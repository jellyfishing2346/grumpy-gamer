<div align="center">

# 🎮 Grumpy Gamer
### *Teaching AI to rage-quit less than humans — one game at a time.*

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-grumpy--gamer.vercel.app-7ecbff?style=for-the-badge)](https://grumpy-gamer.vercel.app)
[![API Docs](https://img.shields.io/badge/📖_API_Docs-Swagger_UI-009688?style=for-the-badge)](https://grumpy-gamer.onrender.com/docs)
[![GitHub](https://img.shields.io/badge/⭐_GitHub-jellyfishing2346-24292e?style=for-the-badge&logo=github)](https://github.com/jellyfishing2346/grumpy-gamer)

**Author:** Faizan Khan &nbsp;|&nbsp; **Duration:** 15 Weeks (January – April 2026)

</div>

---

## 🧠 The Idea

What if you could challenge an AI at chess, get destroyed at Wordle, watch yourself make terrible decisions in a replay, and then have another AI roast you — constructively — about your gameplay? That's Grumpy Gamer.

It started as a simple idea: build a platform where humans play classic games against AI. It grew into a full production system with 12 games, a replay engine, personalized AI coaching, a live spectator mode, and enough tests to make a senior engineer nod approvingly.

---

## ⚡ What Was Built

### 🎯 12 Games, All vs AI
| Game | AI Type | Difficulty Levels |
|------|---------|-------------------|
| ♟️ Chess | Minimax + Alpha-Beta | Easy / Medium / Hard |
| ⛀ Checkers | Minimax | Easy / Medium / Hard |
| 🔵 Connect Four | Minimax | Easy / Medium / Hard |
| ⭕ TicTacToe | Minimax | Easy / Medium / Hard |
| 🔄 Othello | Minimax | Easy / Medium / Hard |
| 🟡 Wordle | Statistical Word Model | Easy / Medium / Hard |
| 💣 Minesweeper | Constraint Solver | Easy / Medium / Hard |
| 🃏 Memory | Pattern Tracker | Easy / Medium / Hard |
| 🔢 2048 | Expectimax | Easy / Medium / Hard |
| ✂️ Rock Paper Scissors | Frequency Analysis | Easy / Medium / Hard |
| 🧩 Sudoku | Backtracking Solver | Easy / Medium / Hard |
| 🪢 Hangman | Letter Frequency | Easy / Medium / Hard |

### 🎬 Replay System
Every move you make is recorded. After every game, you can rewatch it step-by-step, share a public spectator link with anyone, and compare what you did vs what you should have done.

### 🤖 AI Coach
Powered by Claude (Anthropic), the AI Coach analyzes your full game history and gives you personalized **Glows** (what you're crushing) and **Grows** (where you're leaving wins on the table). It's like having a coach who actually watched all your games — because it did.

### 📊 Dashboard & Analytics
Live win/loss/draw breakdowns per game, a 30-day activity heatmap, performance over time charts, and a head-to-head comparison view. Stats are cached server-side so the dashboard loads instantly.

### 💬 Chatbot
An in-app Claude-powered chatbot that answers strategy questions, explains game rules, and gives tips — available right in the sidebar while you play.

---

## 🛠️ Tech Stack

```
Frontend        React 18 + TypeScript + React Router + Chart.js
Backend         FastAPI (Python) + PostgreSQL (Neon)
Auth            JWT with token expiry and refresh handling
AI              Claude API (Anthropic) — Coach + Chatbot
Deployment      Vercel (frontend) + Render (backend) + Neon (DB)
CI/CD           GitHub Actions — lint, test, build on every PR
Monitoring      Sentry (errors) + cron-job.org (keep-alive)
Testing         Jest + React Testing Library + Playwright + pytest
```

---

## 📅 15-Week Journey

```
Weeks 1–4   ████████  Foundation
             Project setup, all 12 games playable, FastAPI backend,
             PostgreSQL schema, JWT auth, initial deployment

Weeks 5–6   ██████    AI Agents
             Heuristic AI for all 12 games (minimax, expectimax,
             constraint solvers), RL training pipeline setup

Weeks 7–8   ██████    Analytics & Dashboard
             Stats API, activity heatmap, performance charts,
             AI Coach integration, Chatbot

Week 9      ████      UX Polish
             Token expiry handling, toast notifications, play again,
             page transitions, mobile responsive, replay recording

Week 10     ████      Performance
             Lazy loading, DB indexes, API caching, memoization,
             pagination, Lighthouse audit fixes

Week 11     ████      Deployment Refinement
             CI testing, Sentry, health check, keep-alive ping,
             rate limiting, CORS, .env docs, CONTRIBUTING.md

Week 12     ████      Documentation & Testing
             Screenshots, Swagger docs, JSDoc, 27 backend tests,
             23 frontend tests, 12 Playwright E2E tests,
             TypeScript strict, error boundaries

Week 13     ████      Final Polish
             Database migration (Neon), replay bug fixes,
             README polish, project summary, bug sweep
```

---

## 🧪 Testing at a Glance

| Layer | Tests | Tool | Coverage |
|-------|-------|------|----------|
| Backend API | 27 tests | pytest + mocks | Auth, Stats, Replays |
| Frontend Components | 23 tests | Jest + RTL | EmptyState, Skeleton, Toast, PlayAgain |
| End-to-End | 12 tests | Playwright | Auth flows, Navigation, Game pages |

All tests run automatically on every pull request via GitHub Actions. A PR cannot be merged unless all tests pass.

---

## 🔧 Key Technical Decisions

**Why FastAPI over Django?**
FastAPI's automatic Swagger docs, async support, and Pydantic validation made it faster to build and iterate. The auto-generated `/docs` page at launch saved hours of documentation work.

**Why heuristic AI before RL?**
Minimax and constraint-solver AIs could be built quickly and deliver a real gameplay experience immediately. RL training takes time — shipping playable games first was the right call.

**Why in-memory caching over Redis?**
The free-tier deployment doesn't support Redis. A Python `dict` with TTL was sufficient for single-worker Render deployments and reduced dashboard load times to near-instant.

**Why Neon over Render PostgreSQL?**
Render free databases expire after 90 days. Neon offers free PostgreSQL that never expires, with the same connection string format — a zero-code-change migration.

---

## ⚠️ Known Limitations

- Chess and Checkers don't record replays yet — the move structure is complex and will be tackled in Week 14
- RL agents are still in training — heuristic AI is used for most games in the meantime
- Render free tier causes ~2s cold starts after 15 minutes idle (mitigated by keep-alive ping)
- No real-time multiplayer yet — WebSockets are on the roadmap

---

## 🔭 What's Next

**Week 14 — AI & RL Training**
Train DQN/PPO agents for TicTacToe, Connect Four, and Checkers. Add model versioning, difficulty levels backed by checkpoint selection, and a training metrics dashboard.

**Week 15 — Final Presentation**
Demo video, slide deck, final metrics, and project handover.

---

<div align="center">

*Built with too much caffeine, too many late nights, and a genuine love for making AI look bad at board games.*

**[Play Now →](https://grumpy-gamer.vercel.app) · [Slide Deck →](https://docs.google.com/presentation/d/1nBV9nYjTpSZuZ35boGEnFM7Tr09Mkt9f74vHxj8Gt3A/edit?usp=sharing)**

</div>