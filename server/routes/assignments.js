// =============================================================
//  server/routes/assignments.js
//
//  Middleware chain for each route:
//
//  POST   /            → protect → teacherOnly → createAssignment
//  GET    /            → protect → getAssignments
//  GET    /:id         → protect → getAssignment
//  PUT    /:id         → protect → teacherOnly → updateAssignment
//  DELETE /:id         → protect → teacherOnly → deleteAssignment
//
//  Notice: protect always runs first (sets req.user),
//  then role checks, then the controller.
//
//  Students CAN access GET routes — they need to view assignments.
//  Only create/update/delete are teacher-gated.
// =============================================================

import { Router } from "express";
import {
  createAssignment,
  getAssignments,
  getAssignment,
  updateAssignment,
  deleteAssignment,
} from "../controllers/assignmentController.js";
import { protect, teacherOnly } from "../middleware/authMiddleware.js";

const router = Router();

// All routes require authentication (protect runs on all)
router.use(protect);

// ── Collection routes ──────────────────────────────────────
router
  .route("/")
  .get(getAssignments)              // Teachers & Students
  .post(teacherOnly, createAssignment); // Teachers only

// ── Resource routes ────────────────────────────────────────
router
  .route("/:id")
  .get(getAssignment)                          // Teachers & Students
  .put(teacherOnly, updateAssignment)          // Teachers only (ownership checked in controller)
  .delete(teacherOnly, deleteAssignment);      // Teachers only (ownership checked in controller)

export default router;
