import React, { createContext, useContext, useState, useEffect } from 'react';

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
    if (user) {
      localStorage.setItem('hackboard-user', JSON.stringify(user));
    }
  }, [user]);

  const loginUser = (userData) => {
    setUser(userData);
  };

  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('hackboard-user');
  };

  return (
    <UserContext.Provider value={{ user, loginUser, logoutUser, isLoggedIn: !!user }}>
      {children}
    </UserContext.Provider>
  );
}
