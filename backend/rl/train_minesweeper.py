"""
Training script for Minesweeper RL Agent using PPO

Minesweeper is a unique challenge for RL because:
1. It requires logical deduction from partial information
2. Some positions are purely guessing (no safe moves)
3. The agent needs to learn number patterns

This script trains a PPO agent with curriculum learning,
starting from easy boards and progressing to harder ones.
"""

import os
import sys
import argparse
import numpy as np
from pathlib import Path
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import (
    EvalCallback,
    CheckpointCallback,
    BaseCallback
)
from stable_baselines3.common.vec_env import DummyVecEnv, VecMonitor

from rl.environments.minesweeper_env import MinesweeperEnv


class MinesweeperProgressCallback(BaseCallback):
    """Callback to track Minesweeper-specific metrics."""
    
    def __init__(self, verbose: int = 0):
        super().__init__(verbose)
        self.episode_wins = []
        self.episode_cells_revealed = []
        self.current_episode_cells = 0
        
    def _on_step(self) -> bool:
        # Check for episode end
        infos = self.locals.get("infos", [])
        for info in infos:
            if "won" in info:
                self.episode_wins.append(info["won"])
            if "cells_revealed" in info:
                self.current_episode_cells += info["cells_revealed"]
            
            # Episode ended
            if info.get("won", False) or info.get("hit_mine", False):
                self.episode_cells_revealed.append(self.current_episode_cells)
                self.current_episode_cells = 0
        
        # Log every 5000 steps
        if self.num_timesteps % 5000 == 0 and len(self.episode_wins) > 0:
            recent_wins = self.episode_wins[-100:]
            win_rate = sum(recent_wins) / len(recent_wins) if recent_wins else 0
            
            recent_cells = self.episode_cells_revealed[-100:]
            avg_cells = sum(recent_cells) / len(recent_cells) if recent_cells else 0
            
            print(f"Step {self.num_timesteps}: "
                  f"Win rate: {win_rate:.1%}, "
                  f"Avg cells revealed: {avg_cells:.1f}")
        
        return True


class SafeMoveWrapper(MinesweeperEnv):
    """
    Wrapper that provides hints about safe moves.
    Helps the agent learn to recognize safe patterns.
    """
    
    def step(self, action):
        obs, reward, terminated, truncated, info = super().step(action)
        
        # Add safe cells to info for learning
        if not terminated:
            safe_cells = self.get_safe_cells()
            info["safe_cells"] = safe_cells
            info["used_safe_move"] = action in safe_cells if safe_cells else False
            
            # Bonus for using safe moves
            if info["used_safe_move"]:
                reward += 0.1
        
        return obs, reward, terminated, truncated, info


def create_curriculum_env(difficulty: str = "easy"):
    """Create environment with curriculum difficulty."""
    configs = {
        "very_easy": {"rows": 5, "cols": 5, "num_mines": 3},
        "easy": {"rows": 8, "cols": 8, "num_mines": 10},
        "medium": {"rows": 10, "cols": 10, "num_mines": 20},
        "hard": {"rows": 12, "cols": 12, "num_mines": 30},
    }
    config = configs.get(difficulty, configs["easy"])
    return SafeMoveWrapper(**config)


def evaluate_agent(model, env, n_episodes: int = 50):
    """Evaluate agent performance."""
    wins = 0
    total_cells = 0
    total_moves = 0
    
    for _ in range(n_episodes):
        obs, _ = env.reset()
        done = False
        episode_moves = 0
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            episode_moves += 1
            
            if info.get("won"):
                wins += 1
            total_cells += info.get("cells_revealed", 0)
        
        total_moves += episode_moves
    
    win_rate = wins / n_episodes
    avg_cells = total_cells / n_episodes
    avg_moves = total_moves / n_episodes
    
    return win_rate, avg_cells, avg_moves


