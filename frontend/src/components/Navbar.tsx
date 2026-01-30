import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const navStyle: React.CSSProperties = {
  padding: "1em",
  background: "#23272f",
  color: "#fff",
  display: "flex",
  gap: "1.5em",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "sans-serif",
  fontSize: "1.1em",
  boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
};

const linkStyle: React.CSSProperties = {
  color: "#fff",
  textDecoration: "none",
  padding: "0.3em 0.7em",
  borderRadius: "4px",
  transition: "background 0.2s"
};

const activeStyle: React.CSSProperties = {
  background: "#4f8cff",
  color: "#fff"
};

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav style={navStyle}>
      {isAuthenticated ? (
        <>
          <NavLink
            to="/home"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
            end
          >
            Home
          </NavLink>
          <NavLink
            to="/games"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Game Selection
          </NavLink>
          <NavLink
            to="/play"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Game Play
          </NavLink>
          <NavLink
            to="/dashboard"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/comparison"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Comparison
          </NavLink>
          <NavLink
            to="/human-vs-ai"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Human vs AI
          </NavLink>
          <NavLink
            to="/about"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            About
          </NavLink>
          <NavLink
            to="/settings"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Settings
          </NavLink>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={{
              marginLeft: 16,
              padding: "0.3em 0.7em",
              borderRadius: 4,
              border: "none",
              background: "#d32f2f",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Log Out
          </button>
        </>
      ) : (
        <>
          <NavLink
            to="/"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
            end
          >
            Home
          </NavLink>
          <NavLink
            to="/faq"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            FAQ
          </NavLink>
          <NavLink
            to="/contact"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Contact
          </NavLink>
          <NavLink
            to="/login"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Log In
          </NavLink>
          <NavLink
            to="/signup"
            style={({ isActive }) => isActive ? { ...linkStyle, ...activeStyle } : linkStyle}
          >
            Sign Up
          </NavLink>
        </>
      )}
    </nav>
  );
};

export default Navbar;