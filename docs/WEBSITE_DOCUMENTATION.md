# Grumpy Gamer - Official Documentation

## Overview

Grumpy Gamer is a web-based platform for playing, training, and analyzing various classic and AI-driven games. The project is organized into backend, frontend, and data components, supporting both human and AI agents for games like Sudoku, Wordle, Chess, Checkers, Connect Four, Othello, Minesweeper, and 2048.

---

## Project Structure

- **backend/**: Python FastAPI backend for authentication, game logic, statistics, and AI agent training.
- **frontend/**: React TypeScript frontend for the user interface.
- **agents/**: Core agent logic for games, including base classes and specific implementations.
- **data/**: Game data, scripts, and tests for agents and games.
- **games/**: Game logic modules for Sudoku and Wordle.
- **tests/**: Python test suite for game environments and agents.
- **docs/**: Documentation and images.

---

## Backend

- Built with Python (see requirements.txt).
- Handles authentication (`auth.py`), JWT utilities, user management, and game statistics.
- Exposes RESTful APIs for the frontend.
- Contains reinforcement learning (RL) training scripts for various games under `backend/rl/`.
- Supports agent and environment modularity for easy extension.

### Key Files

- `api.py`: Main API endpoints.
- `auth.py`: Authentication logic.
- `game_stats.py`: Game statistics tracking.
- `rl/`: RL training scripts and agent/environment definitions.

---

## Frontend

- Built with React and TypeScript.
- Organized into components, hooks, services, and configuration.
- Provides a modern UI for playing games, viewing stats, and interacting with AI agents.

### Key Files

- `src/App.tsx`: Main application entry point.
- `src/components/`: UI components for games and user interaction.
- `public/`: Static assets and HTML templates.

---

## Agents

- Modular agent system for different games.
- Includes both rule-based and learning-based agents.
- Easily extendable for new games or agent types.

---

## Data

- Contains scripts for running and testing agents.
- Includes test suites for Sudoku and Wordle.
- Stores documentation and planning files.

---

## Games

- Core logic for supported games.
- Designed for both backend integration and standalone use.

---

## Testing

- Python test files for each game environment and agent.
- Located in the `tests/` directory.

---

## Deployment

- Supports deployment via Docker (`Dockerfile`), Fly.io (`fly.toml`), and Vercel (`vercel.json`).
- Procfile for process management.

---

## Getting Started

1. **Backend**: Install Python dependencies from `requirements.txt` and run the FastAPI server.
2. **Frontend**: Install Node.js dependencies from `package.json` and start the React development server.
3. **Testing**: Run Python tests in the `tests/` directory.
4. **Deployment**: Use Docker, Fly.io, or Vercel as per configuration files.

---

## License

See `LICENSE.md` for licensing information.

---

For more details, refer to the in-code documentation and the `docs/` directory.

---

## Chatbot

The Grumpy Gamer platform includes an integrated AI-powered chatbot to assist users, answer questions, and provide guidance throughout the site.

### Features

- **Conversational AI**: The chatbot can answer questions about the platform, games, and features using both rule-based logic and a large language model (LLM) backend.
- **Game Tutorials**: Ask for step-by-step instructions or tips for any supported game.
- **FAQs**: Get instant answers to common questions about gameplay, accounts, and troubleshooting.
- **Personalized Recommendations**: The chatbot can suggest games to try based on your activity and preferences.
- **Contextual Help**: Receive guidance based on your current page or recent actions.
- **Fallback to LLM**: If a rule-based answer is not available, the chatbot uses an LLM (e.g., OpenAI) for more general or complex queries.

### How to Use

1. **Open the Chatbot**: Click the chatbot icon in the lower-right corner of the site.
2. **Type Your Question**: Enter any question or request for help (e.g., "How do I play Othello?" or "Show me my stats").
3. **Get Instant Answers**: The chatbot will reply with helpful information, links, or step-by-step instructions.
4. **Follow Up**: Continue the conversation for more details or clarification.

### Technical Details

- **Frontend**: Implemented as a React component (frontend/src/components/Chatbot.tsx). Handles user input, displays chat history, and communicates with the backend.
- **Backend**: FastAPI endpoint at `/api/chatbot` processes messages, determines if a rule-based or LLM response is needed, and returns the reply.
- **Authentication**: Only logged-in users can access the chatbot. Requests are authenticated via JWT tokens.
- **Persistence**: Chat history is stored in the browser for session continuity.

### Example Questions

- "How do I play Connect Four?"
- "What are the rules for Minesweeper?"
- "Suggest a game for me."
- "How do I reset my password?"
- "Show me tips for Chess."

### Limitations

- The chatbot cannot perform account management actions (e.g., password reset) directly, but will guide you to the correct page.
- Some responses may be generic if the LLM is used.

For technical details, see the code in frontend/src/components/Chatbot.tsx and backend/chatbot.py.
