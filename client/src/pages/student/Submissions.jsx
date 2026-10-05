// =============================================================
//  client/src/pages/student/Submissions.jsx
//
//  Shows the student's full submission history with evaluation
//  results. Each card expands to show detailed AI feedback.
// =============================================================

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiFileText, FiClock, FiCheckCircle, FiAlertCircle,
  FiLoader, FiChevronDown, FiChevronUp, FiAward, FiStar,
} from "react-icons/fi";
import { submissionService } from "../../services/submissionService.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted:  { label: "Submitted",   color: "bg-blue-50 text-blue-700 border-blue-200",    icon: FiClock },
  processing: { label: "Grading…",    color: "bg-amber-50 text-amber-700 border-amber-200",  icon: FiLoader },
  evaluated:  { label: "Evaluated",   color: "bg-green-50 text-green-700 border-green-200",  icon: FiCheckCircle },
  reviewed:   { label: "Reviewed",    color: "bg-purple-50 text-purple-700 border-purple-200", icon: FiStar },
  failed:     { label: "Failed",      color: "bg-red-50 text-red-700 border-red-200",         icon: FiAlertCircle },
};

// ── Score ring ────────────────────────────────────────────────
function ScoreRing({ percentage }) {
  const color = percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#f59e0b" : "#ef4444";
  const radius = 20;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ - (percentage / 100) * circ;
  return (
    <svg width="52" height="52" className="flex-shrink-0">
      <circle cx="26" cy="26" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <circle
        cx="26" cy="26" r={radius} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="26" y="31" textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
        {percentage}%
      </text>
    </svg>
  );
}

// ── Single submission card ─────────────────────────────────────
function SubmissionCard({ submission }) {
  const [expanded, setExpanded] = useState(false);

  const status = STATUS_CONFIG[submission.status] || STATUS_CONFIG.submitted;
  const StatusIcon = status.icon;
  const evaluation = submission.evaluationId;
  const assignment = submission.assignmentId;

  // Effective marks: teacher override if available, else AI
  const finalMarks = evaluation?.teacherFinalMarks !== null && evaluation?.teacherFinalMarks !== undefined
    ? evaluation.teacherFinalMarks
    : evaluation?.totalMarks;

  const hasResults = evaluation && (submission.status === "evaluated" || submission.status === "reviewed");

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {hasResults ? (
            <ScoreRing percentage={evaluation.percentage} />
          ) : (
            <div className="h-13 w-13 flex items-center justify-center rounded-full bg-slate-100 flex-shrink-0">
              <FiFileText className="h-6 w-6 text-slate-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">
                  {assignment?.title || "Assignment"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {assignment?.subject} ·{" "}
                  Submitted {new Date(submission.submittedAt).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap flex items-center gap-1 ${status.color}`}>
                <StatusIcon className={`h-3 w-3 ${submission.status === "processing" ? "animate-spin" : ""}`} />
                {status.label}
              </span>
            </div>

            {hasResults && (
              <div className="mt-2 flex items-center gap-4 text-sm">
                <span className="font-bold text-slate-800">
                  {finalMarks} / {assignment?.maxMarks || evaluation.maxMarks}
                </span>
                {submission.status === "reviewed" && evaluation.teacherFinalMarks !== null && (
                  <span className="text-xs text-purple-600 font-medium">Teacher reviewed</span>
                )}
              </div>
            )}

            {submission.status === "failed" && (
              <p className="mt-2 text-xs text-red-600">
                {submission.errorMessage || "AI grading failed. Contact your teacher."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Expand button */}
      {hasResults && (
        <>
          <div className="border-t border-slate-100">
            <button
              onClick={() => setExpanded((p) => !p)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {expanded ? (
                <><FiChevronUp className="h-3.5 w-3.5" /> Hide Details</>
              ) : (
                <><FiChevronDown className="h-3.5 w-3.5" /> View Full Feedback</>
              )}
            </button>
          </div>

          {expanded && (
            <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-4">
              {/* Teacher override note */}
              {submission.status === "reviewed" && evaluation.teacherFinalMarks !== null && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-purple-700 mb-1">📝 Teacher Override</p>
                  <p className="text-sm font-bold text-purple-800">
                    Final: {evaluation.teacherFinalMarks} / {assignment?.maxMarks}
                  </p>
                  {evaluation.teacherComments && (
                    <p className="text-xs text-purple-700 mt-1">{evaluation.teacherComments}</p>
                  )}
                </div>
              )}

              {/* Criterion breakdown */}
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">Criterion Breakdown</p>
                <div className="space-y-3">
                  {evaluation.criteriaResults.map((cr, i) => {
                    const pct = Math.round((cr.marksAwarded / cr.maxMarks) * 100);
                    return (
                      <div key={i} className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-700">{cr.criterion}</span>
                          <span className="text-xs font-bold text-blue-600">{cr.marksAwarded}/{cr.maxMarks}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{cr.feedback}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & weaknesses */}
              {(evaluation.strengths?.length > 0 || evaluation.weaknesses?.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {evaluation.strengths?.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-700 mb-1.5">✅ Strengths</p>
                      <ul className="space-y-1">
                        {evaluation.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-green-800 flex gap-1"><span>•</span><span>{s}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {evaluation.weaknesses?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1.5">⚡ Improve On</p>
                      <ul className="space-y-1">
                        {evaluation.weaknesses.map((w, i) => (
                          <li key={i} className="text-xs text-amber-800 flex gap-1"><span>•</span><span>{w}</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Overall feedback */}
              {evaluation.overallFeedback && (
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1.5">Overall Feedback</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{evaluation.overallFeedback}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
function StudentSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await submissionService.getMySubmissions();
        setSubmissions(data.submissions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmissions();
  }, []);

  // Aggregate stats
  const evaluated = submissions.filter((s) => ["evaluated", "reviewed"].includes(s.status));
  const avgScore =
    evaluated.length > 0
      ? Math.round(
          evaluated.reduce((sum, s) => {
            const pct = s.evaluationId?.percentage ?? 0;
            return sum + pct;
          }, 0) / evaluated.length
        )
      : null;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Submissions</h1>
        <p className="text-slate-500 text-sm mt-1">
          {loading ? "Loading…" : `${submissions.length} submission${submissions.length !== 1 ? "s" : ""}`}
          {avgScore !== null && ` · Avg. Score: ${avgScore}%`}
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Loading submissions…" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FiFileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold text-lg">No submissions yet</p>
          <p className="text-slate-400 text-sm mt-2">
            Go to{" "}
            <Link to="/student/assignments" className="text-blue-600 hover:underline">
              Assignments
            </Link>{" "}
            and submit your first PDF.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <SubmissionCard key={s._id} submission={s} />
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentSubmissions;
