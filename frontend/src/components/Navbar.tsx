import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<string | null>(null);

  const navBase: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(22, 26, 35, 0.92)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(126, 203, 255, 0.12)",
    padding: "0 2em",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    boxShadow: "0 2px 24px rgba(0,0,0,0.18)",
  };

  const logoStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    textDecoration: "none",
    cursor: "pointer",
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: "1.25em",
    fontWeight: 800,
    background: "linear-gradient(90deg, #7ecbff, #b3e0ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-0.01em",
  };

  const linksStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.2em",
    flexWrap: "wrap",
  };

  const getLinkStyle = (isActive: boolean, name: string): React.CSSProperties => ({
    color: isActive ? "#7ecbff" : hovered === name ? "#b3e0ff" : "rgba(255,255,255,0.7)",
    textDecoration: "none",
    padding: "0.4em 0.75em",
    borderRadius: "8px",
    fontSize: "0.92em",
    fontWeight: isActive ? 700 : 500,
    background: isActive ? "rgba(126, 203, 255, 0.1)" : hovered === name ? "rgba(126, 203, 255, 0.06)" : "transparent",
    transition: "all 0.15s ease",
    borderBottom: isActive ? "2px solid #7ecbff" : "2px solid transparent",
    letterSpacing: "0.01em",
  });

  const logoutBtnStyle: React.CSSProperties = {
    marginLeft: "0.5em",
    padding: "0.4em 1em",
    borderRadius: "8px",
    border: "1.5px solid rgba(211, 47, 47, 0.5)",
    background: hovered === "logout" ? "rgba(211,47,47,0.15)" : "transparent",
    color: hovered === "logout" ? "#ff6b6b" : "rgba(255,100,100,0.8)",
    fontWeight: 600,
    fontSize: "0.92em",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  };

  const authBtnStyle = (isPrimary: boolean): React.CSSProperties => ({
    padding: "0.4em 1.1em",
    borderRadius: "8px",
    border: isPrimary ? "none" : "1.5px solid rgba(126, 203, 255, 0.4)",
    background: isPrimary ? "linear-gradient(90deg, #7ecbff, #4fa3d1)" : "transparent",
    color: isPrimary ? "#1a1a2e" : "#7ecbff",
    fontWeight: 700,
    fontSize: "0.92em",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
    marginLeft: isPrimary ? "0.4em" : 0,
  });

  const authenticatedLinks = [
    { to: "/home", label: "Home", end: true },
    { to: "/games", label: "Games" },
    { to: "/dashboard", label: "Dashboard" },
    { to: "/comparison", label: "Comparison" },
    { to: "/human-vs-ai", label: "Human vs AI" },
    { to: "/about", label: "About" },
    { to: "/settings", label: "Settings" },
    { to: "/replays", label: "Replays" },
    { to: "/profile", label: "Profile" },
  ];

  const publicLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
  ];

  return (
    <nav style={navBase}>
      {/* Logo */}
      <div style={logoStyle} onClick={() => navigate(isAuthenticated ? "/home" : "/")}>
        <span style={{ fontSize: "1.4em" }}>🎮</span>
        <span style={logoTextStyle}>Grumpy Gamer</span>
      </div>

      {/* Links */}
      <div style={linksStyle}>
        {isAuthenticated ? (
          <>
            {authenticatedLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => getLinkStyle(isActive, label)}
                onMouseEnter={() => setHovered(label)}
                onMouseLeave={() => setHovered(null)}
              >
                {label}
              </NavLink>
            ))}
            <button
              style={logoutBtnStyle}
              onMouseEnter={() => setHovered("logout")}
              onMouseLeave={() => setHovered(null)}
              onClick={() => { logout(); navigate("/login"); }}
            >
              Log Out
            </button>
          </>
        ) : (
          <>
            {publicLinks.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => getLinkStyle(isActive, label)}
                onMouseEnter={() => setHovered(label)}
                onMouseLeave={() => setHovered(null)}
              >
                {label}
              </NavLink>
            ))}
            <button style={authBtnStyle(false)} onClick={() => navigate("/login")}>
              Log In
            </button>
            <button style={authBtnStyle(true)} onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;