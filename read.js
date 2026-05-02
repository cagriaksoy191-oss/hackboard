console.log(`import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usersAPI, tasksAPI } from '../lib/api';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';
import { getInitials } from '../lib/stringUtils';


const getTaskStatusColorClass = (status) => {
  switch (status) {
    case 'done': return 'bg-success';
    case 'in-progress': return 'bg-warning';
    case 'testing': return 'bg-purple-500';
    default: return 'bg-blue-500';
  }
};


const processUsersData = (users, userTasks) => {
  return users.map((user) => {
    const tasks = userTasks[user.id] || [];
    const completedCount = tasks.filter((t) => t.status === 'done').length;

    const name = user.name;
    const firstSpaceIndex = name.indexOf(' ');
    const firstName = firstSpaceIndex === -1 ? name : name.slice(0, firstSpaceIndex);

    const formattedInitials = getInitials(name);

    return {
      ...user,
  `); console.log('---...---'); console.log(`2">
            {(userTasks[selectedUser.id] || []).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => navigate(`/tasks/${task.id}`)}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${getTaskStatusColorClass(task.status)}`} />
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
`);