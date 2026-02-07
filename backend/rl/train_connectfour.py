"""
Training script for Connect Four RL Agent

Uses PPO (Proximal Policy Optimization) from Stable Baselines3
to train a neural network to play Connect Four.
"""

import os
import sys
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from stable_baselines3 import PPO
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import EvalCallback, BaseCallback
from stable_baselines3.common.vec_env import DummyVecEnv

from rl.environments.connectfour_env import ConnectFourEnv


class ProgressCallback(BaseCallback):
    """Callback for printing training progress."""
    
    def __init__(self, total_timesteps: int, print_freq: int = 10000, verbose: int = 1):
        super().__init__(verbose)
        self.total_timesteps = total_timesteps
        self.print_freq = print_freq
        
    def _on_step(self) -> bool:
        if self.n_calls % self.print_freq == 0:
            progress = (self.num_timesteps / self.total_timesteps) * 100
            print(f"Progress: {progress:.1f}% ({self.num_timesteps:,}/{self.total_timesteps:,} steps)")
        return True


def create_env(opponent: str = "random", opponent_starts: bool = False):
    """Create a Connect Four environment."""
    def _init():
        return ConnectFourEnv(opponent=opponent, opponent_starts=opponent_starts)
    return _init


def train_connectfour(
    total_timesteps: int = 200000,
    opponent: str = "random",
    save_path: str = None,
    verbose: int = 1,
):
    """
    Train a Connect Four agent using PPO.
    
    Args:
        total_timesteps: Number of training steps
        opponent: Type of opponent ("random", "minimax")
        save_path: Path to save the trained model
        verbose: Verbosity level
    """
    if save_path is None:
        save_path = Path(__file__).parent / "models" / f"connectfour_ppo_{opponent}"
    else:
        save_path = Path(save_path)
    
    save_path.mkdir(parents=True, exist_ok=True)
    
    print(f"Training Connect Four agent against {opponent} opponent")
    print(f"Total timesteps: {total_timesteps:,}")
    print(f"Save path: {save_path}")
    print("-" * 50)
    
    # Create vectorized environment with multiple instances for parallel training
    n_envs = 4
    env = make_vec_env(
        create_env(opponent=opponent, opponent_starts=False),
        n_envs=n_envs,
    )
    
    # Create evaluation environment
    eval_env = DummyVecEnv([create_env(opponent=opponent, opponent_starts=False)])
    
    # Create PPO model with larger network for Connect Four
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
        ent_coef=0.01,  # Entropy for exploration
        policy_kwargs=dict(
            net_arch=dict(pi=[256, 256], vf=[256, 256])  # Larger network
        ),
        verbose=verbose,
    )
    
    # Setup callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(save_path),
        log_path=str(save_path / "logs"),
        eval_freq=10000 // n_envs,
        n_eval_episodes=20,
        deterministic=True,
        render=False,
        verbose=verbose,
    )
    
    progress_callback = ProgressCallback(total_timesteps, print_freq=20000)
    
    # Train the model
    print("Starting training...")
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, progress_callback],
        progress_bar=False,
    )
    
    # Save final model
    final_path = save_path / "final_model"
    model.save(str(final_path))
    print(f"Final model saved to: {final_path}")
    
    # Evaluate final model
    print("\nEvaluating final model...")
    evaluate_agent(model, opponent=opponent, n_games=100)
    
    return model


def evaluate_agent(model, opponent: str = "random", n_games: int = 100):
    """Evaluate the trained agent."""
    env = ConnectFourEnv(opponent=opponent, opponent_starts=False)
    
    wins = 0
    losses = 0
    draws = 0
    
    for game in range(n_games):
        obs, info = env.reset()
        done = False
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            
            # Ensure valid move
            valid_moves = info.get("valid_moves", [])
            if len(valid_moves) > 0 and action not in valid_moves:
                action = np.random.choice(valid_moves)
            
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
        
        if info.get("winner") == 1:
            wins += 1
        elif info.get("winner") == -1:
            losses += 1
        else:
            draws += 1
    
    print(f"Results against {opponent} opponent ({n_games} games):")
    print(f"  Wins:   {wins} ({wins/n_games*100:.1f}%)")
    print(f"  Losses: {losses} ({losses/n_games*100:.1f}%)")
    print(f"  Draws:  {draws} ({draws/n_games*100:.1f}%)")
    
    return wins, losses, draws


def curriculum_training():
    """
    Train with curriculum learning:
    1. First train against random opponent
    2. Then train against minimax opponent
    """
    base_path = Path(__file__).parent / "models"
    
    print("=" * 60)
    print("PHASE 1: Training against random opponent")
    print("=" * 60)
    
    model = train_connectfour(
        total_timesteps=100000,
        opponent="random",
        save_path=base_path / "connectfour_ppo_random",
    )
    
    print("\n" + "=" * 60)
    print("PHASE 2: Training against minimax opponent")
    print("=" * 60)
    
    # Load the random-trained model and continue training
    n_envs = 4
    env = make_vec_env(
        create_env(opponent="minimax", opponent_starts=False),
        n_envs=n_envs,
    )
    
    model.set_env(env)
    
    eval_env = DummyVecEnv([create_env(opponent="minimax", opponent_starts=False)])
    
    save_path = base_path / "connectfour_ppo_curriculum"
    save_path.mkdir(parents=True, exist_ok=True)
    
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=str(save_path),
        log_path=str(save_path / "logs"),
        eval_freq=10000 // n_envs,
        n_eval_episodes=20,
        deterministic=True,
        render=False,
    )
    
    progress_callback = ProgressCallback(100000, print_freq=20000)
    
    model.learn(
        total_timesteps=100000,
        callback=[eval_callback, progress_callback],
        progress_bar=False,
    )
    
    # Save final curriculum model
    final_path = save_path / "final_model"
    model.save(str(final_path))
    
    # Also save as the "best" model for the API
    best_path = base_path / "connectfour_best"
    model.save(str(best_path))
    print(f"\nBest model saved to: {best_path}.zip")
    
    # Final evaluation
    print("\n" + "=" * 60)
    print("FINAL EVALUATION")
    print("=" * 60)
    
    print("\nAgainst random opponent:")
    evaluate_agent(model, opponent="random", n_games=100)
    
    print("\nAgainst minimax opponent:")
    evaluate_agent(model, opponent="minimax", n_games=50)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train Connect Four RL Agent")
    parser.add_argument("--timesteps", type=int, default=100000, help="Training timesteps")
    parser.add_argument("--opponent", type=str, default="random", choices=["random", "minimax"])
    parser.add_argument("--curriculum", action="store_true", help="Use curriculum learning")
    
    args = parser.parse_args()
    
    if args.curriculum:
        curriculum_training()
    else:
        model = train_connectfour(
            total_timesteps=args.timesteps,
            opponent=args.opponent,
        )
        
        # Save as best model
        best_path = Path(__file__).parent / "models" / "connectfour_best"
        model.save(str(best_path))
        print(f"\nModel saved to: {best_path}.zip")
