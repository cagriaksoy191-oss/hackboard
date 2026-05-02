import test from 'node:test';
import assert from 'node:assert';

test('Test pure logic extracted from TaskTimer', async () => {
    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const getTimerClassName = (isRunning, isOverBudget, isUnderBudget) => {
        const baseClass = "font-mono text-sm px-2 py-1 rounded-lg";
        if (isRunning) return `${baseClass} bg-accent/20 text-accent animate-pulse`;
        if (isOverBudget) return `${baseClass} bg-error/20 text-error`;
        if (isUnderBudget) return `${baseClass} bg-success/20 text-success`;
        return `${baseClass} bg-white/5 text-gray-400`;
    };

    const getEstimatedHoursClassName = (isOverBudget) => {
        return `text-xs ${isOverBudget ? 'text-error' : 'text-success'}`;
    };

    // formatTime
    assert.strictEqual(formatTime(0), '00:00:00');
    assert.strictEqual(formatTime(59), '00:00:59');
    assert.strictEqual(formatTime(60), '00:01:00');
    assert.strictEqual(formatTime(3599), '00:59:59');
    assert.strictEqual(formatTime(3600), '01:00:00');
    assert.strictEqual(formatTime(3661), '01:01:01');
    assert.strictEqual(formatTime(360000), '100:00:00');

    // getTimerClassName
    const baseClass = "font-mono text-sm px-2 py-1 rounded-lg";
    assert.strictEqual(getTimerClassName(true, false, false), `${baseClass} bg-accent/20 text-accent animate-pulse`);
    assert.strictEqual(getTimerClassName(true, true, false), `${baseClass} bg-accent/20 text-accent animate-pulse`);
    assert.strictEqual(getTimerClassName(false, true, false), `${baseClass} bg-error/20 text-error`);
    assert.strictEqual(getTimerClassName(false, false, true), `${baseClass} bg-success/20 text-success`);
    assert.strictEqual(getTimerClassName(false, false, false), `${baseClass} bg-white/5 text-gray-400`);

    // getEstimatedHoursClassName
    assert.strictEqual(getEstimatedHoursClassName(true), 'text-xs text-error');
    assert.strictEqual(getEstimatedHoursClassName(false), 'text-xs text-success');
});
