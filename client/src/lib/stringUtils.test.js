import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getInitials } from './stringUtils.js';

describe('stringUtils - getInitials', () => {
  it('should return "??" for null or undefined', () => {
    assert.strictEqual(getInitials(null), '??');
    assert.strictEqual(getInitials(undefined), '??');
  });

  it('should return "??" for empty string or whitespace', () => {
    assert.strictEqual(getInitials(''), '??');
    assert.strictEqual(getInitials('   '), '??');
  });

  it('should handle single word names', () => {
    assert.strictEqual(getInitials('John'), 'J');
    assert.strictEqual(getInitials('alice'), 'A');
  });

  it('should handle two word names', () => {
    assert.strictEqual(getInitials('John Doe'), 'JD');
    assert.strictEqual(getInitials('alice bob'), 'AB');
  });

  it('should handle more than two words but return only 2 initials', () => {
    assert.strictEqual(getInitials('John Jacob Jingleheimer Schmidt'), 'JJ');
  });

  it('should handle extra spaces between words', () => {
    assert.strictEqual(getInitials('John    Doe'), 'JD');
    assert.strictEqual(getInitials('  Alice   Bob  '), 'AB');
  });
});
