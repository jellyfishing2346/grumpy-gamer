"""
Training script for Tic-Tac-Toe RL Agent

This script trains a PPO agent to play Tic-Tac-Toe using Stable Baselines3.
The agent learns by playing against various opponents.

Usage:
    python train_tictactoe.py [--timesteps 100000] [--opponent random]
"""

import os
import sys
import argparse
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from stable_baselines3 import PPO, DQN
from stable_baselines3.common.env_util import make_vec_env
from stable_baselines3.common.callbacks import EvalCallback, CheckpointCallback
from stable_baselines3.common.monitor import Monitor
from stable_baselines3.common.vec_env import DummyVecEnv

from rl.environments.tictactoe_env import TicTacToeEnv


def create_env(opponent: str = "random"):
    """Create a TicTacToe environment."""
    def _init():
        return Monitor(TicTacToeEnv(opponent=opponent))
    return _init


def train_agent(
    algorithm: str = "PPO",
    opponent: str = "random",
    total_timesteps: int = 100000,
    save_path: str = None,
    log_path: str = None
):
    """
    Train an RL agent to play Tic-Tac-Toe.
    
    Args:
        algorithm: RL algorithm to use ("PPO" or "DQN")
        opponent: Type of opponent ("random", "minimax")
        total_timesteps: Number of training timesteps
        save_path: Path to save the trained model
        log_path: Path for tensorboard logs
    """
    # Set up paths
    if save_path is None:
        save_path = os.path.join(
            os.path.dirname(__file__),
            "models",
            f"tictactoe_{algorithm.lower()}_{opponent}"
        )
    
    if log_path is None:
        log_path = os.path.join(
            os.path.dirname(__file__),
            "logs",
            f"tictactoe_{algorithm.lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
    
    os.makedirs(os.path.dirname(save_path), exist_ok=True)
    os.makedirs(log_path, exist_ok=True)
    
    print(f"Training {algorithm} agent against {opponent} opponent")
    print(f"Total timesteps: {total_timesteps}")
    print(f"Model will be saved to: {save_path}")
    
    # Create training environment
    env = DummyVecEnv([create_env(opponent) for _ in range(4)])
    
    # Create evaluation environment
    eval_env = DummyVecEnv([create_env(opponent)])
    
    # Create callbacks
    eval_callback = EvalCallback(
        eval_env,
        best_model_save_path=save_path,
        log_path=log_path,
        eval_freq=5000,
        n_eval_episodes=100,
        deterministic=True,
        render=False
    )
    
    checkpoint_callback = CheckpointCallback(
        save_freq=10000,
        save_path=save_path,
        name_prefix="checkpoint"
    )
    
    # Create the agent
    if algorithm.upper() == "PPO":
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
            verbose=1,
            tensorboard_log=None  # Disabled - install tensorboard for logging
        )
    elif algorithm.upper() == "DQN":
        model = DQN(
            "MlpPolicy",
            env,
            learning_rate=1e-4,
            buffer_size=50000,
            learning_starts=1000,
            batch_size=32,
            tau=1.0,
            gamma=0.99,
            train_freq=4,
            target_update_interval=1000,
            exploration_fraction=0.1,
            exploration_final_eps=0.05,
            verbose=1,
            tensorboard_log=None  # Disabled - install tensorboard for logging
        )
    else:
        raise ValueError(f"Unknown algorithm: {algorithm}")
    
    # Train the agent
    print("\nStarting training...")
    model.learn(
        total_timesteps=total_timesteps,
        callback=[eval_callback, checkpoint_callback],
        progress_bar=False  # Disable progress bar (requires tqdm/rich)
    )
    
    # Save the final model
    final_path = f"{save_path}/final_model"
    model.save(final_path)
    print(f"\nTraining complete! Model saved to: {final_path}")
    
    # Evaluate the trained agent
    print("\nEvaluating trained agent...")
    evaluate_agent(model, opponent, n_games=100)
    
    return model


