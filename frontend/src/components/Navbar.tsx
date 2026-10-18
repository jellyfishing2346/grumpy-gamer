import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  // Close the "More" dropdown on outside click or Escape
  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const navBase: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(22, 26, 35, 0.95)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(126, 203, 255, 0.12)",
    padding: "0 1.5em",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
    boxShadow: "0 2px 24px rgba(0,0,0,0.18)",
    boxSizing: "border-box",
    width: "100%",
    gap: "1em",
  };

  const logoStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    flexShrink: 0,
  };

  const logoTextStyle: React.CSSProperties = {
    fontSize: "1.2em",
    fontWeight: 800,
    background: "linear-gradient(90deg, #7ecbff, #b3e0ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    letterSpacing: "-0.01em",
  };

  const getLinkStyle = (isActive: boolean, name: string): React.CSSProperties => ({
    color: isActive ? "#7ecbff" : hovered === name ? "#b3e0ff" : "rgba(255,255,255,0.7)",
    textDecoration: "none",
    padding: "0.4em 0.75em",
    borderRadius: "8px",
    fontSize: "0.9em",
    fontWeight: isActive ? 700 : 500,
    background: isActive ? "rgba(126, 203, 255, 0.1)" : hovered === name ? "rgba(126, 203, 255, 0.06)" : "transparent",
    transition: "all 0.15s ease",
    borderBottom: isActive ? "2px solid #7ecbff" : "2px solid transparent",
    whiteSpace: "nowrap" as const,
  });

  const getMobileLinkStyle = (isActive: boolean): React.CSSProperties => ({
    color: isActive ? "#7ecbff" : "rgba(255,255,255,0.8)",
    textDecoration: "none",
    padding: "0.8em 1.2em",
    display: "block",
    fontWeight: isActive ? 700 : 500,
    fontSize: "1em",
    background: isActive ? "rgba(126,203,255,0.08)" : "transparent",
    borderLeft: isActive ? "2px solid #7ecbff" : "2px solid transparent",
    transition: "all 0.15s ease",
  });

  // `primary` links show in the desktop bar; the rest go under "More".
  // The mobile menu always lists everything.
  const authenticatedLinks = [
    { to: "/home", label: "Home", end: true, primary: true },
    { to: "/games", label: "Games", primary: true },
    { to: "/dashboard", label: "Dashboard", primary: true },
    { to: "/comparison", label: "Comparison" },
    { to: "/human-vs-ai", label: "Human vs AI" },
    { to: "/replays", label: "Replays" },
    { to: "/profile", label: "Profile" },
    { to: "/about", label: "About" },
    { to: "/ai-metrics", label: "🤖 AI Metrics" },
    { to: "/multiplayer", label: "⚔️ Multiplayer", primary: true },
    { to: "/store", label: "🛒 Store" },
    { to: "/tournaments", label: "🏆 Tournaments", primary: true },
    { to: "/predictions", label: "🔮 Predictions", primary: true },
    { to: "/finances", label: "💰 Finances" },
    { to: "/settings", label: "Settings" },
  ];
  const primaryLinks = authenticatedLinks.filter((l) => l.primary);
  const moreLinks = authenticatedLinks.filter((l) => !l.primary);
  const moreActive = moreLinks.some((l) => location.pathname.startsWith(l.to));

  const publicLinks = [
    { to: "/", label: "Home", end: true },
    { to: "/faq", label: "FAQ" },
    { to: "/contact", label: "Contact" },
  ];

  const hamburgerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    cursor: "pointer",
    padding: "0.4em",
    background: "transparent",
    border: "none",
    borderRadius: 8,
  };

  const barStyle = (open: boolean, index: number): React.CSSProperties => ({
    width: 22,
    height: 2,
    background: "#7ecbff",
    borderRadius: 2,
    transition: "all 0.25s ease",
    transform: open
      ? index === 0 ? "rotate(45deg) translate(5px, 5px)"
      : index === 1 ? "scaleX(0)"
      : "rotate(-45deg) translate(5px, -5px)"
      : "none",
    opacity: open && index === 1 ? 0 : 1,
  });

  return (
    <>
      <nav style={navBase}>
        {/* Logo */}
        <div style={logoStyle} onClick={() => navigate(isAuthenticated ? "/home" : "/")}>
          <span style={{ fontSize: "1.4em" }}>🎮</span>
          <span style={logoTextStyle}>Grumpy Gamer</span>
        </div>

        {/* Desktop Links */}
        <div style={{
          display: "flex", alignItems: "center", gap: "0.15em",
          "@media (max-width: 768px)": { display: "none" },
        } as React.CSSProperties}>
          {/* Hide on mobile via CSS class */}
          <div className="navbar-desktop-links" data-testid="navbar-desktop-links" style={{ display: "flex", alignItems: "center", gap: "0.15em" }}>
            {isAuthenticated ? (
              <>
                {primaryLinks.map(({ to, label, end }) => (
                  <NavLink
                    key={to} to={to} end={end}
                    style={({ isActive }) => getLinkStyle(isActive, label)}
                    onMouseEnter={() => setHovered(label)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {label}
                  </NavLink>
                ))}
                <div ref={moreRef} style={{ position: "relative" }}>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    onClick={() => setMoreOpen((o) => !o)}
                    onMouseEnter={() => setHovered("More")}
                    onMouseLeave={() => setHovered(null)}
                    style={{ ...getLinkStyle(moreActive || moreOpen, "More"), border: "none", cursor: "pointer", fontFamily: "inherit" }}
                  >
                    More {moreOpen ? "▴" : "▾"}
                  </button>
                  {moreOpen && (
                    <div
                      role="menu"
                      style={{
                        position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 200,
                        background: "rgba(22, 26, 35, 0.98)", border: "1px solid rgba(126, 203, 255, 0.16)",
                        borderRadius: 12, padding: "0.4em", boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
                        display: "flex", flexDirection: "column", zIndex: 101,
                      }}
                    >
                      {moreLinks.map(({ to, label }) => (
                        <NavLink
                          key={to} to={to} role="menuitem"
                          style={({ isActive }) => ({ ...getLinkStyle(isActive, label), borderBottom: "none", padding: "0.55em 0.85em" })}
                          onMouseEnter={() => setHovered(label)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          {label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  style={{
                    marginLeft: "0.5em", padding: "0.4em 1em", borderRadius: "8px",
                    border: "1.5px solid rgba(211,47,47,0.5)",
                    background: hovered === "logout" ? "rgba(211,47,47,0.15)" : "transparent",
                    color: hovered === "logout" ? "#ff6b6b" : "rgba(255,100,100,0.8)",
                    fontWeight: 600, fontSize: "0.9em", cursor: "pointer",
                    transition: "all 0.15s ease", fontFamily: "inherit",
                  }}
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
                  <NavLink key={to} to={to} end={end}
                    style={({ isActive }) => getLinkStyle(isActive, label)}
                    onMouseEnter={() => setHovered(label)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    {label}
                  </NavLink>
                ))}
                <button onClick={() => navigate("/login")} style={{
                  padding: "0.4em 1.1em", borderRadius: "8px",
                  border: "1.5px solid rgba(126,203,255,0.4)", background: "transparent",
                  color: "#7ecbff", fontWeight: 700, fontSize: "0.9em",
                  cursor: "pointer", fontFamily: "inherit",
                }}>Log In</button>
                <button onClick={() => navigate("/signup")} style={{
                  padding: "0.4em 1.1em", borderRadius: "8px", border: "none",
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e", fontWeight: 700, fontSize: "0.9em",
                  cursor: "pointer", fontFamily: "inherit", marginLeft: "0.4em",
                }}>Sign Up</button>
              </>
            )}
          </div>
        </div>

        {/* Hamburger button */}
        <button
          className="navbar-hamburger"
          style={hamburgerStyle}
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
        >
          {[0, 1, 2].map(i => (
            <div key={i} style={barStyle(menuOpen, i)} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu" data-testid="navbar-mobile-menu" style={{
          position: "fixed", top: 60, left: 0, right: 0,
          background: "rgba(15, 17, 23, 0.98)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(126,203,255,0.12)",
          zIndex: 99,
          animation: "menu-slide-down 0.2s ease",
          maxHeight: "calc(100vh - 60px)",
          overflowY: "auto",
        }}>
          {isAuthenticated ? (
            <>
              {authenticatedLinks.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  style={({ isActive }) => getMobileLinkStyle(isActive)}
                >
                  {label}
                </NavLink>
              ))}
              <div style={{ padding: "1em 1.2em", borderTop: "1px solid rgba(126,203,255,0.08)" }}>
                <button
                  onClick={() => { logout(); navigate("/login"); }}
                  style={{
                    width: "100%", padding: "0.75em", borderRadius: 10,
                    border: "1.5px solid rgba(211,47,47,0.4)",
                    background: "transparent", color: "#ff7e67",
                    fontWeight: 700, fontSize: "1em", cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Log Out
                </button>
              </div>
            </>
          ) : (
            <>
              {publicLinks.map(({ to, label, end }) => (
                <NavLink key={to} to={to} end={end}
                  style={({ isActive }) => getMobileLinkStyle(isActive)}
                >
                  {label}
                </NavLink>
              ))}
              <div style={{ padding: "1em 1.2em", display: "flex", flexDirection: "column", gap: "0.6em" }}>
                <button onClick={() => navigate("/login")} style={{
                  padding: "0.75em", borderRadius: 10,
                  border: "1.5px solid rgba(126,203,255,0.4)", background: "transparent",
                  color: "#7ecbff", fontWeight: 700, fontSize: "1em",
                  cursor: "pointer", fontFamily: "inherit",
                }}>Log In</button>
                <button onClick={() => navigate("/signup")} style={{
                  padding: "0.75em", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #7ecbff, #4fa3d1)",
                  color: "#1a1a2e", fontWeight: 700, fontSize: "1em",
                  cursor: "pointer", fontFamily: "inherit",
                }}>Sign Up</button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        .navbar-hamburger { display: none; }
        .navbar-desktop-links { display: flex; align-items: center; gap: 0.15em; }
        @keyframes menu-slide-down {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        /* Below this width the primary links + "More" no longer fit: use the hamburger */
        @media (max-width: 1100px) {
          .navbar-hamburger { display: flex !important; }
          .navbar-desktop-links { display: none !important; }
        }
        @media (min-width: 1101px) {
          .navbar-mobile-menu { display: none !important; }
        }
      `}</style>
    </>
  );
};

export default Navbar;