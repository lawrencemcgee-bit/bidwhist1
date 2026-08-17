import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BID_DENOMINATIONS,
  CLIENT_EVENTS,
  DENOM_LABEL,
  MAX_BID,
  MIN_BID,
  SERVER_EVENTS,
  isJoker,
  rankValue,
  type ActionErrorPayload,
  type BidDenomination,
  type Card,
  type ChatMessagePayload,
  type PrivateHandPayload,
  type SeatIndex,
  type SpectatorCountPayload,
  type TableState,
} from '@bidwhist/shared';
import { useAuth } from '../store/auth';
import { useTable } from '../store/table';
import { useSocket } from '../hooks/useSocket';
import { useSounds } from '../components/sound/SoundProvider';
import { FeltTable } from '../components/table/FeltTable';
import { PlayingCard } from '../components/cards/PlayingCard';
import { BotAvatar } from '../components/avatars/BotAvatar';

const SUIT_ORDER: Record<string, number> = { S: 0, H: 1, D: 2, C: 3, J: 4 };

function sortHand(hand: Card[]): Card[] {
  return [...hand].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    if (isJoker(a) || isJoker(b)) {
      return a.rank === 'BIG' ? 1 : -1;
    }
    return rankValue(a.rank as never) - rankValue(b.rank as never);
  });
}

