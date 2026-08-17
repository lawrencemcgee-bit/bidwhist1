# Bid Whist — Real-Time Multiplayer (Classic Partnership)

A server-authoritative multiplayer Bid Whist foundation.

- **Frontend:** React 18 + TypeScript (Vite)
- **Backend:** Node.js + TypeScript (Express + Socket.IO)
- **Database:** PostgreSQL + Prisma
- **Auth:** JWT (email/password)
- **Real-time:** Socket.IO
- **Environment:** Docker Compose (local dev), npm workspaces monorepo

## Ruleset

The engine implements a single, fixed variant — **Classic Partnership Bid Whist**
with 13-card hands, Jokers, trump/no-trump bidding, follow-suit enforcement,
partnership scoring to 7 points, and dealer rotation.

See `docs/game-rules.md` for the exact, engine-enforced rules.

## Repository layout

```
apps/
  client/    React + Vite SPA (lobby, felt table, sound hooks, chat)
  server/    Express REST API, Socket.IO, Prisma, game engine, bots
packages/
  shared/    Framework-free types, constants, and the event catalog
docs/
  game-rules.md   Fixed ruleset (source of truth for the engine)
  events.md       Every real-time event and payload
```

### Server module map

| Path | Purpose |
| ---- | ------- |
| `apps/server/src/game/engine.ts` | Server-authoritative state machine (deal → bid → discard → play → score) |
| `apps/server/src/game/evaluator.ts` | Follow-suit enforcement and trick resolution |
| `apps/server/src/game/scoring.ts` | Partnership scoring to 7 |
| `apps/server/src/game/tableManager.ts` | Runtime table orchestration (engine + sockets + bots + DB) |
| `apps/server/src/bots/` | Avatars, personalities, chat lines, deterministic strategy |
| `apps/server/src/modules/auth/` | Register / login / logout / me / avatar (JWT) |
| `apps/server/src/modules/lobby/` | Table REST endpoints |
| `apps/server/src/modules/history/` | Persisted match history REST endpoint |
| `apps/server/src/socket/` | Socket.IO auth + event wiring |
| `apps/server/prisma/` | Schema, migrations, seed |

### Client module map

| Path | Purpose |
| ---- | ------- |
| `apps/client/src/pages/TablePage.tsx` | Live table: felt, hand, bidding, discarding, chat, spectator mode |
| `apps/client/src/pages/LobbyPage.tsx` | Table list, create table, avatar picker, spectate links |
| `apps/client/src/pages/HistoryPage.tsx` | Persisted match history with per-table spectate |
| `apps/client/src/components/table/FeltTable.tsx` | Felt table with seats and center trick |
| `apps/client/src/components/cards/PlayingCard.tsx` | Rounded, animated card |
| `apps/client/src/components/sound/` | Web Audio synthesized shuffle / placement / trick / bid + ambience |
| `apps/client/src/store/` | Zustand stores for auth and live table state |
| `apps/client/src/hooks/useSocket.ts` | Authenticated Socket.IO client hook |

## Getting started

### Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

- Client: `http://localhost:5173`
- Server: `http://localhost:4000`
- Postgres: `localhost:5432`

### Manual

```bash
npm install
docker compose up -d db
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Demo account after seeding: `demo@bidwhist.local` / `bidwhist-demo`.

### Checks

```bash
npm run typecheck   # tsc across all workspaces
npm run test        # vitest (deck, evaluator, bidding, scoring, engine simulation)
```

## Security model

- All game actions are validated by the engine; the client only drives UX.
- Hidden hands travel only in the `table:private` event to the owning socket.
- Every action is bound to the socket's authenticated seat; a socket acting
  out of turn receives `action:error`.
- JWT verified on both REST and the Socket.IO handshake.

## Real-time events

The complete catalog (names + payloads + security notes) is in
`docs/events.md` and typed in `packages/shared/src/events.ts`.

## Phase roadmap

1. **Phase 1:** Monorepo, auth, lobby, engine skeleton, sockets, bots, felt
   table UI, sound hooks.
2. **Phase 2 (this):** Reconnect/resume with automatic bot takeover, persisted
   match history UI, human avatar picker, table spectating.
3. **Phase 3:** Bidding polish (bid history panel, dealer/kitty indicators),
   richer bot strategy (hand patterns, defensive trumping), end-to-end tests.
4. **Phase 4:** Match replay, achievements, ranked ladder.

### Phase 2 notes

- **Reconnect / resume:** If a human disconnects mid-game, a deterministic bot
  takes over their seat (`player:away`) and keeps the game moving
  (`AUTO_BOT_TAKEOVER=true` by default). Reconnecting the same account resumes
  the seat, stops the bot (`player:back`), and re-sends the hidden hand.
- **Spectating:** Open `/table/:id?spectate=1` or use the lobby/History
  "Spectate" buttons. Spectators get public `table:state` only, never hidden
  hands, and are counted via `table:spectators`.
- **Avatar picker:** 8 human avatars are selectable in the lobby header
  (`PATCH /api/auth/me/avatar`) and persist per user.
- **Match history:** Finished games are recorded (including a player roster)
  and listed under `/history`.
