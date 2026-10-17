import { boardAfter, formatCountdown, potentialPayout, pickLabel } from './predictionUtils';
import { coinNote } from './gameStatsService';

describe('boardAfter', () => {
  test('stacks Connect Four pieces from the bottom', () => {
    const moves = [
      { player: 'a' as const, move: 3 },
      { player: 'b' as const, move: 3 },
      { player: 'a' as const, move: 0 },
    ];
    const board = boardAfter('connectfour', moves, 3);
    expect(board).toHaveLength(6);
    expect(board[5][3]).toBe(1);
    expect(board[4][3]).toBe(2);
    expect(board[5][0]).toBe(1);
  });

  test('only applies the first `step` moves', () => {
    const moves = [
      { player: 'a' as const, move: [1, 1] as [number, number] },
      { player: 'b' as const, move: [0, 0] as [number, number] },
    ];
    expect(boardAfter('tictactoe', moves, 0).flat().every((c) => c === 0)).toBe(true);
    const one = boardAfter('tictactoe', moves, 1);
    expect(one[1][1]).toBe(1);
    expect(one[0][0]).toBe(0);
    expect(boardAfter('tictactoe', moves, 2)[0][0]).toBe(2);
  });
});

test('formatCountdown', () => {
  expect(formatCountdown(125.7)).toBe('2:05');
  expect(formatCountdown(9)).toBe('0:09');
  expect(formatCountdown(-3)).toBe('0:00');
});

test('potentialPayout rounds down like the server', () => {
  expect(potentialPayout(25, 1.59)).toBe(39);
  expect(potentialPayout(25, null)).toBe(0);
  expect(potentialPayout(-5, 2)).toBe(0);
});

test('pickLabel', () => {
  expect(pickLabel('a', 'Max', 'Wendy')).toBe('Max wins');
  expect(pickLabel('draw', 'Max', 'Wendy')).toBe('Draw');
});

test('coinNote explains when a game earns nothing', () => {
  expect(coinNote(10, null)).toBe(' +10 coins');
  expect(coinNote(0, 'cooldown')).toMatch(/wait/);
  expect(coinNote(0, 'daily_cap')).toMatch(/limit/);
  expect(coinNote(0, null)).toBe('');
});
