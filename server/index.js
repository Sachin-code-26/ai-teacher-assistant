// =============================================================
//  server/index.js  — The entry point for our Express server
//
//  What this file does:
//  1. Loads environment variables from .env
//  2. Creates the Express application
//  3. Applies global middleware (CORS, JSON parsing, cookies)
//  4. Mounts route groups under /api/...
//  5. Connects to MongoDB
//  6. Starts listening on the configured PORT
// =============================================================

import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDB from "./config/db.js";

// =============================================================
//  IMPORT MODELS — registers all schemas with Mongoose on startup
//  Even if we don't use them directly in index.js, importing them
//  here ensures they are compiled and available throughout the app.
// =============================================================
import "./models/User.js";
import "./models/Assignment.js";
import "./models/Submission.js";
import "./models/Evaluation.js";

// --------------- Load .env FIRST before anything else --------
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================================
//  GLOBAL MIDDLEWARE
//  Middleware = functions that run on EVERY request before your
//  route handler. Order matters — apply them top to bottom.
// =============================================================

// CORS: Allow our React frontend to talk to this server.
// Without this, browsers block cross-origin requests.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // Allow cookies to be sent cross-origin
  })
);

// Parse incoming JSON bodies  (req.body will work for JSON requests)
app.use(express.json());

// Parse URL-encoded bodies (for HTML form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse cookies from incoming requests  (req.cookies will work)
// We use this for JWT stored in HTTP-only cookies
app.use(cookieParser());

// =============================================================
//  ROUTES
//  Each "app.use('/api/...')" groups related routes together.
//  We'll uncomment these as we build each phase.
// =============================================================

// Phase 3: Authentication routes ✅
import authRoutes from "./routes/auth.js";
app.use("/api/auth", authRoutes);

// Phase 4: Assignment routes ✅
import assignmentRoutes from "./routes/assignments.js";
app.use("/api/assignments", assignmentRoutes);

// Phase 6: Submission routes ✅
import submissionRoutes from "./routes/submissions.js";
app.use("/api/submissions", submissionRoutes);

// =============================================================
//  HEALTH CHECK
//  A simple endpoint to confirm the server is running.
//  Visit http://localhost:5000/api/health in your browser.
// =============================================================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "AI Teacher Assistant API is running 🚀",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================
//  GLOBAL ERROR HANDLER
//  If any route throws an error and calls next(error),
//  Express catches it here. This gives us consistent error
//  responses across the entire API.
// =============================================================
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    // Only show stack trace in development, never in production
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// =============================================================
//  START SERVER
//  We connect to MongoDB first, then start listening.
//  This ensures we don't accept requests before the DB is ready.
// =============================================================
const startServer = async () => {
  // Start listening first so the health check always works
  app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
  });

  // Then attempt to connect to MongoDB
  try {
    await connectDB();
  } catch (error) {
    console.error("⚠️  MongoDB not available:", error.message);
    console.error("   → Start MongoDB and restart the server for DB features.");
    // We don't exit in development — the server still responds to health checks
  }
};

startServer();
