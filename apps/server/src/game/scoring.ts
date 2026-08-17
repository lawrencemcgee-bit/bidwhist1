import type { Bid, HandEndedResult, Trump } from '@bidwhist/shared';
import { SCORING_BASE, WINNING_SCORE } from '@bidwhist/shared';
import { partnershipOf, partnerSeat, seatsOfPartnership } from './bidding.js';
import type { SeatIndex } from './types.js';

export interface HandScoringInput {
  declarerSeat: SeatIndex;
  bid: Bid;
  trump: Trump;
  tricksPerSeat: [number, number, number, number];
  currentScores: [number, number, number, number];
}

export function scoreHand(input: HandScoringInput): HandEndedResult {
  const makerPartnership = partnershipOf(input.declarerSeat);
  const makerSeats = seatsOfPartnership(makerPartnership);
  const makerTricks = makerSeats.reduce<number>((sum, seat) => sum + input.tricksPerSeat[seat], 0);
  const made = makerTricks >= input.bid.tricks;
  const scorerPartnership = made ? makerPartnership : ((1 - makerPartnership) as 0 | 1);
  const scorerSeats = seatsOfPartnership(scorerPartnership);
  const scorerTricks = scorerSeats.reduce<number>((sum, seat) => sum + input.tricksPerSeat[seat], 0);
  const points = Math.max(0, scorerTricks - SCORING_BASE);

  const pointsPerSeat = [0, 0, 0, 0] as [number, number, number, number];
  for (const seat of scorerSeats) {
    pointsPerSeat[seat] = points;
  }

  const scores = input.currentScores.map((score, seat) =>
    Math.min(WINNING_SCORE, score + pointsPerSeat[seat as SeatIndex]),
  ) as [number, number, number, number];

  const winnerPartnership: 0 | 1 | null = scores[scorerPartnership] >= WINNING_SCORE ? scorerPartnership : null;

  return {
    declarerSeat: input.declarerSeat,
    bid: input.bid,
    trump: input.trump,
    tricksPerSeat: input.tricksPerSeat,
    made,
    pointsPerSeat,
    scores,
    winnerPartnership,
  };
}

export { partnerSeat, SCORING_BASE };
