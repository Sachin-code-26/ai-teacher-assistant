// =============================================================
//  server/routes/submissions.js
//
//  Route map:
//  POST   /api/submissions                          → studentOnly → createSubmission
//  GET    /api/submissions/my                       → studentOnly → getMySubmissions
//  GET    /api/submissions/teacher/all              → teacherOnly → getTeacherSubmissions
//  GET    /api/submissions/assignment/:assignmentId → teacherOnly → getSubmissionsForAssignment
//  GET    /api/submissions/:id                      → protect    → getSubmission
//  PATCH  /api/submissions/:id/review               → teacherOnly → reviewSubmission
//
//  MULTER SETUP:
//  Multer handles multipart/form-data file uploads.
//  We configure it to:
//  - Store files in an "uploads/" temp directory on disk
//  - Reject non-PDF files immediately (fileFilter)
//  - Reject files larger than 10 MB (limits.fileSize)
//  After the controller processes the file, it deletes the temp file.
// =============================================================

import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  createSubmission,
  getMySubmissions,
  getSubmission,
  getSubmissionsForAssignment,
  reviewSubmission,
  getTeacherSubmissions,
} from "../controllers/submissionController.js";
import { protect, teacherOnly, studentOnly } from "../middleware/authMiddleware.js";

// ── Multer configuration ─────────────────────────────────────

// Ensure the temp uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    // Sanitize and timestamp the filename to avoid collisions
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // Accept
  } else {
    cb(new Error("Only PDF files are allowed."), false); // Reject
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ── Multer error handler wrapper ─────────────────────────────
// Multer errors (wrong MIME type, too large) need special handling
// because they happen before the controller runs.
const uploadPdf = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File is too large. Maximum size is 10 MB.",
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// ── Router ───────────────────────────────────────────────────
const router = Router();

// All routes require authentication
router.use(protect);

// Student routes
router.post("/", studentOnly, uploadPdf, createSubmission);
router.get("/my", studentOnly, getMySubmissions);

// Teacher routes — MUST come before /:id to avoid route conflicts
router.get("/teacher/all", teacherOnly, getTeacherSubmissions);
router.get("/assignment/:assignmentId", teacherOnly, getSubmissionsForAssignment);

// Shared routes (access control in controller)
router.get("/:id", getSubmission);
router.patch("/:id/review", teacherOnly, reviewSubmission);

export default router;
