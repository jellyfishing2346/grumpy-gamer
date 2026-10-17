import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PredictionMarkets from './PredictionMarkets';

const openMatch = {
  id: 7, game: 'tictactoe', game_label: 'Tic-Tac-Toe',
  bot_a: { id: 'minimax_max', name: 'Minimax Max' },
  bot_b: { id: 'wobbly_wendy', name: 'Wobbly Wendy' },
  odds: { a: 1.59, b: null, draw: 2.13 }, status: 'open', result: null, seconds_left: 95,
};
const settledMatch = {
  ...openMatch, id: 3, status: 'settled', result: 'a', seconds_left: 0,
  moves: [{ player: 'a', move: [1, 1] }, { player: 'b', move: [0, 0] }],
};

function respond(body: unknown, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 400, json: () => Promise.resolve(body) } as Response);
}

let wagerBody: Record<string, unknown> | null = null;

beforeEach(() => {
  wagerBody = null;
  localStorage.setItem('access_token', 'test-token');
  global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith('/api/predictions/wager')) {
      wagerBody = JSON.parse(String(init?.body));
      return respond({ prediction_id: 1, odds: 1.59, balance: 75 });
    }
    if (u.endsWith('/api/predictions/matches')) return respond({ open: [openMatch], recent: [settledMatch] });
    if (u.endsWith('/api/predictions/matches/3')) return respond(settledMatch);
    if (u.endsWith('/api/predictions/my')) {
      return respond({ summary: { total: 0, settled: 0, won: 0, win_rate: null, net: 0 }, predictions: [] });
    }
    if (u.endsWith('/api/predictions/leaderboard')) return respond({ min_predictions: 5, leaderboard: [] });
    if (u.endsWith('/api/coins/balance')) return respond({ balance: 100 });
    return respond({}, false);
  }) as jest.Mock;
});

test('shows open matches with odds and disables outcomes that are not offered', async () => {
  render(<PredictionMarkets />);
  expect(await screen.findByText('1.59')).toBeInTheDocument();
  expect(screen.getAllByText('Minimax Max').length).toBeGreaterThan(0);
  expect(screen.getByText('💰 100 coins')).toBeInTheDocument();
  const radios = screen.getAllByRole('radio');
  expect(radios).toHaveLength(3);
  expect(radios[2]).toBeDisabled(); // Wobbly Wendy can't win this one
});

test('places a prediction with the chosen pick and stake', async () => {
  render(<PredictionMarkets />);
  fireEvent.click(await screen.findByRole('radio', { name: /Minimax Max/ }));
  const stake = screen.getByLabelText(/Stake/);
  fireEvent.change(stake, { target: { value: '40' } });
  expect(screen.getByText('63')).toBeInTheDocument(); // floor(40 * 1.59)
  fireEvent.click(screen.getByRole('button', { name: 'Place prediction' }));
  await waitFor(() => expect(wagerBody).toEqual({ match_id: 7, pick: 'a', stake: 40 }));
  expect(await screen.findByText(/Prediction placed/)).toBeInTheDocument();
});

test('blocks stakes above the balance', async () => {
  render(<PredictionMarkets />);
  fireEvent.click(await screen.findByRole('radio', { name: /Draw/ }));
  fireEvent.change(screen.getByLabelText(/Stake/), { target: { value: '300' } });
  expect(screen.getByText(/You have 100 coins/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Place prediction' })).toBeDisabled();
});

test('opens a replay of a finished match', async () => {
  render(<PredictionMarkets />);
  fireEvent.click(await screen.findByRole('button', { name: 'Watch' }));
  expect(await screen.findByRole('region', { name: 'Match replay' })).toBeInTheDocument();
  expect(screen.getByLabelText('Scrub through moves')).toHaveAttribute('max', '2');
});
