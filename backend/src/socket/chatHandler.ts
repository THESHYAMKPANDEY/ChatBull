import { Server, Socket } from 'socket.io';
import Message from '../models/Message';
import User from '../models/User';
import Group from '../models/Group';

// Store connected users: userId -> socketId
const connectedUsers: Map<string, string> = new Map();

export const setupSocket = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    // User joins with their MongoDB user ID
    socket.on('user:join', async (userId: string) => {
      connectedUsers.set(userId, socket.id);
      socket.join(userId);
      
      // Update user online status
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });
      
      // Broadcast user online status
      socket.broadcast.emit('user:online', userId);
      console.log(`User ${userId} joined`);
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
      senderId: string;
      receiverId?: string;
      groupId?: string;
      content: string;
      messageType?: string;
      isPrivate?: boolean;
    }) => {
      try {
        const { senderId, receiverId, groupId, content, messageType = 'text', isPrivate = false } = data;

        // Save message to database
        const message = await Message.create({
          sender: senderId,
          receiver: receiverId, // Can be null for group messages
          groupId: groupId,     // New field for groups
          content,
          messageType,
          isPrivate,
        });

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

        console.log(`Message sent from ${senderId} to ${groupId ? 'Group ' + groupId : receiverId}`);
      } catch (error) {
        console.error('Message send error:', error);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // Get chat history
    socket.on('messages:get', async (data: { userId: string; otherUserId?: string; groupId?: string }) => {
      try {
        const { userId, otherUserId, groupId } = data;
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
        console.error('Get messages error:', error);
        socket.emit('message:error', { error: 'Failed to get messages' });
      }
    });

    // Typing indicator
    socket.on('typing:start', (data: { senderId: string; receiverId?: string; groupId?: string }) => {
      if (data.groupId) {
         // Broadcast to group (simplified for now, ideally iterate members)
         socket.broadcast.to(data.groupId).emit('typing:start', data.senderId);
      } else if (data.receiverId) {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:start', data.senderId);
        }
      }
    });

    socket.on('typing:stop', (data: { senderId: string; receiverId?: string; groupId?: string }) => {
       if (data.groupId) {
         socket.broadcast.to(data.groupId).emit('typing:stop', data.senderId);
      } else if (data.receiverId) {
        const receiverSocketId = connectedUsers.get(data.receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('typing:stop', data.senderId);
        }
      }
    });

    // Mark messages as read
    socket.on('messages:read', async (data: { senderId: string; receiverId: string }) => {
      await Message.updateMany(
        { sender: data.senderId, receiver: data.receiverId, isRead: false },
        { isRead: true }
      );
      
      const senderSocketId = connectedUsers.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages:read', data.receiverId);
      }
    });

    // User disconnect
    socket.on('disconnect', async () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          
          socket.broadcast.emit('user:offline', userId);
          console.log(`User ${userId} disconnected`);
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
    
    // Message reactions
    socket.on('message:reaction:add', async (data: {
      messageId: string;
      userId: string;
      reaction: string;
      timestamp: string;
      displayName: string;
    }) => {
      try {
        // Find the message in our system to determine recipients
        // In a real implementation, we'd look up the message in the database
        // For now, broadcast to both participants in the chat
        
        // Find all sockets in the user's room (they joined with their user ID)
        const userRooms = Array.from(io.sockets.adapter.rooms.keys());
        
        // Broadcast to the message recipient
        io.emit('message:reaction:add', data);
        
        console.log(`😊 Reaction added: ${data.reaction} to message ${data.messageId} by user ${data.userId}`);
      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    });
    
    socket.on('message:reaction:remove', async (data: {
      messageId: string;
      userId: string;
      reaction: string;
    }) => {
      try {
        // Broadcast reaction removal
        io.emit('message:reaction:remove', data);
        
        console.log(`❌ Reaction removed: ${data.reaction} from message ${data.messageId} by user ${data.userId}`);
      } catch (error) {
        console.error('Error removing reaction:', error);
      }
    });
  });
};
