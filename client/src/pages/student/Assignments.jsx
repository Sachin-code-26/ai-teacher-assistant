// =============================================================
//  client/src/pages/student/Assignments.jsx
// =============================================================

import { useState, useEffect } from "react";
import { FiBookOpen, FiSearch } from "react-icons/fi";
import { assignmentService } from "../../services/assignmentService.js";
import AssignmentCard from "../../components/AssignmentCard.jsx";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";

// Loading skeleton card — shown while fetching
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
      <div className="h-3 w-16 bg-slate-200 rounded-full mb-3" />
      <div className="h-4 w-3/4 bg-slate-200 rounded mb-3" />
      <div className="flex gap-3">
        <div className="h-3 w-24 bg-slate-200 rounded-full" />
        <div className="h-3 w-16 bg-slate-200 rounded-full" />
      </div>
    </div>
  );
}

function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await assignmentService.getAssignments();
        setAssignments(data.assignments || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  // Filter by title or subject (case-insensitive)
  const filtered = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? "Loading..." : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""} available`}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or subject..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => <SkeletonCard key={n} />)}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FiBookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold text-lg">
            {search ? "No assignments found" : "No assignments yet"}
          </p>
          <p className="text-slate-400 text-sm mt-2">
            {search
              ? `No results for "${search}" — try a different search.`
              : "Your teacher hasn't posted any assignments yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((assignment) => (
            <AssignmentCard key={assignment._id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentAssignments;
