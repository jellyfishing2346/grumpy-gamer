import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../config/apiFetch";
import {
  ArenaMove, Cell, Pick, boardAfter, formatCountdown, pickLabel, potentialPayout,
} from "../../services/predictionUtils";

interface Bot { id: string; name: string }
interface Match {
  id: number;
  game: string;
  game_label: string;
  bot_a: Bot;
  bot_b: Bot;
  odds: Record<Pick, number | null>;
  status: "open" | "settled";
  result: Pick | null;
  seconds_left: number;
  moves?: ArenaMove[];
}
interface Prediction {
  id: number;
  match_id: number;
  game_label: string;
  matchup: string;
  pick: Pick;
  stake: number;
  odds: number;
  status: "pending" | "won" | "lost";
  payout: number;
}
interface Summary { total: number; settled: number; won: number; win_rate: number | null; net: number }
interface LeaderRow { username: string; settled: number; won: number; accuracy: number; net: number }

const C = {
  bg: "#0f1117",
  surface: "rgba(255,255,255,0.04)",
  line: "rgba(126,203,255,0.14)",
  text: "#e8f4f8",
  muted: "rgba(232,244,248,0.6)",
  accent: "#7ecbff",
  botA: "#7ecbff",
  botB: "#ff8f7a",
  coin: "#fbbf24",
  win: "#4ade80",
  loss: "#ff8f7a",
};
const PICK_COLOR: Record<Pick, string> = { a: C.botA, b: C.botB, draw: "#c4b5fd" };
const MIN_STAKE = 1;
const MAX_STAKE = 500;

const css = `
.pm-btn:focus-visible, .pm-odds:focus-visible, .pm-input:focus-visible {
  outline: 2px solid ${C.accent}; outline-offset: 2px;
}
.pm-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 2rem; align-items: start; }
@media (max-width: 860px) { .pm-grid { grid-template-columns: 1fr; } }
.pm-odds { transition: transform 120ms ease, background 120ms ease; }
.pm-odds:not(:disabled):hover { transform: translateY(-1px); }
@media (prefers-reduced-motion: reduce) { .pm-odds { transition: none; } .pm-odds:not(:disabled):hover { transform: none; } }
`;

const btn: React.CSSProperties = {
  padding: "0.65em 1.4em", borderRadius: 999, border: "none",
  background: C.accent, color: "#10202c", fontWeight: 700, cursor: "pointer",
  fontFamily: "inherit", fontSize: "0.95rem",
};
const ghostBtn: React.CSSProperties = {
  ...btn, background: "transparent", color: C.accent, border: `1px solid ${C.line}`,
};

const Board: React.FC<{ game: string; cells: Cell[][] }> = ({ game, cells }) => {
  const isC4 = game === "connectfour";
  const size = isC4 ? 40 : 64;
  return (
    <div
      role="img"
      aria-label={`${isC4 ? "Connect Four" : "Tic-Tac-Toe"} board`}
      style={{
        display: "inline-grid", gridTemplateColumns: `repeat(${cells[0].length}, ${size}px)`, gap: 6,
        padding: 10, borderRadius: 14, background: isC4 ? "#1c3a5e" : "rgba(255,255,255,0.05)",
      }}
    >
      {cells.flatMap((row, r) => row.map((cell, c) => (
        <div key={`${r}-${c}`} style={{
          width: size, height: size, borderRadius: isC4 ? "50%" : 10,
          background: isC4 ? (cell ? (cell === 1 ? C.botA : C.botB) : C.bg) : "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 34, fontWeight: 800, color: cell === 1 ? C.botA : C.botB,
        }}>
          {!isC4 && cell !== 0 ? (cell === 1 ? "X" : "O") : null}
        </div>
      )))}
    </div>
  );
};

