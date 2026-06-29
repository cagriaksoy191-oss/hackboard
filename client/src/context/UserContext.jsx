import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersAPI } from '../lib/api';

const UserContext = createContext();

export function useUser() {
  return useContext(UserContext);
}

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
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
        localStorage.removeItem('hackboard-refresh-token');
      }
    }).catch(() => {});
  }, []);

  // Proactive Token Refresh Check
  useEffect(() => {
    const checkAndRefreshProactively = async () => {
      const token = localStorage.getItem('hackboard-token');
      const refreshToken = localStorage.getItem('hackboard-refresh-token');
      if (!token || !refreshToken) return;

      const decoded = decodeToken(token);
      if (!decoded) return;

      const now = Math.floor(Date.now() / 1000);
      const timeLeft = decoded.exp - now;

      // If token is expired or expires in less than 60 seconds, refresh pro-actively
      if (timeLeft <= 60) {
        console.info(`[Auth] Proactive refresh triggered. Token expiring in ${timeLeft}s`);
        try {
          const { default: api } = await import('../lib/api');
          const res = await api.post('/v1/auth/refresh', { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data;

          localStorage.setItem('hackboard-token', newAccessToken);
          localStorage.setItem('hackboard-refresh-token', newRefreshToken);

          // Force socket reconnect to pick up new auth header
          const { default: socket } = await import('../lib/socket');
          socket.auth = { token: newAccessToken };
          socket.disconnect();
          socket.connect();

          console.info('[Auth] Proactive refresh succeeded.');
        } catch (err) {
          console.error('[Auth] Proactive refresh failed:', err);
          setUser(null);
          localStorage.removeItem('hackboard-user');
          localStorage.removeItem('hackboard-token');
          localStorage.removeItem('hackboard-refresh-token');
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefreshProactively();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    // Check on mount as well
    checkAndRefreshProactively();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loginUser = async (userData) => {
    try {
      const res = await usersAPI.login(userData.id);
      const { user: authedUser, accessToken, refreshToken, token } = res.data;

      const tokenToUse = accessToken || token;
      setUser(authedUser);
      localStorage.setItem('hackboard-user', JSON.stringify(authedUser));
      localStorage.setItem('hackboard-token', tokenToUse);
      if (refreshToken) {
        localStorage.setItem('hackboard-refresh-token', refreshToken);
      }

      // Force socket reconnect to pick up new auth header
      import('../lib/socket').then(({ default: socket }) => {
        socket.auth = { token: tokenToUse };
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
    localStorage.removeItem('hackboard-refresh-token');
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
