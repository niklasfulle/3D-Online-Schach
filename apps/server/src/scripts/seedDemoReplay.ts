import { randomBytes } from 'node:crypto';

import { hashPassword } from '../auth/AuthService.js';
import { prisma } from '../db/client.js';
import { GameManager } from '../game/GameManager.js';
import { PrismaHistoryProvider } from '../history/HistoryService.js';
import { PrismaGamePersistence } from '../persistence/PrismaGamePersistence.js';

const DEMO_USERS = [
  { username: 'replay_weiss', email: 'replay-weiss@local.test' },
  { username: 'replay_schwarz', email: 'replay-schwarz@local.test' },
] as const;

const DEMO_MOVES = [
  { player: 'replay_weiss', from: 'e2', to: 'e4', delayMs: 2_500 },
  { player: 'replay_schwarz', from: 'e7', to: 'e5', delayMs: 1_800 },
  { player: 'replay_weiss', from: 'f1', to: 'c4', delayMs: 3_200 },
  { player: 'replay_schwarz', from: 'b8', to: 'c6', delayMs: 2_100 },
  { player: 'replay_weiss', from: 'd1', to: 'h5', delayMs: 2_700 },
  { player: 'replay_schwarz', from: 'g8', to: 'f6', delayMs: 1_600 },
  { player: 'replay_weiss', from: 'h5', to: 'f7', delayMs: 3_400 },
] as const;

async function seedDemoReplay(): Promise<void> {
  const demoPassword = randomBytes(18).toString('base64url');
  const passwordHash = await hashPassword(demoPassword);
  const users = await Promise.all(
    DEMO_USERS.map(({ username, email }) =>
      prisma.user.upsert({
        where: { username },
        create: { username, email, passwordHash, lastOnline: new Date() },
        update: { email, passwordHash, lastOnline: new Date() },
        select: { id: true, username: true },
      }),
    ),
  );

  const userIds = users.map(({ id }) => id);
  await prisma.game.deleteMany({
    where: {
      OR: [{ whitePlayerId: { in: userIds } }, { blackPlayerId: { in: userIds } }],
    },
  });

  let now = Date.now() - 25_000;
  const manager = new GameManager(() => now, new PrismaGamePersistence(prisma));
  const [whitePlayer, blackPlayer] = DEMO_USERS;
  const created = manager.createGame(whitePlayer.username, { initialMs: 5 * 60_000, incrementMs: 0 });
  manager.joinGame(created.code, blackPlayer.username);

  for (const move of DEMO_MOVES) {
    now += move.delayMs;
    manager.requestMove(created.code, move.player, { from: move.from, to: move.to });
  }
  await manager.flushPersistence();

  const replayHistory = await new PrismaHistoryProvider(prisma).listForUser(users[0].id, {
    limit: 20,
  });
  if (!replayHistory.games.some((game) => game.code === created.code)) {
    throw new Error('Demo replay was not saved to the white player history');
  }

  console.info(`Demo-Replay ${created.code} wurde erstellt.`);
  console.info(`Anmelden als ${whitePlayer.username} oder ${blackPlayer.username}.`);
  console.info(`Passwort für beide Konten: ${demoPassword}`);
}

try {
  await seedDemoReplay();
} catch (error: unknown) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
