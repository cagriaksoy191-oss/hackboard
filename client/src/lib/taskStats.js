export function calculateTaskStats(tasks) {
  if (!tasks || !Array.isArray(tasks)) {
    return { total: 0, done: 0, inProgress: 0, todo: 0 };
  }

  return tasks.reduce(
    (acc, task) => {
      acc.total += 1;
      if (task && typeof task === 'object') {
        if (task.status === 'done') {
          acc.done += 1;
        } else if (task.status === 'in-progress') {
          acc.inProgress += 1;
        } else if (task.status === 'todo') {
          acc.todo += 1;
        }
      }
      return acc;
    },
    { total: 0, done: 0, inProgress: 0, todo: 0 }
  );
}