const Replay: React.FC<{ match: Match; onClose: () => void }> = ({ match, onClose }) => {
  const moves = useMemo(() => match.moves ?? [], [match.moves]);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    if (step >= moves.length) { setPlaying(false); return; }
    const t = setTimeout(() => setStep((s) => s + 1), 550);
    return () => clearTimeout(t);
  }, [playing, step, moves.length]);

  const done = step >= moves.length;
  const resultText = match.result === "draw" ? "Draw" :
    `${match.result === "a" ? match.bot_a.name : match.bot_b.name} wins`;

  return (
    <section aria-label="Match replay" style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "1.25rem", marginTop: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
          <span style={{ color: C.botA }}>{match.bot_a.name}</span> vs <span style={{ color: C.botB }}>{match.bot_b.name}</span>
        </h3>
        <button className="pm-btn" style={ghostBtn} onClick={onClose}>Close replay</button>
      </div>
      <p style={{ color: C.muted, margin: "0.35rem 0 1rem" }}>
        {match.game_label}. Move {Math.min(step, moves.length)} of {moves.length}
        {done && <strong style={{ color: C.text }}>. {resultText}</strong>}
      </p>
      <div style={{ overflowX: "auto" }}>
        <Board game={match.game} cells={boardAfter(match.game, moves, step)} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem", flexWrap: "wrap" }}>
        <button className="pm-btn" style={ghostBtn} onClick={() => setStep((s) => Math.max(0, s - 1))} aria-label="Previous move">◀</button>
        <button className="pm-btn" style={btn} onClick={() => { if (done) setStep(0); setPlaying((p) => !p || done); }}>
          {playing ? "Pause" : done ? "Replay" : "Play"}
        </button>
        <button className="pm-btn" style={ghostBtn} onClick={() => setStep((s) => Math.min(moves.length, s + 1))} aria-label="Next move">▶</button>
        <input
          type="range" min={0} max={moves.length} value={step} aria-label="Scrub through moves"
          onChange={(e) => { setPlaying(false); setStep(Number(e.target.value)); }}
          style={{ flex: "1 1 160px", accentColor: C.accent }}
        />
      </div>
    </section>
  );
};

const MatchCard: React.FC<{
  match: Match;
  secondsLeft: number;
  myPrediction?: Prediction;
  balance: number | null;
  onPlaced: (message: string) => void;
}> = ({ match, secondsLeft, myPrediction, balance, onPlaced }) => {
  const [pick, setPick] = useState<Pick | null>(null);
  const [stake, setStake] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closed = secondsLeft <= 0;
  const odds = pick ? match.odds[pick] : null;
  const stakeValid = Number.isInteger(stake) && stake >= MIN_STAKE && stake <= MAX_STAKE;
  const affordable = balance === null || stake <= balance;

  const place = async () => {
    if (!pick || !stakeValid) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/predictions/wager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: match.id, pick, stake }),
      });
      const data = await res.json();
      if (res.ok) {
        onPlaced(`Prediction placed: ${pickLabel(pick, match.bot_a.name, match.bot_b.name)} for ${stake} coins.`);
      } else {
        setError(typeof data.detail === "string" ? data.detail : "Couldn't place that prediction. Check the stake and try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const outcomes: Pick[] = ["a", "draw", "b"];
  return (
    <article style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", color: C.muted, fontSize: "0.9rem" }}>
        <span>{match.game_label}</span>
        <span aria-live="polite" style={{ color: closed ? C.muted : secondsLeft < 20 ? C.coin : C.text, fontVariantNumeric: "tabular-nums" }}>
          {closed ? "Betting closed" : `Closes in ${formatCountdown(secondsLeft)}`}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.75rem", margin: "1rem 0 1.1rem" }}>
        <div>
          <div style={{ fontSize: "1.35rem", fontWeight: 800, color: C.botA, lineHeight: 1.15 }}>{match.bot_a.name}</div>
          <div style={{ color: C.muted, fontSize: "0.82rem" }}>moves first</div>
        </div>
        <div style={{ color: C.muted, fontWeight: 600 }}>vs</div>
        <div style={{ textAlign: "right", fontSize: "1.35rem", fontWeight: 800, color: C.botB, lineHeight: 1.15 }}>{match.bot_b.name}</div>
      </div>

      {myPrediction ? (
        <p style={{ margin: 0, padding: "0.75em 1em", borderRadius: 12, background: "rgba(126,203,255,0.08)" }}>
          Your pick: <strong style={{ color: PICK_COLOR[myPrediction.pick] }}>{pickLabel(myPrediction.pick, match.bot_a.name, match.bot_b.name)}</strong>,{" "}
          {myPrediction.stake} coins at {myPrediction.odds.toFixed(2)}. Pays{" "}
          <strong style={{ color: C.coin }}>{potentialPayout(myPrediction.stake, myPrediction.odds)}</strong> if right.
        </p>
      ) : (
        <>
          <div role="radiogroup" aria-label="Choose an outcome" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            {outcomes.map((o) => {
              const value = match.odds[o];
              const selected = pick === o;
              const label = o === "draw" ? "Draw" : (o === "a" ? match.bot_a.name : match.bot_b.name);
              return (
                <button
                  key={o}
                  className="pm-odds"
                  role="radio"
                  aria-checked={selected}
                  disabled={value === null || closed}
                  onClick={() => setPick(o)}
                  title={value === null ? "This outcome isn't offered for this matchup" : undefined}
                  style={{
                    padding: "0.7em 0.4em", borderRadius: 12, cursor: value === null || closed ? "not-allowed" : "pointer",
                    border: `2px solid ${selected ? PICK_COLOR[o] : "transparent"}`,
                    background: selected ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.05)",
                    color: C.text, fontFamily: "inherit", opacity: value === null ? 0.4 : 1,
                  }}
                >
                  <div style={{ fontSize: "0.8rem", color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: value === null ? C.muted : PICK_COLOR[o], fontVariantNumeric: "tabular-nums" }}>
                    {value === null ? "n/a" : value.toFixed(2)}
                  </div>
                </button>
              );
            })}
          </div>

          {pick && !closed && (
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", marginTop: "1rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.85rem", color: C.muted }}>
                Stake (coins)
                <input
                  className="pm-input" type="number" min={MIN_STAKE} max={MAX_STAKE} step={1} value={Number.isNaN(stake) ? "" : stake}
                  onChange={(e) => setStake(Math.floor(Number(e.target.value)))}
                  style={{ width: 110, padding: "0.55em 0.8em", borderRadius: 10, border: `1px solid ${C.line}`, background: "rgba(255,255,255,0.05)", color: C.text, fontFamily: "inherit", fontSize: "1rem" }}
                />
              </label>
              <div style={{ flex: 1, minWidth: 120, color: C.muted, fontSize: "0.9rem", paddingBottom: "0.55em" }}>
                Pays <strong style={{ color: C.coin, fontSize: "1.05rem" }}>{potentialPayout(stake, odds)}</strong> if right
              </div>
              <button className="pm-btn" style={{ ...btn, opacity: busy || !stakeValid || !affordable ? 0.6 : 1 }} disabled={busy || !stakeValid || !affordable} onClick={place}>
                {busy ? "Placing…" : "Place prediction"}
              </button>
            </div>
          )}
          {pick && !stakeValid && <p role="alert" style={{ color: C.loss, margin: "0.6rem 0 0", fontSize: "0.88rem" }}>Stake must be a whole number from {MIN_STAKE} to {MAX_STAKE}.</p>}
          {pick && stakeValid && !affordable && <p role="alert" style={{ color: C.loss, margin: "0.6rem 0 0", fontSize: "0.88rem" }}>You have {balance} coins. Lower the stake to place this prediction.</p>}
          {error && <p role="alert" style={{ color: C.loss, margin: "0.6rem 0 0", fontSize: "0.88rem" }}>{error}</p>}
        </>
      )}
    </article>
  );
};

