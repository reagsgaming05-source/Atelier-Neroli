import { describe, expect, it } from 'vitest';
import { alignMarks, breaksOf, charAt, pausesOf, wordsSaid } from '../src/lib/readalong';

const TEXT = 'Allah envoya Nouh, paix sur lui, vers son peuple.';

describe('read-along', () => {
  it('finds where words start after punctuation', () => {
    expect(breaksOf(TEXT).map((b) => TEXT.slice(b, b + 4))).toEqual(['paix', 'vers']);
    expect(breaksOf('Il dit : « Venez »')).toEqual([9]);
  });

  it('finds the silences in a recording', () => {
    const levels = [5, 5, 0, 0, 0, 5, 0, 5, 0, 0, 0, 0];
    expect(pausesOf(levels, 0.1, 1, 3)).toEqual([
      { start: 0.2, end: expect.closeTo(0.5) },
      { start: 0.8, end: expect.closeTo(1.2) },
    ]);
  });

  it('pins the pauses of the voice to the punctuation, and leaves out a breath elsewhere', () => {
    // The voice says "Allah envoya Nouh," fast, then slows down.
    const marks = alignMarks(TEXT, [0, 6], [
      { start: 1, end: 1.4 },
      { start: 3, end: 3.3 },
      { start: 4.6, end: 4.7 }, // a breath in the middle of "vers son peuple"
    ]);
    const paix = TEXT.indexOf('paix');
    const vers = TEXT.indexOf('vers');
    expect(marks).toEqual([
      [0, 0],
      [paix - 1, 1],
      [paix, 1.4],
      [vers - 1, 3],
      [vers, 3.3],
      [TEXT.length, 6],
    ]);
    // During a pause the words before it are said, the next one not yet.
    expect(wordsSaid(TEXT, charAt(marks, 1.2))).toBe(3);
    expect(wordsSaid(TEXT, charAt(marks, 1.45))).toBe(4);
    expect(wordsSaid(TEXT, charAt(marks, 6))).toBe(9);
    expect(wordsSaid(TEXT, charAt(marks, 0))).toBe(0);
  });

  it('follows the clock evenly between two pins', () => {
    expect(charAt([[0, 10], [100, 20]], 15)).toBe(50);
    expect(charAt([[0, 10], [100, 20]], 5)).toBe(0);
    expect(charAt([[0, 10], [100, 20]], 25)).toBe(100);
  });
});
