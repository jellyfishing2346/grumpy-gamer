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


def get_checkpoints(game_id: str) -> list:
    """Find all checkpoint files for a game."""
    game_dirs = {
        "tictactoe": "tictactoe_ppo_random",
        "connectfour": "connectfour_ppo_random",
        "checkers": "checkers_ppo_random",
        "othello": "othello_ppo",
        "chess": "chess_ppo",
        "minesweeper": "minesweeper_ppo",
    }
    folder = game_dirs.get(game_id)
    if not folder:
        return []
    folder_path = os.path.join(MODELS_DIR, folder)
    if not os.path.exists(folder_path):
        return []
    checkpoints = []
    for f in sorted(os.listdir(folder_path)):
        if f.endswith(".zip"):
            fpath = os.path.join(folder_path, f)
            size_mb = round(os.path.getsize(fpath) / (1024 * 1024), 1)
            steps = None
            if "checkpoint_" in f:
                try:
                    steps = int(f.split("checkpoint_")[1].split("_steps")[0])
                except Exception:
                    pass
            elif f == "best_model.zip":
                steps = "best"
            elif f == "final_model.zip":
                steps = "final"
            checkpoints.append({
                "filename": f,
                "steps": steps,
                "size_mb": size_mb,
            })
    return checkpoints


@rl_router.get("/rl/checkpoints/{game_id}")
def get_game_checkpoints(game_id: str):
    """Return all saved checkpoints for a game."""
    checkpoints = get_checkpoints(game_id)
    if not checkpoints:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"No checkpoints found for {game_id}")
    return {"game_id": game_id, "checkpoints": checkpoints}


@rl_router.get("/rl/checkpoints")
def get_all_checkpoints():
    """Return checkpoint counts for all games."""
    games = ["tictactoe", "connectfour", "checkers", "othello", "chess", "minesweeper"]
    return {
        "games": [
            {"game_id": g, "checkpoint_count": len(get_checkpoints(g))}
            for g in games
        ]
    }


DIFFICULTY_CHECKPOINTS = {
    "tictactoe": {
        "easy": "checkpoint_40000_steps.zip",
        "medium": "checkpoint_80000_steps.zip",
        "hard": "best_model.zip",
    },
    "connectfour": {
        "easy": "best_model.zip",
        "medium": "best_model.zip",
        "hard": "final_model.zip",
    },
    "checkers": {
        "easy": "best_model.zip",
        "medium": "best_model.zip",
        "hard": "final_model.zip",
    },
    "othello": {
        "easy": "best_model.zip",
        "medium": "best_model.zip",
        "hard": "best_model.zip",
    },
}

GAME_DIRS = {
    "tictactoe": "tictactoe_ppo_random",
    "connectfour": "connectfour_ppo_random",
    "checkers": "checkers_ppo_random",
    "othello": "othello_ppo",
}


@rl_router.get("/rl/difficulty/{game_id}/{level}")
def get_difficulty_model(game_id: str, level: str):
    """Return the model checkpoint path for a given game and difficulty level."""
    from fastapi import HTTPException
    if game_id not in DIFFICULTY_CHECKPOINTS:
        raise HTTPException(status_code=404, detail=f"No RL model for {game_id}")
    if level not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Level must be easy, medium, or hard")
    checkpoint = DIFFICULTY_CHECKPOINTS[game_id][level]
    game_dir = GAME_DIRS.get(game_id, "")
    model_path = os.path.join(MODELS_DIR, game_dir, checkpoint)
    return {
        "game_id": game_id,
        "level": level,
        "checkpoint": checkpoint,
        "model_exists": os.path.exists(model_path),
        "model_path": model_path,
    }


@rl_router.get("/rl/difficulty")
def get_all_difficulty_mappings():
    """Return all difficulty level to checkpoint mappings."""
    return {"difficulty_map": DIFFICULTY_CHECKPOINTS}
