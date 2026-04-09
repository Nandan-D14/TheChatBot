export interface SessionRecord {
  session_id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface MessageRecord {
  message_id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

interface CountRow {
  count: number | string;
}

interface MemoryRow {
  summary: string;
}

function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export class D1Service {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // -- Sessions --

  async createSessionRecord(userId: string, title: string): Promise<SessionRecord> {
    const sessionId = createId("sess");
    const createdAt = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, title, created_at)
         VALUES (?1, ?2, ?3, ?4)`
      )
      .bind(sessionId, userId, title, createdAt)
      .run();

    return {
      session_id: sessionId,
      user_id: userId,
      title,
      created_at: createdAt,
    };
  }

  async getSessions(userId: string): Promise<SessionRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id AS session_id, user_id, title, created_at
         FROM sessions
         WHERE user_id = ?1
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .bind(userId)
      .all<SessionRecord>();

    return result.results;
  }

  async getSession(sessionId: string): Promise<SessionRecord | null> {
    const session = await this.db
      .prepare(
        `SELECT id AS session_id, user_id, title, created_at
         FROM sessions
         WHERE id = ?1
         LIMIT 1`
      )
      .bind(sessionId)
      .first<SessionRecord>();

    return session ?? null;
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<SessionRecord> {
    await this.db
      .prepare(`UPDATE sessions SET title = ?1 WHERE id = ?2`)
      .bind(title, sessionId)
      .run();

    const updated = await this.getSession(sessionId);
    if (!updated) {
      throw new Error("Session not found after update");
    }

    return updated;
  }

  async deleteSessionRecord(sessionId: string): Promise<void> {
    await this.db.batch([
      this.db.prepare(`DELETE FROM messages WHERE session_id = ?1`).bind(sessionId),
      this.db.prepare(`DELETE FROM sessions WHERE id = ?1`).bind(sessionId),
    ]);
  }

  // -- Messages --

  async saveMessage(sessionId: string, role: string, content: string): Promise<MessageRecord> {
    const messageId = createId("msg");
    const createdAt = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO messages (id, session_id, role, content, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      )
      .bind(messageId, sessionId, role, content, createdAt)
      .run();

    return {
      message_id: messageId,
      session_id: sessionId,
      role,
      content,
      created_at: createdAt,
    };
  }

  async getMessages(sessionId: string): Promise<MessageRecord[]> {
    const result = await this.db
      .prepare(
        `SELECT id AS message_id, session_id, role, content, created_at
         FROM messages
         WHERE session_id = ?1
         ORDER BY created_at ASC`
      )
      .bind(sessionId)
      .all<MessageRecord>();

    return result.results;
  }

  async getMessageCount(sessionId: string): Promise<number> {
    const countRow = await this.db
      .prepare(`SELECT COUNT(*) AS count FROM messages WHERE session_id = ?1`)
      .bind(sessionId)
      .first<CountRow>();

    if (!countRow) {
      return 0;
    }

    const parsed = Number.parseInt(String(countRow.count), 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  // -- Memory --

  async saveMemory(userId: string, summary: string): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO memory (id, user_id, summary, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET
           summary = excluded.summary,
           updated_at = excluded.updated_at`
      )
      .bind(createId("mem"), userId, summary, now, now)
      .run();
  }

  async getMemory(userId: string): Promise<string | null> {
    const memory = await this.db
      .prepare(`SELECT summary FROM memory WHERE user_id = ?1 LIMIT 1`)
      .bind(userId)
      .first<MemoryRow>();

    return memory?.summary ?? null;
  }

  async deleteMemory(userId: string): Promise<void> {
    await this.db
      .prepare(`DELETE FROM memory WHERE user_id = ?1`)
      .bind(userId)
      .run();
  }

  // -- Analytics --

  async logAnalyticsEvent(
    userId: string,
    eventType: string,
    latencyMs: number | null,
    tokensUsed: number | null
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO analytics_events (id, user_id, event_type, latency_ms, tokens_used, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(
        createId("evt"),
        userId,
        eventType,
        latencyMs,
        tokensUsed,
        new Date().toISOString()
      )
      .run();
  }

  async getAnalyticsDashboard(userId: string, timeRange: string = "All time"): Promise<any> {
    let dateFilter = "1=1"; // default all time
    const now = new Date();
    
    if (timeRange === "Last 7 days") {
      const past = new Date(now.setDate(now.getDate() - 7));
      dateFilter = `created_at >= '${past.toISOString()}'`;
    } else if (timeRange === "Last 30 days") {
      const past = new Date(now.setDate(now.getDate() - 30));
      dateFilter = `created_at >= '${past.toISOString()}'`;
    } else if (timeRange === "This month") {
      const past = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = `created_at >= '${past.toISOString()}'`;
    }

    const [messagesCount, activeSessions, metrics, recentActivity] = await this.db.batch([
      this.db.prepare(`SELECT COUNT(*) as total FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?1) AND ${dateFilter}`).bind(userId),
      this.db.prepare(`SELECT COUNT(DISTINCT session_id) as total FROM messages WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?1) AND ${dateFilter}`).bind(userId),
      this.db.prepare(`SELECT SUM(tokens_used) as tokens, AVG(latency_ms) as latency FROM analytics_events WHERE user_id = ?1 AND ${dateFilter}`).bind(userId),
      this.db.prepare(`SELECT event_type, created_at FROM analytics_events WHERE user_id = ?1 AND ${dateFilter} ORDER BY created_at DESC LIMIT 5`).bind(userId),
    ]);

    return {
      totalMessages: (messagesCount.results[0] as any)?.total || 0,
      activeSessions: (activeSessions.results[0] as any)?.total || 0,
      tokensUsed: (metrics.results[0] as any)?.tokens || 0,
      avgLatency: (metrics.results[0] as any)?.latency || 0,
      recentActivity: recentActivity.results || [],
    };
  }

  // -- Health Check --

  async verifyReady(): Promise<boolean> {
    try {
      const result = await this.db
        .prepare(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table' AND name IN ('sessions', 'messages', 'memory')`
        )
        .all<{ name: string }>();

      const found = new Set(result.results.map((row) => row.name));
      return found.has("sessions") && found.has("messages") && found.has("memory");
    } catch {
      return false;
    }
  }
}
