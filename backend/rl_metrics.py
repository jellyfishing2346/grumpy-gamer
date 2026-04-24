"""
RL Training Metrics API
Provides endpoints for viewing trained model performance stats.
"""
from fastapi import APIRouter
import os

rl_router = APIRouter()

MODELS_DIR = os.path.join(os.path.dirname(__file__), "rl", "models")

TRAINING_RESULTS = {
    "tictactoe": {
        "game": "Tic-Tac-Toe",
        "algorithm": "PPO",
        "timesteps": 100000,
        "win_rate_random": 83,
        "loss_rate_random": 17,
        "draw_rate_random": 0,
        "invalid_moves": 0,
        "training_time_seconds": 38,
        "model_file": "tictactoe_best.zip",
        "status": "trained",
    },
    "connectfour": {
        "game": "Connect Four",
        "algorithm": "PPO",
        "timesteps": 100000,
        "win_rate_random": 96,
        "loss_rate_random": 4,
        "draw_rate_random": 0,
        "invalid_moves": 0,
        "training_time_seconds": 64,
        "model_file": "connectfour_best.zip",
        "status": "trained",
    },
    "checkers": {
        "game": "Checkers",
        "algorithm": "PPO",
        "timesteps": 300000,
        "win_rate_random": 50,
        "loss_rate_random": 50,
        "draw_rate_random": 0,
        "invalid_moves": 0,
        "training_time_seconds": 480,
        "model_file": "checkers_best.zip",
        "status": "trained",
    },
    "othello": {
        "game": "Othello",
        "algorithm": "PPO",
        "timesteps": 200000,
        "win_rate_random": 20,
        "loss_rate_random": 80,
        "draw_rate_random": 0,
        "invalid_moves": 0,
        "training_time_seconds": 780,
        "model_file": "othello_best.zip",
        "status": "trained",
    },
    "chess": {
        "game": "Chess",
        "algorithm": "PPO",
        "timesteps": 0,
        "win_rate_random": None,
        "loss_rate_random": None,
        "draw_rate_random": None,
        "invalid_moves": None,
        "training_time_seconds": 0,
        "model_file": "chess_best.zip",
        "status": "needs_gpu",
    },
    "minesweeper": {
        "game": "Minesweeper",
        "algorithm": "DQN",
        "timesteps": 100000,
        "win_rate_random": None,
        "loss_rate_random": None,
        "draw_rate_random": None,
        "invalid_moves": None,
        "training_time_seconds": 0,
        "model_file": "minesweeper_best.zip",
        "status": "trained",
    },
}


@rl_router.get("/rl/metrics")
def get_rl_metrics():
    """Return training metrics for all RL models."""
    results = []
    for game_id, data in TRAINING_RESULTS.items():
        model_path = os.path.join(MODELS_DIR, data["model_file"])
        model_size_mb = None
        if os.path.exists(model_path):
            model_size_mb = round(os.path.getsize(model_path) / (1024 * 1024), 1)
        results.append({
            "id": game_id,
            **data,
            "model_size_mb": model_size_mb,
            "model_exists": os.path.exists(model_path),
        })
    return {"models": results}


@rl_router.get("/rl/metrics/{game_id}")
def get_game_metrics(game_id: str):
    """Return training metrics for a specific game."""
    if game_id not in TRAINING_RESULTS:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Game {game_id} not found")
    data = TRAINING_RESULTS[game_id]
    model_path = os.path.join(MODELS_DIR, data["model_file"])
    return {
        "id": game_id,
        **data,
        "model_size_mb": round(os.path.getsize(model_path) / (1024 * 1024), 1) if os.path.exists(model_path) else None,
        "model_exists": os.path.exists(model_path),
    }
