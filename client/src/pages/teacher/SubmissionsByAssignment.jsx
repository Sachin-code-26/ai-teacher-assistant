// =============================================================
//  client/src/pages/teacher/SubmissionsByAssignment.jsx
//
//  Teacher view: list of all student submissions for a single
//  assignment.
//
//  Shows:
//  - Assignment title & stats (total, pending review, avg score)
//  - Table of students with their score, status, submit date
//  - Click any row -> /teacher/submissions/:id  (SubmissionReview)
//
//  Route: /teacher/submissions/assignment/:assignmentId
// =============================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiClock,
  FiCheckCircle, FiAlertCircle, FiLoader, FiStar,
  FiUpload, FiTrendingUp,
} from "react-icons/fi";
import { submissionService } from "../../services/submissionService.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import { formatDate } from "../../utils/dateHelpers.js";

const STATUS_STYLES = {
  submitted:  "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  evaluated:  "bg-green-50 text-green-700 border-green-200",
  reviewed:   "bg-purple-50 text-purple-700 border-purple-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
};

const STATUS_ICONS = {
  submitted:  FiClock,
  processing: FiLoader,
  evaluated:  FiCheckCircle,
  reviewed:   FiStar,
  failed:     FiAlertCircle,
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
      <div className={`inline-flex h-9 w-9 rounded-lg items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function SubmissionsByAssignment() {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await submissionService.getSubmissionsForAssignment(assignmentId);
        setData(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [assignmentId]);

  if (loading) return <LoadingSpinner fullPage text="Loading submissions..." />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <FiAlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Error loading submissions</h2>
        <p className="text-slate-500 mb-6 text-sm">{error}</p>
        <button
          onClick={() => navigate("/teacher/assignments")}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <FiArrowLeft className="h-4 w-4" /> Back to Assignments
        </button>
      </div>
    );
  }

  const { assignment, submissions } = data;

  const evaluated = submissions.filter((s) =>
    ["evaluated", "reviewed"].includes(s.status) && s.evaluationId
  );
  const pendingReview = submissions.filter((s) => s.status === "evaluated").length;
  const avgScore =
    evaluated.length > 0
      ? Math.round(
          evaluated.reduce((sum, s) => sum + (s.evaluationId?.percentage ?? 0), 0) /
            evaluated.length
        )
      : null;

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <FiArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{assignment.title}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {submissions.length} submission{submissions.length !== 1 ? "s" : ""} {"\u00b7"} Max {assignment.maxMarks} marks
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard icon={FiUpload} label="Total Submissions" value={submissions.length} color="bg-blue-50 text-blue-600" />
        <StatCard icon={FiCheckCircle} label="Evaluated" value={evaluated.length} color="bg-green-50 text-green-600" />
        <StatCard
          icon={FiClock} label="Pending Review"
          value={pendingReview}
          color={pendingReview > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-400"}
        />
        <StatCard
          icon={FiTrendingUp} label="Avg. Score"
          value={avgScore !== null ? `${avgScore}%` : "---"}
          color="bg-indigo-50 text-indigo-600"
        />
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FiUpload className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold text-lg">No submissions yet</p>
          <p className="text-slate-400 text-sm mt-2">Students have not submitted this assignment yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span className="col-span-4">Student</span>
            <span className="col-span-2 text-right">Score</span>
            <span className="col-span-3 text-center">Status</span>
            <span className="col-span-3 text-right">Submitted</span>
          </div>

          <div className="divide-y divide-slate-100">
            {submissions.map((s) => {
              const evaluation = s.evaluationId;
              const StatusIcon = STATUS_ICONS[s.status] || FiClock;
              const isProcessing = s.status === "processing";
              const finalMarks =
                evaluation?.teacherFinalMarks !== null && evaluation?.teacherFinalMarks !== undefined
                  ? evaluation.teacherFinalMarks
                  : evaluation?.totalMarks;

              return (
                <div
                  key={s._id}
                  onClick={() => navigate(`/teacher/submissions/${s._id}`)}
                  className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors items-center"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FiUser className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {s.studentId?.firstName} {s.studentId?.lastName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">{s.studentId?.email}</p>
                    </div>
                  </div>

                  <div className="col-span-2 text-right">
                    {evaluation && finalMarks !== undefined ? (
                      <div>
                        <span className="text-sm font-bold text-slate-800">
                          {finalMarks}/{assignment.maxMarks}
                        </span>
                        {evaluation.percentage !== undefined && (
                          <p className="text-xs text-slate-400">{evaluation.percentage}%</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">--</span>
                    )}
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[s.status] || ""}`}>
                      <StatusIcon className={`h-3 w-3 ${isProcessing ? "animate-spin" : ""}`} />
                      {s.status}
                    </span>
                  </div>

                  <div className="col-span-3 text-right">
                    <span className="text-xs text-slate-500">{formatDate(s.submittedAt || s.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmissionsByAssignment;
