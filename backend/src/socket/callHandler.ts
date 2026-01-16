import { Server, Socket } from 'socket.io';

export const setupCallSocket = (io: Server) => {
  const callNamespace = io.of('/calls');

  callNamespace.on('connection', (socket: Socket) => {
    console.log('Call user connected:', socket.id);

    // Join user's own room for signaling
    socket.on('call:join', (userId: string) => {
      socket.join(userId);
      console.log(`User ${userId} joined call signaling`);
    });

    // Initiate a call
    socket.on('call:start', (data: { callerId: string; receiverId: string; isVideo: boolean }) => {
      const { callerId, receiverId, isVideo } = data;
      console.log(`Call started from ${callerId} to ${receiverId}`);
      
      // Notify receiver
      callNamespace.to(receiverId).emit('call:incoming', {
        callerId,
        isVideo,
        sessionId: socket.id // Simple session tracking
      });
    });

    // Accept call
    socket.on('call:accept', (data: { callerId: string; receiverId: string }) => {
      console.log(`Call accepted by ${data.receiverId}`);
      callNamespace.to(data.callerId).emit('call:accepted', {
        receiverId: data.receiverId
      });
    });

    // Reject/Hangup
    socket.on('call:hangup', (data: { targetId: string }) => {
      console.log(`Call ended for ${data.targetId}`);
      callNamespace.to(data.targetId).emit('call:ended');
    });

    // WebRTC Signaling: Offer
    socket.on('call:offer', (data: { targetId: string; sdp: any }) => {
      callNamespace.to(data.targetId).emit('call:offer', {
        sdp: data.sdp,
        senderId: socket.id // or userId if mapped
      });
    });

    // WebRTC Signaling: Answer
    socket.on('call:answer', (data: { targetId: string; sdp: any }) => {
      callNamespace.to(data.targetId).emit('call:answer', {
        sdp: data.sdp
      });
    });

    // WebRTC Signaling: ICE Candidate
    socket.on('call:ice-candidate', (data: { targetId: string; candidate: any }) => {
      callNamespace.to(data.targetId).emit('call:ice-candidate', {
        candidate: data.candidate
      });
    });
  });
};
