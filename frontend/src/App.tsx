import React, { lazy, Suspense } from 'react';
import type { ReactElement } from 'react';
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";

import Chatbot from "./components/Chatbot";
import './App.css';

import Home from "./components/pages/Home";
import GameSelection from "./components/pages/GameSelection";
import GamePlay from "./components/pages/GamePlay";
import ErrorBoundary from "./components/ErrorBoundary";
import Dashboard from "./components/pages/Dashboard";
import Comparison from "./components/pages/Comparison";
import HumanVsAI from "./components/pages/HumanVsAI";
import About from "./components/pages/About";
import Settings from "./components/pages/Settings";
import ComingSoonGame from "./components/pages/ComingSoonGame";
import LoginPage from "./components/pages/LoginPage";
import SignupPage from "./components/pages/SignupPage";
import ContactPage from "./components/pages/ContactPage";
import FAQPage from "./components/pages/FAQPage";
import LandingPage from "./components/pages/LandingPage";
import ReplayHistory from "./components/pages/ReplayHistory";
import ReplayViewer from "./components/pages/ReplayViewer";
import SpectatorViewer from "./components/pages/SpectatorViewer";
import ProfilePage from "./components/pages/ProfilePage";
import { ToastProvider } from "./components/ToastProvider";
import PageWrapper from "./components/PageWrapper";
import { usePageTitle } from "./hooks/usePageTitle";
const WordleGame = lazy(() => import("./components/games/WordleGame"));
const SudokuGame = lazy(() => import("./components/games/SudokuGame"));
const TicTacToeGame = lazy(() => import("./components/games/TicTacToeGame"));
const ConnectFourGame = lazy(() => import("./components/games/ConnectFourGame"));
const CheckersGame = lazy(() => import("./components/games/CheckersGame"));
const ChessGame = lazy(() => import("./components/games/ChessGame"));
const RockPaperScissorsGame = lazy(() => import("./components/games/RockPaperScissorsGame"));
const MinesweeperGame = lazy(() => import("./components/games/MinesweeperGame"));
const Game2048 = lazy(() => import("./components/games/Game2048"));
const HangmanGame = lazy(() => import("./components/games/HangmanGame"));
const OthelloGame = lazy(() => import("./components/games/OthelloGame"));
const MemoryGame = lazy(() => import("./components/games/MemoryGame"));
const AIMetrics = lazy(() => import("./components/pages/AIMetrics"));


// Component to update the page title on route change
const PageTitleUpdater = () => {
  usePageTitle();
  return null;
};


// Protect all routes except public pages
const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Show landing page for non-authenticated users, otherwise redirect to home
const PublicLandingRoute = () => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <Router>
        <PageTitleUpdater />
        <Navbar />
        <main><Suspense fallback={<div style={{ minHeight: '100vh', background: '#0f1117' }} />}>
          <PageWrapper>
          <Routes>
            {/* Public routes - accessible to everyone */}
            <Route path="/" element={<PublicLandingRoute />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Routes>
                    <Route path="home" element={<Home />} />
                    <Route path="games" element={<GameSelection />} />
                    <Route path="play/:game" element={
                      <ErrorBoundary>
                        <GamePlay />
                      </ErrorBoundary>
                    } />
                    <Route path="play" element={<Navigate to="games" replace />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="comparison" element={<Comparison />} />
                    <Route path="human-vs-ai" element={<HumanVsAI />} />
                    <Route path="about" element={<About />} />
              <Route path="ai-metrics" element={<AIMetrics />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="play/wordle" element={<WordleGame />} />
                    <Route path="play/sudoku" element={<SudokuGame />} />
                    <Route path="play/tictactoe" element={<TicTacToeGame />} />
                    <Route path="play/connectfour" element={<ConnectFourGame />} />
                    <Route path="play/checkers" element={<CheckersGame />} />
                    <Route path="play/chess" element={<ChessGame />} />
                    <Route path="play/rps" element={<RockPaperScissorsGame />} />
                    <Route path="play/minesweeper" element={<MinesweeperGame />} />
                    <Route path="play/2048" element={<Game2048 />} />
                    <Route path="play/hangman" element={<HangmanGame />} />
                    <Route path="play/othello" element={<OthelloGame />} />
                    <Route path="play/memory" element={<MemoryGame />} />
                    <Route path="play/coming-soon" element={<ComingSoonGame name="Coming Soon" />} />
                    <Route path="replays" element={<ReplayHistory />} />
                    <Route path="replay/:session_id" element={<ReplayViewer />} />
                    <Route path="/watch/:session_id" element={<SpectatorViewer />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Routes>
                </ProtectedRoute>
              }
            />
          </Routes>
        </PageWrapper>
          </Suspense></main>
        <Chatbot />
      </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
