const fs = require('fs');
const content = fs.readFileSync('client/src/pages/Team.jsx', 'utf8');
console.log(content.slice(0, 1000));
console.log('---...---');
console.log(content.slice(-1000));
