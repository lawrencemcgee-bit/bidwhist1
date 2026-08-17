import { describe, expect, it } from 'vitest';
import { isLegalBid } from '@bidwhist/shared';
import { nextSeat, openBidder, partnerSeat, partnershipOf } from './bidding.js';
import type { SeatIndex } from './types.js';

describe('bidding helpers', () => {
  it('isLegalBid enforces the trick ladder', () => {
    expect(isLegalBid(null, { tricks: 7, denomination: 'C' })).toBe(true);
    expect(isLegalBid({ tricks: 7, denomination: 'C' }, { tricks: 8, denomination: 'C' })).toBe(true);
    expect(isLegalBid({ tricks: 7, denomination: 'C' }, { tricks: 7, denomination: 'D' })).toBe(true);
    expect(isLegalBid({ tricks: 7, denomination: 'D' }, { tricks: 7, denomination: 'C' })).toBe(false);
    expect(isLegalBid({ tricks: 7, denomination: 'NT' }, { tricks: 7, denomination: 'S' })).toBe(false);
    expect(isLegalBid({ tricks: 9, denomination: 'C' }, { tricks: 8, denomination: 'NT' })).toBe(false);
    expect(isLegalBid(null, { tricks: 6, denomination: 'NT' })).toBe(false);
    expect(isLegalBid(null, { tricks: 14, denomination: 'NT' })).toBe(false);
  });

  it('rotates seats clockwise', () => {
    expect(nextSeat(0)).toBe(1);
    expect(nextSeat(3)).toBe(0);
  });

  it('opening bidder is left of the dealer', () => {
    expect(openBidder(2)).toBe(3);
    expect(openBidder(3)).toBe(0);
  });

  it('partners sit opposite', () => {
    expect(partnerSeat(0)).toBe(2);
    expect(partnerSeat(1)).toBe(3);
    expect(partnershipOf(0 as SeatIndex)).toBe(0);
    expect(partnershipOf(2 as SeatIndex)).toBe(0);
    expect(partnershipOf(1 as SeatIndex)).toBe(1);
    expect(partnershipOf(3 as SeatIndex)).toBe(1);
  });
});
