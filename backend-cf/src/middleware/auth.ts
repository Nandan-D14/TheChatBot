import type { MiddlewareHandler } from "hono";
import type { Env, Config } from "../core/config";

export function authMiddleware(config: Config): MiddlewareHandler<{
  Bindings: Env;
  Variables: { userId: string; email: string };
}> {
  return async (c, next) => {
    const accessKey = c.req.header("x-app-access-key");

    if (!accessKey || accessKey !== config.appAccessKey) {
      return c.json(
        { error: "Forbidden: missing or invalid access key" },
        403
      );
    }

    // Hardcoded user context (matches Python backend behavior)
    c.set("userId", "shared-app-user");
    c.set("email", "");

    await next();
  };
}
