import React from 'react';
import type { ReactElement } from 'react';
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthProvider";
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
import ComingSoonGame from "./components/pages/ComingSoonGame";
import LoginPage from "./components/pages/LoginPage";
import SignupPage from "./components/pages/SignupPage";
import ContactPage from "./components/pages/ContactPage";
import FAQPage from "./components/pages/FAQPage";
import LandingPage from "./components/pages/LandingPage";


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
                  <Route path="/home" element={<Home />} />
                  <Route path="/games" element={<GameSelection />} />
                  <Route path="/play/:game" element={<GamePlay />} />
                  <Route path="/play" element={<Navigate to="/games" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/comparison" element={<Comparison />} />
                  <Route path="/human-vs-ai" element={<HumanVsAI />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/play/wordle" element={<WordleGame />} />
                  <Route path="/play/sudoku" element={<SudokuGame />} />
                  <Route path="/play/coming-soon" element={<ComingSoonGame name="Coming Soon" />} />
                </Routes>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
