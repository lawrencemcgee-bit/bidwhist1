import 'dotenv/config';

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

export const config = {
  port: intEnv('PORT', 4000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://bidwhist:bidwhist@localhost:5432/bidwhist?schema=public',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  botMinDelayMs: intEnv('BOT_MIN_DELAY_MS', 400),
  botMaxDelayMs: intEnv('BOT_MAX_DELAY_MS', 1200),
  autoBotTakeover: boolEnv('AUTO_BOT_TAKEOVER', true),
} as const;
