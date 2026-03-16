import React, { useEffect, useState } from "react";
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

// Render Wordle-specific move data
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

// Generic move data display
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
          <span style={{ color: textMuted, fontSize: "0.88em", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {key}
          </span>
          <span style={{ color: textPrimary, fontSize: "0.95em", fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
};

const ReplayViewer: React.FC = () => {
  const { session_id } = useParams<{ session_id: string }>();
  const [session, setSession] = useState<ReplaySession | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [loading, setLoading] = useState(true);
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
        const res = await fetch(`${API_URL}/api/replays/${session_id}`, {
          headers: getAuthHeaders(),
        });
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

  const move = session?.moves[currentMove];
  const totalMoves = session?.moves.length || 0;
  const isWordle = session?.game.toLowerCase() === "wordle";

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
        padding: "48px 24px 56px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%,-50%)", width: 400, height: 200,
          pointerEvents: "none",
          background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)",
        }} />
        <button
          onClick={() => navigate("/replays")}
          style={{
            position: "absolute", top: 24, left: 24,
            padding: "0.4em 1em", borderRadius: 8,
            border: "1px solid rgba(126,203,255,0.3)",
            background: "transparent", color: "#7ecbff",
            fontWeight: 600, fontSize: "0.88em",
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← Back
        </button>
        <h1 style={{
          fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff",
          marginBottom: "0.3em", letterSpacing: "-0.02em",
        }}>
          🎬 {session ? `${session.game} Replay` : "Loading Replay..."}
        </h1>
        {session && (
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "1em" }}>
            Outcome:{" "}
            <span style={{ color: outcomeColor(session.outcome, darkMode), fontWeight: 700, textTransform: "capitalize" }}>
              {session.outcome}
            </span>
            {" · "}{totalMoves} move{totalMoves !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "48px 24px 64px" }}>
        {loading ? (
          <div style={{ ...styles.card(cardBg, cardBorder), textAlign: "center" }}>
            <p style={{ color: textMuted }}>Loading replay...</p>
          </div>
        ) : !session || totalMoves === 0 ? (
          <div style={{ ...styles.card(cardBg, cardBorder), textAlign: "center", padding: "3em" }}>
            <div style={{ fontSize: "2.5em", marginBottom: "0.5em" }}>🎬</div>
            <h2 style={{ color: "#7ecbff", marginBottom: "0.5em" }}>No moves found</h2>
            <p style={{ color: textMuted, marginBottom: "1.5em" }}>
              This session has no recorded moves.
            </p>
            <button onClick={() => navigate("/replays")} style={styles.primaryBtn}>
              ← Back to Replays
            </button>
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div style={{ ...styles.card(cardBg, cardBorder), padding: "1.2em 1.8em" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.6em" }}>
                <span style={{ color: textMuted, fontSize: "0.85em", fontWeight: 600 }}>PROGRESS</span>
                <span style={{ color: textPrimary, fontSize: "0.85em", fontWeight: 700 }}>
                  Move {currentMove + 1} of {totalMoves}
                </span>
              </div>
              <div style={{ background: darkMode ? "rgba(255,255,255,0.08)" : "rgba(26,26,46,0.08)", borderRadius: 50, height: 6 }}>
                <div style={{
                  height: 6, borderRadius: 50,
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  width: `${((currentMove + 1) / totalMoves) * 100}%`,
                  transition: "width 0.3s ease",
                }} />
              </div>
            </div>

            {/* Move card */}
            <div style={{ ...styles.card(cardBg, cardBorder), padding: "2em" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1em" }}>
                <h2 style={{ fontSize: "1.1em", fontWeight: 700, color: "#7ecbff" }}>
                  Move {move!.move_number}
                </h2>
                <span style={{ color: textMuted, fontSize: "0.82em" }}>
                  {new Date(move!.played_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>

              {isWordle ? (
                <WordleMoveDisplay moveData={move!.move_data} darkMode={darkMode} />
              ) : (
                <GenericMoveDisplay moveData={move!.move_data} darkMode={darkMode} />
              )}
            </div>

            {/* All moves so far */}
            {currentMove > 0 && (
              <div style={{ ...styles.card(cardBg, cardBorder), padding: "1.5em" }}>
                <h3 style={{ fontSize: "0.9em", fontWeight: 700, color: textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1em" }}>
                  Previous Moves
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5em" }}>
                  {session.moves.slice(0, currentMove).map((m) => (
                    <div key={m.move_number} style={{
                      padding: "0.6em 0.8em",
                      background: darkMode ? "rgba(255,255,255,0.03)" : "rgba(126,203,255,0.04)",
                      borderRadius: 8, opacity: 0.7,
                    }}>
                      {isWordle ? (
                        <WordleMoveDisplay moveData={m.move_data} darkMode={darkMode} />
                      ) : (
                        <span style={{ color: textMuted, fontSize: "0.88em" }}>
                          Move {m.move_number}: {Object.entries(m.move_data).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div style={{ display: "flex", gap: "0.8em", justifyContent: "center", marginTop: "0.5em" }}>
              <button
                onClick={() => setCurrentMove(Math.max(0, currentMove - 1))}
                disabled={currentMove === 0}
                style={{
                  flex: 1, padding: "0.85em", borderRadius: 12,
                  border: cardBorder,
                  background: currentMove === 0 ? "transparent" : (darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)"),
                  color: currentMove === 0 ? textMuted : textPrimary,
                  fontWeight: 700, fontSize: "1em",
                  cursor: currentMove === 0 ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  opacity: currentMove === 0 ? 0.4 : 1,
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentMove(Math.min(totalMoves - 1, currentMove + 1))}
                disabled={currentMove === totalMoves - 1}
                style={{
                  flex: 1, padding: "0.85em", borderRadius: 12, border: "none",
                  background: currentMove === totalMoves - 1
                    ? (darkMode ? "rgba(255,255,255,0.06)" : "rgba(126,203,255,0.08)")
                    : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: currentMove === totalMoves - 1 ? textMuted : "#1a1a2e",
                  fontWeight: 700, fontSize: "1em",
                  cursor: currentMove === totalMoves - 1 ? "not-allowed" : "pointer",
                  fontFamily: "inherit", transition: "all 0.15s",
                  opacity: currentMove === totalMoves - 1 ? 0.4 : 1,
                }}
              >
                Next →
              </button>
            </div>

            {currentMove === totalMoves - 1 && (
              <div style={{
                marginTop: "1.2em", padding: "1.2em",
                background: darkMode ? "rgba(40,224,123,0.08)" : "rgba(40,224,123,0.06)",
                border: "1px solid rgba(40,224,123,0.2)",
                borderRadius: 12, textAlign: "center",
              }}>
                <span style={{ color: "#28e07b", fontWeight: 700 }}>
                  🏁 End of replay —{" "}
                  <span style={{ textTransform: "capitalize" }}>{session.outcome}</span>!
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: (bg: string, border: string): React.CSSProperties => ({
    background: bg, border, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em",
    backdropFilter: "blur(8px)",
  }),
  primaryBtn: {
    padding: "0.75em 2em", borderRadius: 50, border: "none",
    background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
    color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
    cursor: "pointer", fontFamily: "inherit",
  } as React.CSSProperties,
};

export default ReplayViewer;