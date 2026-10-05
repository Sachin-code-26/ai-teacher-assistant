// =============================================================
//  client/src/layouts/StudentLayout.jsx
//  Sidebar + top bar layout for all student pages.
//
//  LAYOUT STRUCTURE:
//  ┌──────────────────────────────────────────┐
//  │  Sidebar (fixed, left)  │  Main content  │
//  │  - Logo                 │  Top header    │
//  │  - Nav links            │  <Outlet />    │
//  │                         │                │
//  └──────────────────────────────────────────┘
// =============================================================

import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  FiHome,
  FiBookOpen,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiX,
  FiCpu,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";
import { getGreeting } from "../utils/dateHelpers.js";

// Navigation items for the student sidebar
const NAV_ITEMS = [
  { to: "/student/dashboard",   icon: FiHome,     label: "Dashboard" },
  { to: "/student/assignments", icon: FiBookOpen,  label: "Assignments" },
  { to: "/student/submissions", icon: FiFileText,  label: "My Submissions" },
];

// NavLink active class helper
const navClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive
      ? "bg-blue-50 text-blue-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

function StudentLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const greeting = `${getGreeting()}, ${user?.firstName || "Student"}!`;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />

      {/* ── MOBILE OVERLAY ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30 flex flex-col transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <FiCpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">AI Teacher</p>
            <p className="text-xs text-slate-400 mt-0.5">Student Portal</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User + logout at bottom */}
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-blue-600">
                {user?.firstName?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">
                {user?.fullName || user?.firstName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <FiLogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-4 lg:px-8 py-4 flex items-center justify-between">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
          >
            {sidebarOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
          </button>

          <p className="text-sm font-medium text-slate-700 hidden sm:block">
            {greeting}
          </p>

          {/* Role badge */}
          <span className="text-xs font-medium bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
            Student
          </span>
        </header>

        {/* Page content — child route renders here */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default StudentLayout;
