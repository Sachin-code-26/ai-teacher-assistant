// =============================================================
//  client/src/pages/student/Dashboard.jsx
// =============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiBookOpen, FiUpload, FiCheckCircle, FiTrendingUp, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { assignmentService } from "../../services/assignmentService.js";
import AssignmentCard from "../../components/AssignmentCard.jsx";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import { getGreeting } from "../../utils/dateHelpers.js";

// Stat card sub-component
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className={`inline-flex h-10 w-10 rounded-lg items-center justify-center mb-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await assignmentService.getAssignments();
        setAssignments(data.assignments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const recentAssignments = assignments.slice(0, 5);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}, {user?.firstName}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s your learning overview.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FiBookOpen} label="Total Assignments"
          value={loading ? "—" : assignments.length}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={FiUpload} label="Submitted"
          value="0"
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={FiCheckCircle} label="Evaluated"
          value="0"
          color="bg-green-50 text-green-600"
        />
        <StatCard
          icon={FiTrendingUp} label="Avg. Score"
          value="—"
          color="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Recent assignments */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Recent Assignments</h2>
          <Link
            to="/student/assignments"
            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            View all <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner size="md" text="Loading assignments..." />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-red-500 text-sm">{error}</div>
          ) : recentAssignments.length === 0 ? (
            <div className="py-12 text-center">
              <FiBookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No assignments yet</p>
              <p className="text-sm text-slate-400 mt-1">
                Your teacher hasn&apos;t posted any assignments.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAssignments.map((assignment) => (
                <AssignmentCard key={assignment._id} assignment={assignment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
