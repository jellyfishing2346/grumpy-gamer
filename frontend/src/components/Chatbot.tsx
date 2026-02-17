import React, { useState, useRef, useEffect } from 'react';

// TypeScript declaration for Google Analytics gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}
import { useAuth } from './AuthProvider';
import './Chatbot.css'; // Create this CSS file for styling


const CHATBOT_HISTORY_KEY = 'chatbot_history';

const getInitialMessages = () => {
  try {
    const stored = localStorage.getItem(CHATBOT_HISTORY_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [
    {
      from: 'bot',
      text: 'Hey there! I am a virtual assistant that can help answer your questions.'
    }
  ];
};


const Chatbot = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  type Message = { from: 'bot' | 'user'; text: string; buttons?: { label: string; value: string }[] };
  const [messages, setMessages] = useState<Message[]>(getInitialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(CHATBOT_HISTORY_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    // Analytics: chatbot opened
    if (isOpen && window.gtag) {
      window.gtag('event', 'chatbot_open', {
        event_category: 'Chatbot',
        event_label: 'Chatbot opened',
      });
    }
  }, [isOpen, messages]);

  // Render links in bot messages
  function renderRichText(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (urlRegex.test(part)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
      }
      return <React.Fragment key={i}>{part}</React.Fragment>;
    });
  }

  // Handle suggestion button click
  function handleSuggestion(value: string) {
    setInput(value);
    // Analytics: suggestion button clicked
    if (window.gtag) {
      window.gtag('event', 'chatbot_suggestion_click', {
        event_category: 'Chatbot',
        event_label: value,
      });
    }
    // Optionally auto-send: handleSend() if desired
  }

  // Handle send message
  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    const userMsg: Message = { from: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    // Analytics: message sent
    if (window.gtag) {
      window.gtag('event', 'chatbot_message_sent', {
        event_category: 'Chatbot',
        event_label: input,
      });
    }
    setInput('');
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('You must be logged in to use the chatbot.');
        setIsLoading(false);
        return;
      }
      const res = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: input })
      });
      if (res.status === 401) {
        setError('Your session has expired. Please log in again.');
        setIsLoading(false);
        return;
      }
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }
      const data = await res.json();
      let botMsg: Message;
      if (typeof data.response === 'string') {
        botMsg = { from: 'bot', text: data.response };
      } else {
        botMsg = { from: 'bot', ...data.response };
      }
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setError('Sorry, there was a problem connecting to the chatbot. Please try again.');
      setMessages(prev => [...prev, { from: 'bot', text: 'Sorry, I could not process your request.' }]);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle clear chat history
  function handleClearHistory() {
    setMessages([
      {
        from: 'bot',
        text: 'Hey there! I am a virtual assistant that can help answer your questions.'
      }
    ]);
    localStorage.removeItem(CHATBOT_HISTORY_KEY);
  }

  if (!isAuthenticated) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#a00', fontWeight: 'bold' }}>
        You must be logged in to use the chatbot.
      </div>
    );
  }

  return (
    <>
      {/* Error message banner */}
      {error && (
        <div
          style={{
            background: '#ffe0e0',
            color: '#a00',
            padding: '8px 16px',
            borderRadius: 8,
            margin: '8px',
            position: 'fixed',
            top: 10,
            right: 10,
            zIndex: 2000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
          }}
          role="alert"
          aria-live="assertive"
        >
          {error}
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            style={{ marginLeft: 16, background: 'none', border: 'none', color: '#a00', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2em' }}
          >
            ×
          </button>
        </div>
      )}
      {/* Small Floating Button */}
      {!isOpen && (
        <button
          className="chatbot-fab chatbot-fab-small"
          onClick={() => setIsOpen(true)}
          aria-label="Open chatbot"
          aria-haspopup="dialog"
          aria-controls="chatbot-window"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') setIsOpen(true);
          }}
        >
          <span role="img" aria-label="mascot">🐶</span>
        </button>
      )}
      {/* Chatbot Window */}
      {isOpen && (
        <div
          className="chatbot-window"
          id="chatbot-window"
          role="dialog"
          aria-modal="true"
          aria-label="Chatbot dialog"
        >
          <div className="chatbot-header">
            <span className="chatbot-title">Buster</span>
            <div className="chatbot-header-actions">
              <button onClick={() => setIsOpen(false)} aria-label="Minimize" tabIndex={0}>_</button>
              <button onClick={() => setIsOpen(false)} aria-label="Close" tabIndex={0}>×</button>
              <button onClick={handleClearHistory} aria-label="Clear chat" title="Clear chat" style={{marginLeft: 8}} tabIndex={0}>🗑️</button>
            </div>
          </div>
          <div className="chatbot-messages" aria-live="polite" aria-atomic="false">
            {messages.map((msg: Message, idx: number) => (
              <div key={idx} className={`chatbot-message chatbot-message-${msg.from}`}
                role="listitem"
                aria-label={msg.from === 'bot' ? 'Bot message' : 'User message'}
              >
                {msg.from === 'bot' && <span className="chatbot-avatar" role="img" aria-label="mascot">🐶</span>}
                <span className="chatbot-text">
                  {renderRichText(msg.text)}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="chatbot-buttons">
                      {msg.buttons.map((btn, bidx) => (
                        <button
                          key={bidx}
                          className="chatbot-suggest-btn"
                          type="button"
                          tabIndex={0}
                          aria-label={btn.label}
                          onClick={() => handleSuggestion(btn.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') handleSuggestion(btn.value);
                          }}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
              </div>
            ))}
            {isLoading && (
              <div className="chatbot-message chatbot-message-bot" aria-live="polite">
                <span className="chatbot-avatar" role="img" aria-label="mascot">🐶</span>
                <span className="chatbot-text chatbot-typing">Typing<span className="chatbot-typing-dot">.</span><span className="chatbot-typing-dot">.</span><span className="chatbot-typing-dot">.</span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chatbot-input-row" onSubmit={handleSend} role="search">
            <input
              type="text"
              placeholder="Ask me a question"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="chatbot-input"
              autoFocus
              disabled={isLoading}
              aria-label="Type your message"
            />
            <button type="submit" className="chatbot-send-btn" aria-label="Send" disabled={isLoading} tabIndex={0}>➤</button>
          </form>
        </div>
      )}
    </>
  );
};

export default Chatbot;
