// =============================================================
//  client/src/pages/teacher/SubmissionReview.jsx
//
//  Teacher view of a single student submission.
//  Shows:
//  - Student info + assignment info
//  - AI evaluation: per-criterion scores + feedback
//  - Teacher override form (adjust marks + add comments)
//
//  Route: /teacher/submissions/:id
// =============================================================

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiUser, FiBook, FiAward, FiCalendar,
  FiCheckCircle, FiAlertCircle, FiLoader, FiStar, FiEdit2,
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

function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Override form state
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideMarks, setOverrideMarks] = useState("");
  const [overrideComments, setOverrideComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [overrideError, setOverrideError] = useState(null);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const data = await submissionService.getSubmission(id);
        setSubmission(data.submission);
        // Pre-fill override form with existing values if already reviewed
        if (data.submission.evaluationId?.teacherFinalMarks !== null) {
          setOverrideMarks(data.submission.evaluationId?.teacherFinalMarks ?? "");
          setOverrideComments(data.submission.evaluationId?.teacherComments ?? "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSubmission();
  }, [id]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    setOverrideError(null);
    const maxMarks = submission.assignmentId?.maxMarks;
    const marks = Number(overrideMarks);
    if (isNaN(marks) || marks < 0 || marks > maxMarks) {
      setOverrideError(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }
    setSubmitting(true);
    try {
      await submissionService.reviewSubmission(id, {
        teacherFinalMarks: marks,
        teacherComments: overrideComments || undefined,
      });
      // Refresh submission data
      const data = await submissionService.getSubmission(id);
      setSubmission(data.submission);
      setOverrideSuccess(true);
      setShowOverrideForm(false);
    } catch (err) {
      setOverrideError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading submission…" />;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <FiAlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Submission not found</h2>
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

  const evaluation = submission.evaluationId;
  const assignment = submission.assignmentId;
  const student = submission.studentId;
  const isReviewed = submission.status === "reviewed";

  const percentage = evaluation?.percentage ?? 0;
  const scoreColor = percentage >= 80 ? "text-green-600" : percentage >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg = percentage >= 80 ? "bg-green-50 border-green-200" : percentage >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <FiArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 mb-1">{assignment?.title}</h1>
            <p className="text-sm text-slate-500">{assignment?.subject}</p>
          </div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${STATUS_STYLES[submission.status] || ""}`}>
            {submission.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-5 text-sm text-slate-600">
          <span className="flex items-center gap-2">
            <FiUser className="h-4 w-4 text-slate-400" />
            {student?.firstName} {student?.lastName}
            <span className="text-slate-400">({student?.email})</span>
          </span>
          <span className="flex items-center gap-2">
            <FiCalendar className="h-4 w-4 text-slate-400" />
            Submitted {formatDate(submission.submittedAt)}
          </span>
          <span className="flex items-center gap-2">
            <FiAward className="h-4 w-4 text-slate-400" />
            {assignment?.maxMarks} marks total
          </span>
        </div>
      </div>

      {/* No evaluation yet */}
      {!evaluation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center mb-4">
          <FiLoader className="h-8 w-8 text-amber-500 mx-auto mb-2 animate-spin" />
          <p className="text-amber-700 font-medium">AI evaluation in progress or failed.</p>
          <p className="text-amber-600 text-sm mt-1">Status: {submission.status}</p>
        </div>
      )}

      {evaluation && (
        <>
          {/* Score summary */}
          <div className={`rounded-xl border p-5 mb-4 ${scoreBg}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">AI Score</p>
                <p className={`text-3xl font-bold ${scoreColor}`}>
                  {evaluation.totalMarks} <span className="text-lg font-normal text-slate-400">/ {evaluation.maxMarks}</span>
                </p>
              </div>
              <p className={`text-5xl font-extrabold ${scoreColor}`}>{percentage}%</p>
            </div>
            <div className="h-2 bg-white/60 rounded-full overflow-hidden mt-4">
              <div
                className={`h-full rounded-full ${percentage >= 80 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* Teacher override banner */}
          {isReviewed && evaluation.teacherFinalMarks !== null && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 flex items-center gap-1.5 mb-1">
                    <FiStar className="h-4 w-4" /> Teacher Override Applied
                  </p>
                  <p className="text-purple-800 font-bold text-xl">
                    Final: {evaluation.teacherFinalMarks} / {assignment?.maxMarks}
                  </p>
                  {evaluation.teacherComments && (
                    <p className="text-sm text-purple-700 mt-1">{evaluation.teacherComments}</p>
                  )}
                </div>
                <button
                  onClick={() => { setShowOverrideForm(true); setOverrideSuccess(false); }}
                  className="flex items-center gap-1.5 text-xs text-purple-600 hover:underline"
                >
                  <FiEdit2 className="h-3.5 w-3.5" /> Edit
                </button>
              </div>
            </div>
          )}

          {/* Success message */}
          {overrideSuccess && !showOverrideForm && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 text-sm text-green-700">
              <FiCheckCircle className="h-4 w-4" /> Override saved successfully.
            </div>
          )}

          {/* Criterion breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
            <h2 className="font-semibold text-slate-800 mb-4">AI Criterion Breakdown</h2>
            <div className="space-y-5">
              {evaluation.criteriaResults.map((cr, i) => {
                const pct = Math.round((cr.marksAwarded / cr.maxMarks) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{cr.criterion}</span>
                      <span className="text-sm font-bold text-blue-600">{cr.marksAwarded} / {cr.maxMarks}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-sm text-slate-500 leading-relaxed">{cr.feedback}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & weaknesses */}
          {(evaluation.strengths?.length > 0 || evaluation.weaknesses?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {evaluation.strengths?.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-700 mb-2">✅ Strengths</p>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-green-800 flex gap-1.5"><span>•</span><span>{s}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {evaluation.weaknesses?.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-2">⚡ Areas to Improve</p>
                  <ul className="space-y-1">
                    {evaluation.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-amber-800 flex gap-1.5"><span>•</span><span>{w}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Overall feedback */}
          {evaluation.overallFeedback && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-4">
              <p className="text-sm font-semibold text-slate-700 mb-2">Overall AI Feedback</p>
              <p className="text-sm text-slate-600 leading-relaxed">{evaluation.overallFeedback}</p>
            </div>
          )}

          {/* Teacher override form */}
          {showOverrideForm ? (
            <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-6">
              <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <FiStar className="h-4 w-4 text-purple-600" /> Override Grade
              </h2>
              <form onSubmit={handleOverrideSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Final Marks (0–{assignment?.maxMarks})
                  </label>
                  <input
                    type="number" required min="0" max={assignment?.maxMarks}
                    value={overrideMarks}
                    onChange={(e) => setOverrideMarks(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder={`AI gave ${evaluation.totalMarks}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    rows={3} value={overrideComments}
                    onChange={(e) => setOverrideComments(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    placeholder="Explain your adjustment…"
                  />
                </div>
                {overrideError && (
                  <p className="text-sm text-red-600 flex items-center gap-1.5">
                    <FiAlertCircle className="h-4 w-4" /> {overrideError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {submitting ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheckCircle className="h-4 w-4" />}
                    {submitting ? "Saving…" : "Submit Override"}
                  </button>
                  <button
                    type="button" onClick={() => setShowOverrideForm(false)}
                    className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : !isReviewed && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="font-semibold text-slate-800 mb-1">Review & Override</h2>
              <p className="text-sm text-slate-500 mb-4">
                Agree with the AI? No action needed. Or override the grade below.
              </p>
              <button
                onClick={() => setShowOverrideForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <FiStar className="h-4 w-4" /> Override Grade
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SubmissionReview;
