import React from 'react';
import type { ReactElement } from 'react';
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";

import Chatbot from "./components/Chatbot";
import './App.css';

import Home from "./components/pages/Home";
import GameSelection from "./components/pages/GameSelection";
import GamePlay from "./components/pages/GamePlay";
import Dashboard from "./components/pages/Dashboard";
import Comparison from "./components/pages/Comparison";
import HumanVsAI from "./components/pages/HumanVsAI";
import About from "./components/pages/About";
import Settings from "./components/pages/Settings";
import WordleGame from "./components/games/WordleGame";
import SudokuGame from "./components/games/SudokuGame";
import TicTacToeGame from "./components/games/TicTacToeGame";
import ConnectFourGame from "./components/games/ConnectFourGame";
import CheckersGame from "./components/games/CheckersGame";
import ChessGame from "./components/games/ChessGame";
import RockPaperScissorsGame from "./components/games/RockPaperScissorsGame";
import MinesweeperGame from "./components/games/MinesweeperGame";
import Game2048 from "./components/games/Game2048";
import HangmanGame from "./components/games/HangmanGame";
import OthelloGame from "./components/games/OthelloGame";
import MemoryGame from "./components/games/MemoryGame";
import ComingSoonGame from "./components/pages/ComingSoonGame";
import LoginPage from "./components/pages/LoginPage";
import SignupPage from "./components/pages/SignupPage";
import ContactPage from "./components/pages/ContactPage";
import FAQPage from "./components/pages/FAQPage";
import LandingPage from "./components/pages/LandingPage";
import ReplayHistory from "./components/pages/ReplayHistory";


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
      <Router>
        <Navbar />
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
                  <Route path="play/:game" element={<GamePlay />} />
                  <Route path="play" element={<Navigate to="games" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="comparison" element={<Comparison />} />
                  <Route path="human-vs-ai" element={<HumanVsAI />} />
                  <Route path="about" element={<About />} />
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
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Chatbot />
      </Router>
    </AuthProvider>
  );
}

export default App;
