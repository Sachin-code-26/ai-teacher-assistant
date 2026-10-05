// =============================================================
//  client/src/context/AuthContext.jsx
//
//  WHAT IS CONTEXT?
//  React Context is a way to share state across your entire
//  component tree WITHOUT passing props through every level.
//
//  Without Context (prop drilling — messy):
//    App → Layout → Navbar → UserMenu → needs user
//    You'd have to pass user as a prop at every level.
//
//  With Context (clean):
//    Any component calls useAuth() and gets user directly.
//
//  HOW OUR AUTH CONTEXT WORKS:
//  1. On app load: calls GET /api/auth/me
//     - If cookie is valid → sets user in state (still logged in)
//     - If 401 → user is null (not logged in)
//  2. login(userData) → updates state after successful login
//  3. logout() → clears cookie on server, clears state, redirects
//
//  The `loading` state prevents a flash of the login page
//  for users who ARE logged in. While we check /me, we show
//  a spinner instead of redirecting them away.
// =============================================================

import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api.js";

// Create the context object
const AuthContext = createContext(null);

// =============================================================
//  AUTH PROVIDER
//  Wrap your entire app with this so all children can access auth.
// =============================================================
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // True while checking session
  const navigate = useNavigate();

  // ── Check if user is already logged in on first load ──────
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/auth/me");
        setUser(response.data.user);
      } catch {
        // 401 means not logged in — that's fine, just set null
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []); // Empty array → runs once on mount

  // ── login: called after successful login/register ─────────
  const login = (userData) => {
    setUser(userData);
  };

  // ── logout: clear server cookie + client state ────────────
  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Even if server call fails, clear local state
    } finally {
      setUser(null);
      navigate("/login");
    }
  };

  const value = { user, loading, login, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================
//  useAuth HOOK
//  Custom hook that components use to access auth state.
//  Throws a helpful error if used outside <AuthProvider>.
// =============================================================
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return context;
}
