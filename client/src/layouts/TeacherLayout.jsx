// =============================================================
//  client/src/layouts/TeacherLayout.jsx
//  Placeholder — full teacher layout built in Phase 9
// =============================================================
import { NavLink, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { FiHome, FiBookOpen, FiLogOut, FiCpu } from "react-icons/fi";
import { useAuth } from "../context/AuthContext.jsx";

const navClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
  }`;

function TeacherLayout() {
  const { user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Toaster position="top-right" />
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-100">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <FiCpu className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">AI Teacher</p>
            <p className="text-xs text-slate-400">Teacher Portal</p>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink to="/teacher/dashboard" className={navClass}>
            <FiHome className="h-4 w-4" /> Dashboard
          </NavLink>
          <NavLink to="/teacher/assignments" className={navClass}>
            <FiBookOpen className="h-4 w-4" /> Assignments
          </NavLink>
        </nav>
        <div className="px-3 py-4 border-t border-slate-100">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            <FiLogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Welcome, {user?.firstName}!
          </p>
          <span className="text-xs font-medium bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">Teacher</span>
        </header>
        <main className="flex-1 p-8 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
export default TeacherLayout;
