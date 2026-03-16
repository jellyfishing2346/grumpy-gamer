import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";
import API_URL from "../../config/api";

interface Replay {
  session_id: number;
  game: string;
  outcome: string;
  played_at: string;
  move_count: number;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const outcomeColor = (outcome: string, darkMode: boolean) => {
  if (outcome === "win") return darkMode ? "#28e07b" : "#16a34a";
  if (outcome === "loss") return darkMode ? "#ff7e67" : "#dc2626";
  return darkMode ? "#ffe066" : "#d97706";
};

const outcomeEmoji = (outcome: string) => {
  if (outcome === "win") return "🏆";
  if (outcome === "loss") return "💀";
  return "🤝";
};

const ReplayHistory: React.FC = () => {
  const [replays, setReplays] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [darkMode] = useDarkModeContext();
  const navigate = useNavigate();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  useEffect(() => {
    async function fetchReplays() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/replays`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setReplays(data.replays || []);
        }
      } catch (err) {
        console.error("Failed to fetch replays:", err);
      }
      setLoading(false);
    }
    fetchReplays();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: bg,
      fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s",
    }}>
      {/* Header */}
      <div style={{
        background: darkMode
          ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", width: 500, height: 200,
          pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)",
        }} />
        <h1 style={{
          fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 800, color: "#fff",
          marginBottom: "0.4em", letterSpacing: "-0.02em",
        }}>
          🎬 Replay History
        </h1>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1.05em" }}>
          Watch your past games play out move by move
        </p>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 64px" }}>
        {loading ? (
          <div style={{
            background: cardBg, border: cardBorder, borderRadius: 16,
            padding: "2em", textAlign: "center",
          }}>
            <p style={{ color: textMuted, fontSize: "1.1em" }}>Loading replays...</p>
          </div>
        ) : replays.length === 0 ? (
          <div style={{
            background: cardBg, border: cardBorder, borderRadius: 16,
            padding: "3em", textAlign: "center",
            backdropFilter: "blur(8px)",
          }}>
            <div style={{ fontSize: "3em", marginBottom: "0.5em" }}>🎬</div>
            <h2 style={{ color: "#7ecbff", marginBottom: "0.5em", fontSize: "1.3em" }}>
              No replays yet
            </h2>
            <p style={{ color: textMuted, marginBottom: "1.5em", lineHeight: 1.6 }}>
              Replays are saved when moves are recorded during gameplay.<br />
              Play some games to see them here!
            </p>
            <button
              onClick={() => navigate("/games")}
              style={{
                padding: "0.75em 2em", borderRadius: 50, border: "none",
                background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              Browse Games
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8em" }}>
            {replays.map((replay) => (
              <div
                key={replay.session_id}
                style={{
                  background: cardBg, border: cardBorder, borderRadius: 16,
                  padding: "1.4em 1.8em", backdropFilter: "blur(8px)",
                  boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: "1em",
                }}
              >
                {/* Left: game info */}
                <div style={{ display: "flex", alignItems: "center", gap: "1em" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: darkMode ? "rgba(126,203,255,0.08)" : "rgba(126,203,255,0.12)",
                    border: "1px solid rgba(126,203,255,0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.3em", flexShrink: 0,
                  }}>
                    {outcomeEmoji(replay.outcome)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: textPrimary, fontSize: "1.05em" }}>
                      {replay.game}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.8em", marginTop: "0.2em" }}>
                      <span style={{
                        fontSize: "0.82em", fontWeight: 600,
                        color: outcomeColor(replay.outcome, darkMode),
                        textTransform: "capitalize",
                      }}>
                        {replay.outcome}
                      </span>
                      <span style={{ color: textMuted, fontSize: "0.82em" }}>·</span>
                      <span style={{ color: textMuted, fontSize: "0.82em" }}>
                        {replay.move_count} move{replay.move_count !== 1 ? "s" : ""}
                      </span>
                      <span style={{ color: textMuted, fontSize: "0.82em" }}>·</span>
                      <span style={{ color: textMuted, fontSize: "0.82em" }}>
                        {formatDate(replay.played_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Watch Replay button */}
                <button
                  onClick={() => navigate(`/replay/${replay.session_id}`)}
                  style={{
                    padding: "0.55em 1.3em", borderRadius: 10, border: "none",
                    background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                    color: "#1a1a2e", fontWeight: 700, fontSize: "0.92em",
                    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                >
                  ▶ Watch Replay
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayHistory;