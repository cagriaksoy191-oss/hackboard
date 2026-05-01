
const userName = "John Doe Middle Name";

function original(name) {
    const names = name.split(' ');
    const firstName = names[0];
    const initials = names.map((w) => w[0]).join('').toUpperCase().slice(0, 2);
    return { firstName, initials };
}

function optimizedV2(name) {
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
    return { firstName, initials: initials.toUpperCase() };
}

// Warm up
for (let i = 0; i < 10000; i++) {
    original(userName);
    optimizedV2(userName);
}

const iterations = 1000000;

console.time('Original');
for (let i = 0; i < iterations; i++) {
    original(userName);
}
console.timeEnd('Original');

console.time('OptimizedV2');
for (let i = 0; i < iterations; i++) {
    optimizedV2(userName);
}
console.timeEnd('OptimizedV2');

// Verify correctness
const testCases = [
    "John Doe Middle Name",
    "Single",
    "  Double  Spaces  ",
    "John Doe",
    "A B",
    "",
    "  "
];

testCases.forEach(tc => {
    const o = original(tc);
    const opt = optimizedV2(tc);
    if (o.firstName !== opt.firstName || o.initials !== opt.initials) {
        console.error(`MATCH FAIL for "${tc}"!`);
        console.error('Original: ', o);
        console.error('Optimized:', opt);
        process.exit(1);
    }
});
console.log("All test cases matched!");
