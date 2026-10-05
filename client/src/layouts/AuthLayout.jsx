// =============================================================
//  client/src/layouts/AuthLayout.jsx
//  Wrapper for Login and Register pages.
// =============================================================

import { Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { FiCpu } from "react-icons/fi";

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />

      <div className="w-full max-w-md">
        {/* App header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <FiCpu className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI Teacher Assistant
          </h1>
          <p className="text-sm text-slate-500 mt-1">Powered by Gemini AI</p>
        </div>

        {/* Form card — child route renders here */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <Outlet />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} AI Teacher Assistant
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;
