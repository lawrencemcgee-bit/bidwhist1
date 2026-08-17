import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const password = await bcrypt.hash('bidwhist-demo', 10);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@bidwhist.local' },
    update: {},
    create: { email: 'demo@bidwhist.local', username: 'DemoPlayer', password, avatarId: 'human-blue' },
  });

  const existing = await prisma.table.findFirst({ where: { name: 'Green Felt 1' } });
  if (!existing) {
    await prisma.table.create({
      data: {
        name: 'Green Felt 1',
        ownerId: demo.id,
        players: {
          create: [
            { userId: demo.id, seatIndex: 0, avatarId: 'human-blue' },
            { isBot: true, seatIndex: 1, botProfile: 'mia-witty', avatarId: 'bot-mia' },
            { isBot: true, seatIndex: 2, botProfile: 'ray-analytical', avatarId: 'bot-ray' },
            { isBot: true, seatIndex: 3, botProfile: 'omar-unpredictable', avatarId: 'bot-omar' },
          ],
        },
      },
    });
  }

  console.log('Seed complete. Demo login: demo@bidwhist.local / bidwhist-demo');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
