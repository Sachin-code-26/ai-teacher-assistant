// =============================================================
//  server/controllers/submissionController.js
//
//  Handles student PDF submissions and teacher review overrides.
//
//  FLOW FOR STUDENT SUBMISSION:
//  1. Multer middleware parses the multipart file upload → req.file
//  2. createSubmission validates the file and checks for duplicates
//  3. Status set to "processing" while Gemini evaluates
//  4. Gemini result saved as Evaluation document
//  5. Submission updated to "evaluated" with evaluationId
//  6. Temp file deleted from disk
//
//  FLOW FOR TEACHER REVIEW:
//  1. Teacher sends { teacherFinalMarks, teacherComments } in body
//  2. We verify the teacher owns the assignment this submission is for
//  3. We update the Evaluation document with teacher override fields
//  4. We update Submission.status to "reviewed"
// =============================================================

import fs from "fs";
import path from "path";
import Submission from "../models/Submission.js";
import Evaluation from "../models/Evaluation.js";
import Assignment from "../models/Assignment.js";
import { evaluateSubmission } from "../services/geminiService.js";

// =============================================================
//  CREATE SUBMISSION
//  POST /api/submissions
//  Access: Students only
// =============================================================
export const createSubmission = async (req, res, next) => {
  const filePath = req.file?.path; // Set by multer

  try {
    const { assignmentId } = req.body;

    // ── Validate request ───────────────────────────────────
    if (!assignmentId) {
      return res.status(400).json({
        success: false,
        message: "assignmentId is required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF file.",
      });
    }

    // ── Check assignment exists and is active ──────────────
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment || !assignment.isActive) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found or is no longer active.",
      });
    }

    // ── Check for duplicate submission ─────────────────────
    // Allow retry if the previous submission failed (AI error).
    // Block only if there's already a successful/processing submission.
    const existing = await Submission.findOne({
      assignmentId,
      studentId: req.user._id,
    });
    if (existing) {
      if (existing.status === "failed") {
        // Delete the failed submission so the student can try again
        await Submission.findByIdAndDelete(existing._id);
      } else {
        return res.status(409).json({
          success: false,
          message: "You have already submitted this assignment.",
          submissionId: existing._id,
        });
      }
    }

    // ── Create the submission record immediately ───────────
    // We save with status="processing" so the student knows it's being graded
    const submission = await Submission.create({
      assignmentId,
      studentId: req.user._id,
      fileUrl: filePath, // Temporary disk path (no cloud storage)
      fileName: req.file.originalname,
      status: "processing",
    });

    // ── Call Gemini for evaluation ─────────────────────────
    let evaluationResult;
    try {
      evaluationResult = await evaluateSubmission(filePath, assignment);
    } catch (geminiError) {
      // Gemini failed — log and mark submission as failed
      console.error("❌ Gemini evaluation error:", geminiError.message);
      console.error("   Status:", geminiError.status);
      await Submission.findByIdAndUpdate(submission._id, {
        status: "failed",
        errorMessage: geminiError.message,
      });
      // Clean up temp file
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(200).json({
        success: true,
        message: "Submission received but AI grading failed. Please contact your teacher.",
        submission: { ...submission.toObject(), status: "failed" },
      });
    }

    // ── Save the Evaluation document ───────────────────────
    const evaluation = await Evaluation.create({
      submissionId: submission._id,
      assignmentId,
      studentId: req.user._id,
      criteriaResults: evaluationResult.criteriaResults,
      totalMarks: evaluationResult.totalMarks,
      maxMarks: evaluationResult.maxMarks,
      percentage: evaluationResult.percentage,
      strengths: evaluationResult.strengths,
      weaknesses: evaluationResult.weaknesses,
      overallFeedback: evaluationResult.overallFeedback,
      aiGenerated: true,
    });

    // ── Update submission status ────────────────────────────
    const updatedSubmission = await Submission.findByIdAndUpdate(
      submission._id,
      {
        status: "evaluated",
        evaluationId: evaluation._id,
      },
      { new: true }
    );

    // ── Clean up temp file ─────────────────────────────────
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return res.status(201).json({
      success: true,
      message: "Submission received and evaluated successfully.",
      submission: updatedSubmission,
      evaluation,
    });
  } catch (error) {
    // Clean up temp file on unexpected error
    if (filePath && fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already submitted this assignment.",
      });
    }
    next(error);
  }
};

