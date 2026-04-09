# TheChatBot - Agent Operating Guide

## Purpose
This file defines how AI coding agents should work inside this repository.

Primary goal:
- Ship reliable improvements to a private ChatGPT-like app built with Next.js frontend, Cloudflare Workers (Hono) backend, Cloudflare D1 persistence, and Beam-hosted model inference.

## Product Context
The system has four major parts:
- frontend: Next.js app for chat UI, sessions, and streaming display
- backend-cf: Cloudflare Workers (Hono) API for chat, sessions, and memory orchestration
- beam_deploy: Beam endpoint deployment for model inference
- infrastructure integration: Cloudflare D1 for session/message/memory persistence

Current roadmap direction:
- Stabilize chat/session/memory flows
- Preserve streaming UX and graceful fallback behavior
- Improve test coverage and CI reliability
- Prepare for later RAG and multimodal phases

## Source Of Truth Files
Agents should prioritize these files when making decisions:
- README.md for setup, architecture, and run instructions
- backend-cf/src/index.ts for API wiring, health endpoints, routes, and chat streaming behavior
- backend-cf/src/services/d1.ts for persistence behavior and database queries
- backend-cf/src/core/beam_llm.ts for Beam request/stream behavior and retry logic
- beam_deploy/app.py for model loading and endpoint deployment behavior
- frontend/hooks/useChat.ts for streaming client behavior
- frontend/components/chat/ for user-facing chat experience

## Agent Responsibilities
When implementing changes, agents must:
- Keep backend API stable unless a breaking change is explicitly requested
- Preserve existing route contracts and payload shapes when possible
- Keep Beam secrets and Cloudflare tokens out of source files
- Prefer minimal, focused edits over broad rewrites
- Verify behavior with local checks before concluding work

## Preferred Workflow
1. Understand intent and impacted layers (frontend/backend/deploy).
2. Inspect related files and existing patterns.
3. Implement smallest viable change.
4. Validate locally.
5. Update docs when behavior or setup changes.

## Validation Checklist
Use relevant checks for every meaningful change:

Backend:
- Run typecheck from backend-cf directory: `npm run typecheck`
- Ensure health endpoints still return expected shape via local wrangler dev server:
	- GET /api/
	- GET /api/health
	- GET /api/info

Frontend:
- Install dependencies if needed: `npm ci`
- Build check: `npm run build`

CI/CD:
- Ensure `.github/workflows/ci.yml` remains green for frontend jobs
- Ensure `.github/workflows/cd-beam.yml` deploy logic is secret-safe and skip-safe

## Coding Standards
- Follow existing style and naming in each folder
- Do not introduce unrelated refactors
- Keep comments short and only where complexity warrants them
- Keep error paths explicit and actionable

## Safety Rules
- Never commit real secrets or tokens
- Treat Cloudflare and Beam outages as expected failure modes
- Preserve graceful fallbacks where already implemented
- Avoid destructive git commands unless explicitly requested

## Task Routing Guidance For AI Agents
Use this routing to choose implementation focus quickly:
- UI rendering, interaction bugs, chat UX: `frontend/`
- API behavior, request/response models, streaming endpoints: `backend-cf/src/index.ts`
- LLM request behavior, retries, timeouts: `backend-cf/src/core/beam_llm.ts`
- Data persistence and document operations: `backend-cf/src/services/d1.ts`
- Model startup, quantization, deployment details: `beam_deploy/app.py`
- Pipeline reliability and deployment automation: `.github/workflows/`

## Definition Of Done
A task is done when:
- Requested change is implemented
- Relevant checks pass locally or limitations are clearly stated
- Documentation is updated when needed
- No unrelated files are modified intentionally
