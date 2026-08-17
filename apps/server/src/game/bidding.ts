import { isLegalBid as sharedIsLegalBid, type Bid } from '@bidwhist/shared';
import type { SeatIndex } from './types.js';

export { sharedIsLegalBid as isLegalBid };

export function nextSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 1) % 4) as SeatIndex;
}

export function openBidder(dealerSeat: SeatIndex): SeatIndex {
  return nextSeat(dealerSeat);
}

export function partnershipOf(seat: SeatIndex): 0 | 1 {
  return (seat % 2) as 0 | 1;
}

export function partnerSeat(seat: SeatIndex): SeatIndex {
  return ((seat + 2) % 4) as SeatIndex;
}

export function seatsOfPartnership(partnership: 0 | 1): [SeatIndex, SeatIndex] {
  return partnership === 0 ? [0, 2] : [1, 3];
}

export type { Bid };
