import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";
import type {
  MemoryAppendOptions,
  MemoryClearOptions,
  MemoryLoadOptions,
  MemoryStore,
  Message,
} from "@anvia/core";
import { CURATED_RAG_DOCUMENTS } from "./curated-rag.js";
import type { RagDocument } from "./schemas.js";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../../..");

dotenv.config({ path: path.join(ROOT_DIR, ".env") });

let pool: pg.Pool | undefined;

export function getPgPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || "43.156.8.165",
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || "football_db",
      user: process.env.DB_USER || "alfian",
      password: process.env.DB_PASSWORD || "YourSecurePasswordHere123!",
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }
  return pool;
}

/**
 * Executes a strictly read-only SELECT query against sofascore.* with statement timeout.
 */
export async function queryReadOnly<T extends pg.QueryResultRow = any>(
  sql: string,
  params: any[] = [],
  timeoutMs = 25000,
): Promise<T[]> {
  const trimmed = sql.trim().replace(/;+$/, "");
  const forbidden = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|COPY)\b/i;
  if (!/^SELECT\b|^WITH\b/i.test(trimmed) || forbidden.test(trimmed)) {
    throw new Error("Only read-only SELECT / WITH queries are permitted against the football analytics database.");
  }

  const client = await getPgPool().connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = '${Number(timeoutMs)}ms'`);
    const res = await client.query<T>(trimmed, params);
    await client.query("COMMIT");
    return res.rows;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ============================================================================
// HYBRID RAG STORE (PostgreSQL `halfspace.rag_documents` + Local JSON Fallback)
// ============================================================================

const LOCAL_RAG_PATH = path.join(ROOT_DIR, ".local-rag-store.json");
let halfspaceInitPromise: Promise<void> | undefined;

function loadLocalRagStore(): { lastSyncDate: string; documents: RagDocument[] } {
  try {
    if (fs.existsSync(LOCAL_RAG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(LOCAL_RAG_PATH, "utf8"));
      if (Array.isArray(raw.documents) && raw.documents.length > 0) {
        return raw;
      }
    }
  } catch {
    // Fallback to curated seed
  }
  const initial = { lastSyncDate: "", documents: [...CURATED_RAG_DOCUMENTS] };
  try {
    fs.writeFileSync(LOCAL_RAG_PATH, JSON.stringify(initial, null, 2), "utf8");
  } catch {
    // ignore write error
  }
  return initial;
}

function saveLocalRagStore(store: { lastSyncDate: string; documents: RagDocument[] }) {
  try {
    fs.writeFileSync(LOCAL_RAG_PATH, JSON.stringify(store, null, 2), "utf8");
  } catch {
    // ignore
  }
}

export async function ensureHalfspaceSchema(): Promise<void> {
  if (!halfspaceInitPromise) {
    halfspaceInitPromise = (async () => {
      try {
        const client = await getPgPool().connect();
        try {
          await client.query(`CREATE SCHEMA IF NOT EXISTS halfspace;`);
          await client.query(`
            CREATE TABLE IF NOT EXISTS halfspace.rag_documents (
              doc_id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              category TEXT NOT NULL,
              club TEXT,
              player TEXT,
              published_date TEXT NOT NULL,
              source_url TEXT NOT NULL,
              content TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS halfspace.chat_sessions (
              session_id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL DEFAULT 'default-user',
              title TEXT NOT NULL DEFAULT 'New chat',
              messages JSONB NOT NULL DEFAULT '[]'::jsonb,
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS halfspace.agg_player_season_all (
              tournament_id INT NOT NULL,
              tournament_name TEXT NOT NULL,
              season_id INT NOT NULL,
              season_key TEXT NOT NULL,
              player_id BIGINT NOT NULL,
              payload JSONB NOT NULL,
              updated_at TIMESTAMP DEFAULT NOW(),
              PRIMARY KEY (tournament_id, season_id, player_id)
            );
          `);
          await client.query(`
            CREATE TABLE IF NOT EXISTS halfspace.user_facts (
              fact_key TEXT PRIMARY KEY,
              fact_value TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT NOW()
            );
          `);

          for (const doc of CURATED_RAG_DOCUMENTS) {
            await client.query(
              `
              INSERT INTO halfspace.rag_documents (doc_id, title, category, club, player, published_date, source_url, content, updated_at)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
              ON CONFLICT (doc_id) DO UPDATE SET
                title = EXCLUDED.title,
                category = EXCLUDED.category,
                club = EXCLUDED.club,
                published_date = EXCLUDED.published_date,
                source_url = EXCLUDED.source_url,
                content = EXCLUDED.content;
              `,
              [
                doc.docId,
                doc.title,
                doc.category,
                doc.club ?? null,
                doc.player ?? null,
                doc.publishedDate,
                doc.sourceUrl,
                doc.content,
              ],
            );
          }
        } finally {
          client.release();
        }
      } catch (err: any) {
        console.warn("[Halfspace DB] Using local RAG/Session fallback store:", err?.message || err);
      }
    })();
  }
  return halfspaceInitPromise;
}

export async function upsertRagDocuments(docs: RagDocument[], syncDate?: string): Promise<number> {
  await ensureHalfspaceSchema();
  const local = loadLocalRagStore();
  const byId = new Map<string, RagDocument>(local.documents.map((d) => [d.docId, d]));
  for (const d of docs) {
    byId.set(d.docId, d);
  }
  saveLocalRagStore({
    lastSyncDate: syncDate ?? (new Date().toISOString().split("T")[0] || ""),
    documents: Array.from(byId.values()),
  });

  try {
    const client = await getPgPool().connect();
    try {
      for (const doc of docs) {
        await client.query(
          `
          INSERT INTO halfspace.rag_documents (doc_id, title, category, club, player, published_date, source_url, content, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (doc_id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            club = EXCLUDED.club,
            published_date = EXCLUDED.published_date,
            source_url = EXCLUDED.source_url,
            content = EXCLUDED.content,
            updated_at = NOW();
          `,
          [
            doc.docId,
            doc.title,
            doc.category,
            doc.club ?? null,
            doc.player ?? null,
            doc.publishedDate,
            doc.sourceUrl,
            doc.content,
          ],
        );
      }
    } finally {
      client.release();
    }
  } catch {
    // Stored in local fallback already
  }
  return docs.length;
}

export function getLastNewsSyncDate(): string {
  return loadLocalRagStore().lastSyncDate;
}

/**
 * Recency-weighted hybrid RAG retrieval over news, regulations, methodology, and tactical profiles.
 */
export async function searchRagDocuments(options: {
  query: string;
  category?: "news" | "regulation" | "methodology" | "tactical_profile" | "all";
  club?: string;
  limit?: number;
}): Promise<Array<RagDocument & { score: number }>> {
  await ensureHalfspaceSchema();
  let allDocs: RagDocument[] = [];

  try {
    const res = await getPgPool().query(
      `SELECT doc_id AS "docId", title, category, club, player, published_date AS "publishedDate", source_url AS "sourceUrl", content
       FROM halfspace.rag_documents`,
    );
    if (res.rows.length > 0) {
      allDocs = res.rows;
    }
  } catch {
    // Fallback to local store
  }
  if (allDocs.length === 0) {
    allDocs = loadLocalRagStore().documents;
  }

  const tokens = options.query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2);

  const clubFilter = options.club?.toLowerCase().trim();
  const catFilter = options.category && options.category !== "all" ? options.category : undefined;

  const scored = allDocs
    .filter((doc) => (!catFilter ? true : doc.category === catFilter))
    .map((doc) => {
      const hayTitle = doc.title.toLowerCase();
      const hayContent = doc.content.toLowerCase();
      const hayClub = (doc.club ?? "").toLowerCase();
      const hayId = doc.docId.toLowerCase();

      let score = 0;
      for (const tok of tokens) {
        if (hayTitle.includes(tok)) score += 4;
        if (hayClub.includes(tok)) score += 5;
        if (hayId.includes(tok)) score += 3;
        if (hayContent.includes(tok)) score += 2;
      }

      if (clubFilter && (hayClub.includes(clubFilter) || hayTitle.includes(clubFilter) || hayContent.includes(clubFilter))) {
        score += 10;
      }

      // Boost regulations when query asks about U-23, asing, kuota, starter, kartu, or lineup
      if (
        doc.category === "regulation" &&
        /u-?23|u23|asing|foreign|kuota|regulasi|starter|lineup|xi|kartu|akumulasi|skorsing/i.test(options.query)
      ) {
        score += 7;
      }

      // Boost methodology when query asks about progressive, padj, key pass, chances
      if (
        doc.category === "methodology" &&
        /progres|progressive|padj|bertahan|defens|key.?pass|chance|posisi|position/i.test(options.query)
      ) {
        score += 8;
      }

      // Recency boost for news articles
      if (doc.category === "news" && doc.publishedDate >= "2026-11-01") {
        score += 3;
      }

      return { ...doc, score };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score || b.publishedDate.localeCompare(a.publishedDate));

  const limit = options.limit ?? 5;
  if (scored.length === 0) {
    return allDocs.slice(0, limit).map((d) => ({ ...d, score: 1 }));
  }
  return scored.slice(0, limit);
}

// ============================================================================
// ANVIA MEMORY STORE (`halfspace.chat_sessions` + Local File Fallback)
// ============================================================================

const LOCAL_SESSIONS_PATH = path.join(ROOT_DIR, ".sessions-memory.json");

type StoredSessionRecord = {
  sessionId: string;
  userId: string;
  title: string;
  updatedAt: string;
  messages: Array<{ message: Message; createdAt: string }>;
};

function readLocalSessions(): Record<string, StoredSessionRecord> {
  try {
    if (fs.existsSync(LOCAL_SESSIONS_PATH)) {
      return JSON.parse(fs.readFileSync(LOCAL_SESSIONS_PATH, "utf8"));
    }
  } catch {
    // ignore
  }
  return {};
}

function writeLocalSessions(data: Record<string, StoredSessionRecord>) {
  try {
    fs.writeFileSync(LOCAL_SESSIONS_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore
  }
}

function extractFirstUserTitle(messages: readonly Message[]): string {
  for (const m of messages) {
    if (m.role === "user") {
      if (typeof m.content === "string") return m.content.slice(0, 80);
      if (Array.isArray(m.content)) {
        const textPart = m.content.find((p: any) => p.type === "text") as { text?: string } | undefined;
        if (textPart?.text) return textPart.text.slice(0, 80);
      }
    }
  }
  return "Liga 1 Tactical Analysis";
}

export class HalfspaceMemoryStore implements MemoryStore {
  async load(args: MemoryLoadOptions): Promise<Message[]> {
    const sessionId = args.scope.sessionId ?? "default";
    await ensureHalfspaceSchema();
    try {
      const res = await getPgPool().query(
        `SELECT messages FROM halfspace.chat_sessions WHERE session_id = $1`,
        [sessionId],
      );
      if (res.rows[0]?.messages) {
        const items = res.rows[0].messages as Array<{ message: Message }>;
        return items.map((i) => i.message);
      }
    } catch {
      // Fallback to local
    }
    const local = readLocalSessions();
    return local[sessionId]?.messages.map((m) => m.message) ?? [];
  }

  async append(args: MemoryAppendOptions): Promise<void> {
    const sessionId = args.scope.sessionId ?? "default";
    const userId = args.scope.userId ?? "default-user";
    const now = new Date().toISOString();
    const existing = await this.load({ scope: args.scope });
    const merged = [...existing, ...args.messages];
    const title = extractFirstUserTitle(merged);
    const wrapped = merged.map((m) => ({ message: m, createdAt: now }));

    const local = readLocalSessions();
    local[sessionId] = { sessionId, userId, title, updatedAt: now, messages: wrapped };
    writeLocalSessions(local);

    try {
      await getPgPool().query(
        `
        INSERT INTO halfspace.chat_sessions (session_id, user_id, title, messages, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
        ON CONFLICT (session_id) DO UPDATE SET
          title = EXCLUDED.title,
          messages = EXCLUDED.messages,
          updated_at = NOW();
        `,
        [sessionId, userId, title, JSON.stringify(wrapped)],
      );
    } catch {
      // Saved locally already
    }
  }

  async clear(args: MemoryClearOptions): Promise<void> {
    const sessionId = args.scope.sessionId ?? "default";
    const local = readLocalSessions();
    delete local[sessionId];
    writeLocalSessions(local);
    try {
      await getPgPool().query(`DELETE FROM halfspace.chat_sessions WHERE session_id = $1`, [sessionId]);
    } catch {
      // ignore
    }
  }

  async listSessions(limit = 50): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
    await ensureHalfspaceSchema();
    try {
      const res = await getPgPool().query(
        `SELECT session_id AS id, title, updated_at AS "updatedAt"
         FROM halfspace.chat_sessions
         ORDER BY updated_at DESC
         LIMIT $1`,
        [limit],
      );
      if (res.rows.length > 0) {
        return res.rows.map((r) => ({
          id: String(r.id),
          title: String(r.title),
          updatedAt: new Date(r.updatedAt).toISOString(),
        }));
      }
    } catch {
      // Fallback
    }
    const local = Object.values(readLocalSessions());
    return local
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, limit)
      .map((s) => ({ id: s.sessionId, title: s.title, updatedAt: s.updatedAt }));
  }

  async getSessionConversation(sessionId: string): Promise<{
    sessionId: string;
    title: string;
    messages: Array<{ message: Message }>;
  } | null> {
    const msgs = await this.load({ scope: { sessionId } });
    if (msgs.length === 0) return null;
    return {
      sessionId,
      title: extractFirstUserTitle(msgs),
      messages: msgs.map((m) => ({ message: m })),
    };
  }
}

export const memoryStore = new HalfspaceMemoryStore();

// ============================================================================
// EXPLICIT USER FACT MEMORY (`halfspace.user_facts` + `.user-memory.json`)
// ============================================================================

const LOCAL_USER_FACTS_PATH = path.join(ROOT_DIR, ".user-memory.json");

export type StoredUserFact = {
  key: string;
  fact: string;
  updatedAt: string;
};

function readLocalUserFacts(): StoredUserFact[] {
  try {
    if (fs.existsSync(LOCAL_USER_FACTS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_USER_FACTS_PATH, "utf8"));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

function writeLocalUserFacts(facts: StoredUserFact[]) {
  try {
    fs.writeFileSync(LOCAL_USER_FACTS_PATH, JSON.stringify(facts, null, 2), "utf8");
  } catch {
    // ignore
  }
}

export async function saveUserMemoryFact(key: string, fact: string): Promise<StoredUserFact> {
  await ensureHalfspaceSchema();
  const cleanKey = key.trim();
  const cleanFact = fact.trim();
  const now = new Date().toISOString();

  const local = readLocalUserFacts();
  const idx = local.findIndex((f) => f.key.toLowerCase() === cleanKey.toLowerCase());
  const entry: StoredUserFact = { key: cleanKey, fact: cleanFact, updatedAt: now };
  if (idx >= 0) local[idx] = entry;
  else local.push(entry);
  writeLocalUserFacts(local);

  try {
    await getPgPool().query(
      `INSERT INTO halfspace.user_facts (fact_key, fact_value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (fact_key) DO UPDATE SET fact_value = EXCLUDED.fact_value, updated_at = NOW()`,
      [cleanKey, cleanFact],
    );
  } catch {
    // stored locally
  }
  return entry;
}

export async function loadUserMemoryFacts(): Promise<StoredUserFact[]> {
  await ensureHalfspaceSchema();
  try {
    const res = await getPgPool().query(
      `SELECT fact_key AS key, fact_value AS fact, updated_at AS "updatedAt"
       FROM halfspace.user_facts
       ORDER BY updated_at DESC`,
    );
    if (res.rows.length > 0) {
      return res.rows.map((r) => ({
        key: String(r.key),
        fact: String(r.fact),
        updatedAt: new Date(r.updatedAt).toISOString(),
      }));
    }
  } catch {
    // fallback
  }
  return readLocalUserFacts();
}

