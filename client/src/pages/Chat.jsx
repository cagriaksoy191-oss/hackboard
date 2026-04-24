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

    const handleMessageNew = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    const handleTypingStart = (data) => {
      setTypingUsers((prev) => {
        if (prev.includes(data.user_id)) return prev;
        return [...prev, data.user_id];
      });
    };
    const handleTypingStop = (data) => {
      setTypingUsers((prev) => prev.filter((id) => id !== data.user_id));
    };

    socket.on('message:new', handleMessageNew);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100dvh-110px)] md:h-[calc(100dvh-120px)] flex flex-col">
      <h2 className="text-2xl font-bold text-primary mb-4 shrink-0">Takim Sohbeti</h2>

      <div className="glass rounded-2xl flex-1 flex flex-col overflow-hidden min-h-0 relative">
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
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
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${!user?.avatar_color ? 'bg-accentAlt' : ''}`} style={user?.avatar_color ? { backgroundColor: user.avatar_color } : undefined}
                      >
                        {user?.name?.[0] || '?'}
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl border ${
                      isMe
                        ? 'bg-gradient-to-r from-accent to-accentAlt text-white border-transparent rounded-br-md'
                        : 'surface-bg border-theme-subtle text-primary rounded-bl-md'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-semibold mb-1 opacity-70">{user?.name || 'Bilinmeyen'}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-muted'}`}>
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
              className="flex items-center gap-2 text-muted text-sm"
            >
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.map((id) => getUserById(id)?.name).filter(Boolean).join(', ')} yaziyor...
              </span>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-theme p-3 sm:p-4 shrink-0 bg-surface/80 backdrop-blur-md z-10 relative">
          {showEmoji && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-3 p-3 surface-bg border border-theme-subtle rounded-xl max-h-40 overflow-y-auto"
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
              aria-label="Emoji Secici"
              title="Emoji Secici"
              className="p-2.5 rounded-xl surface-bg border border-theme-subtle hover-surface-bg-hover text-secondary hover:text-primary transition-colors"
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
              className="flex-1 px-4 py-2.5 input-surface border rounded-xl text-sm focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              aria-label="Mesaj Gonder"
              title="Mesaj Gonder"
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