// =============================================================
//  GET MY SUBMISSIONS
//  GET /api/submissions/my
//  Access: Students only
//
//  Returns all submissions by the logged-in student, with the
//  evaluation result populated (if available).
// =============================================================
export const getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.find({ studentId: req.user._id })
      .populate("assignmentId", "title subject maxMarks dueDate")
      .populate("evaluationId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================
//  GET SINGLE SUBMISSION
//  GET /api/submissions/:id
//  Access: The student who submitted OR a teacher who owns the assignment
// =============================================================
export const getSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("assignmentId", "title subject maxMarks rubric instructions createdBy")
      .populate("studentId", "firstName lastName email")
      .populate("evaluationId");

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    // Access control:
    // - Student can only see their own submission
    // - Teacher can see submissions for their assignments
    const isOwner = submission.studentId._id.toString() === req.user._id.toString();
    const isAssignmentTeacher =
      req.user.role === "teacher" &&
      submission.assignmentId.createdBy?.toString() === req.user._id.toString();

    if (!isOwner && !isAssignmentTeacher) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    return res.status(200).json({ success: true, submission });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }
    next(error);
  }
};

// =============================================================
//  GET SUBMISSIONS FOR AN ASSIGNMENT (Teacher view)
//  GET /api/submissions/assignment/:assignmentId
//  Access: Teacher who created the assignment
// =============================================================
export const getSubmissionsForAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }

    // Only the teacher who created the assignment can view its submissions
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const submissions = await Submission.find({ assignmentId: req.params.assignmentId })
      .populate("studentId", "firstName lastName email")
      .populate("evaluationId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      assignment: { title: assignment.title, maxMarks: assignment.maxMarks },
      submissions,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }
    next(error);
  }
};

// =============================================================
//  TEACHER REVIEW / OVERRIDE
//  PATCH /api/submissions/:id/review
//  Access: Teacher who created the related assignment
// =============================================================
export const reviewSubmission = async (req, res, next) => {
  try {
    const submission = await Submission.findById(req.params.id).populate(
      "assignmentId",
      "createdBy maxMarks"
    );

    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    // Ownership check
    if (
      submission.assignmentId.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (!submission.evaluationId) {
      return res.status(400).json({
        success: false,
        message: "This submission has not been evaluated yet.",
      });
    }

    const { teacherFinalMarks, teacherComments } = req.body;

    if (teacherFinalMarks === undefined) {
      return res.status(400).json({
        success: false,
        message: "teacherFinalMarks is required.",
      });
    }

    const max = submission.assignmentId.maxMarks;
    if (teacherFinalMarks < 0 || teacherFinalMarks > max) {
      return res.status(400).json({
        success: false,
        message: `teacherFinalMarks must be between 0 and ${max}.`,
      });
    }

    // Update the Evaluation document
    const evaluation = await Evaluation.findByIdAndUpdate(
      submission.evaluationId,
      {
        teacherFinalMarks: Number(teacherFinalMarks),
        teacherComments: teacherComments || null,
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
      },
      { new: true }
    );

    // Update submission status
    await Submission.findByIdAndUpdate(submission._id, { status: "reviewed" });

    return res.status(200).json({
      success: true,
      message: "Submission reviewed successfully.",
      evaluation,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }
    next(error);
  }
};

// =============================================================
//  GET ALL SUBMISSIONS FOR TEACHER DASHBOARD
//  GET /api/submissions/teacher/all
//  Access: Teachers only
//
//  Returns all submissions across all of a teacher's assignments.
//  Used for the teacher dashboard to show pending reviews.
// =============================================================
export const getTeacherSubmissions = async (req, res, next) => {
  try {
    // Find all assignments by this teacher
    const assignments = await Assignment.find({ createdBy: req.user._id }).select("_id title");
    const assignmentIds = assignments.map((a) => a._id);

    if (assignmentIds.length === 0) {
      return res.status(200).json({ success: true, count: 0, submissions: [] });
    }

    const submissions = await Submission.find({ assignmentId: { $in: assignmentIds } })
      .populate("assignmentId", "title maxMarks")
      .populate("studentId", "firstName lastName email")
      .populate("evaluationId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    next(error);
  }
};
