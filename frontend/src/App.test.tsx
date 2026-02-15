import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Grumpy Gamer landing heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { name: /Grumpy Gamer/i, level: 1 });
  expect(heading).toBeInTheDocument();
});

test('renders Get Started Free button', () => {
  render(<App />);
  const button = screen.getByText(/Get Started Free/i);
  expect(button).toBeInTheDocument();
});
