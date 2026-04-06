# TheChatBot Backend — Cloudflare Workers

FastAPI → Hono/TypeScript migration for Cloudflare Workers (free tier, no sleeping).

## Quick Start

### 1. Install dependencies

```powershell
cd backend-cf
npm install
```

### 2. Local development

```powershell
npm run dev
```

This starts Wrangler dev server on `http://localhost:8787`.

### 3. Set secrets (before first deploy)

```powershell
wrangler secret put BEAM_ENDPOINT_URL
wrangler secret put BEAM_TOKEN
wrangler secret put APPWRITE_ENDPOINT
wrangler secret put APPWRITE_PROJECT_ID
wrangler secret put APPWRITE_API_KEY
wrangler secret put HF_TOKEN
```

You'll be prompted to paste each value.

### 4. Deploy

```powershell
npm run deploy
```

Your API will be live at `https://thechatbot-api.<your-account>.workers.dev`

### 5. Update frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=https://thechatbot-api.<your-account>.workers.dev
```

## Architecture

```
Cloudflare Workers (Hono)
  ├─ BeamLLM → Beam Cloud (your GPU endpoint, unchanged)
  ├─ Appwrite → Appwrite DB/Auth (unchanged)
  └─ Memory → Conversation + User memory
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service metadata |
| GET | `/health` | Health check |
| GET | `/info` | Config status |
| POST | `/api/chat/stream` | SSE streaming chat |
| POST | `/api/chat/non-stream` | Single-response chat |
| POST | `/api/chat/stream-full` | Full LLM streaming |
| POST | `/api/sessions` | Create session |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/:id` | Get session |
| PATCH | `/api/sessions/:id` | Update session |
| DELETE | `/api/sessions/:id` | Delete session + messages |
| GET | `/api/sessions/:id/messages` | Get messages |
| GET | `/api/memory/me` | Get user memory |
| POST | `/api/memory` | Save user memory |
| DELETE | `/api/memory/me` | Delete user memory |
| POST | `/api/memory/update` | Update memory from conversation |

## Migration from Python Backend

### What changed
- FastAPI → Hono (TypeScript)
- Python `requests`/`aiohttp` → Native `fetch()`
- Pydantic models → Manual validation
- `appwrite` Python SDK → `node-appwrite` SDK
- Thread-based retry → Promise-based retry with `setTimeout`

### What stayed the same
- All endpoint paths (with `/api/` prefix)
- All env var names
- Auth mechanism (`x-app-access-key`)
- Appwrite collections/schemas
- Beam LLM interface
- SSE streaming format

### Key differences
- Canonical routes are prefixed with `/api/` (e.g., `/api/chat/stream`)
- Legacy compatibility aliases (`/chat/*`, `/sessions/*`, `/memory/*`) are supported for existing frontend clients during migration
- New integrations should target `/api/*` endpoints
- CORS uses an explicit allowlist from `CORS_ORIGINS` and rejects unknown origins

## Free Tier Limits

- **100,000 requests/day** (resets daily)
- **10ms CPU time per request** (I/O wait doesn't count)
- **Unlimited bandwidth**
- **No sleeping** — always on

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run deploy` | Deploy to Cloudflare |
| `npm run typecheck` | Run TypeScript type checking |

## File Structure

```
backend-cf/
  src/
    index.ts          (entry point, all routes)
    core/
      config.ts       (env vars, validation)
      beam_llm.ts     (Beam client + streaming)
      memory.ts       (conversation + user memory)
    services/
      appwrite.ts     (Appwrite database service)
    middleware/
      auth.ts         (x-app-access-key middleware)
  wrangler.toml       (Cloudflare config)
  package.json
  tsconfig.json
```
