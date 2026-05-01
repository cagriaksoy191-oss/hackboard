import React from 'react';

function NotificationItem({ n, onClick, typeIcons, formatTime }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex gap-3 p-3 border-b border-theme-subtle hover-surface-bg cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-accent ${
        !n.read ? 'bg-accent/5' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        !n.read ? 'bg-accent/20 text-accent' : 'surface-bg text-secondary'
      }`}>
        {typeIcons[n.type] || typeIcons.activity}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs ${!n.read ? 'font-bold text-primary' : 'text-secondary'}`}>
          {n.title}
        </p>
        <p className="text-xs text-muted truncate">{n.message}</p>
        <p className="text-[10px] text-muted mt-0.5">{formatTime(n.created_at)}</p>
      </div>
      {!n.read && (
        <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-1" />
      )}
    </button>
  );
}

export default NotificationItem;
