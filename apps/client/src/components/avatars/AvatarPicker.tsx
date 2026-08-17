import { HUMAN_AVATARS } from '@bidwhist/shared';
import { BotAvatar } from './BotAvatar';

interface AvatarPickerProps {
  value: string | null | undefined;
  onChange: (avatarId: string) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <div className="avatar-picker">
      {HUMAN_AVATARS.map((avatar) => (
        <button
          key={avatar.id}
          type="button"
          className={`avatar-option ${value === avatar.id ? 'avatar-option-selected' : ''}`}
          onClick={() => onChange(avatar.id)}
          aria-label={`Choose avatar ${avatar.id}`}
        >
          <BotAvatar avatarId={avatar.id} size="md" />
        </button>
      ))}
    </div>
  );
}
