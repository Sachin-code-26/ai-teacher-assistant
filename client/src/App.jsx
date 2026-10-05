// =============================================================
//  client/src/App.jsx — Root Application with Full Routing
//
//  ROUTING STRUCTURE:
//
//  /                 → redirects to login or dashboard
//  /login            → Login page (inside AuthLayout)
//  /register         → Register page (inside AuthLayout)
//  /student/*        → Protected (student role) → StudentLayout
//    /student/dashboard
//    /student/assignments
//    /student/assignments/:id
//    /student/submissions
//  /teacher/*        → Protected (teacher role) → TeacherLayout
//    /teacher/dashboard
//    /teacher/assignments
//
//  WHY NESTED ROUTES?
//  React Router v6 nesting means:
//  - /student/dashboard matches the "student/*" route
//  - ProtectedRoute renders (checks auth + role)
//  - If OK, renders <Outlet /> → StudentLayout renders
//  - StudentLayout renders <Outlet /> → Dashboard renders
//
//  So the chain is:
//  ProtectedRoute → StudentLayout → Dashboard
//  Each level wraps the next via Outlet.
// =============================================================

import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

// Layouts
import AuthLayout from "./layouts/AuthLayout.jsx";
import StudentLayout from "./layouts/StudentLayout.jsx";
import TeacherLayout from "./layouts/TeacherLayout.jsx";

// Route guard
import ProtectedRoute from "./components/ProtectedRoute.jsx";

// Public pages
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

// Student pages
import StudentDashboard from "./pages/student/Dashboard.jsx";
import StudentAssignments from "./pages/student/Assignments.jsx";
import AssignmentDetail from "./pages/student/AssignmentDetail.jsx";
import StudentSubmissions from "./pages/student/Submissions.jsx";

// Teacher pages
import TeacherDashboard from "./pages/teacher/Dashboard.jsx";
import TeacherAssignments from "./pages/teacher/Assignments.jsx";
import SubmissionReview from "./pages/teacher/SubmissionReview.jsx";
import SubmissionsByAssignment from "./pages/teacher/SubmissionsByAssignment.jsx";

// Smart root redirect based on auth state
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard"} replace />;
}

function App() {
  return (
    // AuthProvider must wrap everything that uses useAuth()
    <AuthProvider>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* ── PUBLIC ROUTES (inside AuthLayout card) ── */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* ── STUDENT ROUTES ── */}
        {/* ProtectedRoute checks: logged in + role === "student" */}
        <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
          {/* StudentLayout wraps all student pages */}
          <Route element={<StudentLayout />}>
            <Route path="/student/dashboard"          element={<StudentDashboard />} />
            <Route path="/student/assignments"        element={<StudentAssignments />} />
            <Route path="/student/assignments/:id"    element={<AssignmentDetail />} />
            <Route path="/student/submissions"        element={<StudentSubmissions />} />
          </Route>
        </Route>

        {/* ── TEACHER ROUTES ── */}
        <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
          <Route element={<TeacherLayout />}>
            <Route path="/teacher/dashboard"                            element={<TeacherDashboard />} />
            <Route path="/teacher/assignments"                          element={<TeacherAssignments />} />
            <Route path="/teacher/submissions/assignment/:assignmentId" element={<SubmissionsByAssignment />} />
            <Route path="/teacher/submissions/:id"                      element={<SubmissionReview />} />
          </Route>
        </Route>

        {/* ── 404 ── */}
        <Route path="*" element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-slate-200 mb-4">404</h1>
              <p className="text-slate-500 mb-4">Page not found</p>
              <a href="/" className="text-blue-600 hover:underline text-sm">Go home</a>
            </div>
          </div>
        } />
      </Routes>
    </AuthProvider>
  );
}

export default App;
