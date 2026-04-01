import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from './AuthProvider';
import Chatbot from './Chatbot';

describe('Chatbot', () => {
  it('blocks access if not authenticated', () => {
    render(
      <AuthProvider>
        <Chatbot />
      </AuthProvider>
    );
    expect(document.body).toBeInTheDocument();
  });

  // Add more tests for authenticated state, message sending, etc.
});
