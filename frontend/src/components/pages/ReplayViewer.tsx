import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDarkModeContext } from "../DarkModeProvider";
import API_URL from "../../config/api";

interface Move {
  move_number: number;
  move_data: Record<string, unknown>;
  played_at: string;
}

interface ReplaySession {
  session_id: number;
  game: string;
  outcome: string;
  played_at: string;
  moves: Move[];
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

const WordleMoveDisplay: React.FC<{ moveData: Record<string, unknown>; darkMode: boolean }> = ({ moveData, darkMode }) => {
  const guess = moveData.guess as string | undefined;
  const feedback = moveData.feedback as string[] | undefined;
  if (!guess || !feedback) return null;
  const colorMap: Record<string, string> = {
    green: "#28e07b",
    yellow: "#ffe066",
    gray: darkMode ? "rgba(255,255,255,0.2)" : "rgba(26,26,46,0.15)",
  };
  return (
    <div style={{ display: "flex", gap: "0.4em", justifyContent: "center", marginTop: "0.8em" }}>
      {guess.split("").map((letter, i) => (
        <div key={i} style={{
          width: 44, height: 44,
          background: colorMap[feedback[i]] || colorMap.gray,
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: "1.2em",
          color: feedback[i] === "gray" ? (darkMode ? "rgba(255,255,255,0.6)" : "rgba(26,26,46,0.6)") : "#1a1a2e",
        }}>
          {letter}
        </div>
      ))}
    </div>
  );
};

const GenericMoveDisplay: React.FC<{ moveData: Record<string, unknown>; darkMode: boolean }> = ({ moveData, darkMode }) => {
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5em", marginTop: "0.8em" }}>
      {Object.entries(moveData).map(([key, value]) => (
        <div key={key} style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          padding: "0.5em 0.8em",
          background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.05)",
          borderRadius: 8,
        }}>
          <span style={{ color: textMuted, fontSize: "0.88em", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{key}</span>
          <span style={{ color: textPrimary, fontSize: "0.95em", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const SPEEDS = [
  { label: "0.5x", ms: 2000 },
  { label: "1x", ms: 1000 },
  { label: "2x", ms: 500 },
  { label: "3x", ms: 333 },
];

const ReplayViewer: React.FC = () => {
  const { session_id } = useParams<{ session_id: string }>();
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedIndex, setSpeedIndex] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [darkMode] = useDarkModeContext();
  const navigate = useNavigate();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";

  useEffect(() => {
    async function fetchReplay() {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/api/replays/${session_id}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setSession(data);
          setCurrentMove(0);
        }
      } catch (err) {
        console.error("Failed to fetch replay:", err);
      }
      setLoading(false);
    }
    if (session_id) fetchReplay();
  }, [session_id]);

  // Auto-playback
  useEffect(() => {
    if (isPlaying && session) {
      intervalRef.current = setInterval(() => {
        setCurrentMove(prev => {
          if (prev >= session.moves.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, SPEEDS[speedIndex].ms);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedIndex, session]);

  const handlePlayPause = () => {
    if (session && currentMove >= session.moves.length - 1) {
      setCurrentMove(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  const cardStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: cardBg, border: cardBorder, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em", backdropFilter: "blur(8px)",
    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
    ...extra,
  });

  const move = session?.moves[currentMove];
  const totalMoves = session?.moves.length || 0;
  const isWordle = session?.game.toLowerCase() === "wordle";
  const atEnd = currentMove === totalMoves - 1;

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "48px 24px 56px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />
        <button onClick={() => { setIsPlaying(false); navigate("/replays"); }} style={{ position: "absolute", top: 24, left: 24, padding: "0.4em 1em", borderRadius: 8, border: "1px solid rgba(126,203,255,0.3)", background: "transparent", color: "#7ecbff", fontWeight: 600, fontSize: "0.88em", cursor: "pointer", fontFamily: "inherit" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff", marginBottom: "0.3em", letterSpacing: "-0.02em" }}>
          🎬 {session ? `${session.game} Replay` : "Loading Replay..."}
        </h1>
        {session && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1em" }}>
            Outcome: <span style={{ color: outcomeColor(session.outcome, darkMode), fontWeight: 700, textTransform: "capitalize" }}>{session.outcome}</span>
            {" · "}{totalMoves} move{totalMoves !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px 64px" }}>
        {loading ? (
          <div style={cardStyle({ textAlign: "center" })}><p style={{ color: textMuted }}>Loading replay...</p></div>
        ) : !session || totalMoves === 0 ? (
          <div style={cardStyle({ textAlign: "center", padding: "3em" })}>
            <div style={{ fontSize: "2.5em", marginBottom: "0.5em" }}>🎬</div>
            <h2 style={{ color: "#7ecbff", marginBottom: "0.5em" }}>No moves found</h2>
            <p style={{ color: textMuted, marginBottom: "1.5em" }}>This session has no recorded moves.</p>
            <button onClick={() => navigate("/replays")} style={{ padding: "0.75em 2em", borderRadius: 50, border: "none", background: "linear-gradient(90deg, #7ecbff, #4fa3d1)", color: "#1a1a2e", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>← Back to Replays</button>
          </div>
        ) : (
          <>
            {/* Progress */}
            <div style={cardStyle({ padding: "1.2em 1.8em" })}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6em" }}>
                <span style={{ color: textMuted, fontSize: "0.85em", fontWeight: 600 }}>PROGRESS</span>
                <span style={{ color: textPrimary, fontSize: "0.85em", fontWeight: 700 }}>Move {currentMove + 1} of {totalMoves}</span>
              </div>
              <div style={{ background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(26,26,46,0.08)", borderRadius: 50, height: 6 }}>
                <div style={{ height: 6, borderRadius: 50, background: "linear-gradient(90deg, #7ecbff, #4fa3d1)", width: `${((currentMove + 1) / totalMoves) * 100}%`, transition: "width 0.3s ease" }} />
              </div>
            </div>

            {/* Playback controls */}
            <div style={cardStyle({ padding: "1.2em 1.8em" })}>
              <div style={{ display: "flex", alignItems: "center", gap: "1em", flexWrap: "wrap" }}>
                <button
                  onClick={handlePlayPause}
                  style={{
                    padding: "0.6em 1.4em", borderRadius: 10,
                    border: isPlaying ? "1px solid rgba(255,126,103,0.3)" : "none",
                    background: isPlaying ? "rgba(255,126,103,0.15)" : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                    color: isPlaying ? "#ff7e67" : "#1a1a2e",
                    fontWeight: 700, fontSize: "1em", cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {isPlaying ? "⏸ Pause" : atEnd ? "↺ Replay" : "▶ Play"}
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5em" }}>
                  <span style={{ color: textMuted, fontSize: "0.85em", fontWeight: 600 }}>Speed:</span>
                  <div style={{ display: "flex", gap: "0.3em" }}>
                    {SPEEDS.map((s, i) => (
                      <button key={s.label} onClick={() => setSpeedIndex(i)} style={{
                        padding: "0.3em 0.7em", borderRadius: 8, fontSize: "0.82em", fontWeight: 600,
                        cursor: "pointer", fontFamily: "inherit",
                        background: speedIndex === i ? "rgba(126,203,255,0.15)" : "transparent",
                        color: speedIndex === i ? "#7ecbff" : textMuted,
                        border: speedIndex === i ? "1px solid rgba(126,203,255,0.3)" : `1px solid rgba(126,203,255,0.1)`,
                      }}>{s.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Current move */}
            <div style={cardStyle({ padding: "2em" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1em" }}>
                <h2 style={{ fontSize: "1.1em", fontWeight: 700, color: "#7ecbff" }}>Move {move!.move_number}</h2>
                <span style={{ color: textMuted, fontSize: "0.82em" }}>{new Date(move!.played_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
              </div>
              {isWordle ? <WordleMoveDisplay moveData={move!.move_data} darkMode={darkMode} /> : <GenericMoveDisplay moveData={move!.move_data} darkMode={darkMode} />}
            </div>

            {/* Previous moves */}
            {currentMove > 0 && (
              <div style={cardStyle({ padding: "1.5em" })}>
                <h3 style={{ fontSize: "0.9em", fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1em" }}>Previous Moves</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
                  {session.moves.slice(0, currentMove).map((m) => (
                    <div key={m.move_number} style={{ padding: "0.6em 0.8em", background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(126,203,255,0.04)", borderRadius: 8, opacity: 0.7 }}>
                      {isWordle ? <WordleMoveDisplay moveData={m.move_data} darkMode={darkMode} /> : <span style={{ color: textMuted, fontSize: "0.88em" }}>Move {m.move_number}: {Object.entries(m.move_data).map(([k, v]) => `${k}: ${v}`).join(", ")}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prev/Next */}
            <div style={{ display: "flex", gap: "0.8em", marginTop: "0.5em" }}>
              <button onClick={() => { setIsPlaying(false); setCurrentMove(Math.max(0, currentMove - 1)); }} disabled={currentMove === 0} style={{ flex: 1, padding: "0.85em", borderRadius: 12, border: cardBorder, background: currentMove === 0 ? "transparent" : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)"), color: currentMove === 0 ? textMuted : textPrimary, fontWeight: 700, fontSize: "1em", cursor: currentMove === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: currentMove === 0 ? 0.4 : 1 }}>← Previous</button>
              <button onClick={() => { setIsPlaying(false); setCurrentMove(Math.min(totalMoves - 1, currentMove + 1)); }} disabled={atEnd} style={{ flex: 1, padding: "0.85em", borderRadius: 12, border: "none", background: atEnd ? (darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)") : "linear-gradient(90deg, #7ecbff, #4fa3d1)", color: atEnd ? textMuted : "#1a1a2e", fontWeight: 700, fontSize: "1em", cursor: atEnd ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: atEnd ? 0.4 : 1 }}>Next →</button>
            </div>

            {atEnd && (
              <div style={{ marginTop: "1.2em", padding: "1.2em", background: darkMode ? "rgba(40,224,123,0.08)" : "rgba(40,224,123,0.06)", border: "1px solid rgba(40,224,123,0.2)", borderRadius: 12, textAlign: "center" }}>
                <span style={{ color: "#28e07b", fontWeight: 700 }}>🏁 End of replay — <span style={{ textTransform: "capitalize" }}>{session.outcome}</span>!</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ReplayViewer;