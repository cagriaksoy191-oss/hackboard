import { initDB, prepare, transaction } from '../server/db.js';

async function run() {
  await initDB();

  console.time('Insert 1000 records');
  for (let i = 0; i < 1000; i++) {
    prepare('INSERT INTO users (name, role, avatar_color, is_online) VALUES (?, ?, ?, ?)').run('User ' + i, 'Developer', '#000000', 1);
  }
  console.timeEnd('Insert 1000 records');

  console.time('Transaction Insert 1000 records');
  const insertMany = transaction(() => {
    for (let i = 0; i < 1000; i++) {
      prepare('INSERT INTO tasks (title, status, priority) VALUES (?, ?, ?)').run('Task ' + i, 'todo', 'low');
    }
  });
  insertMany();
  console.timeEnd('Transaction Insert 1000 records');

  // We will need a way to await final flush if it's async
  const { flushSave } = await import('../server/db.js');
  if (typeof flushSave === 'function') {
    console.time('Wait for final flush');
    await flushSave();
    console.timeEnd('Wait for final flush');
  }
}

run();
