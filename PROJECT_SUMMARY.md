# Grumpy Gamer — Project Summary

**Live Demo:** https://grumpy-gamer.vercel.app  
**Repository:** https://github.com/jellyfishing2346/grumpy-gamer  
**API Docs:** https://grumpy-gamer.onrender.com/docs  
**Author:** Faizan Khan  
**Duration:** 15 Weeks (January – April 2026)

---

## Overview

Grumpy Gamer is a full-stack gaming platform where users can challenge AI opponents across 12 classic games, track their performance over time, watch replays of their games, and receive personalized coaching powered by Claude AI. The platform was built over 15 weeks, with each week focused on a specific area of development.

---

## Goals

The primary goals of the project were to:

- Build a polished, production-ready full-stack web application
- Implement AI opponents using both heuristic algorithms and reinforcement learning
- Create a replay system that records and plays back game moves
- Use Claude AI to provide personalized coaching feedback based on game history
- Deploy the application to production with proper CI/CD, monitoring, and testing

---

## Tech Stack

**Frontend:** React, TypeScript, React Router, Chart.js  
**Backend:** FastAPI (Python), PostgreSQL (Neon), JWT authentication  
**AI:** Claude API (Anthropic) for AI Coach and Chatbot, custom RL agents for games  
**Infrastructure:** Vercel (frontend), Render (backend), Neon (database), GitHub Actions (CI/CD)  
**Testing:** Jest, React Testing Library, Playwright (E2E), pytest  
**Monitoring:** Sentry, cron-job.org keep-alive

---

## Features Implemented

### Games (12 total)
Wordle, TicTacToe, Connect Four, Checkers, Chess, Rock Paper Scissors, Minesweeper, 2048, Hangman, Othello, Memory, and Sudoku. Each game includes a heuristic or RL-based AI opponent with adjustable difficulty.

### Authentication
JWT-based signup and login with token expiry handling, session management, and rate limiting on auth endpoints.

### Dashboard & Stats
Per-game win/loss/draw breakdown, activity heatmap showing games played over the past 30 days, and performance over time chart. Stats are cached server-side for 60 seconds to reduce database load.

### Replay System
Every game records moves to the backend via a `pendingMovesRef` queue that flushes after the game ends. Replays can be watched step-by-step or played back automatically. Replay links can be shared publicly in spectator mode.

### AI Coach
After playing games, users can request personalized feedback from Claude AI. The coach analyzes the user's win/loss history across all games and returns specific "glows" (strengths) and "grows" (areas to improve).

### Chatbot
An in-app chatbot powered by Claude AI that can answer questions about the games, give tips, and discuss strategy.

### Profile Page
Displays user stats, game history, win rates, and allows updating username and password.

### Performance Optimizations
Lazy loading for all 12 game components, database indexes on frequently queried columns, server-side caching for stats endpoints, and `useMemo`/`React.memo` for expensive calculations.

---

## Week by Week Progress

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| 1–4 | Foundation | Project setup, basic games, FastAPI backend, PostgreSQL |
| 5–6 | AI Agents | Heuristic AI for all 12 games, RL training pipeline |
| 7–8 | Analytics | Dashboard, stats API, activity heatmap, performance chart |
| 9 | UX Polish | Token expiry, toasts, play again, transitions, mobile layout |
| 10 | Performance | Lazy loading, DB indexes, API caching, memoization, pagination |
| 11 | Deployment | CI/CD, Sentry, health check, keep-alive, rate limiting, CORS |
| 12 | Testing & Docs | Screenshots, Swagger docs, JSDoc, 27 backend tests, 23 frontend tests, 12 E2E tests |
| 13 | Final Polish | Bug sweep, README polish, project summary, replay fixes |

---

## Technical Decisions & Tradeoffs

**PostgreSQL over MongoDB:** The game stats and replay data are highly relational (users → game sessions → moves), making PostgreSQL a natural fit. The structured schema also made it easy to add indexes for performance.

**FastAPI over Django:** FastAPI's async support, automatic Swagger docs, and Pydantic validation made it faster to build and document the API. Django would have been overkill for this use case.

**In-memory caching over Redis:** For the free tier deployment, a simple Python dict-based cache with TTL was sufficient. Redis would be the next step for a production system with multiple workers.

**Heuristic AI first, RL second:** Heuristic AIs (minimax, MCTS) were implemented first to get all games playable quickly. RL agents are being trained in Week 14 as an enhancement.

**Lazy loading game components:** All 12 game components are lazily loaded with React.lazy() so the initial bundle is smaller and games only load when navigated to.

---

## Testing

| Type | Count | Tool |
|------|-------|------|
| Backend unit tests | 27 | pytest |
| Frontend component tests | 23 | Jest + React Testing Library |
| End-to-end tests | 12 | Playwright |

All tests run automatically on every pull request via GitHub Actions CI.

---

## Known Limitations

- Chess and Checkers replay recording not yet implemented (complexity of move tracking)
- RL agents are still in training — heuristic AI is used for most games
- Render free tier causes ~2 second cold starts after inactivity (mitigated by keep-alive ping)
- No real-time multiplayer (WebSockets not implemented yet)

---

## Future Improvements

- Complete RL training for TicTacToe, Connect Four, and Checkers (Week 14)
- Add real-time multiplayer with WebSockets
- Global leaderboard across all users
- Mobile app (React Native)
- More games: Snake, Tetris, Battleship