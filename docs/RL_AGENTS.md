# 🤖 Grumpy Gamer — RL Agent Documentation

This document describes the Reinforcement Learning (RL) agent system, 
how AI indicators work in-game, and how to train or load new models.

---

## Overview

Grumpy Gamer uses a hybrid AI approach:

- **Heuristic AI** — Minimax with alpha-beta pruning (Chess, Checkers, Connect Four, TicTacToe, Othello)
- **RL Agents** — PPO/DQN trained models (TicTacToe, Connect Four, Checkers, Othello, Minesweeper, 2048)
- **Fallback** — If an RL model fails to load, the game automatically falls back to heuristic AI

---

## In-Game AI Indicators

Every game shows a badge indicating which AI type is active:

| Indicator | Meaning |
|-----------|---------|
| `🧠 RL Agent (trained model)` | RL model loaded and responding |
| `🧠 RL Agent (using fallback)` | RL API failed, using heuristic fallback |
| `🤖 RL Agent ✓` | RL model active and trained |
| `🤖 RL Agent (training...)` | RL model not yet available |
| `Difficulty: Easy/Medium/Hard` | Heuristic minimax AI active |

---

## Trained Models

| Game | Algorithm | Win Rate vs Random | Timesteps | Status |
|------|-----------|-------------------|-----------|--------|
| TicTacToe | PPO | 83% | 100k | ✅ Trained |
| Connect Four | PPO | 96% | 100k | ✅ Trained |
| Checkers | PPO | 50% | 300k | ✅ Trained |
| Othello | PPO | 20% | 200k | ✅ Trained |
| Minesweeper | DQN | — | 100k | ✅ Trained |
| Chess | PPO | — | — | ⚠️ Needs GPU |

---

## Difficulty Levels → Checkpoints

Different difficulty levels map to different training checkpoints:

| Game | Easy | Medium | Hard |
|------|------|--------|------|
| TicTacToe | 40k steps (weaker) | 80k steps | best model |
| Connect Four | best model | best model | final model |
| Checkers | best model | best model | final model |
| Othello | best model | best model | best model |

---

## API Endpoints

### Get All Model Metrics
```
GET /api/rl/metrics
```
Returns training stats for all games (win rate, timesteps, model size, status).

### Get Model Metrics for a Game
```
GET /api/rl/metrics/{game_id}
```

### Get All Checkpoints for a Game
```
GET /api/rl/checkpoints/{game_id}
```
Returns all saved checkpoint files with their training step count and file size.

### Get Difficulty Level Model
```
GET /api/rl/difficulty/{game_id}/{level}
```
Returns the checkpoint file mapped to a difficulty level (easy/medium/hard).

### Example: TicTacToe Easy
```
GET /api/rl/difficulty/tictactoe/easy

{
  "game_id": "tictactoe",
  "level": "easy",
  "checkpoint": "checkpoint_40000_steps.zip",
  "model_exists": true
}
```

---

## Training a New Model

### TicTacToe
```bash
cd backend
python3 -m rl.train_tictactoe --algorithm PPO --opponent random --timesteps 100000
```

### Connect Four
```bash
python3 -m rl.train_connectfour --timesteps 100000 --opponent random
```

### Checkers
```bash
python3 -m rl.train_checkers --timesteps 300000 --opponent random
```

### Othello
```bash
python3 -m rl.train_othello --timesteps 200000 --opponent random --no-curriculum --envs 4
```

---

## Model Files

All models are stored in `backend/rl/models/`:

```
rl/models/
├── tictactoe_best.zip          ← Production model
├── tictactoe_ppo_random/
│   ├── best_model.zip
│   ├── checkpoint_40000_steps.zip
│   ├── checkpoint_80000_steps.zip
│   └── final_model.zip
├── connectfour_best.zip
├── connectfour_ppo_random/
├── checkers_best.zip
├── checkers_ppo_random/
├── othello_best.zip
├── othello_ppo/
├── chess_best.zip
└── minesweeper_best.zip
```

---

## Adding a New RL Model

1. Train the model using the training scripts in `backend/rl/`
2. Save the best model to `backend/rl/models/{game}_best.zip`
3. Add an entry to `TRAINING_RESULTS` in `backend/rl_metrics.py`
4. Add difficulty mappings to `DIFFICULTY_CHECKPOINTS` in `backend/rl_metrics.py`
5. The game frontend will automatically use the new model via the `/api/rl/{game}/move` endpoint