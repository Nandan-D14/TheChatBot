import { Hono, type Context } from "hono";
import { streamSSE } from "hono/streaming";
import type { Env, Config } from "./core/config";
import { getConfig } from "./core/config";
import { BeamLLM } from "./core/beam_llm";
import { AppwriteService } from "./services/appwrite";
import { authMiddleware } from "./middleware/auth";
import { UserMemory } from "./core/memory";

const app = new Hono<{ Bindings: Env; Variables: { userId: string; email: string } }>();

// ── Helpers ──

function getBeamLLM(env: Env): BeamLLM {
  const config = getConfig(env);
  return new BeamLLM(config.beamEndpoint, config.beamToken);
}

function getAppwriteService(env: Env): AppwriteService {
  const config = getConfig(env);
  return new AppwriteService(config);
}

function getConfigSafe(env: Env): Config {
  return getConfig(env);
}

type AppContext = Context<{ Bindings: Env; Variables: { userId: string; email: string } }>;

async function forwardLegacyToApi(c: AppContext) {
  const url = new URL(c.req.url);
  url.pathname = `/api${url.pathname}`;
  const proxiedRequest = new Request(url.toString(), c.req.raw);
  return app.fetch(proxiedRequest, c.env, c.executionCtx);
}

// ── Global middleware ──

app.use("*", async (c, next) => {
  const config = getConfigSafe(c.env);
  const origins = config.corsOrigins;
  const origin = c.req.header("Origin") || "";
  const requestId = crypto.randomUUID();
  const allowAnyOrigin = origins.includes("*");
  const hasOrigin = origin.length > 0;
  const isAllowedOrigin = allowAnyOrigin || (hasOrigin && origins.includes(origin));

  c.header("X-Request-Id", requestId);

  if (allowAnyOrigin) {
    c.header("Access-Control-Allow-Origin", "*");
  } else if (hasOrigin && isAllowedOrigin) {
    c.header("Access-Control-Allow-Origin", origin);
  }

  c.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type, x-app-access-key");
  c.header("Access-Control-Max-Age", "86400");

  if (c.req.method === "OPTIONS") {
    if (hasOrigin && !isAllowedOrigin) {
      return c.json({ error: "Origin not allowed" }, 403);
    }
    return c.body(null, 204);
  }

  if (hasOrigin && !isAllowedOrigin) {
    return c.json({ error: "Origin not allowed" }, 403);
  }

  const bodyMethods = new Set(["POST", "PUT", "PATCH"]);
  if (bodyMethods.has(c.req.method)) {
    const contentLengthHeader = c.req.header("Content-Length");
    if (contentLengthHeader) {
      const contentLength = Number.parseInt(contentLengthHeader, 10);
      if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
        return c.json({ error: "Payload too large" }, 413);
      }
    }
  }

  await next();
});

// Legacy compatibility paths used by the current frontend.
app.use("/chat", forwardLegacyToApi);
app.use("/chat/*", forwardLegacyToApi);
app.use("/sessions", forwardLegacyToApi);
app.use("/sessions/*", forwardLegacyToApi);
app.use("/memory", forwardLegacyToApi);
app.use("/memory/*", forwardLegacyToApi);

// ── Public routes (no auth) ──

app.get("/", (c) =>
  c.json({
    service: "thechatbot-api",
    version: "2.0.0",
    runtime: "cloudflare-workers",
  })
);

app.get("/health", (c) =>
  c.json({
    status: "healthy",
    service: "thechatbot-api",
  })
);

app.get("/info", async (c) => {
  const appwriteService = getAppwriteService(c.env);
  const appwriteReady = await appwriteService.verifyReady().catch(() => false);
  const config = getConfigSafe(c.env);

  return c.json({
    beam_configured:
      !!c.env.BEAM_ENDPOINT_URL &&
      c.env.BEAM_ENDPOINT_URL !== "https://your-app.beam.cloud",
    appwrite_configured:
      !!c.env.APPWRITE_ENDPOINT &&
      c.env.APPWRITE_ENDPOINT !== "http://localhost/v1",
    appwrite_ready: appwriteReady,
    cors_origins: config.corsOrigins,
  });
});

// ── Auth middleware for /api/* ──

app.use("/api/*", async (c, next) => {
  const config = getConfigSafe(c.env);
  const auth = authMiddleware(config);
  return auth(c, next);
});

// ── Chat routes ──

