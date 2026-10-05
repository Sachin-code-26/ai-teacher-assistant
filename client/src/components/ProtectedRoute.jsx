// =============================================================
//  client/src/components/ProtectedRoute.jsx
//
//  Route guard — prevents unauthorized access to pages.
//
//  WHY THIS EXISTS:
//  React Router renders components based on URL alone.
//  Without this guard, anyone could visit /teacher/dashboard
//  just by typing the URL, even if they're a student or logged out.
//
//  HOW IT WORKS:
//  1. While checking auth (loading) → show spinner
//  2. If no user → redirect to /login
//  3. If user's role isn't in allowedRoles → redirect to their dashboard
//  4. Everything passes → render <Outlet /> (the child route's page)
//
//  <Outlet /> is the React Router v6 way to render nested routes.
//  When a route is nested inside ProtectedRoute, Outlet renders it.
// =============================================================

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();

  // Step 1: Still checking session — show spinner
  if (loading) {
    return <LoadingSpinner fullPage text="Loading..." />;
  }

  // Step 2: Not logged in — send to login
  if (!user) {
    return <Navigate to="/login" replace />;
    // `replace` removes /teacher/dashboard from history so
    // the back button doesn't return to it after logout
  }

  // Step 3: Wrong role — redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const dashboardPath =
      user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  // Step 4: All good — render the child page
  return <Outlet />;
}

export default ProtectedRoute;
