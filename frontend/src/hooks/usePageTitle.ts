/**
 * usePageTitle hook
 *
 * Dynamically updates the browser tab title based on the current route.
 * Handles static routes, dynamic game routes (/play/:game),
 * replay routes (/replay/:id), and spectator routes (/watch/:id).
 *
 * @example
 * // Inside a component wrapped in Router:
 * const PageTitleUpdater = () => {
 *   usePageTitle();
 *   return null;
 * };
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const routeTitles: Record<string, string> = {
  "/": "Grumpy Gamer",
  "/home": "Home | Grumpy Gamer",
  "/games": "Game Selection | Grumpy Gamer",
  "/dashboard": "Dashboard | Grumpy Gamer",
  "/comparison": "Comparison | Grumpy Gamer",
  "/human-vs-ai": "Human vs AI | Grumpy Gamer",
  "/about": "About | Grumpy Gamer",
  "/settings": "Settings | Grumpy Gamer",
  "/profile": "Profile | Grumpy Gamer",
  "/replays": "Replay History | Grumpy Gamer",
  "/login": "Log In | Grumpy Gamer",
  "/signup": "Sign Up | Grumpy Gamer",
  "/faq": "FAQ | Grumpy Gamer",
  "/contact": "Contact | Grumpy Gamer",
};

const gameNames: Record<string, string> = {
  wordle: "Wordle",
  sudoku: "Sudoku",
  tictactoe: "Tic-Tac-Toe",
  connectfour: "Connect Four",
  chess: "Chess",
  checkers: "Checkers",
  rps: "Rock Paper Scissors",
  minesweeper: "Minesweeper",
  "2048": "2048",
  hangman: "Hangman",
  othello: "Othello",
  memory: "Memory",
};

export function usePageTitle() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // Handle /play/:game routes
    if (path.startsWith("/play/")) {
      const game = path.split("/play/")[1];
      const gameName = gameNames[game] || game;
      document.title = `${gameName} | Grumpy Gamer`;
      return;
    }

    // Handle /replay/:id routes
    if (path.startsWith("/replay/")) {
      document.title = "Replay Viewer | Grumpy Gamer";
      return;
    }

    // Handle /watch/:id routes
    if (path.startsWith("/watch/")) {
      document.title = "Spectator Mode | Grumpy Gamer";
      return;
    }

    // Known routes
    const title = routeTitles[path] || "Grumpy Gamer";
    document.title = title;
  }, [location.pathname]);
}