app.post("/api/chat/stream", async (c) => {
  const userId = c.get("userId");
  const beamLLM = getBeamLLM(c.env);
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const prompt = (b.prompt as string) || "";
  const sessionId = (b.session_id as string) || "";
  const history = Array.isArray(b.history) ? (b.history as {role: string; content: string}[]) : [];
  const temperature =
    typeof b.temperature === "number" ? b.temperature : 0.7;
  const maxTokens = typeof b.max_tokens === "number" ? b.max_tokens : 512;

  if (!prompt || !sessionId) {
    return c.json({ error: "prompt and session_id are required" }, 400);
  }

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found or not owned by user" }, 404);
  }

  await appwriteService
    .saveMessage(sessionId, "user", prompt)
    .catch((err) => console.error("Failed to save user message:", err));

  const msgCount = await appwriteService.getMessageCount(sessionId);
  if (msgCount <= 1 && session.title === "New Chat") {
    const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
    await appwriteService
      .updateSessionTitle(sessionId, title)
      .catch((err) => console.error("Failed to auto-title:", err));
  }

  const fullResponse = await beamLLM.call({
    prompt,
    history,
    temperature,
    max_tokens: maxTokens,
  });

  const words = fullResponse.split(/\s+/);

  return streamSSE(c, async (stream) => {
    for (let i = 0; i < words.length; i++) {
      const word = words[i] + " ";
      await stream.writeSSE({
        data: JSON.stringify({ token: word, complete: false }),
      });
      await new Promise((r) => setTimeout(r, 20));
    }

    await stream.writeSSE({
      data: JSON.stringify({
        token: "",
        complete: true,
        session_id: sessionId,
      }),
    });
    await stream.writeSSE({ data: "[DONE]" });

    await appwriteService
      .saveMessage(sessionId, "assistant", fullResponse)
      .catch((err) => console.error("Failed to save AI message:", err));
  });
});

app.post("/api/chat/non-stream", async (c) => {
  const userId = c.get("userId");
  const beamLLM = getBeamLLM(c.env);
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const prompt = (b.prompt as string) || "";
  const sessionId = (b.session_id as string) || "";
  const history = Array.isArray(b.history) ? (b.history as {role: string; content: string}[]) : [];
  const temperature =
    typeof b.temperature === "number" ? b.temperature : 0.7;
  const maxTokens = typeof b.max_tokens === "number" ? b.max_tokens : 512;

  if (!prompt || !sessionId) {
    return c.json({ error: "prompt and session_id are required" }, 400);
  }

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found or not owned by user" }, 404);
  }

  await appwriteService
    .saveMessage(sessionId, "user", prompt)
    .catch((err) => console.error("Failed to save user message:", err));

  const msgCount = await appwriteService.getMessageCount(sessionId);
  if (msgCount <= 1 && session.title === "New Chat") {
    const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
    await appwriteService
      .updateSessionTitle(sessionId, title)
      .catch((err) => console.error("Failed to auto-title:", err));
  }

  const response = await beamLLM.call({
    prompt,
    history,
    temperature,
    max_tokens: maxTokens,
  });

  await appwriteService
    .saveMessage(sessionId, "assistant", response)
    .catch((err) => console.error("Failed to save AI message:", err));

  return c.json({ response, session_id: sessionId });
});

app.post("/api/chat/stream-full", async (c) => {
  const userId = c.get("userId");
  const beamLLM = getBeamLLM(c.env);
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const prompt = (b.prompt as string) || "";
  const sessionId = (b.session_id as string) || "";
  const history = Array.isArray(b.history) ? (b.history as {role: string; content: string}[]) : [];
  const temperature =
    typeof b.temperature === "number" ? b.temperature : 0.7;
  const maxTokens = typeof b.max_tokens === "number" ? b.max_tokens : 512;

  if (!prompt || !sessionId) {
    return c.json({ error: "prompt and session_id are required" }, 400);
  }

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found or not owned by user" }, 404);
  }

  await appwriteService
    .saveMessage(sessionId, "user", prompt)
    .catch((err) => console.error("Failed to save user message:", err));

  const msgCount = await appwriteService.getMessageCount(sessionId);
  if (msgCount <= 1 && session.title === "New Chat") {
    const title = prompt.slice(0, 50) + (prompt.length > 50 ? "..." : "");
    await appwriteService
      .updateSessionTitle(sessionId, title)
      .catch((err) => console.error("Failed to auto-title:", err));
  }

  let fullResponse = "";

  return streamSSE(c, async (stream) => {
    try {
      for await (const chunk of beamLLM.stream({
        prompt,
        history,
        temperature,
        max_tokens: maxTokens,
      })) {
        fullResponse += chunk;
        await stream.writeSSE({
          data: JSON.stringify({ token: chunk, complete: false }),
        });
      }

      await stream.writeSSE({
        data: JSON.stringify({
          token: "",
          complete: true,
          session_id: sessionId,
        }),
      });
      await stream.writeSSE({ data: "[DONE]" });

      await appwriteService
        .saveMessage(sessionId, "assistant", fullResponse)
        .catch((err) => console.error("Failed to save AI message:", err));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      await stream.writeSSE({
        data: JSON.stringify({ error: errorMessage, complete: true }),
      });
    }
  });
});

