import { io } from 'socket.io-client';

const socket = process.env.NODE_ENV === 'test'
  ? { on: () => {}, off: () => {}, emit: () => {} }
  : io('/', {
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        const token = localStorage.getItem('hackboard-token');
        if (token) {
          cb({ token });
          return;
        }
        cb({});
      }
    });

let isInitialConnect = true;

if (process.env.NODE_ENV !== 'test') {
  socket.on('connect', () => {
    console.info('[Socket] Connected to server.');
    if (!isInitialConnect) {
      console.info('[Socket] Reconnect detected. Dispatching targeted refetch...');
      window.dispatchEvent(new Event('socket:reconnect-refetch'));
    }
    isInitialConnect = false;
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
  });
}

export default socket;
