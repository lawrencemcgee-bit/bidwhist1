import type { AchievementDto } from '@bidwhist/shared';
import { ACHIEVEMENTS } from '@bidwhist/shared';
import { prisma } from '../../lib/prisma.js';

export async function listAchievements(userId: string): Promise<AchievementDto[]> {
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    select: { achievementId: true, unlockedAt: true },
  });
  const unlockedMap = new Map(unlocked.map((u) => [u.achievementId, u.unlockedAt]));

  return ACHIEVEMENTS.map((def) => {
    const unlockedAt = unlockedMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      description: def.description,
      unlockedAt: unlockedAt ? unlockedAt.toISOString() : null,
    };
  });
}
