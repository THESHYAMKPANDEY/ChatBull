import { io, Socket } from 'socket.io-client';
import { auth } from '../config/firebase';
import { appConfig } from '../config/appConfig';

let socket: Socket | null = null;

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;

  const token = await auth.currentUser?.getIdToken();
  socket = io(appConfig.SOCKET_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connect error', err?.message || err);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
