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
| `apps/server/src/bots/` | Avatars, personalities, chat lines, hand-pattern bidding, defensive trumping strategy |
| `apps/server/src/modules/auth/` | Register / login / logout / me / avatar (JWT) |
| `apps/server/src/modules/lobby/` | Table REST endpoints |
| `apps/server/src/modules/history/` | Persisted match history + replay log REST endpoints |
| `apps/server/src/modules/ladder/` | Ranked ladder (ELO-style rating) REST endpoints |
| `apps/server/src/modules/achievements/` | Achievement catalog + unlock status REST endpoint |
| `apps/server/src/modules/results/` | Game-end stats: rating updates + achievement unlock logic |
| `apps/server/src/lib/rating.ts` | ELO-style rating math (expected score, update) |
| `apps/server/src/socket/` | Socket.IO auth + event wiring |
| `apps/server/prisma/` | Schema, migrations, seed |

### Client module map

| Path | Purpose |
| ---- | ------- |
| `apps/client/src/pages/TablePage.tsx` | Live table: felt, hand, bidding, discarding, chat, spectator mode |
| `apps/client/src/pages/LobbyPage.tsx` | Table list, create table, avatar picker, spectate links, rating |
| `apps/client/src/pages/HistoryPage.tsx` | Persisted match history with replay + spectate links |
| `apps/client/src/pages/LadderPage.tsx` | Ranked ladder leaderboard |
| `apps/client/src/pages/AchievementsPage.tsx` | Achievement catalog with unlock status |
| `apps/client/src/pages/ReplayPage.tsx` | Step-through match replay viewer |
| `apps/client/src/components/table/FeltTable.tsx` | Felt table with seats, center trick, kitty indicator |
| `apps/client/src/components/table/Seat.tsx` | Seat badge: avatar, score, cards, dealer label, away state |
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
npm run test        # vitest (deck, evaluator, bidding, scoring, engine simulation, strategy, rating, game results, socket e2e)
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
2. **Phase 2:** Reconnect/resume with automatic bot takeover, persisted
   match history UI, human avatar picker, table spectating.
3. **Phase 3:** Bidding polish (bid history panel, dealer/kitty indicators),
   richer bot strategy (hand patterns, defensive trumping), end-to-end tests.
4. **Phase 4 (this):** Match replay, achievements, ranked ladder.

### Phase 4 notes

- **Match replay:** The engine records a full action log (`deal` with all four
  hands + kitty, bids, discards, plays, trick winners, hand results). Finished
  games persist this log on `GameRecord.replay`, served at
  `GET /api/history/:id/replay` and rendered by a step-through viewer at
  `/replay/:id` with play/pause, step, and speed controls.
- **Achievements:** 8 achievements (`first-game`, `games-10`, `games-50`,
  `first-win`, `wins-10`, `big-bid`, `fast-start`, `shutout`) are tracked on
  game end and stored in `UserAchievement`. The catalog + unlock status is
  served at `GET /api/achievements` and shown at `/achievements`.
- **Ranked ladder:** Every finished game updates each human player's rating
  (ELO-style, K=24, starting 1200) plus `gamesPlayed`/`wins` counters on
  `User`. `GET /api/ladder` returns the leaderboard, `/ladder` renders it,
  and the lobby header shows your current rating.
- **Server-authoritative scoring:** rating and achievement updates run in
  `apps/server/src/modules/results/gameResults.service.ts`, invoked after a
  game finishes, and are idempotent (achievements never double-unlock).

### Phase 3 notes

- **Bid history panel:** `TableState` now carries the per-hand auction log
  (`biddingHistory`), rendered as an "Auction" panel while bidding is open.
- **Dealer / kitty indicators:** seats show a "dealer" badge, and the felt
  shows a face-down 2-card kitty during the auction (hidden until the declarer
  picks it up).
- **Bot strategy:** bidding evaluates hand patterns (trump length, voids,
  singletons, doubletons, honor concentration, NT long suits / stoppers) via
  `analyzeHand`, and play decides defensive ruffs by personality, trump
  richness, and trick number — cautious bots preserve trumps early.
- **End-to-end test:** `src/e2e/fullGame.socket.test.ts` boots the real HTTP +
  Socket.IO server against an in-memory Prisma mock, plays a full game over
  the wire with one auto-driven human and three live bots, and asserts the
  public state (finished, bidding history, dealer, kitty, >1 tricks).

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
