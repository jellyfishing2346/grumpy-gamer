import React from "react";
import { NavLink } from "react-router-dom";

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

const Navbar = () => (
  <nav style={navStyle}>
    <NavLink
      to="/"
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
  </nav>
);

export default Navbar;