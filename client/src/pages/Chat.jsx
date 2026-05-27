import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '../components/chat/ChatMessage';
import TypingIndicator from '../components/chat/TypingIndicator';
import ChatInput from '../components/chat/ChatInput';

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

    const handleMessageNew = (msg) => setMessages((prev) => [...prev, msg]);
    const handleTypingStart = (data) => {
      setTypingUsers((prev) => prev.includes(data.user_id) ? prev : [...prev, data.user_id]);
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

  const addEmoji = (emoji) => setNewMessage((prev) => prev + emoji);

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const getUserById = (id) => users.find((u) => u.id === id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-[calc(100dvh-110px)] md:h-[calc(100dvh-120px)] flex flex-col"
    >
      {/* Page Title */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
          Takım Sohbeti
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]" />
          </span>
          {users.length} kişi çevrimiçi
        </div>
      </div>

      {/* Chat Container */}
      <div className="
        rounded-xl flex-1 flex flex-col overflow-hidden min-h-0 relative
        bg-[var(--bg-surface)] border border-[var(--border-subtle)]
      ">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 relative">
          <AnimatePresence>
            {messages.map((msg, i) => {
              const isMe = msg.user_id === (currentUser?.id || 1);
              const user = getUserById(msg.user_id);
              return (
                <ChatMessage
                  key={msg.id || i}
                  msg={msg}
                  isMe={isMe}
                  user={user}
                  formatTime={formatTime}
                  index={i}
                />
              );
            })}
          </AnimatePresence>
          <TypingIndicator typingUsers={typingUsers} getUserById={getUserById} />
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          newMessage={newMessage}
          showEmoji={showEmoji}
          setShowEmoji={setShowEmoji}
          handleSend={handleSend}
          handleTyping={handleTyping}
          addEmoji={addEmoji}
          emojis={emojis}
        />
      </div>
    </motion.div>
  );
}

export default Chat;
