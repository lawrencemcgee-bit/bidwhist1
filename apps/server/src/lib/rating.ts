export const STARTING_RATING = 1200;
export const RATING_K = 24;

export function expectedScore(rating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - rating) / 400));
}

export function eloUpdate(rating: number, expected: number, score: number, k = RATING_K): number {
  return Math.round(rating + k * (score - expected));
}
