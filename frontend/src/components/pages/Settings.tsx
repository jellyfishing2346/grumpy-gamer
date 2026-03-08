import API_URL from "../../config/api";
import React from "react";
import { updateUser, deleteUser } from "../../services/userService";
import { useDarkModeContext } from "../DarkModeProvider";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthProvider";


const containerStyle: React.CSSProperties = {
  padding: "2.5em 2em",
  maxWidth: 700,
  margin: "3.5em auto",
  background: "rgba(36, 41, 54, 0.85)",
  borderRadius: 24,
  boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
  color: "#f5f6fa",
  textAlign: "center",
  backdropFilter: "blur(8px)",
  border: "1.5px solid rgba(255,255,255,0.08)",
};

const headingStyle: React.CSSProperties = {
  fontSize: "2.6em",
  marginBottom: "0.4em",
  color: "#7ecbff",
  fontWeight: 800,
  letterSpacing: "0.01em",
  textShadow: "0 2px 12px #23272f55"
};

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<any>("");
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  // Dark mode toggle (global)
  const [darkMode, setDarkMode] = useDarkModeContext();

  // Fetch user info from backend using token
  React.useEffect(() => {
    const token = localStorage.getItem("access_token") || "";
    async function fetchUserInfo() {
      try {
        const res = await fetch(
          `${API_URL}/api/user/info`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to fetch user info");
        const user = await res.json();
        setUsername(user.username);
        setEmail(user.email);
      } catch (err) {
        setUsername("");
        setEmail("");
      }
    }
    if (token) fetchUserInfo();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    const token = localStorage.getItem("access_token") || "";
    try {
      await updateUser({ email, username, newEmail: email, newUsername: username, token });
      setMessage("Account info updated successfully.");
    } catch (err) {
      setMessage("Error updating account info.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    setMessage("");
    const token = localStorage.getItem("access_token") || "";
    try {
      await deleteUser(email, token);
      setMessage("Account deleted. You will be logged out.");
      logout();
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setMessage("Error deleting account.");
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <h1 style={headingStyle}>Settings</h1>
      <p style={{ fontSize: "1.2em", marginBottom: "1.5em" }}>
        Manage your account and preferences below:
      </p>
      <div style={{ marginBottom: 24, textAlign: "left", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 12, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={e => setDarkMode(e.target.checked)}
            style={{ width: 20, height: 20 }}
          />
          Enable Dark Mode
        </label>
      </div>
      <div style={{ textAlign: "left", maxWidth: 400, margin: "0 auto", color: "#eee" }}>
        <form onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1em" }}>
            <label style={{ minWidth: 90, fontWeight: 600 }}>Username:</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ padding: "0.4em", borderRadius: 6, border: "1px solid #444", flex: 1 }}
              required
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", marginBottom: "1em" }}>
            <label style={{ minWidth: 90, fontWeight: 600 }}>Email:</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: "0.4em", borderRadius: 6, border: "1px solid #444", flex: 1 }}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: "0.7em 1.5em", borderRadius: 8, background: "#4f8cff", color: "#fff", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer", marginBottom: 16 }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
        <div style={{ margin: "1.5em 0" }}>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={loading}
            style={{ padding: "0.7em 1.5em", borderRadius: 8, background: "#ff4f4f", color: "#fff", fontWeight: 700, border: "none", cursor: loading ? "not-allowed" : "pointer" }}
          >
            Delete Account
          </button>
        </div>
        {showDeleteConfirm && (
          <div style={{ background: "#23272f", borderRadius: 8, padding: "1em", color: "#ffd700", marginBottom: 16 }}>
            <b>Are you sure you want to delete your account?</b>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={handleDelete}
                disabled={loading}
                style={{ padding: "0.5em 1.2em", borderRadius: 8, background: "#ff4f4f", color: "#fff", fontWeight: 700, border: "none", marginRight: 8 }}
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={loading}
                style={{ padding: "0.5em 1.2em", borderRadius: 8, background: "#444", color: "#fff", fontWeight: 700, border: "none" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {message && (
          <div style={{ background: "#181a20", borderRadius: 8, padding: "1em", color: "#7ecbff", marginBottom: 16 }}>
            {Array.isArray(message)
              ? message.map((m, i) => {
                  if (typeof m === 'object' && m !== null) {
                    return <div key={i}>{typeof m.msg === 'string' ? m.msg : JSON.stringify(m)}</div>;
                  }
                  return <div key={i}>{String(m)}</div>;
                })
              : typeof message === 'object' && message !== null
                ? typeof message.msg === 'string'
                  ? message.msg
                  : JSON.stringify(message)
                : String(message)
            }
          </div>
        )}
        <div style={{ fontSize: "0.95em", color: "#aaa", marginTop: 24 }}>
          <b>Privacy Notice:</b> Your account information is private and never shared. All changes are securely processed.
        </div>
      </div>
    </div>
  );
};

export default Settings;