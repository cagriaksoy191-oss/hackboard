import React, { useState, useEffect, useCallback } from 'react';
import { tasksAPI } from '../lib/api';
import socket from '../lib/socket';

export const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const getTimerClassName = (isRunning, isOverBudget, isUnderBudget) => {
  const baseClass = "font-mono text-sm px-2 py-1 rounded-lg";
  if (isRunning) return `${baseClass} bg-accent/20 text-accent animate-pulse`;
  if (isOverBudget) return `${baseClass} bg-error/20 text-error`;
  if (isUnderBudget) return `${baseClass} bg-success/20 text-success`;
  return `${baseClass} bg-white/5 text-gray-400`;
};

export const getEstimatedHoursClassName = (isOverBudget) => {
  return `text-xs ${isOverBudget ? 'text-error' : 'text-success'}`;
};

function TaskTimer({ task, onTimeUpdate }) {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (task.actual_hours > 0) {
      setElapsed(task.actual_hours * 3600);
    }
  }, [task.actual_hours]);

  const tick = useCallback(() => {
    if (startTime) {
      const now = Date.now();
      const diff = Math.floor((now - startTime) / 1000);
      setElapsed((prev) => prev + 1);
    }
  }, [startTime]);

  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(tick, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, tick]);

  const handleStart = () => {
    setIsRunning(true);
    setStartTime(Date.now());
    socket.emit('timer:start', { taskId: task.id, startTime: Date.now() });
  };

  const handleStop = async () => {
    setIsRunning(false);
    const hours = Math.round((elapsed / 3600) * 100) / 100;
    await tasksAPI.update(task.id, { actual_hours: hours });
    socket.emit('timer:stop', { taskId: task.id, actualHours: hours });
    if (onTimeUpdate) onTimeUpdate(hours);
    setStartTime(null);
  };

  const isOverBudget = task.estimated_hours > 0 && (elapsed / 3600) > task.estimated_hours;
  const isUnderBudget = task.estimated_hours > 0 && (elapsed / 3600) <= task.estimated_hours;

  return (
    <div className="flex items-center gap-2">
      <div className={getTimerClassName(isRunning, isOverBudget, isUnderBudget)}>
        {formatTime(elapsed)}
      </div>

      {task.estimated_hours > 0 && (
        <span className={getEstimatedHoursClassName(isOverBudget)}>
          / {task.estimated_hours}h
        </span>
      )}

      {!isRunning ? (
        <button
          onClick={handleStart}
          className="p-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Zamanlayiciyi Baslat"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      ) : (
        <button
          onClick={handleStop}
          className="p-1.5 rounded-lg bg-error/20 text-error hover:bg-error/30 transition-all duration-200 hover:scale-110 active:scale-95"
          title="Zamanlayiciyi Durdur"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default TaskTimer;
