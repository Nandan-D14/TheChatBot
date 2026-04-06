export interface BeamLLMRequest {
  prompt: string;
  history: { role: string; content: string }[];
  temperature: number;
  max_tokens: number;
}

export class BeamLLM {
  private endpoint: string;
  private token: string;

  constructor(endpoint: string, token: string) {
    this.endpoint = endpoint;
    this.token = token;
  }

  async call(request: BeamLLMRequest): Promise<string> {
    const maxRetries = 3;
    const backoffMs = 10000; // 10s initial backoff for cold starts

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          const data = await response.json() as { response?: string };
          return data.response || "";
        }

        // Retry on 502, 503, 504 (cold start / transient errors)
        if ([502, 503, 504].includes(response.status)) {
          lastError = new Error(`Beam returned ${response.status}`);
          await this.sleep(backoffMs * (attempt + 1));
          continue;
        }

        // Non-retryable error
        const body = await response.text().catch(() => "");
        throw new Error(
          `Beam request failed: ${response.status} ${body}`
        );
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));

        // Retry on network errors (timeout)
        if (err instanceof TypeError && err.message.includes("fetch")) {
          await this.sleep(backoffMs);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("Beam request failed after retries");
  }

  async *stream(request: BeamLLMRequest): AsyncGenerator<string> {
    const maxRetries = 3;
    const backoffMs = 5000;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify({ ...request, stream: true }),
        });

        if (!response.ok) {
          if ([502, 503, 504].includes(response.status)) {
            await this.sleep(backoffMs * (attempt + 1));
            continue;
          }
          const body = await response.text().catch(() => "");
          throw new Error(
            `Beam request failed: ${response.status} ${body}`
          );
        }

        if (!response.body) {
          throw new Error("No response body from Beam");
        }

        // Stream chunks from Beam directly
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            yield chunk;
          }
        }

        // Final flush
        const tail = decoder.decode();
        if (tail) {
          yield tail;
        }

        return; // Success, exit generator
      } catch (err) {
        if (attempt === maxRetries - 1) throw err;
        await this.sleep(backoffMs);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
