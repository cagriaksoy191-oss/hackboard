const fs = require('fs');

const filePath = 'client/src/pages/Team.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// Replace the inline initials logic with the imported function
content = content.replace(
  `import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';`,
  `import {
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';
import { getInitials } from '../lib/stringUtils';`
);

content = content.replace(
  `      let initials = '';
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
      const formattedInitials = initials.toUpperCase();`,
  `      const formattedInitials = getInitials(name);`
);

// Extract status color logic
const statusColorLogic = `
const getTaskStatusColorClass = (status) => {
  switch (status) {
    case 'done': return 'bg-success';
    case 'in-progress': return 'bg-warning';
    case 'testing': return 'bg-purple-500';
    default: return 'bg-blue-500';
  }
};
`;

content = content.replace(
  `function Team() {`,
  `${statusColorLogic}\nfunction Team() {`
);

content = content.replace(
  `                  <span className={\`w-2 h-2 rounded-full \${
                    task.status === 'done' ? 'bg-success' :
                    task.status === 'in-progress' ? 'bg-warning' :
                    task.status === 'testing' ? 'bg-purple-500' : 'bg-blue-500'
                  }\`} />`,
  `                  <span className={\`w-2 h-2 rounded-full \${getTaskStatusColorClass(task.status)}\`} />`
);

// Extract processed users map logic
const mapUsersLogic = `
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
      initials: formattedInitials,
      tasksCount: tasks.length,
      completedCount,
      chartData: [{ name: firstName, completed: completedCount }],
    };
  });
};
`;

content = content.replace(
  `${statusColorLogic}`,
  `${statusColorLogic}\n${mapUsersLogic}`
);

content = content.replace(
  `  const processedUsers = useMemo(() => {
    return users.map((user) => {
      const tasks = userTasks[user.id] || [];
      const completedCount = tasks.filter((t) => t.status === 'done').length;

      const name = user.name;
      const firstSpaceIndex = name.indexOf(' ');
      const firstName = firstSpaceIndex === -1 ? name : name.slice(0, firstSpaceIndex);

      const formattedInitials = getInitials(name);

      return {
        ...user,
        initials: formattedInitials,
        tasksCount: tasks.length,
        completedCount,
        chartData: [{ name: firstName, completed: completedCount }],
      };
    });
  }, [users, userTasks]);`,
  `  const processedUsers = useMemo(() => processUsersData(users, userTasks), [users, userTasks]);`
);


fs.writeFileSync(filePath, content);
console.log('Patched Team.jsx');
