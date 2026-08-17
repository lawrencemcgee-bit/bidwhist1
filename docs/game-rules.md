# Classic Partnership Bid Whist — Fixed Ruleset

This document is the single source of truth for the server-authoritative game
engine. The engine implements exactly these rules and nothing else.

## Overview

- 4 players, 2 partnerships. Partners sit opposite each other (seats 0-2 and 1-3).
- 54-card deck: 52 standard cards + 2 Jokers.
- Each player is dealt **13 cards**; the remaining **2 cards** form the kitty.
- Auction ("bidding"), then trick play, then partnership scoring.
- First partnership to **7 points** wins the game.

## Deck and Cards

- Suits: clubs (C), diamonds (D), hearts (H), spades (S).
- Ranks: 2..10, J, Q, K, A (Ace high).
- Two Jokers: `BIG` and `LITTLE`.
- A Joker's "suit" is dynamic:
  - When a suit is trump, Jokers belong to the trump suit and are the two
    highest trumps (BIG above LITTLE).
  - In no-trump, Jokers are the two highest cards overall and have no suit.

## Dealing

- Dealer rotates clockwise (seat `+1`) after every hand.
- 54 cards are shuffled; each seat receives 13 cards; 2 cards go to the kitty
  facedown. Kitty contents are hidden until bidding ends.

## Bidding

- Opening bidder is the player to the left of the dealer.
- Bids specify how many tricks the partnership will take: **7 to 13**, plus a
  denomination: clubs, diamonds, hearts, spades, or no-trump.
- Denomination ladder (low to high): clubs, diamonds, hearts, spades, no-trump.
- A bid must either name more tricks, or the same tricks in a higher
  denomination. Passing is always allowed.
- If all four players pass, the hand is thrown in and redealt with the same
  dealer.
- Bidding ends after a bid is followed by three consecutive passes. The last
  bidder is the **declarer**, and the final bid's denomination becomes the
  trump suit (or no-trump).

## Kitty Resolution

- The declarer takes the 2 kitty cards into hand (now 15 cards).
- The declarer discards 2 cards facedown; those 2 cards are passed to the
  declarer's partner.
- The partner adds the 2 passed cards to hand (now 15 cards) and discards 2
  cards facedown. The partner's discards leave play.
- Every player now holds 13 cards for trick play.

## Trick Play

- The player to the left of the declarer leads the first trick.
- Each trick is 4 cards played clockwise. Players must follow suit when able;
  a Joker has no suit to follow, so any card is legal after a Joker lead.
- A trick is won by the highest trump played, or by the highest card of the
  lead suit when no trump was played. Jokers outrank aces.
- The trick winner leads the next trick. Trick 13 ends the hand.

## Scoring

- The declarer's partnership **makes** its bid if it takes at least the bid
  number of tricks.
- If made: the declarer's partnership scores `tricksTaken - 6` points.
- If set: the defending partnership scores `itsTricksTaken - 6` points.
- The first partnership to reach **7** points wins the game. If a hand would
  push a partnership past 7, the game ends immediately at 7.

## Engine Decisions (documented)

- With 13-card hands and Jokers included, the 54-card deck leaves a **2-card
  kitty**; the kitty-discard flow above is the chosen variant.
- In no-trump, a Joker lead creates a suit of "no suit": followers may play any
  card, and Jokers still rank as the two highest cards.
- Games run continuously: a completed hand automatically starts the next hand
  with the rotated dealer, until a partnership reaches 7 points.
