import { BOT_AVATARS, HUMAN_AVATARS } from '@bidwhist/shared';

type AvatarSize = 'sm' | 'md' | 'lg';

interface BotAvatarProps {
  avatarId: string;
  username?: string;
  size?: AvatarSize;
}

export function BotAvatar({ avatarId, username, size = 'md' }: BotAvatarProps) {
  const botProfile = BOT_AVATARS.find((p) => p.id === avatarId);
  const humanProfile = HUMAN_AVATARS.find((a) => a.id === avatarId);
  const name = botProfile?.name ?? username ?? '?';
  const initials = botProfile?.initials ?? name.charAt(0).toUpperCase() ?? '?';
  const color = botProfile?.color ?? humanProfile?.color ?? '#334155';
  const secondary = botProfile?.secondaryColor ?? humanProfile?.secondaryColor ?? '#94a3b8';
  const personality = botProfile?.personality;

  return (
    <div
      className={`bot-avatar bot-avatar-${size}`}
      title={personality ? `${name} — ${personality}` : name}
      style={{ background: `radial-gradient(circle at 30% 30%, ${secondary}, ${color})` }}
    >
      <span className="bot-avatar-initials">{initials}</span>
      {personality && <span className="bot-avatar-badge">{personality}</span>}
    </div>
  );
}
