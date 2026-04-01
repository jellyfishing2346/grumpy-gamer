import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';

const ToastTrigger: React.FC<{ message: string; type?: 'success' | 'loss' | 'draw' | 'info' }> = ({ message, type }) => {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast(message, type)}>
      Show Toast
    </button>
  );
};

describe('ToastProvider', () => {
  test('renders children', () => {
    render(
      <ToastProvider>
        <div>Child content</div>
      </ToastProvider>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('shows toast message when showToast is called', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Test toast!" type="success" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('Test toast!')).toBeInTheDocument();
  });

  test('shows success toast with correct icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Win!" type="success" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  test('shows loss toast with correct icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Loss!" type="loss" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  test('shows draw toast with correct icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Draw!" type="draw" />
      </ToastProvider>
    );
    act(() => {
      screen.getByText('Show Toast').click();
    });
    expect(screen.getByText('🤝')).toBeInTheDocument();
  });

  test('throws error when useToast used outside provider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ToastTrigger message="test" />);
    }).toThrow();
    consoleError.mockRestore();
  });
});