import { io } from 'socket.io-client';

const socket = process.env.NODE_ENV === 'test'
  ? { on: () => {}, off: () => {}, emit: () => {} }
  : io('/', {
      transports: ['websocket', 'polling'],
    });

export default socket;