const PredictionMarkets: React.FC = () => {
  const [openMatches, setOpenMatches] = useState<Match[]>([]);
  const [recent, setRecent] = useState<Match[]>([]);
  const [mine, setMine] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leaders, setLeaders] = useState<LeaderRow[]>([]);
  const [minForBoard, setMinForBoard] = useState(5);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [replay, setReplay] = useState<Match | null>(null);
  const [now, setNow] = useState(Date.now());
  const fetchedAt = useRef(Date.now());

  const load = useCallback(async () => {
    try {
      const [mRes, myRes, lbRes, balRes] = await Promise.all([
        apiFetch("/api/predictions/matches"),
        apiFetch("/api/predictions/my"),
        apiFetch("/api/predictions/leaderboard"),
        apiFetch("/api/coins/balance"),
      ]);
      if (!mRes.ok) throw new Error("matches");
      const m = await mRes.json();
      fetchedAt.current = Date.now();
      setNow(Date.now());
      setOpenMatches(m.open ?? []);
      setRecent(m.recent ?? []);
      if (myRes.ok) {
        const d = await myRes.json();
        setMine(d.predictions ?? []);
        setSummary(d.summary ?? null);
      }
      if (lbRes.ok) {
        const d = await lbRes.json();
        setLeaders(d.leaderboard ?? []);
        setMinForBoard(d.min_predictions ?? 5);
      }
      if (balRes.ok) setBalance((await balRes.json()).balance);
      setLoadError(null);
    } catch {
      setLoadError("Couldn't load matches. The server may be waking up; try again in a moment.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(load, 20000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [load]);

  const elapsed = (now - fetchedAt.current) / 1000;
  const anyJustClosed = openMatches.some((m) => m.seconds_left > 0 && m.seconds_left - elapsed <= 0);
  useEffect(() => {
    if (anyJustClosed) {
      const t = setTimeout(load, 1500); // give settlement a moment, then refresh
      return () => clearTimeout(t);
    }
  }, [anyJustClosed, load]);

  const pendingByMatch = useMemo(() => {
    const map: Record<number, Prediction> = {};
    mine.forEach((p) => { if (p.status === "pending") map[p.match_id] = p; });
    return map;
  }, [mine]);

  const watch = async (id: number) => {
    try {
      const res = await apiFetch(`/api/predictions/matches/${id}`);
      if (res.ok) setReplay(await res.json());
    } catch { /* keep current view */ }
  };

  const onPlaced = (text: string) => {
    setMessage(text);
    load();
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', system-ui, sans-serif", padding: "2rem 1.25rem" }}>
      <style>{css}</style>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ fontSize: "2.1rem", fontWeight: 800, margin: 0, color: C.accent }}>🔮 Predictions</h1>
            <p style={{ color: C.muted, margin: "0.35rem 0 0", maxWidth: "60ch" }}>
              Pick the winner of upcoming AI vs AI matches. When betting closes the match is played, and correct picks pay your stake times the odds.
            </p>
          </div>
          {balance !== null && <div style={{ color: C.coin, fontWeight: 700, fontSize: "1.1rem" }}>💰 {balance} coins</div>}
        </header>

        {message && <div role="status" style={{ padding: "0.8em 1em", borderRadius: 12, background: "rgba(74,222,128,0.1)", color: C.win, marginBottom: "1rem" }}>{message}</div>}
        {loadError && (
          <div role="alert" style={{ padding: "0.8em 1em", borderRadius: 12, background: "rgba(255,143,122,0.1)", color: C.loss, marginBottom: "1rem", display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
            {loadError}
            <button className="pm-btn" style={ghostBtn} onClick={load}>Retry</button>
          </div>
        )}

        <div className="pm-grid">
          <main>
            <h2 style={{ fontSize: "1.2rem", margin: "0 0 0.75rem" }}>Open for predictions</h2>
            {loading ? <p style={{ color: C.muted }}>Loading matches…</p> : openMatches.length === 0 ? (
              <p style={{ color: C.muted }}>No matches are open right now. New ones are scheduled automatically; check back in a minute.</p>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {openMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    secondsLeft={m.seconds_left - elapsed}
                    myPrediction={pendingByMatch[m.id]}
                    balance={balance}
                    onPlaced={onPlaced}
                  />
                ))}
              </div>
            )}

            <h2 style={{ fontSize: "1.2rem", margin: "2rem 0 0.75rem" }}>Recent results</h2>
            {recent.length === 0 ? <p style={{ color: C.muted }}>Finished matches appear here, ready to watch.</p> : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.5rem" }}>
                {recent.map((m) => (
                  <li key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.7em 1em", borderRadius: 12, background: C.surface }}>
                    <span>
                      <span style={{ color: C.muted }}>{m.game_label}: </span>
                      <span style={{ color: C.botA, fontWeight: m.result === "a" ? 800 : 500 }}>{m.bot_a.name}</span>
                      {" vs "}
                      <span style={{ color: C.botB, fontWeight: m.result === "b" ? 800 : 500 }}>{m.bot_b.name}</span>
                      <span style={{ color: C.muted }}>{m.result === "draw" ? " (draw)" : ""}</span>
                    </span>
                    <button className="pm-btn" style={{ ...ghostBtn, padding: "0.4em 1em", fontSize: "0.85rem" }} onClick={() => watch(m.id)}>Watch</button>
                  </li>
                ))}
              </ul>
            )}
            {replay && <Replay key={replay.id} match={replay} onClose={() => setReplay(null)} />}
          </main>

          <aside style={{ display: "grid", gap: "1.25rem" }}>
            <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "1.25rem" }}>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem" }}>Your record</h2>
              {summary && summary.total > 0 ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{summary.win_rate === null ? "–" : `${summary.win_rate}%`}</div>
                      <div style={{ color: C.muted, fontSize: "0.85rem" }}>{summary.won} of {summary.settled} right</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, color: summary.net >= 0 ? C.win : C.loss }}>{summary.net >= 0 ? "+" : ""}{summary.net}</div>
                      <div style={{ color: C.muted, fontSize: "0.85rem" }}>coins net</div>
                    </div>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.4rem", fontSize: "0.88rem" }}>
                    {mine.slice(0, 8).map((p) => (
                      <li key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span style={{ color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.matchup}</span>
                        <span style={{ whiteSpace: "nowrap", color: p.status === "won" ? C.win : p.status === "lost" ? C.loss : C.text }}>
                          {p.status === "won" ? `+${p.payout - p.stake}` : p.status === "lost" ? `−${p.stake}` : "Pending"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p style={{ color: C.muted, margin: 0 }}>Make your first prediction to start your record.</p>}
            </section>

            <section style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 18, padding: "1.25rem" }}>
              <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.25rem" }}>Top predictors</h2>
              <p style={{ color: C.muted, fontSize: "0.82rem", margin: "0 0 0.75rem" }}>Ranked by coins won, after {minForBoard}+ settled predictions.</p>
              {leaders.length === 0 ? <p style={{ color: C.muted, margin: 0 }}>Nobody qualifies yet.</p> : (
                <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.45rem", fontSize: "0.9rem" }}>
                  {leaders.map((l, i) => (
                    <li key={`${i}-${l.username}`}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                        <span>{l.username} <span style={{ color: C.muted }}>{l.accuracy}%</span></span>
                        <strong style={{ color: l.net >= 0 ? C.win : C.loss }}>{l.net >= 0 ? "+" : ""}{l.net}</strong>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PredictionMarkets;
