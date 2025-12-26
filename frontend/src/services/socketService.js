import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3050';

let socket = null;

export const socketService = {
  connect: (token) => {
    if (socket?.connected) {
      return socket;
    }

    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join_room', { token });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return socket;
  },

  joinLogs: (channelId) => {
    if (socket?.connected) {
      socket.emit('join_logs', { id: channelId });
    } else {
      const token = localStorage.getItem('token');
      if (token) {
        const newSocket = socketService.connect(token);
        newSocket.on('connect', () => {
          newSocket.emit('join_logs', { id: channelId });
        });
      }
    }
  },

  leaveLogs: () => {
    if (socket?.connected) {
      const token = localStorage.getItem('token');
      socket.emit('leave_room', { token });
    }
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket: () => socket,
};

