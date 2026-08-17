import type { Server, Socket } from 'socket.io';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@bidwhist/shared';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { TableRuntime } from '../game/tableManager.js';
import { HttpError } from '../middleware/error.js';

interface RegistryEntry {
  runtime: TableRuntime;
}

export class TableRegistry {
  readonly entries = new Map<string, RegistryEntry>();

  async getOrCreate(io: Server, tableId: string): Promise<TableRuntime> {
    const existing = this.entries.get(tableId);
    if (existing) return existing.runtime;

    const row = await prisma.table.findUnique({ where: { id: tableId } });
    if (!row) {
      throw new HttpError(404, 'TABLE_NOT_FOUND', 'Table not found');
    }
    const runtime = new TableRuntime(io, row.id, row.name, row.ownerId);
    this.entries.set(tableId, { runtime });
    return runtime;
  }

  remove(tableId: string): void {
    this.entries.delete(tableId);
  }
}

function emitError(socket: Socket, err: unknown): void {
  if (err instanceof HttpError) {
    socket.emit(SERVER_EVENTS.actionError, { code: err.code, message: err.message });
    return;
  }
  console.error(err);
  socket.emit(SERVER_EVENTS.actionError, { code: 'INTERNAL', message: 'Internal server error' });
}

async function guard(socket: Socket, fn: () => Promise<void> | void): Promise<void> {
  try {
    await fn();
  } catch (err) {
    emitError(socket, err);
  }
}

export function configureSocket(io: Server): void {
  const registry = new TableRegistry();

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (typeof token !== 'string' || token.length === 0) {
      next(new Error('UNAUTHORIZED'));
      return;
    }
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { sub: string; email: string; username: string };
    socket.join(`user:${user.sub}`);

    socket.on(
      CLIENT_EVENTS.tableJoin,
      (payload: { tableId: string; preferredSeat?: 0 | 1 | 2 | 3; avatarId?: string }) => {
        void guard(socket, async () => {
          const runtime = await registry.getOrCreate(io, payload.tableId);
          const result = await runtime.addHuman(
            { id: user.sub, username: user.username, avatarId: payload.avatarId },
            socket.id,
            payload.preferredSeat,
          );
          if (!result.ok) {
            socket.emit(SERVER_EVENTS.actionError, { code: 'JOIN_FAILED', message: result.error });
            return;
          }
          socket.join(runtime.roomId);
          runtime.sendStateTo(socket.id);
        });
      },
    );

    socket.on(CLIENT_EVENTS.tableSpectate, (payload: { tableId: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        socket.join(runtime.roomId);
        runtime.addSpectator(socket);
        runtime.sendStateTo(socket.id);
      });
    });

    socket.on(CLIENT_EVENTS.tableLeave, (payload: { tableId: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        socket.leave(runtime.roomId);
        runtime.removeSpectator(socket.id);
        await runtime.removeHuman(user.sub);
      });
    });

    socket.on(CLIENT_EVENTS.botAdd, (payload: { tableId: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        if (runtime.ownerId !== user.sub) {
          socket.emit(SERVER_EVENTS.actionError, { code: 'FORBIDDEN', message: 'Only the owner may add bots' });
          return;
        }
        await runtime.addBot();
      });
    });

    socket.on(CLIENT_EVENTS.botRemove, (payload: { tableId: string; seat: 0 | 1 | 2 | 3 }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        if (runtime.ownerId !== user.sub) {
          socket.emit(SERVER_EVENTS.actionError, { code: 'FORBIDDEN', message: 'Only the owner may remove bots' });
          return;
        }
        await runtime.removeBot(payload.seat);
      });
    });

    socket.on(CLIENT_EVENTS.gameStart, (payload: { tableId: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        if (runtime.ownerId !== user.sub) {
          socket.emit(SERVER_EVENTS.actionError, { code: 'FORBIDDEN', message: 'Only the owner may start the game' });
          return;
        }
        await runtime.startGame();
      });
    });

    socket.on(CLIENT_EVENTS.bidAction, (payload: { tableId: string } & Parameters<TableRuntime['handleBid']>[1]) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        runtime.handleBid(socket, payload);
      });
    });

    socket.on(CLIENT_EVENTS.discardCards, (payload: { tableId: string; cardIds: string[] }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        runtime.handleDiscard(socket, payload);
      });
    });

    socket.on(CLIENT_EVENTS.playCard, (payload: { tableId: string; cardId: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        runtime.handlePlay(socket, payload);
      });
    });

    socket.on(CLIENT_EVENTS.chatSend, (payload: { tableId: string; text: string }) => {
      void guard(socket, async () => {
        const runtime = await registry.getOrCreate(io, payload.tableId);
        runtime.handleChat(socket, payload);
      });
    });

    socket.on('disconnect', () => {
      for (const entry of registry.entries.values()) {
        entry.runtime.handleDisconnect(socket.id);
      }
    });
  });
}