// ── Session routes ──

app.post("/api/sessions", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title : "New Chat";

  const session = await appwriteService.createSessionRecord(userId, title);

  return c.json(
    {
      session_id: session.$id,
      user_id: (session.user_id as string) || userId,
      title: (session.title as string) || title,
      created_at:
        (session.created_at as string) || new Date().toISOString(),
    },
    201
  );
});

app.get("/api/sessions", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);
  const sessions = await appwriteService.getSessions(userId);

  return c.json(
    sessions.map((s) => ({
      session_id: s.$id as string,
      user_id: s.user_id as string,
      title: s.title as string,
      created_at: s.created_at as string,
    }))
  );
});

app.get("/api/sessions/:sessionId", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const appwriteService = getAppwriteService(c.env);

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({
    session_id: session.$id as string,
    user_id: session.user_id as string,
    title: session.title as string,
    created_at: session.created_at as string,
  });
});

app.patch("/api/sessions/:sessionId", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const appwriteService = getAppwriteService(c.env);

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const title = (b.title as string) || "";
  if (!title) {
    return c.json({ error: "title is required" }, 400);
  }

  const updated = await appwriteService.updateSessionTitle(sessionId, title);

  return c.json({
    session_id: updated.$id as string,
    user_id: updated.user_id as string,
    title: updated.title as string,
    created_at: updated.created_at as string,
  });
});

app.delete("/api/sessions/:sessionId", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const appwriteService = getAppwriteService(c.env);

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  await appwriteService.deleteSessionRecord(sessionId);
  return c.json({ message: "Session deleted" });
});

app.get("/api/sessions/:sessionId/messages", async (c) => {
  const userId = c.get("userId");
  const sessionId = c.req.param("sessionId");
  const appwriteService = getAppwriteService(c.env);

  const session = await appwriteService.getSession(sessionId);
  if (!session || session.user_id !== userId) {
    return c.json({ error: "Session not found" }, 404);
  }

  const messages = await appwriteService.getMessages(sessionId);

  return c.json({
    session_id: sessionId,
    messages: messages.map((m) => ({
      message_id: m.$id as string,
      session_id: m.session_id as string,
      role: m.role as string,
      content: m.content as string,
      created_at: m.created_at as string,
    })),
    count: messages.length,
  });
});

// ── Memory routes ──

app.get("/api/memory/me", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);
  const userMemory = new UserMemory(appwriteService, userId);
  const summary = await userMemory.getSummary();

  return c.json({ user_id: userId, summary: summary || "" });
});

app.post("/api/memory", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const summary = (b.summary as string) || "";
  if (!summary) {
    return c.json({ error: "summary is required" }, 400);
  }

  const userMemory = new UserMemory(appwriteService, userId);
  await userMemory.saveSummary(summary);

  return c.json({ message: "Memory saved", user_id: userId });
});

app.delete("/api/memory/me", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);
  const userMemory = new UserMemory(appwriteService, userId);
  await userMemory.delete();

  return c.json({ message: "Memory deleted" });
});

app.post("/api/memory/update", async (c) => {
  const userId = c.get("userId");
  const appwriteService = getAppwriteService(c.env);

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON" }, 400);
  }

  const b = body as Record<string, unknown>;
  const messages = Array.isArray(b.messages)
    ? (b.messages as string[])
    : [];

  const userMemory = new UserMemory(appwriteService, userId);
  await userMemory.updateWithConversation(messages);

  return c.json({ message: "Memory updated", user_id: userId });
});

// ── Error handler ──

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const maybeStatus = (err as { status?: unknown }).status;
  const status = typeof maybeStatus === "number" ? maybeStatus : 500;

  if (status >= 500) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({ error: err.message || "Request failed" }),
    {
      status: status >= 400 && status < 500 ? status : 400,
      headers: { "Content-Type": "application/json" },
    }
  );
});

export default app;
