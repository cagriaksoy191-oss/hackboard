const allowedOrigins = ['http://localhost:5173', 'http://localhost:3001'];

const corsOriginCheck = (origin) => {
  return allowedOrigins.includes(origin);
};

const testCases = [
  { origin: 'http://localhost:5173', expected: true },
  { origin: 'http://localhost:3001', expected: true },
  { origin: undefined, expected: false },
  { origin: 'http://evil.com', expected: false },
  { origin: 'http://localhost:3000', expected: false },
];

let allPassed = true;

testCases.forEach((tc) => {
  const result = corsOriginCheck(tc.origin);
  if (result === tc.expected) {
    console.log(`PASS: origin=${tc.origin} expected=${tc.expected} result=${result}`);
  } else {
    console.log(`FAIL: origin=${tc.origin} expected=${tc.expected} result=${result}`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('All CORS tests passed!');
  process.exit(0);
} else {
  console.log('CORS tests failed!');
  process.exit(1);
}
