import type { TableSummary } from '@bidwhist/shared';
import type { Table } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import type { CreateTableInput } from './lobby.validators.js';

type TableWithPlayers = Table & {
  players: Array<{ isBot: boolean }>;
};

function toSummary(row: TableWithPlayers): TableSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status as TableSummary['status'],
    maxPlayers: row.maxPlayers,
    ownerId: row.ownerId,
    playerCount: row.players.length,
    botCount: row.players.filter((p) => p.isBot).length,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listTables(): Promise<TableSummary[]> {
  const rows = await prisma.table.findMany({
    orderBy: { createdAt: 'desc' },
    include: { players: { select: { isBot: true } } },
  });
  return rows.map(toSummary);
}

export async function createTable(ownerId: string, input: CreateTableInput): Promise<TableSummary> {
  const row = await prisma.table.create({
    data: { name: input.name, ownerId },
    include: { players: { select: { isBot: true } } },
  });
  return toSummary(row);
}

export async function getTable(id: string): Promise<TableSummary> {
  const row = await prisma.table.findUnique({
    where: { id },
    include: { players: { select: { isBot: true } } },
  });
  if (!row) {
    throw new HttpError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }
  return toSummary(row);
}

export async function deleteTable(id: string, actorId: string): Promise<void> {
  const row = await prisma.table.findUnique({ where: { id } });
  if (!row) {
    throw new HttpError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }
  if (row.ownerId !== actorId) {
    throw new HttpError(403, 'FORBIDDEN', 'Only the table owner can delete it');
  }
  await prisma.table.delete({ where: { id } });
}
