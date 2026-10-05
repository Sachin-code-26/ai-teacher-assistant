// =============================================================
//  client/src/services/api.js
//
//  Centralized Axios instance for all API calls.
//
//  Why one centralized instance?
//  - We define baseURL once — change it in one place.
//  - We enable credentials once (for cookies).
//  - We can add request/response interceptors:
//      → Interceptors run on every request/response automatically.
//      → Use them to attach tokens, handle 401s, show loaders, etc.
//
//  Usage in a component or service:
//    import api from '../services/api';
//    const response = await api.get('/assignments');
//    const response = await api.post('/auth/login', { email, password });
// =============================================================

import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy will forward this to http://localhost:5000/api
  withCredentials: true, // IMPORTANT: send/receive HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// =============================================================
//  REQUEST INTERCEPTOR
//  Runs before every outgoing request.
//  We can use this to attach an Authorization header if needed.
// =============================================================
api.interceptors.request.use(
  (config) => {
    // In Phase 3 we'll optionally attach JWT from localStorage here
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// =============================================================
//  RESPONSE INTERCEPTOR
//  Runs on every response (success or error).
//  Use this to handle 401 Unauthorized globally (e.g., auto-logout).
// =============================================================
api.interceptors.response.use(
  (response) => {
    // Return the response data directly to keep usage clean
    return response;
  },
  (error) => {
    // Global 401 handling will be added in Phase 3
    if (error.response?.status === 401) {
      // Will redirect to login in Phase 3
      console.warn("Unauthorized request — redirecting to login");
    }
    return Promise.reject(error);
  }
);

export default api;
