// =============================================================
//  server/routes/auth.js
//
//  Route definitions for authentication endpoints.
//
//  WHAT THIS FILE DOES:
//  Maps HTTP method + path → controller function.
//  Routes are "thin" — zero business logic here.
//  All logic lives in controllers and services.
//
//  HOW EXPRESS ROUTER WORKS:
//  When we do app.use("/api/auth", authRoutes) in index.js,
//  all paths here are RELATIVE to /api/auth.
//
//  So router.post("/login") handles POST /api/auth/login
//     router.get("/me")    handles GET  /api/auth/me
//
//  MIDDLEWARE CHAIN EXAMPLE:
//  GET /api/auth/me → protect → getMe
//  The request must pass through `protect` before `getMe` runs.
// =============================================================

import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes — no authentication needed
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Protected route — must be logged in
// protect middleware runs first, then getMe
router.get("/me", protect, getMe);

export default router;
