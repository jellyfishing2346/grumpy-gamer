"""
Training script for 2048 RL agent using PPO.

This script trains a PPO agent to play 2048, optimizing for
high scores and reaching the 2048 tile.
"""

import os
import argparse
import numpy as np
from pathlib import Path
from typing import Callable

# Stable Baselines 3
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, EvalCallback
from stable_baselines3.common.vec_env import DummyVecEnv
from stable_baselines3.common.monitor import Monitor

# Local environment
from rl.environments.game2048_env import Game2048Env


class Game2048TrainingCallback(BaseCallback):
    """Custom callback for logging 2048 training progress."""
    
    def __init__(self, eval_freq: int = 5000, verbose: int = 1):
        super().__init__(verbose)
        self.eval_freq = eval_freq
        self.eval_env = None
    
    def _on_step(self) -> bool:
        if self.n_calls % self.eval_freq == 0:
            # Run evaluation
            avg_score, avg_max_tile, win_rate = self._evaluate()
            print(f"Step {self.n_calls}: Avg score: {avg_score:.0f}, "
                  f"Avg max tile: {avg_max_tile:.0f}, Win rate: {win_rate:.1%}")
        return True
    
    def _evaluate(self, n_episodes: int = 20) -> tuple:
        """Evaluate current model."""
        if self.eval_env is None:
            self.eval_env = Game2048Env()
        
        total_score = 0
        total_max_tile = 0
        wins = 0
        
        for _ in range(n_episodes):
            obs, _ = self.eval_env.reset()
            done = False
            
            while not done:
                action, _ = self.model.predict(obs, deterministic=True)
                obs, _, terminated, truncated, info = self.eval_env.step(action)
                done = terminated or truncated
            
            total_score += info.get("score", 0)
            total_max_tile += info.get("max_tile", 0)
            if info.get("has_won", False):
                wins += 1
        
        return (
            total_score / n_episodes,
            total_max_tile / n_episodes,
            wins / n_episodes
        )


def make_env() -> Callable:
    """Create a function that returns a 2048 environment."""
    def _init():
        env = Game2048Env()
        return Monitor(env)
    return _init


def evaluate_agent(model, env, n_episodes: int = 100) -> tuple:
    """Evaluate the agent's performance."""
    total_score = 0
    total_max_tile = 0
    wins = 0
    max_tiles = []
    
    for _ in range(n_episodes):
        obs, _ = env.reset()
        done = False
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, terminated, truncated, info = env.step(action)
            done = terminated or truncated
        
        total_score += info.get("score", 0)
        max_tile = info.get("max_tile", 0)
        total_max_tile += max_tile
        max_tiles.append(max_tile)
        if info.get("has_won", False):
            wins += 1
    
    return (
        total_score / n_episodes,
        total_max_tile / n_episodes,
        wins / n_episodes,
        max_tiles
    )


def train_2048(
    total_timesteps: int = 500000,
    n_envs: int = 8,
    save_path: str = "rl/models",
):
    """
    Train a 2048 RL agent.
    
    Args:
        total_timesteps: Total training steps
        n_envs: Number of parallel environments
        save_path: Directory to save models
    """
    print("Training 2048 RL agent...")
    print(f"Timesteps: {total_timesteps}")
    print(f"Parallel environments: {n_envs}")
    print()
    
    # Create directories
    os.makedirs(save_path, exist_ok=True)
    log_path = os.path.join(save_path, "..", "logs", "game2048_ppo")
    os.makedirs(log_path, exist_ok=True)
    
    # Create vectorized environment
    env_fns = [make_env() for _ in range(n_envs)]
    env = DummyVecEnv(env_fns)
    
    # Create evaluation environment
    eval_env = Monitor(Game2048Env())
    
    # Create model with tuned hyperparameters for 2048
    model = PPO(
        "MlpPolicy",
        env,
        learning_rate=1e-4,  # Lower learning rate for stability
        n_steps=2048,
        batch_size=256,
        n_epochs=10,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,  # Encourage exploration
        verbose=1,
    )
    
    # Callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=os.path.join(save_path, "game2048_ppo"),
        eval_freq=10000 // n_envs,
        deterministic=True,
        render=False,
    )
    
    training_callback = Game2048TrainingCallback(eval_freq=5000)
    
    # Train
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, training_callback],
    )
    
    env.close()
    
    # Save final model
    final_path = os.path.join(save_path, "game2048_best.zip")
    model.save(final_path)
    print(f"\nModel saved to: {final_path}")
    
    # Final evaluation
    print("\n=== Final Evaluation ===")
    eval_env = Game2048Env()
    avg_score, avg_max_tile, win_rate, max_tiles = evaluate_agent(model, eval_env, n_episodes=100)
    
    print(f"Average score: {avg_score:.0f}")
    print(f"Average max tile: {avg_max_tile:.0f}")
    print(f"Win rate (2048+): {win_rate:.1%}")
    
    # Tile distribution
    tile_counts = {}
    for tile in max_tiles:
        tile_counts[tile] = tile_counts.get(tile, 0) + 1
    print("\nMax tile distribution:")
    for tile in sorted(tile_counts.keys(), reverse=True):
        print(f"  {tile}: {tile_counts[tile]}%")
    
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train 2048 RL agent")
    parser.add_argument("--timesteps", type=int, default=500000, help="Total training timesteps")
    parser.add_argument("--envs", type=int, default=8, help="Number of parallel environments")
    
    args = parser.parse_args()
    
    train_2048(
        total_timesteps=args.timesteps,
        n_envs=args.envs,
    )
