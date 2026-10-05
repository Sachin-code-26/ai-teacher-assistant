// =============================================================
//  client/src/services/submissionService.js
//  All API calls related to submissions and evaluations.
// =============================================================

import api from "./api.js";

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || "Something went wrong. Please try again."
  );
};

export const submissionService = {
  // ── STUDENT ─────────────────────────────────────────────

  /**
   * Submit a PDF file for an assignment.
   * Uses multipart/form-data — axios handles Content-Type automatically.
   * @param {string} assignmentId
   * @param {File} file - The PDF File object from the input element
   */
  async submitAssignment(assignmentId, file) {
    try {
      const formData = new FormData();
      formData.append("assignmentId", assignmentId);
      formData.append("file", file);

      const response = await api.post("/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Get all submissions for the logged-in student.
   */
  async getMySubmissions() {
    try {
      const response = await api.get("/submissions/my");
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Get a single submission with its evaluation.
   * @param {string} id - Submission ID
   */
  async getSubmission(id) {
    try {
      const response = await api.get(`/submissions/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  // ── TEACHER ─────────────────────────────────────────────

  /**
   * Get all submissions for all of a teacher's assignments (dashboard).
   */
  async getTeacherSubmissions() {
    try {
      const response = await api.get("/submissions/teacher/all");
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Get all submissions for a specific assignment.
   * @param {string} assignmentId
   */
  async getSubmissionsForAssignment(assignmentId) {
    try {
      const response = await api.get(`/submissions/assignment/${assignmentId}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  /**
   * Submit a teacher grade override.
   * @param {string} submissionId
   * @param {{ teacherFinalMarks: number, teacherComments: string }} data
   */
  async reviewSubmission(submissionId, data) {
    try {
      const response = await api.patch(`/submissions/${submissionId}/review`, data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};