export function TablePage() {
  const { tableId = '' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuth((s) => s.user);
  const socket = useSocket();
  const sounds = useSounds();
  const soundsRef = useRef(sounds);
  soundsRef.current = sounds;

  const state = useTable((s) => s.state);
  const hand = useTable((s) => s.hand);
  const chat = useTable((s) => s.chat);
  const bidDraft = useTable((s) => s.bidDraft);
  const discardSelection = useTable((s) => s.discardSelection);
  const spectatorCount = useTable((s) => s.spectatorCount);
  const setState = useTable((s) => s.setState);
  const setHand = useTable((s) => s.setHand);
  const addChat = useTable((s) => s.addChat);
  const setBidDraft = useTable((s) => s.setBidDraft);
  const toggleDiscard = useTable((s) => s.toggleDiscard);
  const clearDiscardSelection = useTable((s) => s.clearDiscardSelection);
  const setSpectatorCount = useTable((s) => s.setSpectatorCount);
  const reset = useTable((s) => s.reset);

  const isSpectating = searchParams.get('spectate') === '1';

  const [error, setError] = useState<string | null>(null);
  const [chatText, setChatText] = useState('');

  useEffect(() => reset, [reset]);

  useEffect(() => {
    if (!socket || !tableId) return;
    if (isSpectating) {
      socket.emit(CLIENT_EVENTS.tableSpectate, { tableId });
    } else {
      socket.emit(CLIENT_EVENTS.tableJoin, { tableId, avatarId: user?.avatarId ?? undefined });
    }

    const onState = (s: TableState) => setState(s);
    const onPrivate = (p: PrivateHandPayload) => setHand(p.hand);
    const onChat = (m: ChatMessagePayload) => addChat(m);
    const onError = (e: ActionErrorPayload) => setError(e.message);
    const onDeal = () => soundsRef.current.playShuffle();
    const onCardPlayed = () => soundsRef.current.playPlacement();
    const onTrickWon = () => soundsRef.current.playTrickWin();
    const onBid = () => soundsRef.current.playBid();
    const onSpectators = (p: SpectatorCountPayload) => setSpectatorCount(p.count);

    socket.on(SERVER_EVENTS.tableState, onState);
    socket.on(SERVER_EVENTS.tablePrivate, onPrivate);
    socket.on(SERVER_EVENTS.chatMessage, onChat);
    socket.on(SERVER_EVENTS.actionError, onError);
    socket.on(SERVER_EVENTS.gameDeal, onDeal);
    socket.on(SERVER_EVENTS.cardPlayed, onCardPlayed);
    socket.on(SERVER_EVENTS.trickWon, onTrickWon);
    socket.on(SERVER_EVENTS.bidMade, onBid);
    socket.on(SERVER_EVENTS.bidPassed, onBid);
    socket.on(SERVER_EVENTS.spectatorCount, onSpectators);

    return () => {
      socket.emit(CLIENT_EVENTS.tableLeave, { tableId });
      socket.off(SERVER_EVENTS.tableState, onState);
      socket.off(SERVER_EVENTS.tablePrivate, onPrivate);
      socket.off(SERVER_EVENTS.chatMessage, onChat);
      socket.off(SERVER_EVENTS.actionError, onError);
      socket.off(SERVER_EVENTS.gameDeal, onDeal);
      socket.off(SERVER_EVENTS.cardPlayed, onCardPlayed);
      socket.off(SERVER_EVENTS.trickWon, onTrickWon);
      socket.off(SERVER_EVENTS.bidMade, onBid);
      socket.off(SERVER_EVENTS.bidPassed, onBid);
      socket.off(SERVER_EVENTS.spectatorCount, onSpectators);
    };
  }, [socket, tableId, setState, setHand, addChat, reset, isSpectating, user?.avatarId, setSpectatorCount]);

  const mySeat = useMemo<SeatIndex | null>(() => {
    if (isSpectating || !state || !user) return null;
    const index = state.players.findIndex((p) => p?.userId === user.id);
    return index === -1 ? null : (index as SeatIndex);
  }, [state, user, isSpectating]);

  const sortedHand = useMemo(() => sortHand(hand), [hand]);

  const phase = state?.phase ?? 'WAITING';
  const isOwner = state?.ownerId === user?.id;
  const isAway = mySeat !== null && state?.players[mySeat]?.away === true;

  const myBidTurn =
    phase === 'BIDDING' && mySeat !== null && state?.currentBidder === mySeat && !isAway;
  const myDiscardTurn =
    phase === 'DISCARDING' && mySeat !== null && state?.currentDiscarder === mySeat && !isAway;
  const myPlayTurn =
    phase === 'PLAYING' && mySeat !== null && state?.currentPlayer === mySeat && !isAway;

  const leadSuit = useMemo(() => {
    const lead = state?.currentTrick[0];
    if (!lead) return null;
    return isJoker(lead.card) ? null : lead.card.suit;
  }, [state?.currentTrick]);

  const isLegalPlay = (card: Card): boolean => {
    if (!myPlayTurn) return false;
    if (leadSuit === null) return true;
    const follows = hand.some((c) => c.suit === leadSuit);
    return !follows || card.suit === leadSuit;
  };

  const emit = (event: string, payload: Record<string, unknown>) => socket?.emit(event, { tableId, ...payload });

  const submitBid = () => {
    if (!bidDraft || !socket) return;
    socket.emit(CLIENT_EVENTS.bidAction, {
      tableId,
      type: 'bid',
      bid: { tricks: bidDraft.tricks, denomination: bidDraft.denomination },
    });
  };

  const passBid = () => emit(CLIENT_EVENTS.bidAction, { type: 'pass' });

  const confirmDiscard = () => {
    if (discardSelection.length !== 2) return;
    emit(CLIENT_EVENTS.discardCards, { cardIds: discardSelection });
    clearDiscardSelection();
  };

  const sendChat = (e: FormEvent) => {
    e.preventDefault();
    const text = chatText.trim();
    if (!text) return;
    emit(CLIENT_EVENTS.chatSend, { text });
    setChatText('');
  };

  const seatedCount = state?.players.filter(Boolean).length ?? 0;

  return (
    <div className="table-page">
      <div className="table-layout">
        <div className="table-main">
          <header className="table-header">
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              Lobby
            </button>
            <h2>{state?.name ?? 'Table'}</h2>
            <span className="table-status">{state?.status}</span>
            {isSpectating && <span className="spectator-badge">spectating</span>}
            {spectatorCount > 0 && <span className="spectator-count">{spectatorCount} watching</span>}
          </header>

          {state && <FeltTable state={state} mySeat={mySeat} />}

          {error && <p className="form-error">{error}</p>}

          {isSpectating && (
            <div className="pre-game-panel">
              <p>You are spectating this table.</p>
              <button className="btn btn-primary" onClick={() => navigate(`/table/${tableId}`)}>
                Join this table
              </button>
            </div>
          )}

          {isAway && (
            <div className="away-banner">
              A bot is holding your seat. Reconnect your browser tab to take back control.
            </div>
          )}

          {phase === 'WAITING' && state && !isSpectating && (
            <div className="pre-game-panel">
              <p>{seatedCount}/4 seated</p>
              {isOwner && (
                <div className="pre-game-actions">
                  <button className="btn btn-secondary" onClick={() => emit(CLIENT_EVENTS.botAdd, {})}>
                    Add bot
                  </button>
                  <button
                    className="btn btn-primary"
                    disabled={seatedCount !== 4}
                    onClick={() => emit(CLIENT_EVENTS.gameStart, {})}
                  >
                    Start game
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'BIDDING' && state?.highestBid && (
            <p className="status-line">
              High bid: {state.highestBid.tricks} {DENOM_LABEL[state.highestBid.denomination]}
            </p>
          )}

          {myBidTurn && bidDraft && !isSpectating && (
            <div className="bid-panel">
              <div className="bid-tricks">
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setBidDraft({ ...bidDraft, tricks: Math.max(MIN_BID, bidDraft.tricks - 1) })
                  }
                >
                  -
                </button>
                <span className="bid-tricks-value">{bidDraft.tricks}</span>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    setBidDraft({ ...bidDraft, tricks: Math.min(MAX_BID, bidDraft.tricks + 1) })
                  }
                >
                  +
                </button>
              </div>
              <select
                value={bidDraft.denomination}
                onChange={(e) =>
                  setBidDraft({ ...bidDraft, denomination: e.target.value as BidDenomination })
                }
              >
                {BID_DENOMINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DENOM_LABEL[d]}
                  </option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={submitBid}>
                Bid
              </button>
              <button className="btn btn-ghost" onClick={passBid}>
                Pass
              </button>
            </div>
          )}

          {!isSpectating && (
            <div className="hand-row">
              {phase !== 'WAITING' &&
                sortedHand.map((card) => {
                  const canPlay = isLegalPlay(card);
                  const isDiscarding = myDiscardTurn;
                  const selected = discardSelection.includes(card.id);
                  return (
                    <PlayingCard
                      key={card.id}
                      card={card}
                      selected={selected}
                      disabled={!canPlay && !isDiscarding}
                      onClick={
                        isDiscarding
                          ? () => toggleDiscard(card.id)
                          : canPlay
                            ? () => emit(CLIENT_EVENTS.playCard, { cardId: card.id })
                            : undefined
                      }
                    />
                  );
                })}
              {phase === 'WAITING' && <p className="status-line">Waiting for players…</p>}
            </div>
          )}

          {myDiscardTurn && !isSpectating && (
            <div className="discard-panel">
              <p>
                Discard {discardSelection.length}/2 cards
                {discardSelection.length > 0 && ' — passed to your partner'}
              </p>
              <button
                className="btn btn-primary"
                disabled={discardSelection.length !== 2}
                onClick={confirmDiscard}
              >
                Confirm discard
              </button>
            </div>
          )}
        </div>

        <aside className="chat-panel">
          <h3>Table talk</h3>
          <ul className="chat-list">
            {chat.map((m, i) => (
              <li key={i} className="chat-line">
                <BotAvatar avatarId={m.avatarId} username={m.username} size="sm" />
                <div className="chat-body">
                  <span className="chat-name">{m.username}</span>
                  <span className="chat-text">{m.text}</span>
                </div>
              </li>
            ))}
          </ul>
          <form className="chat-form" onSubmit={sendChat}>
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              maxLength={280}
              placeholder="Say something nice…"
            />
            <button type="submit" className="btn btn-secondary">
              Send
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
