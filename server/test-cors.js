const allowedOrigins = ['http://localhost:5173', 'http://localhost:3001'];

// Mock Express CORS check
const expressCorsCheck = (origin) => {
  return !origin || allowedOrigins.includes(origin);
};

// Mock Socket.IO CORS check
const socketCorsCheck = (origin) => {
  return allowedOrigins.includes(origin);
};

const expressTestCases = [
  { origin: 'http://localhost:5173', expected: true },
  { origin: 'http://localhost:3001', expected: true },
  { origin: undefined, expected: true }, // REST needs this!
  { origin: 'http://evil.com', expected: false },
  { origin: 'http://localhost:3000', expected: false },
];

const socketTestCases = [
  { origin: 'http://localhost:5173', expected: true },
  { origin: 'http://localhost:3001', expected: true },
  { origin: undefined, expected: false }, // Socket.IO strictly rejects this!
  { origin: 'http://evil.com', expected: false },
  { origin: 'http://localhost:3000', expected: false },
];

let allPassed = true;

console.log('--- Testing Express CORS ---');
expressTestCases.forEach((tc) => {
  const result = expressCorsCheck(tc.origin);
  if (result === tc.expected) {
    console.log(`PASS: origin=${tc.origin} expected=${tc.expected} result=${result}`);
  } else {
    console.log(`FAIL: origin=${tc.origin} expected=${tc.expected} result=${result}`);
    allPassed = false;
  }
});

console.log('\n--- Testing Socket.IO CORS ---');
socketTestCases.forEach((tc) => {
  const result = socketCorsCheck(tc.origin);
  if (result === tc.expected) {
    console.log(`PASS: origin=${tc.origin} expected=${tc.expected} result=${result}`);
  } else {
    console.log(`FAIL: origin=${tc.origin} expected=${tc.expected} result=${result}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\nAll CORS tests passed!');
  process.exit(0);
} else {
  console.log('\nCORS tests failed!');
  process.exit(1);
}
