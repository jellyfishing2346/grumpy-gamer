import React, { useEffect, useState } from "react";
import { useDarkModeContext } from "../DarkModeProvider";
import { apiFetch } from "../../config/apiFetch";

interface GameStat {
  game: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}


const ProfilePage: React.FC = () => {
  const [darkMode] = useDarkModeContext();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [stats, setStats] = useState<GameStat[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);

  // Email/username form
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [infoMsg, setInfoMsg] = useState("");
  const [infoMsgType, setInfoMsgType] = useState<"success" | "error">("success");
  const [savingInfo, setSavingInfo] = useState(false);

  // Password form
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwMsgType, setPwMsgType] = useState<"success" | "error">("success");
  const [savingPw, setSavingPw] = useState(false);

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";
  const inputBg = darkMode ? "rgba(255,255,255,0.06)" : "#fff";
  const inputBorder = darkMode ? "1px solid rgba(126,203,255,0.15)" : "1px solid rgba(126,203,255,0.3)";

  useEffect(() => {
    async function fetchData() {
      setLoadingInfo(true);
      try {
        const [infoRes, statsRes] = await Promise.all([
          apiFetch("/api/user/info"),
          apiFetch("/api/stats/summary"),
        ]);
        if (infoRes.ok) {
          const user = await infoRes.json();
          setUsername(user.username || "");
          setEmail(user.email || "");
          setNewUsername(user.username || "");
          setNewEmail(user.email || "");
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats || []);
        }
      } catch (err) {
        console.error("Failed to fetch profile data:", err);
      }
      setLoadingInfo(false);
    }
    fetchData();
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg("");
    try {
      const res = await fetch("/api/user/update", {
        method: "PUT",
        body: JSON.stringify({ new_username: newUsername, new_email: newEmail }),
      });
      if (res.ok) {
        setUsername(newUsername);
        setEmail(newEmail);
        setInfoMsg("Profile updated successfully.");
        setInfoMsgType("success");
      } else {
        const data = await res.json();
        setInfoMsg(data.detail || "Failed to update profile.");
        setInfoMsgType("error");
      }
    } catch {
      setInfoMsg("Network error. Please try again.");
      setInfoMsgType("error");
    }
    setSavingInfo(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwMsg("Passwords don't match.");
      setPwMsgType("error");
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg("Password must be at least 6 characters.");
      setPwMsgType("error");
      return;
    }
    setSavingPw(true);
    try {
      const res = await apiFetch("/api/user/update", {
        method: "PUT",
        body: JSON.stringify({ new_password: newPassword }),
      });
      if (res.ok) {
        setPwMsg("Password changed successfully.");
        setPwMsgType("success");
        
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const data = await res.json();
        setPwMsg(data.detail || "Failed to change password.");
        setPwMsgType("error");
      }
    } catch {
      setPwMsg("Network error. Please try again.");
      setPwMsgType("error");
    }
    setSavingPw(false);
  };

  const totalGames = stats.reduce((s, g) => s + g.total, 0);
  const totalWins = stats.reduce((s, g) => s + g.wins, 0);
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : "0.0";
  const topGame = stats.length > 0 ? stats.reduce((a, b) => a.total > b.total ? a : b) : null;

  const cardStyle: React.CSSProperties = {
    background: cardBg, border: cardBorder, borderRadius: 16,
    padding: "1.8em", marginBottom: "1.2em", backdropFilter: "blur(8px)",
    boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.65em 1em", borderRadius: 10,
    border: inputBorder, background: inputBg, color: textPrimary,
    fontSize: "1em", fontFamily: "inherit", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.82em", fontWeight: 600,
    color: textMuted, marginBottom: "0.4em",
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  const msgStyle = (type: "success" | "error"): React.CSSProperties => ({
    marginTop: "0.8em", padding: "0.7em 1em", borderRadius: 8, fontSize: "0.9em", fontWeight: 500,
    background: type === "success" ? "rgba(40,224,123,0.1)" : "rgba(255,126,103,0.1)",
    border: `1px solid ${type === "success" ? "rgba(40,224,123,0.3)" : "rgba(255,126,103,0.3)"}`,
    color: type === "success" ? "#28e07b" : "#ff7e67",
  });

  return (
    <div style={{ minHeight: "100vh", background: bg, fontFamily: "'DM Sans', 'Inter', sans-serif", transition: "background 0.3s" }}>
      {/* Header */}
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)" : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px", textAlign: "center", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 400, height: 200, pointerEvents: "none", background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)" }} />

        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #7ecbff, #4fa3d1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.8em", margin: "0 auto 1em", fontWeight: 800, color: "#1a1a2e",
        }}>
          {username ? username[0].toUpperCase() : "?"}
        </div>

        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.5rem)", fontWeight: 800, color: "#fff", marginBottom: "0.2em", letterSpacing: "-0.02em" }}>
          {loadingInfo ? "Loading..." : username || "Your Profile"}
        </h1>
        <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95em" }}>{email}</p>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "48px 24px 64px" }}>

        {/* Stats snapshot */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>📊 Stats Snapshot</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.8em" }}>
            {[
              { label: "Games Played", value: totalGames, color: "#7ecbff" },
              { label: "Wins", value: totalWins, color: "#28e07b" },
              { label: "Win Rate", value: `${winRate}%`, color: "#7ecbff" },
              { label: "Top Game", value: topGame ? topGame.game : "—", color: "#ffe066" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{
                background: darkMode ? "rgba(255,255,255,0.04)" : "rgba(126,203,255,0.06)",
                border: darkMode ? "1px solid rgba(126,203,255,0.08)" : "1px solid rgba(126,203,255,0.15)",
                borderRadius: 12, padding: "1em", textAlign: "center",
              }}>
                <div style={{ fontSize: "1.5em", fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: "0.78em", color: textMuted, marginTop: "0.3em" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit profile */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>👤 Edit Profile</h2>
          <form onSubmit={handleSaveInfo}>
            <div style={{ marginBottom: "1.2em" }}>
              <label style={labelStyle}>Username</label>
              <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: "1.5em" }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} style={inputStyle} required />
            </div>
            <button type="submit" disabled={savingInfo} style={{
              width: "100%", padding: "0.75em", borderRadius: 10, border: "none",
              background: savingInfo ? "rgba(126,203,255,0.3)" : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
              cursor: savingInfo ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {savingInfo ? "Saving..." : "Save Changes"}
            </button>
            {infoMsg && <div style={msgStyle(infoMsgType)}>{infoMsg}</div>}
          </form>
        </div>

        {/* Change password */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>🔒 Change Password</h2>
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: "1.2em" }}>
              <label style={labelStyle}>New Password</label>
              <input type="password" placeholder="••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={inputStyle} required />
            </div>
            <div style={{ marginBottom: "1.5em" }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={inputStyle} required />
            </div>
            <button type="submit" disabled={savingPw} style={{
              width: "100%", padding: "0.75em", borderRadius: 10, border: "none",
              background: savingPw ? "rgba(126,203,255,0.3)" : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
              color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
              cursor: savingPw ? "not-allowed" : "pointer", fontFamily: "inherit",
            }}>
              {savingPw ? "Changing..." : "Change Password"}
            </button>
            {pwMsg && <div style={msgStyle(pwMsgType)}>{pwMsg}</div>}
          </form>
        </div>

      </div>
    </div>
  );
};

export default ProfilePage;