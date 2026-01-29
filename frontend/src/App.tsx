import React from 'react';
import Navbar from "./components/Navbar";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
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
    </Router>
  );
}

export default App;
