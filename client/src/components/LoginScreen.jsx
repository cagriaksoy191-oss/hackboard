import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usersAPI } from '../lib/api';

function LoginScreen({ onLogin }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    usersAPI.getAll().then((res) => {
      setUsers(res.data);
      setLoading(false);
    });
  }, []);

  const handleLogin = () => {
    if (selectedUser) {
      onLogin(selectedUser);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accentAlt/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent to-accentAlt flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-accent/20"
          >
            H
          </motion.div>
          <h1 className="text-4xl font-bold text-white mb-2">HackBoard</h1>
          <p className="text-gray-400 text-lg">Hackathon Yonetim Paneli</p>
          <p className="text-gray-500 text-sm mt-2">Devam etmek icin bir kullanici secin</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-6 animate-pulse">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10" />
                <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-white/5 rounded w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-8">
            {users.map((user, i) => {
              const initials = user.name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
              const isSelected = selectedUser?.id === user.id;
              return (
                <motion.button
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * i }}
                  onClick={() => setSelectedUser(user)}
                  className={`glass rounded-2xl p-6 text-center transition-all duration-300 hover:scale-[1.03] ${
                    isSelected
                      ? 'border-accent/50 shadow-lg shadow-accent/10 bg-accent/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="relative inline-block mb-3">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold text-white mx-auto"
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg ${!user.avatar_color ? 'bg-accentAlt' : ''}`} style={user.avatar_color ? { backgroundColor: user.avatar_color } : undefined}
                    >
                      {initials}
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center"
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <h3 className="text-white font-semibold text-sm">{user.name}</h3>
                  <p className="text-gray-400 text-xs mt-1">{user.role}</p>
                </motion.button>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center"
            >
              <button
                onClick={handleLogin}
                className="px-12 py-3 bg-gradient-to-r from-accent to-accentAlt text-white font-semibold rounded-xl hover:opacity-90 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
              >
                Giris Yap
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default LoginScreen;
