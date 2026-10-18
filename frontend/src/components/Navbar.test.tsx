import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

jest.mock('./AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true, logout: jest.fn() }),
}));

const renderAt = (path: string) =>
  render(<MemoryRouter initialEntries={[path]}><Navbar /></MemoryRouter>);

test('desktop bar shows only the primary links plus a More menu', () => {
  renderAt('/home');
  const bar = screen.getByTestId('navbar-desktop-links');
  const links = within(bar).getAllByRole('link').map((a) => a.textContent);
  expect(links).toEqual(['Home', 'Games', 'Dashboard', '⚔️ Multiplayer', '🏆 Tournaments', '🔮 Predictions']);
  expect(within(bar).queryByText('Comparison')).not.toBeInTheDocument();
});

test('More opens the remaining links and closes on Escape', () => {
  renderAt('/home');
  const more = screen.getByRole('button', { name: /More/ });
  expect(more).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(more);
  const menu = screen.getByRole('menu');
  expect(within(menu).getAllByRole('menuitem')).toHaveLength(9);
  expect(within(menu).getByText('💰 Finances')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('menu')).not.toBeInTheDocument();
});

test('every link appears exactly once in the mobile menu', () => {
  renderAt('/home');
  fireEvent.click(screen.getByLabelText('Toggle menu'));
  const mobile = screen.getByTestId('navbar-mobile-menu');
  const labels = within(mobile).getAllByRole('link').map((a) => a.textContent);
  expect(labels).toHaveLength(15);
  expect(new Set(labels).size).toBe(15);
});
