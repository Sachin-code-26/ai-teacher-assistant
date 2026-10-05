// =============================================================
//  server/middleware/authMiddleware.js
//
//  Middleware functions that protect routes.
//
//  HOW MIDDLEWARE WORKS IN EXPRESS:
//  Every middleware receives (req, res, next).
//  - req   = incoming request (headers, body, cookies, etc.)
//  - res   = outgoing response
//  - next  = function to call the NEXT middleware/handler in chain
//
//  If we call next()      → request continues to the controller
//  If we call next(error) → request jumps to the error handler
//  If we call res.json()  → request stops here (we responded)
//
//  USAGE IN ROUTES (Phase 4+):
//
//  // Only logged-in users:
//  router.get("/assignments", protect, assignmentController.getAll);
//
//  // Only teachers:
//  router.post("/assignments", protect, teacherOnly, assignmentController.create);
//
//  // Only students:
//  router.post("/submit", protect, studentOnly, submissionController.create);
//
//  Notice: protect always comes BEFORE teacherOnly/studentOnly
//  because teacherOnly needs req.user (which protect sets up).
// =============================================================

import { verifyToken } from "../utils/jwtHelper.js";
import User from "../models/User.js";

// =============================================================
//  PROTECT MIDDLEWARE
//
//  Verifies the JWT from the cookie.
//  If valid → fetches the user from DB → attaches to req.user
//  If invalid → sends 401 Unauthorized
//
//  After this middleware runs, every subsequent handler can
//  access req.user to know who is making the request.
// =============================================================
export const protect = async (req, res, next) => {
  try {
    // 1. Get the token from the HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please log in.",
      });
    }

    // 2. Verify the token — throws if expired or tampered
    const decoded = verifyToken(token);
    // decoded = { id: "64abc...", role: "teacher", iat: ..., exp: ... }

    // 3. Fetch the user from DB using the id in the token
    //    We do this (instead of just using decoded.id) so that:
    //    - If user is deleted, they can't use old tokens
    //    - We always have fresh user data
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists.",
      });
    }

    // 4. Attach user to the request — controllers can read req.user
    req.user = user;

    // 5. Pass control to the next middleware or controller
    next();
  } catch (error) {
    // jwt.verify throws if token is expired or signature is invalid
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please log in again.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please log in again.",
      });
    }
    next(error);
  }
};

// =============================================================
//  TEACHER ONLY MIDDLEWARE
//
//  Must come AFTER protect (needs req.user to exist).
//  Blocks any user who isn't a teacher.
// =============================================================
export const teacherOnly = (req, res, next) => {
  if (req.user && req.user.role === "teacher") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Teachers only.",
  });
};

// =============================================================
//  STUDENT ONLY MIDDLEWARE
//
//  Must come AFTER protect (needs req.user to exist).
//  Blocks any user who isn't a student.
// =============================================================
export const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === "student") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Students only.",
  });
};
