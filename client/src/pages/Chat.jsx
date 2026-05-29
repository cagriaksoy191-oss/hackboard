import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatMessage from '../components/chat/ChatMessage';
import TypingIndicator from '../components/chat/TypingIndicator';
import ChatInput from '../components/chat/ChatInput';

import { messagesAPI, channelsAPI, usersAPI } from '../lib/api';
import { useUser } from '../context/UserContext';
import socket from '../lib/socket';

const emojis = ['😀', '😂', '🔥', '💪', '👍', '❤️', '🎉', '🚀', '💡', '✅', '⚡', '🎯', '😎', '🤔', '👏', '🙌', '💯', '🏆', '⭐', '🌟'];

/* ──────────────────────────────────────────────
   ThreadPanel — Apple Messages-inspired slide panel
   ────────────────────────────────────────────── */
function ThreadPanel({ parentMsg, onClose, currentUser, users, formatTime }) {
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const repliesEndRef = useRef(null);

  const getUserById = useCallback((id) => users.find(u => u.id === id), [users]);

  useEffect(() => {
    if (!parentMsg) return;
    setLoading(true);
    messagesAPI.getThread(parentMsg.id).then(res => {
      setReplies(res.data.replies || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [parentMsg]);

  useEffect(() => {
    repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  // Live thread updates
  useEffect(() => {
    if (!parentMsg) return;
    const handleReply = (data) => {
      if (data.threadId === parentMsg.id) {
        setReplies(prev => [...prev, data.message]);
      }
    };
    socket.on('thread:reply', handleReply);
    return () => socket.off('thread:reply', handleReply);
  }, [parentMsg]);

  const handleSendReply = (e) => {
    e.preventDefault();
    if (!replyText.trim() || !parentMsg) return;
    socket.emit('message:send', {
      user_id: currentUser?.id || 1,
      content: replyText,
      channel_id: parentMsg.channel_id,
      thread_id: parentMsg.id,
    });
    setReplyText('');
  };

  if (!parentMsg) return null;

  const parentUser = getUserById(parentMsg.user_id);

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-full sm:w-[380px] bg-[var(--bg-surface)] border-l border-[var(--border-default)] flex flex-col z-20 shadow-[var(--shadow-xl)]"
    >
      {/* Thread Header */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-[13px] font-bold text-[var(--text-primary)]">Konu Başlığı</h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{replies.length} yanıt</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Parent Message */}
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)] shrink-0">
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: parentUser?.avatar_color || parentMsg.avatar_color || '#6366f1' }}
          >
            {(parentUser?.name || parentMsg.name || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                {parentUser?.name || parentMsg.name || 'Anonim'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">{formatTime(parentMsg.created_at)}</span>
            </div>
            <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap break-words">
              {parentMsg.content}
            </p>
          </div>
        </div>
      </div>

      {/* Thread Replies */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[11px] text-[var(--text-muted)]">Henüz yanıt yok. İlk yanıtı siz verin!</p>
          </div>
        ) : (
          replies.map((reply, i) => {
            const replyUser = getUserById(reply.user_id);
            const isMe = reply.user_id === (currentUser?.id || 1);
            return (
              <motion.div
                key={reply.id || i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-start gap-2"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: replyUser?.avatar_color || reply.avatar_color || '#6366f1' }}
                >
                  {(replyUser?.name || reply.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className={`flex-1 min-w-0 px-2.5 py-2 rounded-xl text-[12px] leading-relaxed ${
                  isMe
                    ? 'bg-[var(--accent-primary-subtle)] text-[var(--text-primary)]'
                    : 'bg-[var(--interactive-muted)] text-[var(--text-primary)]'
                }`}>
                  <span className="font-semibold text-[10px] text-[var(--text-secondary)] block mb-0.5">
                    {replyUser?.name || reply.name || 'Anonim'}
                  </span>
                  <span className="whitespace-pre-wrap break-words">{reply.content}</span>
                  <span className="text-[9px] text-[var(--text-muted)] ml-1.5">{formatTime(reply.created_at)}</span>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={repliesEndRef} />
      </div>

      {/* Thread Reply Input */}
      <div className="p-3 border-t border-[var(--border-subtle)] shrink-0">
        <form onSubmit={handleSendReply} className="flex items-center gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Yanıt yaz..."
            className="flex-1 px-3 py-2 rounded-lg text-[12px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary-muted)] transition-all duration-150"
          />
          <button
            type="submit"
            className="p-2 rounded-lg bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-hover)] active:scale-95 transition-all duration-150 shadow-[var(--shadow-accent)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </form>
      </div>
    </motion.div>
  );
}

/* ──────────────────────────────────────────────
   ChannelSidebar — Minimalist channel list
   ────────────────────────────────────────────── */
function ChannelSidebar({ channels, activeChannel, onSelect, onCreateChannel, showCreate, setShowCreate, createName, setCreateName, handleCreate }) {
  return (
    <div className="w-56 shrink-0 border-r border-[var(--border-subtle)] flex flex-col bg-[var(--bg-surface-2)] rounded-l-xl overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Kanallar</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="p-1 rounded-md hover:bg-[var(--interactive-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          title="Kanal Ekle"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Create Channel Inline */}
      <AnimatePresence>
        {showCreate && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onSubmit={handleCreate}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="kanal-adı"
                autoFocus
                className="w-full px-2.5 py-1.5 rounded-md text-[11px] bg-[var(--bg-input)] border border-[var(--border-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-all duration-150"
                onKeyDown={(e) => { if (e.key === 'Escape') setShowCreate(false); }}
              />
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Channel List */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {channels.map(ch => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className={`
              w-full text-left px-3 py-2 flex items-center gap-2
              text-[12px] transition-all duration-100 ease-[var(--ease-apple)]
              ${activeChannel?.id === ch.id
                ? 'bg-[var(--accent-primary-subtle)] text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--interactive-hover)] hover:text-[var(--text-primary)]'
              }
            `.trim().replace(/\s+/g, ' ')}
          >
            <span className="text-[14px] opacity-60">#</span>
            <span className="truncate flex-1">{ch.name}</span>
            {ch.is_default === 1 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--interactive-muted)] text-[var(--text-muted)]">varsayılan</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Chat Page — Channels + Messages + Thread Panel
   ────────────────────────────────────────────── */
function Chat() {
  const [messages, setMessages] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [threadParent, setThreadParent] = useState(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [createChannelName, setCreateChannelName] = useState('');
  const [replyCounts, setReplyCounts] = useState({});
  const messagesEndRef = useRef(null);
  const prevChannelRef = useRef(null);
  const { user: currentUser } = useUser();

  // Load channels + users
  useEffect(() => {
    Promise.all([channelsAPI.getAll(), usersAPI.getAll()]).then(([chRes, userRes]) => {
      const chs = chRes.data;
      setChannels(chs);
      setUsers(userRes.data);
      // Auto-select default or first channel
      const defaultCh = chs.find(c => c.is_default === 1) || chs[0];
      if (defaultCh) setActiveChannel(defaultCh);
    }).catch(() => {});

    const handleChannelCreated = (ch) => setChannels(prev => [...prev, ch]);
    const handleChannelDeleted = (data) => setChannels(prev => prev.filter(c => c.id !== data.id));
    socket.on('channel:created', handleChannelCreated);
    socket.on('channel:deleted', handleChannelDeleted);
    return () => {
      socket.off('channel:created', handleChannelCreated);
      socket.off('channel:deleted', handleChannelDeleted);
    };
  }, []);

  // Load messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;

    // Leave previous channel room, join new
    if (prevChannelRef.current && prevChannelRef.current !== activeChannel.id) {
      socket.emit('channel:leave', { channelId: prevChannelRef.current });
    }
    socket.emit('channel:join', { channelId: activeChannel.id });
    prevChannelRef.current = activeChannel.id;

    setMessages([]);
    messagesAPI.getAll({ channel_id: activeChannel.id }).then(res => {
      setMessages(res.data);
      // Build reply counts
      const counts = {};
      res.data.forEach(m => {
        if (m.reply_count) counts[m.id] = m.reply_count;
      });
      setReplyCounts(counts);
    }).catch(() => {});

    setThreadParent(null);
  }, [activeChannel]);

  // Socket message listener (channel-scoped)
  useEffect(() => {
    const handleMessageNew = (msg) => {
      if (msg.thread_id) {
        // Thread reply — update reply count
        setReplyCounts(prev => ({
          ...prev,
          [msg.thread_id]: (prev[msg.thread_id] || 0) + 1,
        }));
        return; // Don't add to main feed
      }
      // Only add if it's for the active channel
      if (activeChannel && msg.channel_id === activeChannel.id) {
        setMessages(prev => [...prev, msg]);
      }
    };
    const handleTypingStart = (data) => {
      setTypingUsers(prev => prev.includes(data.user_id) ? prev : [...prev, data.user_id]);
    };
    const handleTypingStop = (data) => {
      setTypingUsers(prev => prev.filter(id => id !== data.user_id));
    };

    socket.on('message:new', handleMessageNew);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);

    return () => {
      socket.off('message:new', handleMessageNew);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;
    socket.emit('message:send', {
      user_id: currentUser?.id || 1,
      content: newMessage,
      channel_id: activeChannel.id,
    });
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

  const addEmoji = (emoji) => setNewMessage(prev => prev + emoji);

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const getUserById = useCallback((id) => users.find(u => u.id === id), [users]);

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!createChannelName.trim()) return;
    try {
      await channelsAPI.create({ name: createChannelName.trim() });
      setCreateChannelName('');
      setShowCreateChannel(false);
    } catch (err) {
      console.error('Channel create error:', err);
    }
  };

  const handleOpenThread = (msg) => {
    setThreadParent(msg);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="h-[calc(100dvh-110px)] md:h-[calc(100dvh-120px)] flex flex-col"
    >
      {/* Page Title */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-[var(--text-primary)] tracking-tight">
            Sohbet
          </h2>
          {activeChannel && (
            <span className="text-[12px] text-[var(--text-tertiary)]">
              <span className="text-[var(--text-muted)]">#</span> {activeChannel.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-success)] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-success)]" />
          </span>
          {users.filter(u => u.is_online).length || users.length} çevrimiçi
        </div>
      </div>

      {/* Chat Layout */}
      <div className="rounded-xl flex-1 flex overflow-hidden min-h-0 relative bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
        {/* Channel Sidebar */}
        <ChannelSidebar
          channels={channels}
          activeChannel={activeChannel}
          onSelect={setActiveChannel}
          showCreate={showCreateChannel}
          setShowCreate={setShowCreateChannel}
          createName={createChannelName}
          setCreateName={setCreateChannelName}
          handleCreate={handleCreateChannel}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 relative">
            {!activeChannel ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-[var(--text-muted)]">Bir kanal seçin</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <span className="text-[28px]">💬</span>
                <p className="text-[12px] text-[var(--text-muted)]">#{activeChannel.name} kanalında henüz mesaj yok</p>
                <p className="text-[11px] text-[var(--text-muted)]">İlk mesajı gönderin!</p>
              </div>
            ) : (
              <AnimatePresence>
                {messages.map((msg, i) => {
                  const isMe = msg.user_id === (currentUser?.id || 1);
                  const user = getUserById(msg.user_id);
                  const threadCount = replyCounts[msg.id] || 0;
                  return (
                    <div key={msg.id || i}>
                      <ChatMessage
                        msg={msg}
                        isMe={isMe}
                        user={user}
                        formatTime={formatTime}
                        index={i}
                      />
                      {/* Thread indicator */}
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isMe ? 'pr-10' : 'pl-10'}`}>
                        <button
                          onClick={() => handleOpenThread(msg)}
                          className="flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-md text-[10px] text-[var(--accent-primary)] hover:bg-[var(--accent-primary-subtle)] transition-colors"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                          </svg>
                          {threadCount > 0 ? `${threadCount} yanıt` : 'Yanıtla'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </AnimatePresence>
            )}
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

        {/* Thread Panel (Apple Messages slide-in) */}
        <AnimatePresence>
          {threadParent && (
            <ThreadPanel
              parentMsg={threadParent}
              onClose={() => setThreadParent(null)}
              currentUser={currentUser}
              users={users}
              formatTime={formatTime}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default Chat;