def train_minesweeper(
    timesteps: int = 100000,
    difficulty: str = "easy",
    save_dir: str = "rl/models/minesweeper_ppo",
    curriculum: bool = True
):
    """
    Train a Minesweeper agent.
    
    Args:
        timesteps: Total training timesteps
        difficulty: Board difficulty (very_easy, easy, medium, hard)
        save_dir: Directory to save models
        curriculum: Whether to use curriculum learning
    """
    print(f"Training Minesweeper RL agent...")
    print(f"Difficulty: {difficulty}")
    print(f"Timesteps: {timesteps}")
    print(f"Curriculum learning: {curriculum}")
    print()
    
    # Create directories
    os.makedirs(save_dir, exist_ok=True)
    os.makedirs("rl/models", exist_ok=True)
    
    if curriculum:
        # Start with very easy, progress to target difficulty
        difficulties = ["very_easy", "easy", "medium", "hard"]
        target_idx = difficulties.index(difficulty) if difficulty in difficulties else 1
        steps_per_stage = timesteps // (target_idx + 1)
        
        model = None
        
        for stage, diff in enumerate(difficulties[:target_idx + 1]):
            print(f"\n=== Curriculum Stage {stage + 1}: {diff} ===")
            
            env = DummyVecEnv([lambda d=diff: create_curriculum_env(d)])
            env = VecMonitor(env)
            
            if model is None:
                # CNN policy for 2D grid input
                model = PPO(
                    "MlpPolicy",  # Use MLP for flattened observation
                    env,
                    learning_rate=3e-4,
                    n_steps=2048,
                    batch_size=64,
                    n_epochs=10,
                    gamma=0.99,
                    gae_lambda=0.95,
                    clip_range=0.2,
                    ent_coef=0.01,  # Encourage exploration
                    verbose=1
                )
            else:
                model.set_env(env)
            
            progress_callback = MinesweeperProgressCallback()
            
            model.learn(
                total_timesteps=steps_per_stage,
                callback=progress_callback,
                progress_bar=False
            )
            
            # Evaluate after each stage
            eval_env = create_curriculum_env(diff)
            win_rate, avg_cells, _ = evaluate_agent(model, eval_env, n_episodes=30)
            print(f"Stage {stage + 1} evaluation: "
                  f"Win rate: {win_rate:.1%}, Avg cells: {avg_cells:.1f}")
    
    else:
        # Train on single difficulty
        env = DummyVecEnv([lambda: create_curriculum_env(difficulty)])
        env = VecMonitor(env)
        
        model = PPO(
            "MlpPolicy",
            env,
            learning_rate=3e-4,
            n_steps=2048,
            batch_size=64,
            n_epochs=10,
            gamma=0.99,
            gae_lambda=0.95,
            clip_range=0.2,
            ent_coef=0.01,
            verbose=1
        )
        
        progress_callback = MinesweeperProgressCallback()
        
        model.learn(
            total_timesteps=timesteps,
            callback=progress_callback,
            progress_bar=False
        )
    
    # Save final model
    final_path = "rl/models/minesweeper_best.zip"
    model.save(final_path)
    print(f"\nModel saved to: {final_path}")
    
    # Final evaluation
    print("\n=== Final Evaluation ===")
    eval_env = create_curriculum_env(difficulty)
    win_rate, avg_cells, avg_moves = evaluate_agent(model, eval_env, n_episodes=50)
    
    print(f"Win rate: {win_rate:.1%} ({int(win_rate * 50)}/50 games)")
    print(f"Average cells revealed per game: {avg_cells:.1f}")
    print(f"Average moves per game: {avg_moves:.1f}")
    
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Minesweeper RL agent")
    parser.add_argument(
        "--timesteps", "-t",
        type=int,
        default=100000,
        help="Total training timesteps (default: 100000)"
    )
    parser.add_argument(
        "--difficulty", "-d",
        type=str,
        default="easy",
        choices=["very_easy", "easy", "medium", "hard"],
        help="Board difficulty (default: easy)"
    )
    parser.add_argument(
        "--no-curriculum",
        action="store_true",
        help="Disable curriculum learning"
    )
    
    args = parser.parse_args()
    
    train_minesweeper(
        timesteps=args.timesteps,
        difficulty=args.difficulty,
        curriculum=not args.no_curriculum
    )
