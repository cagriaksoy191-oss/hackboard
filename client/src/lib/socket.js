import { io } from 'socket.io-client';

const socket = process.env.NODE_ENV === 'test'
  ? { on: () => {}, off: () => {}, emit: () => {} }
  : io('/', {
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        const userStr = localStorage.getItem('hackboard-user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user && user.id) {
              cb({ userId: user.id });
              return;
            }
          } catch (e) {
            console.error('Error parsing user from localStorage for socket auth', e);
          }
        }
        cb({});
      }
    });

export default socket;
