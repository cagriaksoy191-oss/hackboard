const users = Array.from({ length: 1000 }, (_, i) => ({ name: "İıI i User " + i }));

function currentApproach() {
  return users.map((u) => u.name.replace(/[İiıI]/g, (m) => {
    const map = { "İ": "I", "i": "i", "ı": "i", "I": "I" };
    return map[m] || m;
  }));
}

const map = { "İ": "I", "i": "i", "ı": "i", "I": "I" };
function optimizedApproach() {
  return users.map((u) => u.name.replace(/[İiıI]/g, (m) => {
    return map[m] || m;
  }));
}

// Warm up
for (let i = 0; i < 100; i++) {
  currentApproach();
  optimizedApproach();
}

console.log('Running baseline (current approach)...');
let start = performance.now();
for (let i = 0; i < 5000; i++) {
  currentApproach();
}
let end = performance.now();
console.log(`current: ${end - start}ms`);

console.log('Running optimized approach...');
start = performance.now();
for (let i = 0; i < 5000; i++) {
  optimizedApproach();
}
end = performance.now();
console.log(`optimized: ${end - start}ms`);
