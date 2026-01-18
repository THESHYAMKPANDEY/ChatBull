import { Server, Socket } from 'socket.io';
import PrivateMessage from '../models/PrivateMessage';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// Store private sessions: sessionId -> { alias, socketId, publicKey }
const privateSessions: Map<string, { alias: string; socketId: string; publicKey?: string }> = new Map();

// Generate random anonymous alias
const generateAlias = (): string => {
  const adjectives = ['Swift', 'Silent', 'Shadow', 'Mystic', 'Phantom', 'Ghost', 'Stealth', 'Hidden'];
  const nouns = ['Fox', 'Wolf', 'Hawk', 'Raven', 'Panther', 'Tiger', 'Eagle', 'Serpent'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
};

// Generate random session ID
const generateSessionId = (): string => {
  return `priv_${crypto.randomBytes(12).toString('hex')}`;
};

type SocketEventBudget = { windowStart: number; count: number };
const socketEventBudgets: Map<string, Map<string, SocketEventBudget>> = new Map();

const allowEvent = (socketId: string, event: string, max: number, windowMs: number): boolean => {
  const now = Date.now();
  const perSocket = socketEventBudgets.get(socketId) || new Map<string, SocketEventBudget>();
  const current = perSocket.get(event);

  if (!current || now - current.windowStart >= windowMs) {
    perSocket.set(event, { windowStart: now, count: 1 });
    socketEventBudgets.set(socketId, perSocket);
    return true;
  }

  if (current.count >= max) return false;
  current.count += 1;
  return true;
};

const asTrimmedString = (value: unknown, maxLen: number): string | null => {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
};

export const setupPrivateSocket = (io: Server) => {
  const privateNamespace = io.of('/private');

  privateNamespace.on('connection', (socket: Socket) => {
    logger.info('Private user connected', { socketId: socket.id });

    // User enters private mode
    socket.on('private:join', (data: { publicKey?: string } | ((res: any) => void), callback?: (data: any) => void) => {
      if (!allowEvent(socket.id, 'private:join', 5, 60_000)) return;
      // Handle legacy case or just callback
      let publicKey: string | undefined;
      let cb = callback;

      if (typeof data === 'function') {
        cb = data;
      } else if (data && typeof data === 'object') {
        publicKey = asTrimmedString((data as any).publicKey, 4096) || undefined;
      }

      if (!cb) return;

      const sessionId = generateSessionId();
      const alias = generateAlias();

      privateSessions.set(sessionId, { alias, socketId: socket.id, publicKey });
      socket.join('private-lobby');

      // Send back session info
      cb({
        sessionId,
        alias,
        message: 'Welcome to Private Mode. Your identity is hidden.',
      });

      // Broadcast to lobby that someone joined (without revealing identity)
      socket.to('private-lobby').emit('private:user-joined', {
        alias,
        publicKey,
        message: `${alias} joined the private chat`,
      });

      logger.info('Private session created', { socketId: socket.id });
    });

    // Send private message
    socket.on('private:send', async (data: {
      sessionId: string;
      receiverAlias: string;
      content: string;
    }) => {
      try {
        if (!allowEvent(socket.id, 'private:send', 60, 60_000)) {
          socket.emit('private:error', { error: 'Rate limit exceeded' });
          return;
        }

        const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
        const receiverAlias = asTrimmedString(data.receiverAlias, 64);
        const content = asTrimmedString(data.content, 4000);
        if (!sessionId || !receiverAlias || !content) {
          socket.emit('private:error', { error: 'Invalid message' });
          return;
        }

        const session = privateSessions.get(sessionId);
        if (!session) {
          socket.emit('private:error', { error: 'Invalid session' });
          return;
        }

        // Find receiver's socket
        let receiverSocketId: string | null = null;
        for (const [, value] of privateSessions.entries()) {
          if (value.alias === data.receiverAlias) {
            receiverSocketId = value.socketId;
            break;
          }
        }

        // Save message (will auto-delete after 24h)
        const message = await PrivateMessage.create({
          sessionId,
          senderAlias: session.alias,
          receiverAlias,
          content,
        });

        // Send to receiver if online
        if (receiverSocketId) {
          privateNamespace.to(receiverSocketId).emit('private:receive', {
            id: message._id,
            senderAlias: session.alias,
            content,
            createdAt: message.createdAt,
          });
        }

        // Confirm to sender
        socket.emit('private:sent', {
          id: message._id,
          receiverAlias,
          content,
          createdAt: message.createdAt,
        });

      } catch (error: any) {
        logger.error('Private send error', { socketId: socket.id });
        socket.emit('private:error', { error: 'Failed to send message' });
      }
    });

    // Broadcast to lobby (public chat in private mode)
    socket.on('private:broadcast', async (data: {
      sessionId: string;
      content: string;
    }) => {
      if (!allowEvent(socket.id, 'private:broadcast', 60, 60_000)) {
        socket.emit('private:error', { error: 'Rate limit exceeded' });
        return;
      }

      const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      const content = asTrimmedString(data.content, 4000);
      if (!sessionId || !content) {
        socket.emit('private:error', { error: 'Invalid message' });
        return;
      }

      const session = privateSessions.get(sessionId);
      if (!session) {
        socket.emit('private:error', { error: 'Invalid session' });
        return;
      }

      socket.to('private-lobby').emit('private:broadcast', {
        senderAlias: session.alias,
        content,
        createdAt: new Date(),
      });

      // Also send back to sender for confirmation
      socket.emit('private:broadcast', {
        senderAlias: session.alias,
        content,
        createdAt: new Date(),
        isSelf: true,
      });
    });

    // Get online users in private mode
    socket.on('private:users', (data: { sessionId: string }, callback: (users: any[]) => void) => {
      if (!allowEvent(socket.id, 'private:users', 30, 60_000)) return;
      const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      const session = privateSessions.get(sessionId);
      if (!session) return;

      const users = Array.from(privateSessions.values())
        .map(s => ({ alias: s.alias, publicKey: s.publicKey }))
        .filter(u => u.alias !== session.alias);
      
      callback(users);
    });

    // Exit private mode - DELETE ALL DATA
    socket.on('private:exit', async (data: { sessionId: string }) => {
      const sessionId = typeof data.sessionId === 'string' ? data.sessionId : '';
      const session = privateSessions.get(sessionId);
      if (session) {
        // Delete all messages for this session
        await PrivateMessage.deleteMany({ sessionId });
        
        // Remove from sessions
        privateSessions.delete(sessionId);
        
        // Leave room
        socket.leave('private-lobby');

        // Notify others
        socket.to('private-lobby').emit('private:user-left', {
          alias: session.alias,
          message: `${session.alias} left the private chat`,
        });

        logger.info('Private session destroyed', { socketId: socket.id });
      }

      socket.emit('private:exited', { message: 'All your private data has been deleted.' });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      socketEventBudgets.delete(socket.id);
      // Find and clean up session
      for (const [sessionId, session] of privateSessions.entries()) {
        if (session.socketId === socket.id) {
          // Delete all messages
          await PrivateMessage.deleteMany({ sessionId });
          privateSessions.delete(sessionId);
          
          // Notify others
          socket.to('private-lobby').emit('private:user-left', {
            alias: session.alias,
            message: `${session.alias} left the private chat`,
          });
          
          logger.info('Private session cleaned up on disconnect', { socketId: socket.id });
          break;
        }
      }
    });
  });
};
