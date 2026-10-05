// =============================================================
//  client/src/services/assignmentService.js
//  All API calls related to assignments.
// =============================================================

import api from "./api.js";

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || "Something went wrong. Please try again."
  );
};

export const assignmentService = {
  async getAssignments() {
    try {
      const response = await api.get("/assignments");
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async getAssignment(id) {
    try {
      const response = await api.get(`/assignments/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async createAssignment(data) {
    try {
      const response = await api.post("/assignments", data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async updateAssignment(id, data) {
    try {
      const response = await api.put(`/assignments/${id}`, data);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async deleteAssignment(id) {
    try {
      const response = await api.delete(`/assignments/${id}`);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};
