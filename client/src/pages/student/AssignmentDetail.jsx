// =============================================================
//  client/src/pages/student/AssignmentDetail.jsx
// =============================================================

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FiArrowLeft, FiCalendar, FiAward, FiBook,
  FiAlertCircle, FiUpload, FiFileText, FiCheckCircle,
  FiLoader, FiX, FiStar,
} from "react-icons/fi";
import { assignmentService } from "../../services/assignmentService.js";
import { submissionService } from "../../services/submissionService.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import { formatDate, isOverdue } from "../../utils/dateHelpers.js";

// ── Evaluation result panel shown after successful grading ──
function EvaluationPanel({ evaluation, maxMarks }) {
  const percentage = evaluation.percentage;
  const scoreColor =
    percentage >= 80 ? "text-green-600" : percentage >= 50 ? "text-amber-600" : "text-red-600";
  const scoreBg =
    percentage >= 80 ? "bg-green-50 border-green-200" : percentage >= 50 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  return (
    <div className="space-y-4">
      {/* Score summary */}
      <div className={`rounded-xl border p-5 ${scoreBg}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-medium text-slate-600">AI Evaluation Complete</p>
            <p className={`text-3xl font-bold ${scoreColor}`}>
              {evaluation.totalMarks} <span className="text-lg font-normal text-slate-400">/ {maxMarks}</span>
            </p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-extrabold ${scoreColor}`}>{percentage}%</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-white/60 rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all ${percentage >= 80 ? "bg-green-500" : percentage >= 50 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Teacher override badge */}
      {evaluation.teacherFinalMarks !== null && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-purple-700 mb-1">📝 Teacher Override</p>
          <p className="text-purple-800 font-bold text-xl">
            Final Marks: {evaluation.teacherFinalMarks} / {maxMarks}
          </p>
          {evaluation.teacherComments && (
            <p className="text-sm text-purple-700 mt-2">{evaluation.teacherComments}</p>
          )}
        </div>
      )}

      {/* Per-criterion breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Criterion Breakdown</h3>
        <div className="space-y-4">
          {evaluation.criteriaResults.map((cr, i) => {
            const pct = Math.round((cr.marksAwarded / cr.maxMarks) * 100);
            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{cr.criterion}</span>
                  <span className="text-sm font-bold text-blue-600">
                    {cr.marksAwarded} / {cr.maxMarks}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{cr.feedback}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      {(evaluation.strengths?.length > 0 || evaluation.weaknesses?.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {evaluation.strengths?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-green-700 mb-2">✅ Strengths</p>
              <ul className="space-y-1">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-green-800 flex gap-1.5">
                    <span>•</span><span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {evaluation.weaknesses?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-700 mb-2">⚡ Improve On</p>
              <ul className="space-y-1">
                {evaluation.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-amber-800 flex gap-1.5">
                    <span>•</span><span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Overall feedback */}
      {evaluation.overallFeedback && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-2">Overall Feedback</p>
          <p className="text-sm text-slate-600 leading-relaxed">{evaluation.overallFeedback}</p>
        </div>
      )}
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────
const STATUS_STYLES = {
  submitted:  "bg-blue-50 text-blue-700 border-blue-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  evaluated:  "bg-green-50 text-green-700 border-green-200",
  reviewed:   "bg-purple-50 text-purple-700 border-purple-200",
  failed:     "bg-red-50 text-red-700 border-red-200",
};

function AssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Submission state
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [evaluation, setEvaluation] = useState(null);

  const fileInputRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load assignment
        const data = await assignmentService.getAssignment(id);
        setAssignment(data.assignment);

        // Check if student already submitted
        const subData = await submissionService.getMySubmissions();
        const mySubmission = subData.submissions?.find(
          (s) => s.assignmentId?._id === id || s.assignmentId === id
        );
        if (mySubmission) {
          setExistingSubmission(mySubmission);
          if (mySubmission.evaluationId) {
            setEvaluation(mySubmission.evaluationId);
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be smaller than 10 MB.");
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const result = await submissionService.submitAssignment(id, selectedFile);
      setExistingSubmission(result.submission);
      if (result.evaluation) setEvaluation(result.evaluation);
      setSelectedFile(null);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage text="Loading assignment..." />;

  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <FiAlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Assignment not found</h2>
        <p className="text-slate-500 mb-6 text-sm">{error}</p>
        <button
          onClick={() => navigate("/student/assignments")}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <FiArrowLeft className="h-4 w-4" /> Back to Assignments
        </button>
      </div>
    );
  }

  const overdue = isOverdue(assignment.dueDate);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate("/student/assignments")}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
      >
        <FiArrowLeft className="h-4 w-4" /> Back to Assignments
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-3">
          <FiBook className="h-3 w-3" /> {assignment.subject}
        </span>
        <h1 className="text-xl font-bold text-slate-900 mb-4">{assignment.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <span className={`flex items-center gap-1.5 ${overdue ? "text-red-500 font-medium" : "text-slate-500"}`}>
            <FiCalendar className="h-4 w-4" />
            {overdue ? "Overdue · " : "Due · "}{formatDate(assignment.dueDate)}
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <FiAward className="h-4 w-4" /> {assignment.maxMarks} marks total
          </span>
          {assignment.createdBy && (
            <span className="flex items-center gap-1.5 text-slate-500">
              <FiFileText className="h-4 w-4" />
              By {assignment.createdBy.firstName} {assignment.createdBy.lastName}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {assignment.description && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
          <h2 className="font-semibold text-slate-800 mb-2">Description</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{assignment.description}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-slate-800 mb-3">Assignment Instructions</h2>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
            {assignment.instructions}
          </p>
        </div>
      </div>

      {/* Rubric table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-slate-800 mb-4">Grading Rubric</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-medium text-slate-600 rounded-tl-lg">Criterion</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Description</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 rounded-tr-lg">Max Marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignment.rubric.map((criterion, index) => (
                <tr key={index} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{criterion.criterion}</td>
                  <td className="px-4 py-3 text-slate-500">{criterion.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-600">{criterion.maxMarks}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 border-t-2 border-blue-200">
                <td colSpan={2} className="px-4 py-3 font-semibold text-slate-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-blue-700 text-base">{assignment.maxMarks}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Submission section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-4">
        {existingSubmission && existingSubmission.status !== "failed" ? (
          // Already submitted (non-failed)
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">Your Submission</h2>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border capitalize ${STATUS_STYLES[existingSubmission.status] || ""}`}>
                {existingSubmission.status}
              </span>
            </div>

            {existingSubmission.status === "processing" && (
              <div className="flex items-center gap-3 py-6 text-amber-600">
                <FiLoader className="h-5 w-5 animate-spin" />
                <p className="text-sm font-medium">AI is evaluating your submission… This may take a moment.</p>
              </div>
            )}

            {evaluation && (existingSubmission.status === "evaluated" || existingSubmission.status === "reviewed") && (
              <EvaluationPanel evaluation={evaluation} maxMarks={assignment.maxMarks} />
            )}
          </div>
        ) : (
          // Upload form
          <div>
            <h2 className="font-semibold text-slate-800 mb-1">Submit Your Answer</h2>
            <p className="text-sm text-slate-500 mb-4">
              Upload your answer as a PDF file. AI evaluation will begin automatically.
            </p>

            {/* File drop / picker */}
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                selectedFile
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 hover:border-slate-300 bg-slate-50"
              } ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
                disabled={uploading}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FiFileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="ml-2 text-slate-400 hover:text-slate-600"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <FiUpload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Click to choose a PDF</p>
                  <p className="text-xs text-slate-400 mt-1">PDF only, max 10 MB</p>
                </div>
              )}
            </div>

            {uploadError && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1.5">
                <FiAlertCircle className="h-4 w-4" /> {uploadError}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!selectedFile || uploading || overdue}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {uploading ? (
                <><FiLoader className="h-4 w-4 animate-spin" /> Uploading & Evaluating…</>
              ) : (
                <><FiUpload className="h-4 w-4" /> Upload & Submit PDF</>
              )}
            </button>

            {overdue && (
              <p className="mt-2 text-xs text-red-500">This assignment is overdue and no longer accepting submissions.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AssignmentDetail;
