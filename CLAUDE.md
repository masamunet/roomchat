# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RoomChat is a real-time anonymous chat application built with SvelteKit. Users create rooms via Google OAuth, share 8-character invite codes, and participants join with nicknames. Rooms auto-delete after 6 hours.

## Commands

- **Dev server:** `npm run dev` (localhost:5173)
- **Build:** `npm run build`
- **Preview:** `npm run preview`
- **Type check:** `npm run check`
- **Type check (watch):** `npm run check:watch`

### Worktree Preview

worktreeでプレビューする場合は、`.env.prod`を`.env`としてコピーしてから起動すること:

```bash
cp .env.prod .env
npm run build && npm run preview
```

## Tech Stack

- **Frontend:** Svelte 5 (Runes), Tailwind CSS 4, Vite 7
- **Backend:** SvelteKit with adapter-node
- **Database:** PostgreSQL (production) / PGLite (dev, embedded — used when DATABASE_URL is not set)
- **Auth:** Google OAuth via Arctic
- **Real-time:** Server-Sent Events (SSE) with in-memory connection manager
- **Deployment:** Render (render.yaml)

## Architecture

### Database Layer
`src/lib/server/db/index.ts` abstracts between PGLite (dev) and PostgreSQL (prod). The driver is selected based on whether `DATABASE_URL` is set. Migrations in `src/lib/server/db/migrations/` are run automatically on startup.

### Repository Pattern
Data access is in `src/lib/server/repositories/` (room, participant, message). All SQL is parameterized.

### Real-time Communication
`src/lib/server/sse/manager.ts` manages per-room SSE connections (max 100/room, 30s keepalive). Messages are broadcast to all connected clients except the sender.

### Chat Views
Three interchangeable views in `src/lib/components/chat/`: SlackView, LineView, NiconicoView. View selection is persisted in localStorage.

### Authentication & Security
- Google OAuth flow in `src/lib/server/auth.ts`
- Session cookies (30-day expiry, httpOnly)
- CSRF protection, rate limiting, security headers — all in `src/hooks.server.ts`
- Participant identity stored in `room_participants` cookie (encoded JSON)

### Key Constraints
- Max 3 active rooms per user
- Rooms auto-expire after 6 hours
- Nicknames must be unique per room (1-50 chars)
- Messages: 1-2000 chars, control characters stripped
- Rate limiting on message POST

## Environment Variables

See `.env.example`. Key variables:
- `DATABASE_URL` — PostgreSQL connection string (omit for PGLite in dev)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth credentials
- `ORIGIN` — Application URL
