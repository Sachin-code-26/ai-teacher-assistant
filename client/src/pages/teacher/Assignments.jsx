// =============================================================
//  client/src/pages/teacher/Assignments.jsx
//
//  Full assignment management page for teachers.
//  Features:
//  - List all their own assignments with submission counts
//  - Create new assignment via slide-in form panel
//  - Edit existing assignment (same form, pre-filled)
//  - Delete assignment with confirmation
//  - Toggle assignment active/inactive
// =============================================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight,
  FiX, FiChevronDown, FiChevronUp, FiAlertCircle,
  FiBookOpen, FiLoader, FiCheck,
} from "react-icons/fi";
import { assignmentService } from "../../services/assignmentService.js";
import { submissionService } from "../../services/submissionService.js";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import { formatDate } from "../../utils/dateHelpers.js";

// ── Rubric row component ─────────────────────────────────────
function RubricRow({ criterion, onChange, onRemove, index, canRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          placeholder="Criterion name"
          value={criterion.criterion}
          onChange={(e) => onChange(index, "criterion", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          placeholder="Description"
          value={criterion.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          className="sm:col-span-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number" min="1" placeholder="Max marks"
          value={criterion.maxMarks}
          onChange={(e) => onChange(index, "maxMarks", e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        disabled={!canRemove}
        className="mt-0.5 p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
}

const emptyRubric = () => ({ criterion: "", description: "", maxMarks: "" });
const emptyForm = () => ({
  title: "", description: "", instructions: "",
  subject: "", maxMarks: "", dueDate: "",
  rubric: [emptyRubric()],
});

// ── Assignment form panel ─────────────────────────────────────
function AssignmentForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const isEdit = !!initial;

  const rubricTotal = form.rubric.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
  const maxMatchesRubric = rubricTotal === Number(form.maxMarks || 0);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const setRubricField = (i, field, value) => {
    const rubric = [...form.rubric];
    rubric[i] = { ...rubric[i], [field]: value };
    setForm((f) => ({ ...f, rubric }));
  };
  const addRubricRow = () => setForm((f) => ({ ...f, rubric: [...f.rubric, emptyRubric()] }));
  const removeRubricRow = (i) =>
    setForm((f) => ({ ...f, rubric: f.rubric.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    // Client-side validation
    if (!maxMatchesRubric) {
      setFormError(`Rubric total (${rubricTotal}) must equal Max Marks (${form.maxMarks || 0}).`);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        maxMarks: Number(form.maxMarks),
        rubric: form.rubric.map((r) => ({ ...r, maxMarks: Number(r.maxMarks) })),
      };
      if (isEdit) {
        await assignmentService.updateAssignment(initial._id, payload);
      } else {
        await assignmentService.createAssignment(payload);
      }
      onSave();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">
          {isEdit ? "Edit Assignment" : "New Assignment"}
        </h2>
        <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <FiX className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              required value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Essay on Climate Change"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
            <input
              required value={form.subject}
              onChange={(e) => setField("subject", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Environmental Science"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Marks *</label>
            <input
              required type="number" min="1" value={form.maxMarks}
              onChange={(e) => setField("maxMarks", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
            <input
              required type="date" value={form.dueDate ? form.dueDate.split("T")[0] : ""}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setField("dueDate", e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            rows={2} value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional overview of the assignment"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instructions *</label>
          <textarea
            required rows={4} value={form.instructions}
            onChange={(e) => setField("instructions", e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Detailed instructions for the student…"
          />
        </div>

        {/* Rubric builder */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-slate-700">
              Grading Rubric *
              <span className={`ml-2 text-xs font-normal ${maxMatchesRubric && form.maxMarks ? "text-green-600" : "text-amber-600"}`}>
                (Total: {rubricTotal} / {form.maxMarks || "?"})
              </span>
            </label>
            <button
              type="button" onClick={addRubricRow}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <FiPlus className="h-3.5 w-3.5" /> Add row
            </button>
          </div>
          <div className="space-y-2">
            {form.rubric.map((cr, i) => (
              <RubricRow
                key={i} index={i} criterion={cr}
                onChange={setRubricField}
                onRemove={removeRubricRow}
                canRemove={form.rubric.length > 1}
              />
            ))}
          </div>
        </div>

        {formError && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <FiAlertCircle className="h-4 w-4 flex-shrink-0" /> {formError}
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="submit" disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheck className="h-4 w-4" />}
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Assignment"}
          </button>
          <button type="button" onClick={onCancel}
            className="px-5 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Assignment list card ──────────────────────────────────────
function AssignmentCard({ assignment, submissionCount, onEdit, onDelete, onToggle }) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try { await onDelete(assignment._id); }
    finally { setDeleting(false); }
  };

  const handleToggle = async () => {
    setToggling(true);
    try { await onToggle(assignment._id, !assignment.isActive); }
    finally { setToggling(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 truncate">{assignment.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border flex-shrink-0 ${assignment.isActive ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {assignment.isActive ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {assignment.subject} · Due {formatDate(assignment.dueDate)} · {assignment.maxMarks} marks
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {submissionCount} submission{submissionCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {submissionCount > 0 && (
            <button
              onClick={() => navigate(`/teacher/submissions/assignment/${assignment._id}`)}
              className="text-xs text-blue-600 hover:underline px-2 py-1.5"
            >
              View submissions
            </button>
          )}
          <button
            onClick={handleToggle} disabled={toggling}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            title={assignment.isActive ? "Deactivate" : "Activate"}
          >
            {toggling ? <FiLoader className="h-4 w-4 animate-spin" /> : assignment.isActive ? <FiToggleRight className="h-5 w-5 text-green-500" /> : <FiToggleLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => onEdit(assignment)}
            className="p-2 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
          <button
            onClick={handleDelete} disabled={deleting}
            className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete"
          >
            {deleting ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiTrash2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────
function TeacherAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [submissionCounts, setSubmissionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const fetchData = async () => {
    try {
      const [aData, sData] = await Promise.all([
        assignmentService.getAssignments(),
        submissionService.getTeacherSubmissions(),
      ]);
      setAssignments(aData.assignments || []);

      // Count submissions per assignment
      const counts = {};
      for (const s of sData.submissions || []) {
        const aid = s.assignmentId?._id || s.assignmentId;
        counts[aid] = (counts[aid] || 0) + 1;
      }
      setSubmissionCounts(counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleFormSave = async () => {
    setShowForm(false);
    setEditingAssignment(null);
    setLoading(true);
    await fetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAssignment(null);
  };

  const handleDelete = async (id) => {
    await assignmentService.deleteAssignment(id);
    setAssignments((prev) => prev.filter((a) => a._id !== id));
  };

  const handleToggle = async (id, isActive) => {
    await assignmentService.updateAssignment(id, { isActive });
    setAssignments((prev) =>
      prev.map((a) => (a._id === id ? { ...a, isActive } : a))
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Assignments</h1>
          <p className="text-slate-500 text-sm mt-1">
            {loading ? "Loading…" : `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setEditingAssignment(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <FiPlus className="h-4 w-4" /> New Assignment
          </button>
        )}
      </div>

      {/* Form panel */}
      {showForm && (
        <AssignmentForm
          initial={editingAssignment}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" text="Loading assignments…" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600">{error}</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FiBookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold text-lg">No assignments yet</p>
          <p className="text-slate-400 text-sm mt-2">
            Click <strong>New Assignment</strong> to create your first one.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((a) => (
            <AssignmentCard
              key={a._id}
              assignment={a}
              submissionCount={submissionCounts[a._id] || 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TeacherAssignments;
