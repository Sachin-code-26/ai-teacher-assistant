// =============================================================
//  client/src/pages/teacher/Dashboard.jsx
//
//  Teacher dashboard showing:
//  - Stats: total assignments, total submissions, pending reviews, avg score
//  - Recent submissions table needing review
//  - Quick links to assignments
// =============================================================

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookOpen, FiUpload, FiClock, FiTrendingUp,
  FiArrowRight, FiUser, FiCheckCircle, FiStar,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { assignmentService } from "../../services/assignmentService.js";
import { submissionService } from "../../services/submissionService.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import { getGreeting } from "../../utils/dateHelpers.js";

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className={`inline-flex h-10 w-10 rounded-lg items-center justify-center mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES = {
  submitted:  "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  evaluated:  "bg-green-50 text-green-700 border-green-200",
  reviewed:   "bg-purple-50 text-purple-700 border-purple-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
};

function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aData, sData] = await Promise.all([
          assignmentService.getAssignments(),
          submissionService.getTeacherSubmissions(),
        ]);
        setAssignments(aData.assignments || []);
        setSubmissions(sData.submissions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Computed stats
  const pendingReview = submissions.filter((s) => s.status === "evaluated").length;
  const evaluated = submissions.filter((s) => ["evaluated", "reviewed"].includes(s.status));
  const avgScore =
    evaluated.length > 0
      ? Math.round(
          evaluated.reduce((sum, s) => sum + (s.evaluationId?.percentage ?? 0), 0) /
            evaluated.length
        )
      : null;

  // Most recent 6 submissions
  const recentSubmissions = submissions.slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {user?.firstName}! 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's what's happening across your assignments.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Loading dashboard…" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard icon={FiBookOpen} label="Assignments" value={assignments.length} color="bg-indigo-50 text-indigo-600" />
            <StatCard icon={FiUpload} label="Total Submissions" value={submissions.length} color="bg-blue-50 text-blue-600" />
            <StatCard
              icon={FiClock} label="Pending Review"
              value={pendingReview}
              color={pendingReview > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}
              sub={pendingReview > 0 ? "Needs your attention" : undefined}
            />
            <StatCard
              icon={FiTrendingUp} label="Avg. Class Score"
              value={avgScore !== null ? `${avgScore}%` : "—"}
              color="bg-green-50 text-green-600"
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent submissions table */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Recent Submissions</h2>
                <Link
                  to="/teacher/assignments"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  View assignments <FiArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {recentSubmissions.length === 0 ? (
                <div className="py-12 text-center">
                  <FiUpload className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No submissions yet</p>
                  <p className="text-sm text-slate-400 mt-1">Students haven't submitted anything yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentSubmissions.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => navigate(`/teacher/submissions/${s._id}`)}
                      className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FiUser className="h-4 w-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {s.studentId?.firstName} {s.studentId?.lastName}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{s.assignmentId?.title}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {s.evaluationId && (
                          <span className="text-sm font-bold text-slate-700">
                            {s.evaluationId.totalMarks}/{s.evaluationId.maxMarks}
                          </span>
                        )}
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[s.status] || ""}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My assignments quick list */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">My Assignments</h2>
                <Link to="/teacher/assignments" className="text-xs text-blue-600 hover:underline">Manage</Link>
              </div>
              {assignments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-slate-500 text-sm">No assignments yet.</p>
                  <Link
                    to="/teacher/assignments"
                    className="inline-block mt-2 text-xs text-blue-600 hover:underline"
                  >
                    Create your first →
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {assignments.slice(0, 8).map((a) => {
                    const count = submissions.filter(
                      (s) => s.assignmentId?._id === a._id || s.assignmentId === a._id
                    ).length;
                    return (
                      <div key={a._id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.title}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-400">{a.subject}</p>
                          <span className="text-xs text-slate-500">{count} submission{count !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TeacherDashboard;