def evaluate_agent(model, opponent: str = "random", n_games: int = 100):
    """
    Evaluate a trained agent.
    
    Args:
        model: Trained model
        opponent: Type of opponent to evaluate against
        n_games: Number of games to play
    """
    env = TicTacToeEnv(opponent=opponent)
    
    wins = 0
    losses = 0
    draws = 0
    invalid_moves = 0
    
    for _ in range(n_games):
        obs, _ = env.reset()
        done = False
        
        while not done:
            action, _ = model.predict(obs, deterministic=True)
            obs, reward, terminated, truncated, info = env.step(action)
            done = terminated or truncated
            
            if info.get("invalid_move"):
                invalid_moves += 1
        
        winner = info.get("winner")
        if winner == "agent":
            wins += 1
        elif winner == "opponent":
            losses += 1
        else:
            draws += 1
    
    print(f"\nEvaluation Results ({n_games} games against {opponent}):")
    print(f"  Wins:   {wins} ({100*wins/n_games:.1f}%)")
    print(f"  Losses: {losses} ({100*losses/n_games:.1f}%)")
    print(f"  Draws:  {draws} ({100*draws/n_games:.1f}%)")
    print(f"  Invalid moves: {invalid_moves}")
    
    return {"wins": wins, "losses": losses, "draws": draws, "invalid_moves": invalid_moves}


def curriculum_training(total_timesteps: int = 200000):
    """
    Train using curriculum learning: start with random opponent, then minimax.
    
    This helps the agent learn basic gameplay before facing optimal opponent.
    """
    print("=" * 60)
    print("CURRICULUM TRAINING")
    print("=" * 60)
    
    save_path = os.path.join(os.path.dirname(__file__), "models", "tictactoe_ppo_curriculum")
    os.makedirs(save_path, exist_ok=True)
    
    # Phase 1: Train against random opponent
    print("\n" + "=" * 40)
    print("Phase 1: Training against RANDOM opponent")
    print("=" * 40)
    
    env1 = DummyVecEnv([create_env("random") for _ in range(4)])
    
    model = PPO(
        "MlpPolicy",
        env1,
        learning_rate=3e-4,
        n_steps=2048,
        batch_size=64,
        n_epochs=10,
        gamma=0.99,
        verbose=1
    )
    
    model.learn(total_timesteps=total_timesteps // 2, progress_bar=True)
    
    # Evaluate after phase 1
    print("\nEvaluating after Phase 1:")
    evaluate_agent(model, "random", 100)
    
    # Phase 2: Continue training against minimax opponent
    print("\n" + "=" * 40)
    print("Phase 2: Training against MINIMAX opponent")
    print("=" * 40)
    
    env2 = DummyVecEnv([create_env("minimax") for _ in range(4)])
    model.set_env(env2)
    
    model.learn(total_timesteps=total_timesteps // 2, progress_bar=True)
    
    # Final evaluation
    print("\n" + "=" * 40)
    print("Final Evaluation")
    print("=" * 40)
    
    print("\nAgainst RANDOM opponent:")
    evaluate_agent(model, "random", 100)
    
    print("\nAgainst MINIMAX opponent:")
    evaluate_agent(model, "minimax", 100)
    
    # Save the final model
    model.save(f"{save_path}/final_model")
    print(f"\nModel saved to: {save_path}/final_model")
    
    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Tic-Tac-Toe RL Agent")
    parser.add_argument(
        "--algorithm", "-a",
        type=str,
        default="PPO",
        choices=["PPO", "DQN"],
        help="RL algorithm to use"
    )
    parser.add_argument(
        "--opponent", "-o",
        type=str,
        default="random",
        choices=["random", "minimax"],
        help="Type of opponent"
    )
    parser.add_argument(
        "--timesteps", "-t",
        type=int,
        default=100000,
        help="Total training timesteps"
    )
    parser.add_argument(
        "--curriculum", "-c",
        action="store_true",
        help="Use curriculum learning (random then minimax)"
    )
    parser.add_argument(
        "--evaluate", "-e",
        type=str,
        default=None,
        help="Path to model to evaluate (skip training)"
    )
    
    args = parser.parse_args()
    
    if args.evaluate:
        # Load and evaluate existing model
        print(f"Loading model from: {args.evaluate}")
        model = PPO.load(args.evaluate)
        
        print("\nAgainst RANDOM opponent:")
        evaluate_agent(model, "random", 100)
        
        print("\nAgainst MINIMAX opponent:")
        evaluate_agent(model, "minimax", 100)
    elif args.curriculum:
        # Curriculum training
        curriculum_training(args.timesteps)
    else:
        # Standard training
        train_agent(
            algorithm=args.algorithm,
            opponent=args.opponent,
            total_timesteps=args.timesteps
        )
