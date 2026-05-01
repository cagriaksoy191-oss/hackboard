import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usersAPI, tasksAPI } from '../lib/api';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

function Team() {
  const [users, setUsers] = useState([]);
  const [userTasks, setUserTasks] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    usersAPI.getAll().then((res) => setUsers(res.data));
    tasksAPI.getAll().then((res) => {
      const map = {};
      res.data.forEach((t) => {
        if (t.assigned_to) {
          if (!map[t.assigned_to]) map[t.assigned_to] = [];
          map[t.assigned_to].push(t);
        }
      });
      setUserTasks(map);
    });
  }, []);

  const handleUserClick = (user) => {
    if (selectedUser?.id === user.id) {
      setSelectedUser(null);
    } else {
      setSelectedUser(user);
    }
  };

  const processedUsers = useMemo(() => {
    return users.map((user) => {
      const tasks = userTasks[user.id] || [];
      const completedCount = tasks.filter((t) => t.status === 'done').length;

      const name = user.name;
      const firstSpaceIndex = name.indexOf(' ');
      const firstName = firstSpaceIndex === -1 ? name : name.slice(0, firstSpaceIndex);

      let initials = '';
      let isNewWord = true;
      for (let i = 0; i < name.length; i++) {
        const char = name[i];
        if (char !== ' ') {
          if (isNewWord) {
            initials += char;
            if (initials.length === 2) break;
            isNewWord = false;
          }
        } else {
          isNewWord = true;
        }
      }
      const formattedInitials = initials.toUpperCase();

      return {
        ...user,
        initials: formattedInitials,
        tasksCount: tasks.length,
        completedCount,
        chartData: [{ name: firstName, completed: completedCount }],
      };
    });
  }, [users, userTasks]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Takim Uyeleri</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {processedUsers.map((user, i) => {
          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => handleUserClick(user)}
              className="glass rounded-2xl p-5 card-hover cursor-pointer"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: user.avatar_color || '#7c3aed' }}
                  >
                    {user.initials}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-card ${
                      user.is_online ? 'bg-success' : 'bg-error'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{user.name}</h3>
                  <p className="text-xs text-gray-400">{user.role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-white">{user.tasksCount}</p>
                  <p className="text-xs text-gray-400">Toplam</p>
                </div>
                <div className="bg-white/5 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-success">{user.completedCount}</p>
                  <p className="text-xs text-gray-400">Tamamlanan</p>
                </div>
              </div>

              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={user.chartData}>
                    <Bar dataKey="completed" fill={user.avatar_color || '#7c3aed'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          );
        })}
      </div>

      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {selectedUser.name} - Gorevleri
            </h3>
            <button
              onClick={() => setSelectedUser(null)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {(userTasks[selectedUser.id] || []).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${
                    task.status === 'done' ? 'bg-success' :
                    task.status === 'in-progress' ? 'bg-warning' :
                    task.status === 'testing' ? 'bg-purple-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm text-white">{task.title}</span>
                </div>
                <span className="text-xs text-gray-400">{task.priority}</span>
              </div>
            ))}
            {(!userTasks[selectedUser.id] || userTasks[selectedUser.id].length === 0) && (
              <p className="text-gray-500 text-sm text-center py-4">Atanmis gorev yok.</p>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default Team;
