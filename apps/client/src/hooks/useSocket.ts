import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '../config.js';
import { useAuth } from '../store/auth.js';

export function useSocket(): Socket | null {
  const token = useAuth((s) => s.token);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      return;
    }
    const instance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    setSocket(instance);
    return () => {
      instance.disconnect();
    };
  }, [token]);

  return socket;
}
