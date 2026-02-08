"""
Training script for Othello RL agent using PPO.

This script trains a PPO agent to play Othello using self-play
and curriculum learning with increasingly difficult opponents.
"""

import os
import argparse
import numpy as np
from pathlib import Path
from typing import Callable

# Stable Baselines 3
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import BaseCallback, EvalCallback
from stable_baselines3.common.vec_env import DummyVecEnv, SubprocVecEnv
from stable_baselines3.common.monitor import Monitor

# Local environment
from rl.environments.othello_env import OthelloEnv


class OthelloTrainingCallback(BaseCallback):
    """Custom callback for logging Othello training progress."""
    
    def __init__(self, eval_freq: int = 5000, verbose: int = 1):
        super().__init__(verbose)
        self.eval_freq = eval_freq
        self.eval_env = None
    
    def _on_step(self) -> bool:
        if self.n_calls % self.eval_freq == 0:
            # Run evaluation
            win_rate, avg_pieces = self._evaluate()
            print(f"Step {self.n_calls}: Win rate: {win_rate:.1%}, Avg pieces: {avg_pieces:.1f}")
        return True
    
    def _evaluate(self, n_episodes: int = 20) -> tuple:
        """Evaluate current model."""
        if self.eval_env is None:
            self.eval_env = OthelloEnv(opponent="minimax")
        
        wins = 0
        total_pieces = 0
        
        for _ in range(n_episodes):
            obs, _ = self.eval_env.reset()
            done = False
            
            while not done:
                action, _ = self.model.predict(obs, deterministic=True)
                obs, _, terminated, truncated, info = self.eval_env.step(action)
                done = terminated or truncated
            
            if info.get("winner") == 1:
                wins += 1
            total_pieces += info.get("black_count", 0)
        
        return wins / n_episodes, total_pieces / n_episodes


def make_env(opponent: str = "random", opponent_starts: bool = False) -> Callable:
    """Create a function that returns an Othello environment."""
    def _init():
        env = OthelloEnv(opponent=opponent, opponent_starts=opponent_starts)
        return Monitor(env)
    return _init


def evaluate_agent(model, env, n_episodes: int = 50) -> tuple:
    """Evaluate the agent's performance."""
    wins = 0
    total_pieces = 0
    
    for _ in range(n_episodes):
        obs, _ = env.reset()
        done = False
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, _, terminated, truncated, info = env.step(action)
            done = terminated or truncated
        
        if info.get("winner") == 1:
            wins += 1
        total_pieces += info.get("black_count", 0)
    
    win_rate = wins / n_episodes
    avg_pieces = total_pieces / n_episodes
    
    return win_rate, avg_pieces


def train_othello(
    total_timesteps: int = 500000,
    opponent: str = "random",
    use_curriculum: bool = True,
    n_envs: int = 8,
    save_path: str = "rl/models",
):
    """
    Train an Othello RL agent.
    
    Args:
        total_timesteps: Total training steps
        opponent: Opponent type ("random", "minimax", "self")
        use_curriculum: Whether to use curriculum learning
        n_envs: Number of parallel environments
        save_path: Directory to save models
    """
    print("Training Othello RL agent...")
    print(f"Opponent: {opponent}")
    print(f"Timesteps: {total_timesteps}")
    print(f"Curriculum learning: {use_curriculum}")
    print()
    
    # Create directories
    os.makedirs(save_path, exist_ok=True)
    log_path = os.path.join(save_path, "..", "logs", "othello_ppo")
    os.makedirs(log_path, exist_ok=True)
    
    if use_curriculum:
        # Curriculum: start with random, then minimax
        stages = [
            {"opponent": "random", "timesteps": total_timesteps // 2},
            {"opponent": "minimax", "timesteps": total_timesteps // 2},
        ]
    else:
        stages = [{"opponent": opponent, "timesteps": total_timesteps}]
    
    model = None
    
    for stage_idx, stage in enumerate(stages):
        print(f"\n=== Stage {stage_idx + 1}/{len(stages)}: {stage['opponent']} opponent ===")
        
        # Create vectorized environment
        env_fns = [make_env(stage["opponent"], opponent_starts=(i % 2 == 1)) for i in range(n_envs)]
        env = DummyVecEnv(env_fns)
        
        # Create evaluation environment
        eval_env = Monitor(OthelloEnv(opponent="minimax"))
        
        if model is None:
            # Create new model
            model = PPO(
                "MlpPolicy",
                env,
                learning_rate=3e-4,
                n_steps=2048,
                batch_size=256,
                n_epochs=10,
                gamma=0.99,
                gae_lambda=0.95,
                clip_range=0.2,
                ent_coef=0.01,
                verbose=1,
            )
        else:
            # Continue training with new environment
            model.set_env(env)
        
        # Callbacks
        eval_callback = EvalCallback(
            eval_env,
            best_model_save_path=os.path.join(save_path, "othello_ppo"),
            eval_freq=10000 // n_envs,
            deterministic=True,
            render=False,
        )
        
        training_callback = OthelloTrainingCallback(eval_freq=5000)
        
        # Train
        model.learn(
            total_timesteps=stage["timesteps"],
            callback=[eval_callback, training_callback],
            reset_num_timesteps=False,
        )
        
        env.close()
    
    # Save final model
    final_path = os.path.join(save_path, "othello_best.zip")
    model.save(final_path)
    print(f"\nModel saved to: {final_path}")
    
    # Final evaluation
    print("\n=== Final Evaluation ===")
    eval_env = OthelloEnv(opponent="minimax")
    win_rate, avg_pieces = evaluate_agent(model, eval_env, n_episodes=100)
    print(f"Win rate vs Minimax: {win_rate:.1%}")
    print(f"Average pieces: {avg_pieces:.1f}")
    
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Othello RL agent")
    parser.add_argument("--timesteps", type=int, default=500000, help="Total training timesteps")
    parser.add_argument("--opponent", type=str, default="random", choices=["random", "minimax", "self"])
    parser.add_argument("--no-curriculum", action="store_true", help="Disable curriculum learning")
    parser.add_argument("--envs", type=int, default=8, help="Number of parallel environments")
    
    args = parser.parse_args()
    
    train_othello(
        total_timesteps=args.timesteps,
        opponent=args.opponent,
        use_curriculum=not args.no_curriculum,
        n_envs=args.envs,
    )
