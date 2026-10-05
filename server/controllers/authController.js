// =============================================================
//  server/controllers/authController.js
//
//  Handles the request/response cycle for all auth operations.
//
//  CONTROLLER RULES WE FOLLOW:
//  - Controllers only handle HTTP layer (req, res)
//  - No complex business logic here — that goes in services
//  - Always send consistent responses
//  - Never return password fields
//  - Catch errors and forward to the global error handler
//
//  FUNCTIONS EXPORTED:
//  - register  → POST /api/auth/register
//  - login     → POST /api/auth/login
//  - logout    → POST /api/auth/logout
//  - getMe     → GET  /api/auth/me
// =============================================================

import User from "../models/User.js";
import {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
} from "../utils/jwtHelper.js";

// =============================================================
//  Helper: format user data for API response
//  We pick exactly what we want to return — never the password.
// =============================================================
const formatUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  fullName: user.fullName,   // virtual from schema
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

// =============================================================
//  REGISTER
//  POST /api/auth/register
//  Body: { firstName, lastName, email, password, role }
// =============================================================
export const register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    // ── Input validation ───────────────────────────────────
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide firstName, lastName, email, and password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // ── Check for existing user ────────────────────────────
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // ── Create user ────────────────────────────────────────
    // The password is automatically hashed by our pre-save hook
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      // Only allow "student" or "teacher" — default is "student"
      role: role === "teacher" ? "teacher" : "student",
    });

    // ── Generate JWT and set cookie ────────────────────────
    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    // ── Respond with user data (no password!) ──────────────
    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    // Handle Mongoose duplicate key error (race condition)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    next(error);
  }
};

// =============================================================
//  LOGIN
//  POST /api/auth/login
//  Body: { email, password }
// =============================================================
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // ── Input validation ───────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    // ── Find user — must use .select("+password") ──────────
    // Remember: password has select:false, so we must explicitly
    // ask for it here. This is the ONLY place we ever do this.
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    // ── Verify password ────────────────────────────────────
    // We check BOTH conditions before returning an error.
    // This is important: if we said "user not found" vs "wrong password"
    // separately, attackers could use the difference to enumerate emails.
    // By always saying "Invalid credentials", we reveal nothing.
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // ── Generate JWT and set cookie ────────────────────────
    const token = generateToken(user._id, user.role);
    setTokenCookie(res, token);

    // ── Respond ────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      message: "Logged in successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================
//  LOGOUT
//  POST /api/auth/logout
//  No body needed — just clears the cookie.
// =============================================================
export const logout = (req, res) => {
  clearTokenCookie(res);
  return res.status(200).json({
    success: true,
    message: "Logged out successfully.",
  });
};

// =============================================================
//  GET ME
//  GET /api/auth/me
//  Protected route — requires valid JWT cookie.
//  The protect middleware already fetched req.user for us.
//
//  This endpoint is used by the React frontend on app load to
//  check if the user is already logged in and get their data.
// =============================================================
export const getMe = async (req, res) => {
  // req.user was set by the protect middleware — no DB call needed
  return res.status(200).json({
    success: true,
    user: formatUser(req.user),
  });
};
