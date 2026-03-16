import React from "react";
import API_URL from "../../config/api";
import { updateUser, deleteUser } from "../../services/userService";
import { useDarkModeContext } from "../DarkModeProvider";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string>("");
  const [messageType, setMessageType] = React.useState<"success" | "error">("success");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [darkMode, setDarkMode] = useDarkModeContext();

  const bg = darkMode ? "#0f1117" : "#f0f4ff";
  const cardBg = darkMode ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.95)";
  const cardBorder = darkMode ? "1px solid rgba(126,203,255,0.1)" : "1px solid rgba(126,203,255,0.2)";
  const textPrimary = darkMode ? "#f0f4ff" : "#1a1a2e";
  const textMuted = darkMode ? "rgba(255,255,255,0.5)" : "rgba(26,26,46,0.55)";
  const inputBg = darkMode ? "rgba(255,255,255,0.06)" : "#fff";
  const inputBorder = darkMode ? "1px solid rgba(126,203,255,0.15)" : "1px solid rgba(126,203,255,0.3)";

  React.useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    async function fetchUserInfo() {
      try {
        const res = await fetch(`${API_URL}/api/user/info`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed");
        const user = await res.json();
        setUsername(user.username);
        setEmail(user.email);
      } catch {
        setUsername("");
        setEmail("");
      }
    }
    if (token) fetchUserInfo();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const token = localStorage.getItem("access_token") || "";
    try {
      await updateUser({ email, username, newEmail: email, newUsername: username, token });
      setMessage("Account info updated successfully.");
      setMessageType("success");
    } catch {
      setMessage("Error updating account info.");
      setMessageType("error");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token") || "";
    try {
      await deleteUser(email, token);
      setMessage("Account deleted. Logging you out...");
      setMessageType("success");
      logout();
      setTimeout(() => navigate("/login"), 1500);
    } catch {
      setMessage("Error deleting account.");
      setMessageType("error");
    }
    setLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65em 1em",
    borderRadius: 10,
    border: inputBorder,
    background: inputBg,
    color: textPrimary,
    fontSize: "1em",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.15s",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.88em",
    fontWeight: 600,
    color: textMuted,
    marginBottom: "0.4em",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: bg,
      fontFamily: "'DM Sans', 'Inter', sans-serif",
      transition: "background 0.3s",
    }}>
      {/* Header */}
      <div style={{
        background: darkMode
          ? "linear-gradient(135deg, #0f1117 0%, #161b27 100%)"
          : "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
        padding: "56px 24px 64px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          width: 400, height: 200,
          background: "radial-gradient(ellipse, rgba(126,203,255,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <h1 style={{
          fontSize: "clamp(2rem, 4vw, 3rem)",
          fontWeight: 800,
          color: "#fff",
          marginBottom: "0.5em",
          letterSpacing: "-0.02em",
        }}>
          Settings
        </h1>
        <p style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "1.05em",
          maxWidth: 400,
          margin: "0 auto",
        }}>
          Manage your account and preferences
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 64px" }}>

        {/* Preferences */}
        <div style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 16,
          padding: "1.8em",
          marginBottom: "1.2em",
          backdropFilter: "blur(8px)",
          boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
        }}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>
            ⚙️ Preferences
          </h2>
          <div
            onClick={() => setDarkMode(!darkMode)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer", color: textPrimary, fontWeight: 500,
            }}
          >
            <div style={{
              width: 44, height: 24, borderRadius: 12,
              background: darkMode ? "#7ecbff" : "rgba(126,203,255,0.2)",
              border: "1px solid rgba(126,203,255,0.3)",
              position: "relative", transition: "background 0.2s", flexShrink: 0,
            }}>
              <div style={{
                position: "absolute", top: 3,
                left: darkMode ? 22 : 2,
                width: 16, height: 16, borderRadius: "50%",
                background: darkMode ? "#1a1a2e" : "#7ecbff",
                transition: "left 0.2s",
              }} />
            </div>
            {darkMode ? "🌙 Dark Mode" : "☀️ Light Mode"}
          </div>
        </div>

        {/* Account Info */}
        <div style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 16,
          padding: "1.8em",
          marginBottom: "1.2em",
          backdropFilter: "blur(8px)",
          boxShadow: darkMode ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(80,120,200,0.06)",
        }}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#7ecbff", marginBottom: "1.2em" }}>
            👤 Account Info
          </h2>
          <form onSubmit={handleSave}>
            <div style={{ marginBottom: "1.2em" }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div style={{ marginBottom: "1.5em" }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "0.75em", borderRadius: 10, border: "none",
                background: loading ? "rgba(126,203,255,0.3)" : "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>

          {message && (
            <div style={{
              marginTop: "1em", padding: "0.8em 1em", borderRadius: 10,
              background: messageType === "success" ? "rgba(40,224,123,0.1)" : "rgba(255,126,103,0.1)",
              border: `1px solid ${messageType === "success" ? "rgba(40,224,123,0.3)" : "rgba(255,126,103,0.3)"}`,
              color: messageType === "success" ? "#28e07b" : "#ff7e67",
              fontSize: "0.95em", fontWeight: 500,
            }}>
              {message}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div style={{
          background: darkMode ? "rgba(255,79,79,0.05)" : "rgba(255,79,79,0.03)",
          border: "1px solid rgba(255,79,79,0.2)",
          borderRadius: 16, padding: "1.8em",
          backdropFilter: "blur(8px)",
        }}>
          <h2 style={{ fontSize: "1.05em", fontWeight: 700, color: "#ff7e67", marginBottom: "0.5em" }}>
            ⚠️ Danger Zone
          </h2>
          <p style={{ color: textMuted, fontSize: "0.92em", marginBottom: "1.2em" }}>
            Permanently delete your account and all associated data.
          </p>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={loading}
              style={{
                padding: "0.65em 1.5em", borderRadius: 10,
                border: "1.5px solid rgba(255,79,79,0.4)",
                background: "transparent", color: "#ff7e67",
                fontWeight: 700, fontSize: "0.95em",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              Delete Account
            </button>
          ) : (
            <div style={{
              background: darkMode ? "rgba(255,79,79,0.08)" : "rgba(255,79,79,0.05)",
              borderRadius: 10, padding: "1em",
              border: "1px solid rgba(255,79,79,0.2)",
            }}>
              <p style={{ color: textPrimary, fontWeight: 600, marginBottom: "1em" }}>
                Are you sure? This cannot be undone.
              </p>
              <div style={{ display: "flex", gap: "0.8em" }}>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{
                    padding: "0.6em 1.2em", borderRadius: 8, border: "none",
                    background: "#ff4f4f", color: "#fff", fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Yes, Delete
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={loading}
                  style={{
                    padding: "0.6em 1.2em", borderRadius: 8,
                    border: darkMode ? "1px solid #444" : "1px solid #ddd",
                    background: "transparent", color: textMuted,
                    fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{ textAlign: "center", color: textMuted, fontSize: "0.85em", marginTop: "2em" }}>
          🔒 Your information is private and never shared.
        </p>
      </div>
    </div>
  );
};

export default Settings;