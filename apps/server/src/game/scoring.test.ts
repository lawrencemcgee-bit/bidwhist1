import { describe, expect, it } from 'vitest';
import { scoreHand } from './scoring.js';
import type { SeatIndex } from './types.js';

const score = (
  declarerSeat: SeatIndex,
  bidTricks: number,
  tricksPerSeat: [number, number, number, number],
  currentScores: [number, number, number, number] = [0, 0, 0, 0],
) =>
  scoreHand({
    declarerSeat,
    bid: { tricks: bidTricks, denomination: 'S' },
    trump: 'S',
    tricksPerSeat,
    currentScores,
  });

describe('scoring', () => {
  it('maker scores tricks over 6 when the bid is made', () => {
    const result = score(0, 7, [4, 3, 3, 3]);
    expect(result.made).toBe(true);
    expect(result.pointsPerSeat).toEqual([1, 0, 1, 0]);
    expect(result.scores).toEqual([1, 0, 1, 0]);
  });

  it('defenders score when the bid is set', () => {
    const result = score(0, 9, [2, 5, 2, 4]);
    expect(result.made).toBe(false);
    expect(result.pointsPerSeat).toEqual([0, 3, 0, 3]);
  });

  it('a 13 trick contract is worth 7 points and ends the game', () => {
    const result = score(1, 13, [0, 7, 0, 6]);
    expect(result.made).toBe(true);
    expect(result.pointsPerSeat[1]).toBe(7);
    expect(result.winnerPartnership).toBe(1);
  });

  it('caps cumulative scores at 7', () => {
    const result = score(0, 7, [4, 3, 3, 3], [6, 0, 6, 0]);
    expect(result.scores).toEqual([7, 0, 7, 0]);
    expect(result.winnerPartnership).toBe(0);
  });

  it('no winner below 7 points', () => {
    const result = score(0, 7, [4, 3, 3, 3], [5, 4, 5, 4]);
    expect(result.winnerPartnership).toBeNull();
  });
});
