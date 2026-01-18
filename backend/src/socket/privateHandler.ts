import { Server, Socket } from 'socket.io';
import PrivateMessage from '../models/PrivateMessage';
import { logger } from '../utils/logger';

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
  return 'priv_' + Math.random().toString(36).substring(2, 15);
};

export const setupPrivateSocket = (io: Server) => {
  const privateNamespace = io.of('/private');

  privateNamespace.on('connection', (socket: Socket) => {
    logger.info(`Private user connected: ${socket.id}`);

    // User enters private mode
    socket.on('private:join', (data: { publicKey?: string } | ((res: any) => void), callback?: (data: any) => void) => {
      // Handle legacy case or just callback
      let publicKey: string | undefined;
      let cb = callback;

      if (typeof data === 'function') {
        cb = data;
      } else if (data && typeof data === 'object') {
        publicKey = data.publicKey;
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

      logger.info(`Private session created: ${alias}`);
    });

    // Send private message
    socket.on('private:send', async (data: {
      sessionId: string;
      receiverAlias: string;
      content: string;
    }) => {
      try {
        const session = privateSessions.get(data.sessionId);
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
          sessionId: data.sessionId,
          senderAlias: session.alias,
          receiverAlias: data.receiverAlias,
          content: data.content,
        });

        // Send to receiver if online
        if (receiverSocketId) {
          privateNamespace.to(receiverSocketId).emit('private:receive', {
            id: message._id,
            senderAlias: session.alias,
            content: data.content,
            createdAt: message.createdAt,
          });
        }

        // Confirm to sender
        socket.emit('private:sent', {
          id: message._id,
          receiverAlias: data.receiverAlias,
          content: data.content,
          createdAt: message.createdAt,
        });

      } catch (error: any) {
        logger.error(`Private send error: ${error.message}`);
        socket.emit('private:error', { error: 'Failed to send message' });
      }
    });

    // Broadcast to lobby (public chat in private mode)
    socket.on('private:broadcast', async (data: {
      sessionId: string;
      content: string;
    }) => {
      const session = privateSessions.get(data.sessionId);
      if (!session) {
        socket.emit('private:error', { error: 'Invalid session' });
        return;
      }

      socket.to('private-lobby').emit('private:broadcast', {
        senderAlias: session.alias,
        content: data.content,
        createdAt: new Date(),
      });

      // Also send back to sender for confirmation
      socket.emit('private:broadcast', {
        senderAlias: session.alias,
        content: data.content,
        createdAt: new Date(),
        isSelf: true,
      });
    });

    // Get online users in private mode
    socket.on('private:users', (data: { sessionId: string }, callback: (users: any[]) => void) => {
      const session = privateSessions.get(data.sessionId);
      if (!session) return;

      const users = Array.from(privateSessions.values())
        .map(s => ({ alias: s.alias, publicKey: s.publicKey }))
        .filter(u => u.alias !== session.alias);
      
      callback(users);
    });

    // Exit private mode - DELETE ALL DATA
    socket.on('private:exit', async (data: { sessionId: string }) => {
      const session = privateSessions.get(data.sessionId);
      if (session) {
        // Delete all messages for this session
        await PrivateMessage.deleteMany({ sessionId: data.sessionId });
        
        // Remove from sessions
        privateSessions.delete(data.sessionId);
        
        // Leave room
        socket.leave('private-lobby');

        // Notify others
        socket.to('private-lobby').emit('private:user-left', {
          alias: session.alias,
          message: `${session.alias} left the private chat`,
        });

        logger.info(`Private session destroyed: ${session.alias}`);
      }

      socket.emit('private:exited', { message: 'All your private data has been deleted.' });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
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
          
          logger.info(`Private session cleaned up on disconnect: ${session.alias}`);
          break;
        }
      }
    });
  });
};
