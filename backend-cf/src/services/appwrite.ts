import { Client, Databases, ID, Query } from "node-appwrite";
import type { Config } from "../core/config";

export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.client = new Client();
    this.client
      .setEndpoint(config.appwriteEndpoint)
      .setProject(config.appwriteProjectId)
      .setKey(config.appwriteApiKey);
    this.databases = new Databases(this.client);
  }

  private get dbId() {
    return this.config.appwriteDbId;
  }
  private get sessionsCollection() {
    return this.config.appwriteSessionsCollection;
  }
  private get messagesCollection() {
    return this.config.appwriteMessagesCollection;
  }
  private get memoryCollection() {
    return this.config.appwriteMemoryCollection;
  }

  private async callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    const maxRetries = this.config.appwriteMaxRetries;
    const backoff = this.config.appwriteRetryBackoff;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await new Promise((r) =>
            setTimeout(r, backoff * Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    throw lastError;
  }

  // ── Sessions ──

  async createSessionRecord(
    userId: string,
    title: string
  ): Promise<Record<string, unknown>> {
    return this.callWithRetry(async () => {
      return this.databases.createDocument(
        this.dbId,
        this.sessionsCollection,
        ID.unique(),
        {
          user_id: userId,
          title,
          created_at: new Date().toISOString(),
        }
      );
    });
  }

  async getSessions(userId: string): Promise<Record<string, unknown>[]> {
    return this.callWithRetry(async () => {
      const result = await this.databases.listDocuments(
        this.dbId,
        this.sessionsCollection,
        [
          Query.equal("user_id", userId),
          Query.orderDesc("created_at"),
          Query.limit(100),
        ]
      );
      return result.documents as Record<string, unknown>[];
    });
  }

  async getSession(
    sessionId: string
  ): Promise<Record<string, unknown> | null> {
    return this.callWithRetry(async () => {
      try {
        return (await this.databases.getDocument(
          this.dbId,
          this.sessionsCollection,
          sessionId
        )) as Record<string, unknown>;
      } catch (err: any) {
        if (err.code === 404 || err.code === 400) {
          return null;
        }
        throw err;
      }
    });
  }

  async updateSessionTitle(
    sessionId: string,
    title: string
  ): Promise<Record<string, unknown>> {
    return this.callWithRetry(async () => {
      return this.databases.updateDocument(
        this.dbId,
        this.sessionsCollection,
        sessionId,
        { title }
      );
    });
  }

  async deleteSessionRecord(sessionId: string): Promise<void> {
    await this.callWithRetry(async () => {
      // Delete all messages first
      const messages = await this.getMessages(sessionId);
      for (const msg of messages) {
        await this.databases.deleteDocument(
          this.dbId,
          this.messagesCollection,
          msg.$id as string
        );
      }
      // Delete session
      await this.databases.deleteDocument(
        this.dbId,
        this.sessionsCollection,
        sessionId
      );
    });
  }

  // ── Messages ──

  async saveMessage(
    sessionId: string,
    role: string,
    content: string
  ): Promise<Record<string, unknown>> {
    return this.callWithRetry(async () => {
      return this.databases.createDocument(
        this.dbId,
        this.messagesCollection,
        ID.unique(),
        {
          session_id: sessionId,
          role,
          content,
          created_at: new Date().toISOString(),
        }
      );
    });
  }

  async getMessages(sessionId: string): Promise<Record<string, unknown>[]> {
    return this.callWithRetry(async () => {
      const result = await this.databases.listDocuments(
        this.dbId,
        this.messagesCollection,
        [Query.equal("session_id", sessionId), Query.orderAsc("created_at")]
      );
      return result.documents as Record<string, unknown>[];
    });
  }

  async getMessageCount(sessionId: string): Promise<number> {
    return this.callWithRetry(async () => {
      const result = await this.databases.listDocuments(
        this.dbId,
        this.messagesCollection,
        [
          Query.equal("session_id", sessionId),
          Query.limit(1), // We only need the count from total
        ]
      );
      return result.total;
    });
  }

  // ── Memory ──

  async saveMemory(userId: string, summary: string): Promise<void> {
    await this.callWithRetry(async () => {
      // Check if memory exists
      const existing = await this.databases.listDocuments(
        this.dbId,
        this.memoryCollection,
        [Query.equal("user_id", userId), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        // Update existing
        await this.databases.updateDocument(
          this.dbId,
          this.memoryCollection,
          existing.documents[0].$id as string,
          { summary, updated_at: new Date().toISOString() }
        );
      } else {
        // Create new
        await this.databases.createDocument(
          this.dbId,
          this.memoryCollection,
          ID.unique(),
          {
            user_id: userId,
            summary,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        );
      }
    });
  }

  async getMemory(userId: string): Promise<string | null> {
    return this.callWithRetry(async () => {
      const result = await this.databases.listDocuments(
        this.dbId,
        this.memoryCollection,
        [Query.equal("user_id", userId), Query.limit(1)]
      );
      if (result.documents.length === 0) return null;
      return (result.documents[0] as Record<string, unknown>).summary as string;
    });
  }

  async deleteMemory(userId: string): Promise<void> {
    await this.callWithRetry(async () => {
      const result = await this.databases.listDocuments(
        this.dbId,
        this.memoryCollection,
        [Query.equal("user_id", userId)]
      );
      for (const doc of result.documents) {
        await this.databases.deleteDocument(
          this.dbId,
          this.memoryCollection,
          doc.$id as string
        );
      }
    });
  }

  // ── Users ──

  async createEmailPasswordSession(
    email: string,
    password: string
  ): Promise<Record<string, unknown>> {
    // Uses the Account API via Appwrite REST directly
    const response = await fetch(
      `${this.config.appwriteEndpoint}/account/sessions/email-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": this.config.appwriteProjectId,
        },
        body: JSON.stringify({ email, password }),
      }
    );
    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }
    return await response.json();
  }

  // ── Health Check ──

  async verifyReady(): Promise<boolean> {
    try {
      await this.databases.listDocuments(
        this.dbId,
        this.sessionsCollection,
        [Query.limit(1)]
      );
      await this.databases.listDocuments(
        this.dbId,
        this.messagesCollection,
        [Query.limit(1)]
      );
      await this.databases.listDocuments(
        this.dbId,
        this.memoryCollection,
        [Query.limit(1)]
      );
      return true;
    } catch {
      return false;
    }
  }
}
