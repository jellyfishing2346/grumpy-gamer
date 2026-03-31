<div align="center">

# 🎮 Contributing to Grumpy Gamer

**Welcome, challenger!** Whether you're squashing bugs, adding features, or improving docs — we're glad you're here.

[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge)](https://github.com/jellyfishing2346/grumpy-gamer/pulls)
[![Code Style](https://img.shields.io/badge/code_style-flake8-blue?style=for-the-badge)](https://flake8.pycqa.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

</div>

---

## 📋 Table of Contents

- [🚀 Development Setup](#-development-setup)
- [🧪 Running Tests](#-running-tests)
- [🌿 Branch Naming](#-branch-naming)
- [🔁 Pull Request Process](#-pull-request-process)
- [✨ Code Style](#-code-style)
- [💬 Commit Messages](#-commit-messages)

---

## 🚀 Development Setup

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.9+ |
| PostgreSQL | 14+ |

### ⚡ Frontend

```bash
cd frontend
npm install
npm start
# → Running at http://localhost:3000
```

### 🐍 Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up your environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and SECRET_KEY

uvicorn api:app --reload --port 8000
# → Running at http://localhost:8000
```

> 💡 **Tip:** The frontend proxies API requests to `localhost:8000` in development, so you don't need to worry about CORS locally.

---

## 🧪 Running Tests

### Frontend Tests

```bash
cd frontend
npm test -- --watchAll=false
```

### Backend Tests

```bash
cd backend
pytest tests/ -v
```

### Linting

```bash
# Frontend
cd frontend && npm run lint

# Backend
cd backend && flake8 .
```

> ✅ All tests and linting must pass before a PR can be merged.

---

## 🌿 Branch Naming

Always branch off `main` using this format:

```
issue-{number}-{short-description}
```

| ✅ Good | ❌ Bad |
|--------|--------|
| `issue-103-token-expiry` | `fix-bug` |
| `issue-114-memoize-components` | `my-branch` |
| `issue-150-cors` | `feature` |

---

## 🔁 Pull Request Process

1. **Branch** from `main` using the naming convention above
2. **Code** your changes and write/update tests if needed
3. **Verify** all tests pass and linting is clean
4. **Open a PR** against `main` with a clear title and description
5. **Pass CI** — all checks must be green before merging
6. **Squash and merge** when approved

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- Specific change 1
- Specific change 2

## Testing
How you tested the changes locally.

## Issues Closed
Closes #123
```

---

## ✨ Code Style

### 🖥️ Frontend (TypeScript / React)

- Use **functional components** with hooks — no class components
- Wrap expensive calculations in `useMemo`
- Wrap event handlers passed as props in `useCallback`
- Keep components **focused** — split large ones into smaller pieces
- Use **inline styles** consistent with the existing dark theme (`#0f1117` background, `#7ecbff` accent)
- Lazy load heavy components with `React.lazy()`

### 🐍 Backend (Python / FastAPI)

- Follow **PEP 8** — enforced by flake8, max line length 100
- One responsibility per endpoint
- Always **close database connections** after use
- Use **type hints** where possible
- Add **docstrings** to all endpoint functions
- Cache expensive queries where appropriate

---

## 💬 Commit Messages

Keep it short, clear, and reference the issue:

```
Short description of change (#issue-number)
```

| ✅ Good | ❌ Bad |
|--------|--------|
| `Add lazy loading to game components (#111)` | `fixed stuff` |
| `Fix token expiry redirect (#103)` | `update` |
| `Add rate limiting to login endpoint (#148)` | `changes` |

---

<div align="center">

**Happy coding! May your wins be plentiful and your bugs be few. 🏆**

</div>