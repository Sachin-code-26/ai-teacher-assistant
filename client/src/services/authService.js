// =============================================================
//  client/src/services/authService.js
//
//  All API calls related to authentication.
//
//  WHY A SEPARATE SERVICE FILE?
//  Components should NOT contain raw axios calls.
//  If the API endpoint changes, you update ONE place (here),
//  not every component that makes that call.
//
//  ERROR HANDLING PATTERN:
//  We catch axios errors and rethrow with the SERVER'S message.
//  This way, components receive clean error strings like
//  "Invalid email or password" instead of axios error objects.
// =============================================================

import api from "./api.js";

const handleError = (error) => {
  throw new Error(
    error.response?.data?.message || "Something went wrong. Please try again."
  );
};

export const authService = {
  async login(credentials) {
    try {
      const response = await api.post("/auth/login", credentials);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData);
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async logout() {
    try {
      const response = await api.post("/auth/logout");
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },

  async getMe() {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      handleError(error);
    }
  },
};
