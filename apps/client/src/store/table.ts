import { create } from 'zustand';
import type { Bid, BidDenomination, Card, ChatMessagePayload, TableState } from '@bidwhist/shared';

interface TableStore {
  state: TableState | null;
  hand: Card[];
  chat: ChatMessagePayload[];
  bidDraft: { tricks: number; denomination: BidDenomination } | null;
  discardSelection: string[];
  spectatorCount: number;
  setState: (state: TableState) => void;
  setHand: (hand: Card[]) => void;
  addChat: (message: ChatMessagePayload) => void;
  setBidDraft: (draft: { tricks: number; denomination: BidDenomination } | null) => void;
  toggleDiscard: (cardId: string) => void;
  clearDiscardSelection: () => void;
  setSpectatorCount: (count: number) => void;
  reset: () => void;
}

export const useTable = create<TableStore>((set) => ({
  state: null,
  hand: [],
  chat: [],
  bidDraft: { tricks: 7, denomination: 'C' },
  discardSelection: [],
  spectatorCount: 0,

  setState: (state) => set({ state }),
  setHand: (hand) => set({ hand }),
  addChat: (message) =>
    set((s) => ({ chat: [...s.chat.slice(-199), message] })),
  setBidDraft: (bidDraft) => set({ bidDraft }),
  toggleDiscard: (cardId) =>
    set((s) => ({
      discardSelection: s.discardSelection.includes(cardId)
        ? s.discardSelection.filter((id) => id !== cardId)
        : [...s.discardSelection, cardId],
    })),
  clearDiscardSelection: () => set({ discardSelection: [] }),
  setSpectatorCount: (count) => set({ spectatorCount: count }),
  reset: () => set({ state: null, hand: [], chat: [], discardSelection: [], spectatorCount: 0 }),
}));

export type { Bid };
