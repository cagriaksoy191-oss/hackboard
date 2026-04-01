import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { messagesAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import socket from '../lib/socket';

const emojis = ['😀', '😂', '🔥', '💪', '👍', '❤️', '🎉', '🚀', '💡', '✅', '⚡', '🎯', '😎', '🤔', '👏', '🙌', '💯', '🏆', '⭐', '🌟'];

function Chat() {
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const { user: currentUser } = useUser();

  useEffect(() => {
    Promise.all([messagesAPI.getAll(), usersAPI.getAll()]).then(([msgRes, userRes]) => {
      setMessages(msgRes.data);
      setUsers(userRes.data);
    });

    socket.on('message:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('typing:start', (data) => {
      setTypingUsers((prev) => {
        if (prev.includes(data.user_id)) return prev;
        return [...prev, data.user_id];
      });
    });

    socket.on('typing:stop', (data) => {
      setTypingUsers((prev) => prev.filter((id) => id !== data.user_id));
    });

    return () => {
      socket.off('message:new');
      socket.off('typing:start');
      socket.off('typing:stop');
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    socket.emit('message:send', { user_id: currentUser?.id || 1, content: newMessage });
    setNewMessage('');
    setShowEmoji(false);
    socket.emit('typing:stop', { user_id: currentUser?.id || 1 });
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing:start', { user_id: currentUser?.id || 1 });
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      socket.emit('typing:stop', { user_id: currentUser?.id || 1 });
    }, 2000);
  };

  const addEmoji = (emoji) => {
    setNewMessage((prev) => prev + emoji);
  };

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getUserById = (id) => users.find((u) => u.id === id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-8rem)] flex flex-col">
      <h2 className="text-2xl font-bold text-white mb-4">Takim Sohbeti</h2>

      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.user_id === (currentUser?.id || 1);
              const user = getUserById(msg.user_id);
              return (
                <motion.div
                  key={msg.id || i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[70%] ${isMe ? 'flex-row-reverse' : ''}`}>
                    {!isMe && (
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: user?.avatar_color || '#7c3aed' }}
                      >
                        {user?.name?.[0] || '?'}
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl ${
                      isMe
                        ? 'bg-gradient-to-r from-accent to-accentAlt text-white rounded-br-md'
                        : 'bg-white/10 text-gray-200 rounded-bl-md'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-semibold mb-1 opacity-70">{user?.name || 'Bilinmeyen'}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-gray-500'}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-400 text-sm"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map((id) => getUserById(id)?.name).filter(Boolean).join(', ')} yaziyor...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-white/10 p-4">
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-3 p-3 bg-white/5 rounded-xl"
            >
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}

          <form onSubmit={handleSend} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={handleTyping}
              placeholder="Mesaj yaz..."
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-gradient-to-r from-accent to-accentAlt text-white hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
}

export default Chat;
