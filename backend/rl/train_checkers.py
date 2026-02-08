"""
Training script for Checkers RL agent using PPO.

Checkers is more complex than Tic-Tac-Toe or Connect Four,
so we use a longer training schedule and curriculum learning.
"""

import os
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback, BaseCallback
from stable_baselines3.common.vec_env import DummyVecEnv

# Add parent directory to path for imports
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rl.environments.checkers_env import CheckersEnv


class ProgressCallback(BaseCallback):
    """Callback for printing training progress."""

    def __init__(self, total_timesteps: int, print_freq: int = 50000, verbose: int = 1):
        super().__init__(verbose)
        self.total_timesteps = total_timesteps
        self.print_freq = print_freq

    def _on_step(self) -> bool:
        if self.n_calls % self.print_freq == 0:
            progress = (self.num_timesteps / self.total_timesteps) * 100
            print(f"Progress: {progress:.1f}% ({self.num_timesteps:,}/{self.total_timesteps:,} steps)")
        return True


def evaluate_against_random(model, n_games: int = 100) -> dict:
    """Evaluate the trained model against a random opponent."""
    env = CheckersEnv(opponent_type="random")

    wins = 0
    losses = 0
    draws = 0

    for _ in range(n_games):
        obs, info = env.reset()
        done = False

        while not done:
            valid_moves = len(env.valid_moves)
            if valid_moves == 0:
                break

            action, _ = model.predict(obs, deterministic=True)
            action = int(action)

            # Ensure action is valid
            if action >= valid_moves:
                action = np.random.randint(0, valid_moves)

            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated

        result = info.get("result", "unknown")
        if result == "win":
            wins += 1
        elif result == "loss":
            losses += 1
        else:
            draws += 1

    return {
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "win_rate": wins / n_games * 100
    }


def train_checkers_agent(
    total_timesteps: int = 200000,
    save_path: str = None,
    opponent_type: str = "random"
):
    """
    Train a Checkers agent using PPO.

    Args:
        total_timesteps: Total training steps
        save_path: Directory to save models
        opponent_type: Type of opponent ("random" or "heuristic")
    """
    if save_path is None:
        save_path = os.path.join(os.path.dirname(__file__), "models", f"checkers_ppo_{opponent_type}")

    os.makedirs(save_path, exist_ok=True)

    print(f"Training Checkers agent against {opponent_type} opponent")
    print(f"Total timesteps: {total_timesteps:,}")
    print(f"Save path: {save_path}")
    print("-" * 50)

    # Create training environment
    def make_env():
        return CheckersEnv(opponent_type=opponent_type)

    env = DummyVecEnv([make_env for _ in range(4)])  # 4 parallel environments

    # Create evaluation environment
    eval_env = DummyVecEnv([make_env])

    # Callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_path,
        log_path=save_path,
        eval_freq=10000,
        n_eval_episodes=20,
        deterministic=True,
        verbose=1
    )

    progress_callback = ProgressCallback(total_timesteps, print_freq=50000)

    # Create PPO model with tuned hyperparameters for Checkers
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
        ent_coef=0.01,  # Encourage exploration
        vf_coef=0.5,
        max_grad_norm=0.5,
        policy_kwargs={
            "net_arch": dict(pi=[256, 256], vf=[256, 256])  # Larger network for complex game
        },
        verbose=1
    )

    print("Starting training...")

    # Train the model
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, progress_callback],
        progress_bar=False
    )

    # Save final model
    final_path = os.path.join(save_path, "final_model")
    model.save(final_path)
    print(f"Final model saved to: {final_path}")

    # Evaluate against random opponent
    print("\nEvaluating final model...")
    results = evaluate_against_random(model, n_games=100)
    print("\nResults against random opponent (100 games):")
    print(f"  Wins:   {results['wins']} ({results['win_rate']:.1f}%)")
    print(f"  Losses: {results['losses']} ({100 - results['win_rate'] - results['draws']:.1f}%)")
    print(f"  Draws:  {results['draws']} ({results['draws']:.1f}%)")

    # Save the best model to standard location
    best_model_path = os.path.join(os.path.dirname(__file__), "models", "checkers_best.zip")
    model.save(best_model_path)
    print(f"\nModel saved to: {best_model_path}")

    return model, results


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train Checkers RL agent")
    parser.add_argument("--timesteps", type=int, default=200000, help="Total training timesteps")
    parser.add_argument("--opponent", type=str, default="random", choices=["random", "heuristic"])

    args = parser.parse_args()

    train_checkers_agent(
        total_timesteps=args.timesteps,
        opponent_type=args.opponent
    )
