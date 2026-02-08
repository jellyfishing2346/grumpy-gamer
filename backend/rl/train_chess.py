"""
Training script for Chess RL agent using PPO.

Note: Chess is extremely complex for RL. This provides basic training,
but the agent will primarily use Minimax fallback for strong play.
"""

import os
import numpy as np
from stable_baselines3 import PPO
from stable_baselines3.common.callbacks import EvalCallback, BaseCallback
from stable_baselines3.common.vec_env import DummyVecEnv

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rl.environments.chess_env import ChessEnv


class ProgressCallback(BaseCallback):
    def __init__(self, total_timesteps: int, print_freq: int = 50000, verbose: int = 1):
        super().__init__(verbose)
        self.total_timesteps = total_timesteps
        self.print_freq = print_freq

    def _on_step(self) -> bool:
        if self.n_calls % self.print_freq == 0:
            progress = (self.num_timesteps / self.total_timesteps) * 100
            print(f"Progress: {progress:.1f}% ({self.num_timesteps:,}/{self.total_timesteps:,} steps)")
        return True


def evaluate_model(model, n_games: int = 50) -> dict:
    """Evaluate the trained model."""
    env = ChessEnv(opponent_type="random")

    wins, losses, draws = 0, 0, 0

    for _ in range(n_games):
        obs, info = env.reset()
        done = False

        while not done:
            valid_moves = len(env.valid_moves)
            if valid_moves == 0:
                break

            action, _ = model.predict(obs, deterministic=True)
            action = int(action)
            if action >= valid_moves:
                action = np.random.randint(0, valid_moves)

            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated

        result = info.get("result", "unknown")
        if "win" in result:
            wins += 1
        elif "loss" in result:
            losses += 1
        else:
            draws += 1

    return {"wins": wins, "losses": losses, "draws": draws, "win_rate": wins / n_games * 100}


def train_chess_agent(total_timesteps: int = 100000, save_path: str = None):
    """Train a Chess agent using PPO."""
    if save_path is None:
        save_path = os.path.join(os.path.dirname(__file__), "models", "chess_ppo")

    os.makedirs(save_path, exist_ok=True)

    print("Training Chess agent")
    print(f"Total timesteps: {total_timesteps:,}")
    print(f"Save path: {save_path}")
    print("-" * 50)

    def make_env():
        return ChessEnv(opponent_type="random")

    env = DummyVecEnv([make_env for _ in range(4)])
    eval_env = DummyVecEnv([make_env])

    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_path,
        log_path=save_path,
        eval_freq=10000,
        n_eval_episodes=10,
        deterministic=True,
        verbose=1
    )

    progress_callback = ProgressCallback(total_timesteps, print_freq=25000)

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
        policy_kwargs={"net_arch": dict(pi=[256, 256], vf=[256, 256])},
        verbose=1
    )

    print("Starting training...")
    model.learn(total_timesteps=total_timesteps, callback=[eval_callback, progress_callback])

    # Save final model
    final_path = os.path.join(save_path, "final_model")
    model.save(final_path)
    print(f"Final model saved to: {final_path}")

    # Evaluate
    print("\nEvaluating final model...")
    results = evaluate_model(model, n_games=50)
    print("\nResults against random opponent (50 games):")
    print(f"  Wins:   {results['wins']} ({results['win_rate']:.1f}%)")
    print(f"  Losses: {results['losses']}")
    print(f"  Draws:  {results['draws']}")

    # Save best model
    best_model_path = os.path.join(os.path.dirname(__file__), "models", "chess_best.zip")
    model.save(best_model_path)
    print(f"\nModel saved to: {best_model_path}")

    return model, results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Train Chess RL agent")
    parser.add_argument("--timesteps", type=int, default=100000, help="Total training timesteps")
    args = parser.parse_args()

    train_chess_agent(total_timesteps=args.timesteps)
