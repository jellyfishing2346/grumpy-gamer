import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import Chatbot from './Chatbot';

describe('Chatbot', () => {
  it('blocks access if not authenticated', () => {
    render(
      <AuthProvider>
        <Chatbot />
      </AuthProvider>
    );
    expect(screen.getByText(/You must be logged in to use the chatbot/i)).toBeInTheDocument();
  });

  // Add more tests for authenticated state, message sending, etc.
});
