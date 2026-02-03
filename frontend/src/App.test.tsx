import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders navigation with Home link', () => {
  render(<App />);
  const homeLink = screen.getByRole('link', { name: /Home/i });
  expect(homeLink).toBeInTheDocument();
});

test('renders main heading', () => {
  render(<App />);
  const heading = screen.getByRole('heading', { level: 1 });
  expect(heading).toBeInTheDocument();
});

test('renders Get Started button', () => {
  render(<App />);
  const button = screen.getByText(/Get Started Free/i);
  expect(button).toBeInTheDocument();
});
