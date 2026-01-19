import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import Call from '../models/Call';
import User from '../models/User';

// Store active calls: socketId -> callId
const activeCalls: Map<string, string> = new Map();

export const setupCallSocket = (io: Server) => {
  const callNamespace = io.of('/call'); // Optional: separate namespace, but main namespace is easier for integration

  // We'll use the main namespace to share authentication logic easily
  // If we used a separate namespace, we'd need to re-apply auth middleware.
  // So let's attach to the main 'io' instance but prefix events with 'call:'.
  
  io.on('connection', (socket: Socket) => {
    
    // Initiate a call
    socket.on('call:start', async (data: { receiverId: string; type: 'audio' | 'video' }) => {
      try {
        const callerId = String((socket.data as any).userId || '');
        if (!callerId) return;

        const { receiverId, type } = data;
        
        logger.info('Call initiated', { callerId, receiverId, type });

        // Create call record
        const call = await Call.create({
          caller: callerId,
          receiver: receiverId,
          callType: type,
          status: 'initiated',
        });

        // Notify receiver
        // We need to find the receiver's socket. 
        // Note: connectedUsers map is in chatHandler.ts and not exported.
        // We should ideally have a shared UserSessionManager.
        // For now, we will emit to the room named by userId (which is joined in chatHandler).
        
        io.to(receiverId).emit('call:incoming', {
          callId: call._id,
          callerId,
          callerName: (socket.data as any).displayName,
          type,
          offer: data // Pass any initial WebRTC offer if included, though usually offer comes after acceptance
        });

      } catch (error) {
        logger.error('Error starting call', { error });
        socket.emit('call:error', { message: 'Failed to start call' });
      }
    });

    // Accept call
    socket.on('call:accept', async (data: { callId: string; callerId: string }) => {
      try {
        const userId = String((socket.data as any).userId || '');
        
        await Call.findByIdAndUpdate(data.callId, { status: 'ongoing', startTime: new Date() });
        
        io.to(data.callerId).emit('call:accepted', {
          callId: data.callId,
          responderId: userId
        });
        
        logger.info('Call accepted', { callId: data.callId });
      } catch (error) {
        logger.error('Error accepting call', { error });
      }
    });

    // Reject call
    socket.on('call:reject', async (data: { callId: string; callerId: string }) => {
      try {
        await Call.findByIdAndUpdate(data.callId, { status: 'rejected', endTime: new Date() });
        
        io.to(data.callerId).emit('call:rejected', {
          callId: data.callId
        });
        
        logger.info('Call rejected', { callId: data.callId });
      } catch (error) {
        logger.error('Error rejecting call', { error });
      }
    });

    // WebRTC Signaling (Ice Candidates, SDP)
    socket.on('call:signal', (data: { targetId: string; signal: any }) => {
      // Relay signal to target
      io.to(data.targetId).emit('call:signal', {
        senderId: (socket.data as any).userId,
        signal: data.signal
      });
    });

    // End call
    socket.on('call:end', async (data: { callId: string; targetId?: string }) => {
      try {
        if (data.callId) {
          await Call.findByIdAndUpdate(data.callId, { status: 'completed', endTime: new Date() });
        }

        if (data.targetId) {
          io.to(data.targetId).emit('call:ended', { callId: data.callId });
        }
        
        logger.info('Call ended', { callId: data.callId });
      } catch (error) {
        logger.error('Error ending call', { error });
      }
    });
  });
};
