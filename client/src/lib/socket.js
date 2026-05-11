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

export default socket;
