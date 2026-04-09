import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("TheChatBot API", () => {
  it("should return metadata on GET /", async () => {
    const request = new Request("http://localhost/");
    // Mock environment variables and bindings
    const env = {
      CORS_ORIGINS: "http://localhost:3000",
      DB: {},
    };
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };
    
    const response = await app.fetch(request, env as any, ctx as any);
    
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty("service", "thechatbot-api");
    expect(body).toHaveProperty("version");
  });

  it("should return healthy status on GET /health", async () => {
    const request = new Request("http://localhost/health");
    const env = {
      CORS_ORIGINS: "http://localhost:3000",
      DB: {},
    };
    const ctx = {
      waitUntil: () => {},
      passThroughOnException: () => {},
    };
    
    const response = await app.fetch(request, env as any, ctx as any);
    
    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body).toHaveProperty("status", "healthy");
    expect(body).toHaveProperty("service", "thechatbot-api");
  });
});
