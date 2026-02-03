import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders navigation with Home link', () => {
  render(<App />);
  const homeLink = screen.getByText(/Home/i);
  expect(homeLink).toBeInTheDocument();
});

test('renders navigation with FAQ link', () => {
  render(<App />);
  const faqLink = screen.getByText(/FAQ/i);
  expect(faqLink).toBeInTheDocument();
});

test('renders navigation with Contact link', () => {
  render(<App />);
  const contactLink = screen.getByText(/Contact/i);
  expect(contactLink).toBeInTheDocument();
});
