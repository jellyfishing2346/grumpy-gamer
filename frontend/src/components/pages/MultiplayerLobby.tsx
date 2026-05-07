import React, { useState, useEffect, useRef, useCallback } from "react";
import API_URL from "../../config/api";

type GameStatus = "lobby" | "waiting" | "playing" | "finished";
type Symbol = "X" | "O" | "";

interface GameState {
  board: Symbol[];
  currentTurn: Symbol;
  winner: Symbol | null;
  isDraw: boolean;
  status: GameStatus;
  symbol: Symbol;
  roomId: string;
  playerId: string;
  message: string;
}

const WS_URL = (typeof window !== "undefined" && window.location.hostname !== "localhost")
  ? API_URL.replace("https://", "wss://").replace("http://", "ws://")
  : "ws://localhost:8000";

const MultiplayerLobby: React.FC = () => {
  const [view, setView] = useState<"lobby" | "game">("lobby");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameState>({
    board: Array(9).fill(""),
    currentTurn: "X",
    winner: null,
    isDraw: false,
    status: "lobby",
    symbol: "",
    roomId: "",
    playerId: "",
    message: "",
  });
  const ws = useRef<WebSocket | null>(null);

  const connectWebSocket = useCallback((roomId: string, playerId: string) => {
    const socket = new WebSocket(`${WS_URL}/api/ws/${roomId}/${playerId}`);
    ws.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === "connected") {
        setGame((g) => ({
          ...g,
          board: msg.board,
          currentTurn: msg.current_turn,
          status: msg.player_count === 2 ? "playing" : "waiting",
          message: msg.player_count === 2 ? "Game started!" : "Waiting for opponent...",
        }));
      } else if (msg.type === "game_start") {
        setGame((g) => ({ ...g, board: msg.board, currentTurn: msg.current_turn, status: "playing", message: msg.message }));
      } else if (msg.type === "move") {
        setGame((g) => ({ ...g, board: msg.board, currentTurn: msg.current_turn, message: `Player ${msg.symbol} played. ${msg.current_turn}'s turn.` }));
      } else if (msg.type === "game_over") {
        setGame((g) => ({ ...g, board: msg.board, winner: msg.winner, isDraw: !msg.winner, status: "finished", message: msg.message }));
      } else if (msg.type === "rematch") {
        setGame((g) => ({ ...g, board: msg.board, currentTurn: msg.current_turn, winner: null, isDraw: false, status: "playing", message: msg.message }));
      } else if (msg.type === "opponent_disconnected") {
        setGame((g) => ({ ...g, status: "finished", message: msg.message }));
      } else if (msg.type === "error") {
        setError(msg.message);
      }
    };

    socket.onclose = () => {
      setGame((g) => ({ ...g, message: "Connection closed." }));
    };
  }, []);

  const createRoom = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/multiplayer/create`, { method: "POST" });
      const data = await res.json();
      setGame((g) => ({ ...g, roomId: data.room_id, playerId: data.player_id, symbol: data.symbol, status: "waiting" }));
      setView("game");
      connectWebSocket(data.room_id, data.player_id);
    } catch {
      setError("Failed to create room");
    }
    setLoading(false);
  };

  const joinRoom = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/multiplayer/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: joinCode.trim().toUpperCase() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.detail || "Failed to join room");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setGame((g) => ({ ...g, roomId: data.room_id, playerId: data.player_id, symbol: data.symbol, status: "waiting" }));
      setView("game");
      connectWebSocket(data.room_id, data.player_id);
    } catch {
      setError("Failed to join room");
    }
    setLoading(false);
  };

  const makeMove = (cell: number) => {
    if (game.status !== "playing" || game.currentTurn !== game.symbol || game.board[cell] !== "") return;
    ws.current?.send(JSON.stringify({ type: "move", cell }));
  };

  const requestRematch = () => {
    ws.current?.send(JSON.stringify({ type: "rematch" }));
  };

  const leaveGame = () => {
    ws.current?.close();
    setView("lobby");
    setGame({ board: Array(9).fill(""), currentTurn: "X", winner: null, isDraw: false, status: "lobby", symbol: "", roomId: "", playerId: "", message: "" });
    setError(null);
    setJoinCode("");
  };

  useEffect(() => {
    return () => { ws.current?.close(); };
  }, []);

  const dark = { background: "#0f1117", color: "#e8f4f8", fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" };
  const card = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(126,203,255,0.12)", borderRadius: 20, padding: "2.5rem", maxWidth: 480, width: "100%" };
  const btn = (primary = true): React.CSSProperties => ({
    padding: "0.8em 2em", borderRadius: 50, border: primary ? "none" : "1px solid rgba(126,203,255,0.3)",
    background: primary ? "linear-gradient(90deg,#7ecbff,#4fa3d1)" : "transparent",
    color: primary ? "#1a1a2e" : "#7ecbff", fontWeight: 700, fontSize: "1rem",
    cursor: "pointer", fontFamily: "inherit", width: "100%", marginBottom: "0.75rem",
  });

  if (view === "lobby") {
    return (
      <div style={dark}>
        <div style={card}>
          <h1 style={{ textAlign: "center", color: "#7ecbff", fontSize: "1.8rem", fontWeight: 800, marginBottom: "0.5rem" }}>⚔️ Multiplayer</h1>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", marginBottom: "2rem" }}>Play TicTacToe against a friend in real-time</p>
          {error && <p style={{ color: "#f87171", textAlign: "center", marginBottom: "1rem" }}>{error}</p>}
          <button style={btn()} onClick={createRoom} disabled={loading}>
            {loading ? "Creating..." : "🎮 Create Room"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              maxLength={6}
              style={{
                flex: 1, padding: "0.8em 1em", borderRadius: 50, border: "1px solid rgba(126,203,255,0.3)",
                background: "rgba(255,255,255,0.06)", color: "#e8f4f8", fontFamily: "inherit",
                fontSize: "1rem", letterSpacing: "0.15em", textAlign: "center",
              }}
            />
            <button
              onClick={joinRoom}
              disabled={loading || !joinCode.trim()}
              style={{ ...btn(false), width: "auto", marginBottom: 0, padding: "0.8em 1.5em" }}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isMyTurn = game.currentTurn === game.symbol && game.status === "playing";

  return (
    <div style={dark}>
      <div style={{ ...card, maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <span style={{ color: "#7ecbff", fontWeight: 700, fontSize: "1.1rem" }}>Room: {game.roomId}</span>
            <span style={{ marginLeft: "0.75rem", padding: "0.2em 0.75em", borderRadius: 50, background: "rgba(126,203,255,0.1)", color: "#7ecbff", fontSize: "0.8rem" }}>
              You are {game.symbol}
            </span>
          </div>
          <button onClick={leaveGame} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.9rem" }}>← Leave</button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem", padding: "0.6em", background: "rgba(255,255,255,0.04)", borderRadius: 10, color: game.status === "waiting" ? "#fbbf24" : "#7ecbff", fontSize: "0.9rem" }}>
          {game.status === "waiting" ? `⏳ ${game.message || "Waiting for opponent..."} — Share code: ${game.roomId}` : game.message || (isMyTurn ? "Your turn!" : `Waiting for ${game.currentTurn}...`)}
        </div>

        {/* Board */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: "1.5rem" }}>
          {game.board.map((cell, i) => (
            <button
              key={i}
              onClick={() => makeMove(i)}
              disabled={!isMyTurn || cell !== "" || game.status !== "playing"}
              style={{
                height: 100, borderRadius: 12, border: "1px solid rgba(126,203,255,0.15)",
                background: cell ? "rgba(126,203,255,0.08)" : isMyTurn && cell === "" ? "rgba(126,203,255,0.04)" : "rgba(255,255,255,0.03)",
                color: cell === "X" ? "#7ecbff" : "#f87171", fontSize: "2.5rem", fontWeight: 800,
                cursor: isMyTurn && !cell && game.status === "playing" ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              {cell}
            </button>
          ))}
        </div>

        {game.status === "finished" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: game.winner === game.symbol ? "#4ade80" : game.isDraw ? "#fbbf24" : "#f87171", marginBottom: "1rem" }}>
              {game.winner === game.symbol ? "🏆 You Win!" : game.isDraw ? "🤝 Draw!" : "💀 You Lose!"}
            </div>
            <button style={btn()} onClick={requestRematch}>🔄 Request Rematch</button>
            <button style={btn(false)} onClick={leaveGame}>Leave Game</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiplayerLobby;