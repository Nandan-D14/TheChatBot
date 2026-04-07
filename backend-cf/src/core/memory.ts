import type { D1Service } from "../services/d1";

interface ChatMessage {
  type: "user" | "ai";
  content: string;
}

export class ConversationMemory {
  private messages: ChatMessage[] = [];
  private windowSize: number;
  private storageService?: D1Service;
  private sessionId?: string;

  constructor(windowSize: number = 20, storageService?: D1Service, sessionId?: string) {
    this.windowSize = windowSize;
    this.storageService = storageService;
    this.sessionId = sessionId;
  }

  addUserMessage(content: string): void {
    this.messages.push({ type: "user", content });
    this.trimWindow();
    this.persistMessage("user", content);
  }

  addAiMessage(content: string): void {
    this.messages.push({ type: "ai", content });
    this.trimWindow();
    this.persistMessage("assistant", content);
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  getHistory(): string[] {
    return this.messages.map((m) => {
      const prefix = m.type === "user" ? "User:" : "AI:";
      return `${prefix} ${m.content}`;
    });
  }

  clear(): void {
    this.messages = [];
  }

  private trimWindow(): void {
    if (this.messages.length > this.windowSize) {
      this.messages = this.messages.slice(-this.windowSize);
    }
  }

  private persistMessage(role: string, content: string): void {
    if (this.storageService && this.sessionId) {
      // Fire-and-forget, don't await
      this.storageService
        .saveMessage(this.sessionId, role, content)
        .catch((err) => console.error("Failed to persist message:", err));
    }
  }
}

export class UserMemory {
  private storageService: D1Service;
  private userId: string;

  constructor(storageService: D1Service, userId: string) {
    this.storageService = storageService;
    this.userId = userId;
  }

  async getSummary(): Promise<string | null> {
    return this.storageService.getMemory(this.userId);
  }

  async saveSummary(summary: string): Promise<void> {
    await this.storageService.saveMemory(this.userId, summary);
  }

  async delete(): Promise<void> {
    await this.storageService.deleteMemory(this.userId);
  }

  async updateWithConversation(messages: string[]): Promise<void> {
    const current = await this.getSummary();
    // Simple append strategy — can be enhanced with LLM summarization
    const newSummary = current
      ? `${current}\n\nRecent context:\n${messages.slice(-5).join("\n")}`
      : `User context:\n${messages.slice(-5).join("\n")}`;
    await this.saveSummary(newSummary);
  }
}
