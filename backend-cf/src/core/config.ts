export interface Env {
  // Beam
  BEAM_ENDPOINT_URL: string;
  BEAM_TOKEN: string;

  // Appwrite
  APPWRITE_ENDPOINT: string;
  APPWRITE_PROJECT_ID: string;
  APPWRITE_API_KEY: string;
  APPWRITE_DB_ID: string;
  APPWRITE_SESSIONS_COLLECTION_ID: string;
  APPWRITE_MESSAGES_COLLECTION_ID: string;
  APPWRITE_MEMORY_COLLECTION_ID: string;

  // App
  APP_ACCESS_KEY: string;
  CORS_ORIGINS: string;

  // Appwrite retry config
  APPWRITE_OPERATION_TIMEOUT_S: string;
  APPWRITE_MAX_RETRIES: string;
  APPWRITE_RETRY_BACKOFF_S: string;
}

export function getConfig(env: Env) {
  return {
    beamEndpoint: env.BEAM_ENDPOINT_URL,
    beamToken: env.BEAM_TOKEN,
    appwriteEndpoint: env.APPWRITE_ENDPOINT,
    appwriteProjectId: env.APPWRITE_PROJECT_ID,
    appwriteApiKey: env.APPWRITE_API_KEY,
    appwriteDbId: env.APPWRITE_DB_ID,
    appwriteSessionsCollection: env.APPWRITE_SESSIONS_COLLECTION_ID,
    appwriteMessagesCollection: env.APPWRITE_MESSAGES_COLLECTION_ID,
    appwriteMemoryCollection: env.APPWRITE_MEMORY_COLLECTION_ID,
    appAccessKey: env.APP_ACCESS_KEY,
    corsOrigins: env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    appwriteTimeout: parseInt(env.APPWRITE_OPERATION_TIMEOUT_S, 10),
    appwriteMaxRetries: parseInt(env.APPWRITE_MAX_RETRIES, 10),
    appwriteRetryBackoff: parseFloat(env.APPWRITE_RETRY_BACKOFF_S),
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
    return {
      prompt: b.prompt as string,
      session_id: b.session_id as string,
      history: Array.isArray(b.history) ? (b.history as string[]) : [],
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
