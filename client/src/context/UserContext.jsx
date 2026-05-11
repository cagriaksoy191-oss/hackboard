import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hackboard-user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hackboard-user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    usersAPI.getAll().then((res) => {
      const exists = res.data.some((u) => u.id === user.id);
      if (!exists) {
        setUser(null);
        localStorage.removeItem('hackboard-user');
        localStorage.removeItem('hackboard-token');
      }
    }).catch(() => {});
  }, []);

  const loginUser = async (userData) => {
    try {
      const res = await usersAPI.login(userData.id);
      const { user: authedUser, token } = res.data;

      setUser(authedUser);
      localStorage.setItem('hackboard-user', JSON.stringify(authedUser));
      localStorage.setItem('hackboard-token', token);

      // Force socket reconnect to pick up new auth header
      import('../lib/socket').then(({ default: socket }) => {
        socket.auth = { token };
        socket.disconnect();
        socket.connect();
      });
    } catch (err) {
      console.error('Login failed:', err);
    }
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('hackboard-user');
    localStorage.removeItem('hackboard-token');
    import('../lib/socket').then(({ default: socket }) => {
      socket.auth = {};
      socket.disconnect();
    });
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser, isLoggedIn: !!user }}>
      {children}
    </UserContext.Provider>
  );
}
