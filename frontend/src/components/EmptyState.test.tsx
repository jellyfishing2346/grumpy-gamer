import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmptyState from './EmptyState';

// Mock DarkModeProvider
jest.mock('./DarkModeProvider', () => ({
  useDarkModeContext: () => [false],
}));

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('EmptyState', () => {
  test('renders title and description', () => {
    renderWithRouter(
      <EmptyState
        icon="🎮"
        title="No games yet"
        description="Play some games to see your stats."
      />
    );
    expect(screen.getByText('No games yet')).toBeInTheDocument();
    expect(screen.getByText('Play some games to see your stats.')).toBeInTheDocument();
  });

  test('renders icon', () => {
    renderWithRouter(
      <EmptyState icon="🎮" title="Title" description="Desc" />
    );
    expect(screen.getByText('🎮')).toBeInTheDocument();
  });

  test('renders action button when actionLabel and actionRoute provided', () => {
    renderWithRouter(
      <EmptyState
        icon="🎮"
        title="Title"
        description="Desc"
        actionLabel="Browse Games"
        actionRoute="/games"
      />
    );
    expect(screen.getByText('Browse Games')).toBeInTheDocument();
  });

  test('renders secondary button when secondaryLabel and secondaryRoute provided', () => {
    renderWithRouter(
      <EmptyState
        icon="🎮"
        title="Title"
        description="Desc"
        actionLabel="Primary"
        actionRoute="/primary"
        secondaryLabel="Secondary"
        secondaryRoute="/secondary"
      />
    );
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  test('does not render buttons when not provided', () => {
    renderWithRouter(
      <EmptyState icon="🎮" title="Title" description="Desc" />
    );
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});