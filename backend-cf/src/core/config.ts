export interface Env {
  // Beam
  BEAM_ENDPOINT_URL: string;
  BEAM_TOKEN: string;

  // D1
  DB: D1Database;

  // App
  APP_ACCESS_KEY: string;
  CORS_ORIGINS: string;
}

export function getConfig(env: Env) {
  return {
    beamEndpoint: env.BEAM_ENDPOINT_URL,
    beamToken: env.BEAM_TOKEN,
    appAccessKey: env.APP_ACCESS_KEY,
    corsOrigins: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
  };
}

export type Config = ReturnType<typeof getConfig>;

// Zod-like validation schemas (lightweight for CF Workers)
export const ChatRequestSchema = {
  validate: (body: unknown) => {
    const b = body as Record<string, unknown>;
    if (!b || typeof b !== "object") throw new Error("Invalid body");
    if (typeof b.prompt !== "string" || !b.prompt) throw new Error("prompt is required");
    if (typeof b.session_id !== "string" || !b.session_id) throw new Error("session_id is required");
    const history = Array.isArray(b.history)
      ? b.history
          .filter((item): item is { role: string; content: string } => {
            if (!item || typeof item !== "object") {
              return false;
            }
            const h = item as Record<string, unknown>;
            return typeof h.role === "string" && typeof h.content === "string";
          })
          .map((item) => ({ role: item.role, content: item.content }))
      : [];

    return {
      prompt: b.prompt as string,
      session_id: b.session_id as string,
      history,
      temperature: typeof b.temperature === "number" ? b.temperature : 0.7,
      max_tokens: typeof b.max_tokens === "number" ? b.max_tokens : 512,
    };
  },
};

export const CreateSessionRequestSchema = {
  validate: (body: unknown) => {
    const b = body as Record<string, unknown>;
    if (!b || typeof b !== "object") throw new Error("Invalid body");
    return {
      title: typeof b.title === "string" ? b.title : "New Chat",
    };
  },
};

export const UpdateSessionRequestSchema = {
  validate: (body: unknown) => {
    const b = body as Record<string, unknown>;
    if (!b || typeof b !== "object") throw new Error("Invalid body");
    if (typeof b.title !== "string" || !b.title) throw new Error("title is required");
    return {
      title: b.title as string,
    };
  },
};
