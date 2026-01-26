import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import User from '../models/User';
import Group from '../models/Group';
import { logger } from '../utils/logger';

// Store connected users: userId -> socketId
const connectedUsers: Map<string, string> = new Map();

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

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    logger.info('User connected', { socketId: socket.id });

    // User joins with their MongoDB user ID
    socket.on('user:join', async (_clientUserId?: string) => {
      const userId = String((socket.data as any).userId || '');
      if (!userId) return;

      connectedUsers.set(userId, socket.id);
      socket.join(userId);
      
      // Update user online status
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      
      // Broadcast user online status
      socket.broadcast.emit('user:online', userId);
      logger.info('User joined', { userId });
    });
    
    // Subscribe to another user's status
    socket.on('user:subscribe-status', async (targetUserId: string) => {
      // Check if target user is online
      const isTargetOnline = connectedUsers.has(targetUserId);
      
      // Send initial status
      socket.emit('user:status-update', {
        userId: targetUserId,
        isOnline: isTargetOnline
      });
    });

    // Send message
    socket.on('message:send', async (data: {
      receiverId?: string;
      groupId?: string;
      content: string;
      messageType?: string;
      isPrivate?: boolean;
      replyTo?: { messageId?: string; senderName?: string; content?: string };
    }) => {
      try {
        if (!allowEvent(socket.id, 'message:send', 60, 60_000)) {
          socket.emit('message:error', { error: 'Rate limit exceeded' });
          return;
        }

        const senderId = String((socket.data as any).userId || '');
        if (!senderId) {
          socket.emit('message:error', { error: 'Unauthorized' });
          return;
        }

        const receiverId = typeof data.receiverId === 'string' ? data.receiverId : undefined;
        const groupId = typeof data.groupId === 'string' ? data.groupId : undefined;
        const content = asTrimmedString(data.content, 4000);
        const messageType = typeof data.messageType === 'string' ? data.messageType : 'text';
        const isPrivate = typeof data.isPrivate === 'boolean' ? data.isPrivate : false;
        const replyToRaw = data.replyTo && typeof data.replyTo === 'object' ? data.replyTo : undefined;
        const replyToMessageId = replyToRaw?.messageId && typeof replyToRaw.messageId === 'string' ? replyToRaw.messageId : undefined;
        const replyToSenderName = replyToRaw?.senderName && typeof replyToRaw.senderName === 'string' ? replyToRaw.senderName.trim().slice(0, 80) : undefined;
        const replyToContent = replyToRaw?.content && typeof replyToRaw.content === 'string' ? replyToRaw.content.trim().slice(0, 400) : undefined;

        if (!content) {
          socket.emit('message:error', { error: 'Invalid message content' });
          return;
        }
        if (!groupId && !receiverId) {
          socket.emit('message:error', { error: 'Missing receiverId or groupId' });
          return;
        }

        // Save message to database
        const messageData: any = {
          sender: senderId,
          content,
          messageType,
          isPrivate,
        };

        if (replyToMessageId && replyToSenderName && replyToContent) {
          messageData.replyTo = {
            messageId: replyToMessageId,
            senderName: replyToSenderName,
            content: replyToContent,
          };
        }

        if (groupId) {
          messageData.groupId = groupId;
        } else if (receiverId) {
          messageData.receiver = receiverId;
        }

        const message = await Message.create(messageData);

        // Populate sender info
        await message.populate('sender', 'displayName photoURL');

        if (groupId) {
          // Group Message Logic
          const group = await Group.findById(groupId);
          if (group) {
            // Send to all group members except sender
            group.members.forEach((memberId) => {
              const memberIdStr = memberId.toString();
              if (memberIdStr !== senderId) {
                const memberSocketId = connectedUsers.get(memberIdStr);
                if (memberSocketId) {
                  io.to(memberSocketId).emit('message:receive', message);
                }
              }
            });
          }
        } else if (receiverId) {
          // Direct Message Logic
          const receiverSocketId = connectedUsers.get(receiverId);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit('message:receive', message);
          }
        }

        // Confirm to sender
        socket.emit('message:sent', message);

      } catch (error) {
        logger.error('Message send error', { socketId: socket.id });
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // Get chat history
    socket.on('messages:get', async (data: { userId?: string; otherUserId?: string; groupId?: string }) => {
      try {
        if (!allowEvent(socket.id, 'messages:get', 30, 60_000)) {
          socket.emit('message:error', { error: 'Rate limit exceeded' });
          return;
        }

        const userId = String((socket.data as any).userId || '');
        const { otherUserId, groupId } = data;
        let query;

        if (groupId) {
          query = { groupId };
        } else if (otherUserId) {
          query = {
            $or: [
              { sender: userId, receiver: otherUserId },
              { sender: otherUserId, receiver: userId },
            ],
            isPrivate: false,
          };
        } else {
            return;
        }

        const messages = await Message.find(query)
          .sort({ createdAt: 1 })
          .populate('sender', 'displayName photoURL')
          .limit(100);

        socket.emit('messages:history', messages);
      } catch (error) {
        logger.error('Get messages error', { socketId: socket.id });
        socket.emit('message:error', { error: 'Failed to get messages' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (data: { senderId?: string; receiverId?: string; groupId?: string }) => {
      if (!allowEvent(socket.id, 'typing:start', 120, 60_000)) return;
      const senderId = String((socket.data as any).userId || '');
      if (!senderId) return;
      if (data.groupId) {
         // Broadcast to group (simplified for now, ideally iterate members)
         socket.broadcast.to(data.groupId).emit('typing:start', senderId);
      } else if (data.receiverId) {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:start', senderId);
        }
      }
    });

    socket.on('typing:stop', (data: { senderId?: string; receiverId?: string; groupId?: string }) => {
       if (!allowEvent(socket.id, 'typing:stop', 120, 60_000)) return;
       const senderId = String((socket.data as any).userId || '');
       if (!senderId) return;
       if (data.groupId) {
         socket.broadcast.to(data.groupId).emit('typing:stop', senderId);
      } else if (data.receiverId) {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:stop', senderId);
        }
      }
    });

    // Mark messages as read
    socket.on('messages:read', async (data: { senderId: string; receiverId: string }) => {
      const receiverId = String((socket.data as any).userId || '');
      if (!receiverId) return;
      await Message.updateMany(
        { sender: data.senderId, receiver: receiverId, isRead: false },
        { isRead: true }
      );
      
      const senderSocketId = connectedUsers.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages:read', receiverId);
      }
    });

    // User disconnect
    socket.on('disconnect', async () => {
      socketEventBudgets.delete(socket.id);
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          
          socket.broadcast.emit('user:offline', userId);
          logger.info('User disconnected', { userId });
          break;
        }
      }
    });
    
    // Additional user status events
    socket.on('user:status-request', async (targetUserId: string) => {
      const isOnline = connectedUsers.has(targetUserId);
      socket.emit('user:status-response', {
        userId: targetUserId,
        isOnline
      });
    });
    
    socket.on('message:reaction:add', async (data: { messageId: string; reaction: string }) => {
      try {
        if (!allowEvent(socket.id, 'message:reaction:add', 240, 60_000)) return;
        const userId = String((socket.data as any).userId || '');
        if (!userId) return;

        const messageId = typeof data.messageId === 'string' ? data.messageId : '';
        const reaction = asTrimmedString(data.reaction, 32);
        if (!messageId || !reaction) return;

        const message = await Message.findById(messageId).select('sender receiver groupId');
        if (!message) return;

        await Message.updateOne(
          { _id: messageId },
          { $addToSet: { [`reactions.${reaction}`]: userId } }
        );

        const payload = {
          messageId,
          userId,
          reaction,
          timestamp: new Date().toISOString(),
          displayName: String((socket.data as any).displayName || ''),
        };

        if (message.groupId) {
          const group = await Group.findById(message.groupId);
          if (group) {
            group.members.forEach((memberId) => {
              io.to(memberId.toString()).emit('message:reaction:add', payload);
            });
          }
          return;
        }

        const senderId = message.sender?.toString();
        const receiverId = message.receiver?.toString();
        if (senderId) io.to(senderId).emit('message:reaction:add', payload);
        if (receiverId) io.to(receiverId).emit('message:reaction:add', payload);
      } catch (error) {
        logger.error('Error adding reaction', { socketId: socket.id });
      }
    });

    socket.on('message:reaction:remove', async (data: { messageId: string; reaction: string }) => {
      try {
        if (!allowEvent(socket.id, 'message:reaction:remove', 240, 60_000)) return;
        const userId = String((socket.data as any).userId || '');
        if (!userId) return;

        const messageId = typeof data.messageId === 'string' ? data.messageId : '';
        const reaction = asTrimmedString(data.reaction, 32);
        if (!messageId || !reaction) return;

        const message = await Message.findById(messageId).select('sender receiver groupId');
        if (!message) return;

        await Message.updateOne(
          { _id: messageId },
          { $pull: { [`reactions.${reaction}`]: userId } }
        );

        const payload = {
          messageId,
          userId,
          reaction,
        };

        if (message.groupId) {
          const group = await Group.findById(message.groupId);
          if (group) {
            group.members.forEach((memberId) => {
              io.to(memberId.toString()).emit('message:reaction:remove', payload);
            });
          }
          return;
        }

        const senderId = message.sender?.toString();
        const receiverId = message.receiver?.toString();
        if (senderId) io.to(senderId).emit('message:reaction:remove', payload);
        if (receiverId) io.to(receiverId).emit('message:reaction:remove', payload);
      } catch (error) {
        logger.error('Error removing reaction', { socketId: socket.id });
      }
    });
  });
};
