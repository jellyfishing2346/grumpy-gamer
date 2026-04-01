import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlayAgainButton from './PlayAgainButton';

describe('PlayAgainButton', () => {
  test('renders with default label', () => {
    render(<PlayAgainButton />);
    expect(screen.getByText('🔄 Play Again')).toBeInTheDocument();
  });

  test('renders with custom label', () => {
    render(<PlayAgainButton label="↺ Try Again" />);
    expect(screen.getByText('↺ Try Again')).toBeInTheDocument();
  });

  test('calls onPlayAgain when clicked', () => {
    const mockFn = jest.fn();
    render(<PlayAgainButton onPlayAgain={mockFn} />);
    fireEvent.click(screen.getByText('🔄 Play Again'));
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('calls window.location.reload when no onPlayAgain provided', () => {
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      writable: true,
    });
    render(<PlayAgainButton />);
    fireEvent.click(screen.getByText('🔄 Play Again'));
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});