import { cardLabel, isJoker, type Card } from '@bidwhist/shared';

interface PlayingCardProps {
  card: Card;
  faceDown?: boolean;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  onClick?: () => void;
}

export function PlayingCard({ card, faceDown = false, selected = false, disabled = false, small = false, onClick }: PlayingCardProps) {
  const red = card.suit === 'H' || card.suit === 'D';
  const classes = [
    'playing-card',
    red ? 'card-red' : 'card-black',
    small ? 'playing-card-small' : '',
    selected ? 'is-selected' : '',
    onClick && !disabled ? 'is-playable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (faceDown) {
    return <div className={`${classes} card-face-down`} />;
  }

  const rank = isJoker(card) ? (card.rank === 'BIG' ? '★' : '☆') : card.rank;

  return (
    <button
      type="button"
      className={classes}
      onClick={onClick}
      disabled={disabled}
      aria-label={cardLabel(card)}
    >
      <span className="card-corner card-corner-top">{rank}</span>
      <span className="card-pip">{cardLabel(card)}</span>
      <span className="card-corner card-corner-bottom">{rank}</span>
    </button>
  );
}
