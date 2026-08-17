# Real-Time Event Catalog

Socket.IO transports: default (polling + websocket upgrade). All names are
namespaced strings under the root namespace. Every event below uses a
versioned payload type from `packages/shared/src/events.ts`.

## Handshake

- Client connects with `auth: { token: <jwt> }`.
- Server rejects the connection (`connect_error`) when the token is missing or
  invalid.

## Client -> Server

| Event | Payload | Auth | Notes |
| ----- | ------- | ---- | ----- |
| `table:join` | `{ tableId, preferredSeat?, avatarId? }` | user | Joins room `table:<id>`, binds socket to the user's seat (reconnect resumes the seat and ends any bot takeover). |
| `table:spectate` | `{ tableId }` | user | Joins room `table:<id>` as a spectator; receives public state only. |
| `table:leave` | `{ tableId }` | user | Leaves table / stops spectating; frees seat if game has not started. |
| `table:bot:add` | `{ tableId }` | user (owner) | Fills the next empty seat with a bot. |
| `table:bot:remove` | `{ tableId, seat }` | user (owner) | Removes a bot from an empty seat. |
| `game:start` | `{ tableId }` | user (owner) | Starts the game; requires exactly 4 seated players. |
| `bid:action` | `{ tableId, type: 'pass' } \| { tableId, type: 'bid', bid: { tricks, denomination } }` | user | Server-authoritative bid/pass for the current bidder. |
| `discard:cards` | `{ tableId, cardIds: string[] }` | user | Discard 2 cards (declarer or partner during kitty resolution). |
| `play:card` | `{ tableId, cardId }` | user | Play a card from hand. |
| `chat:send` | `{ tableId, text }` | user | Broadcast a chat line to the table. |

## Server -> Client

Broadcast events go to every socket in the table room. `table:state` and
`table:private` are personalized per seat.

| Event | Payload | Audience | Trigger |
| ----- | ------- | -------- | ------- |
| `table:state` | `TableState` (public view, includes `spectators`) | seat + room + spectators | Initial snapshot, seat/status changes, every game transition. |
| `table:private` | `{ hand: Card[] }` | specific seat | Your hidden hand after a deal or kitty resolution. Emitted again to a reconnecting owner socket. |
| `table:player-joined` | `PlayerSnapshot` | room | A human or bot occupied a seat. |
| `table:player-left` | `{ seat }` | room | A human disconnected (a bot may take over). |
| `player:away` | `{ seat, botProfileId }` | room | A disconnected human's seat was taken over by a bot. |
| `player:back` | `{ seat }` | room | A human reconnected and regained their seat. |
| `table:spectators` | `{ count }` | room | Spectator count changed. |
| `game:started` | `{ tableId }` | room | Owner started the game. |
| `game:deal` | `{ handNumber, dealerSeat, kittyCount }` | room | New hand dealt (cards dealt privately via `table:private`). |
| `bid:started` | `{ currentBidder }` | room | Bidding opens for a hand. |
| `bid:turn` | `{ seat }` | room | It is `seat`'s turn to bid. |
| `bid:made` | `{ seat, bid }` | room | A legal bid was accepted. |
| `bid:passed` | `{ seat }` | room | A pass was accepted. |
| `bid:ended` | `{ declarerSeat, bid, trump }` | room | Auction resolved. |
| `discard:turn` | `{ seat, kittyReveal }` | room | Declarer (kittyReveal) or partner must discard 2. |
| `discard:made` | `{ seat, cardIds, passedToSeat? }` | room | Discards were accepted. |
| `play:turn` | `{ seat }` | room | It is `seat`'s turn to play. |
| `card:played` | `PlayedCard` | room | A card hit the felt. |
| `trick:won` | `{ winnerSeat, trickNumber, cards }` | room | A trick was resolved. |
| `hand:ended` | `HandEndedPayload` | room | Hand scores were tallied. |
| `game:ended` | `{ winnerPartnership, scores }` | room | A partnership reached 7 points. |
| `chat:message` | `{ seat, username, avatarId, text, at }` | room | Human or bot chat line (`seat` is `null` for spectators). |
| `action:error` | `{ code, message }` | specific socket | A client action was rejected with a reason. |

## Disconnect / Reconnect / Spectating

- On socket disconnect, a human seat is marked disconnected; if the game is in
  progress and `AUTO_BOT_TAKEOVER` is enabled, a deterministic bot takes over
  the seat (`player:away`). Reconnecting the same user resumes the seat, stops
  the bot, and re-emits `table:private` for the current hand.
- Spectators receive `table:state` and `table:spectators` but never
  `table:private`. Spectators may chat (their `seat` is `null`).
- A socket that joins as a spectator and later joins the seat is removed from
  the spectator set.

## Security Notes

- Hidden cards are never part of `table:state`; they travel only in
  `table:private`, emitted to the owning socket only.
- The server rejects any action from a socket whose seat does not match the
  current actor (bidder / trick leader / discarder).
- Kitty contents are only revealed to the declarer at kitty resolution.
- Takeover bot actions are validated by the engine exactly like human actions;
  a bot never receives another player's hidden hand.
