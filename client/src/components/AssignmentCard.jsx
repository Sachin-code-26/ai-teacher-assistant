// =============================================================
//  client/src/components/AssignmentCard.jsx
//  Card component for displaying an assignment in a list.
// =============================================================

import { Link } from "react-router-dom";
import { FiArrowRight, FiCalendar, FiAward, FiBook } from "react-icons/fi";
import { formatDate, isOverdue } from "../utils/dateHelpers.js";

// Status badge config: color + label per submission status
const STATUS_CONFIG = {
  submitted:  { bg: "bg-blue-100",   text: "text-blue-700",   label: "Submitted" },
  processing: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Processing..." },
  evaluated:  { bg: "bg-green-100",  text: "text-green-700",  label: "Evaluated" },
  reviewed:   { bg: "bg-purple-100", text: "text-purple-700", label: "Reviewed" },
  failed:     { bg: "bg-red-100",    text: "text-red-700",    label: "Failed" },
};

function AssignmentCard({ assignment, showStatus = false, submissionStatus }) {
  const overdue = isOverdue(assignment.dueDate);

  const statusConfig =
    submissionStatus && STATUS_CONFIG[submissionStatus]
      ? STATUS_CONFIG[submissionStatus]
      : null;

  return (
    <Link
      to={`/student/assignments/${assignment._id}`}
      className="block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Subject badge */}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full mb-2">
            <FiBook className="h-3 w-3" />
            {assignment.subject}
          </span>

          {/* Title */}
          <h3 className="font-semibold text-slate-800 text-base leading-snug mb-3 group-hover:text-blue-600 transition-colors">
            {assignment.title}
          </h3>

          {/* Meta info row */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* Due date */}
            <span
              className={`flex items-center gap-1 ${
                overdue ? "text-red-500 font-medium" : "text-slate-500"
              }`}
            >
              <FiCalendar className="h-3.5 w-3.5" />
              {overdue ? "Overdue · " : "Due · "}
              {formatDate(assignment.dueDate)}
            </span>

            {/* Max marks */}
            <span className="flex items-center gap-1 text-slate-500">
              <FiAward className="h-3.5 w-3.5" />
              {assignment.maxMarks} marks
            </span>
          </div>
        </div>

        {/* Right: arrow + status */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <FiArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          {showStatus && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                statusConfig
                  ? `${statusConfig.bg} ${statusConfig.text}`
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {statusConfig ? statusConfig.label : "Not submitted"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default AssignmentCard;
