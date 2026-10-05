// =============================================================
//  server/controllers/assignmentController.js
//
//  Handles all CRUD operations for assignments.
//
//  ACCESS CONTROL SUMMARY:
//  ┌─────────────────────────────────────────────────────┐
//  │  Route                  │ Who can access?           │
//  ├─────────────────────────────────────────────────────┤
//  │  POST   /assignments    │ Teachers only             │
//  │  GET    /assignments    │ All logged-in users       │
//  │  GET    /assignments/:id│ All logged-in users       │
//  │  PUT    /assignments/:id│ Teacher who OWNS it only  │
//  │  DELETE /assignments/:id│ Teacher who OWNS it only  │
//  └─────────────────────────────────────────────────────┘
//
//  OWNERSHIP VERIFICATION PATTERN:
//  When a teacher tries to update/delete an assignment, we check:
//    assignment.createdBy.toString() === req.user._id.toString()
//
//  Why .toString()?
//  MongoDB returns ObjectIds, not strings. Direct comparison
//  (objectId === objectId) doesn't work reliably in JS because
//  they're objects, not primitives. .toString() converts both
//  to strings for safe comparison.
// =============================================================

import Assignment from "../models/Assignment.js";

// =============================================================
//  CREATE ASSIGNMENT
//  POST /api/assignments
//  Access: Teachers only
// =============================================================
export const createAssignment = async (req, res, next) => {
  try {
    const {
      title,
      description,
      instructions,
      subject,
      maxMarks,
      rubric,
      dueDate,
    } = req.body;

    // ── Basic validation ───────────────────────────────────
    if (!title || !instructions || !subject || !maxMarks || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide title, instructions, subject, maxMarks, and dueDate.",
      });
    }

    // ── Rubric validation ──────────────────────────────────
    if (!rubric || !Array.isArray(rubric) || rubric.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Assignment must have at least one rubric criterion.",
      });
    }

    // Validate each criterion has required fields
    for (const criterion of rubric) {
      if (!criterion.criterion || !criterion.description || criterion.maxMarks === undefined) {
        return res.status(400).json({
          success: false,
          message: "Each rubric criterion must have criterion, description, and maxMarks.",
        });
      }
      if (criterion.maxMarks < 1) {
        return res.status(400).json({
          success: false,
          message: `Criterion "${criterion.criterion}" must have maxMarks of at least 1.`,
        });
      }
    }

    // ── Cross-validate rubric total vs maxMarks ────────────
    // The sum of rubric marks should equal the assignment's maxMarks.
    // This prevents inconsistencies like "maxMarks=10 but rubric totals 15".
    const rubricTotal = rubric.reduce((sum, c) => sum + Number(c.maxMarks), 0);
    if (rubricTotal !== Number(maxMarks)) {
      return res.status(400).json({
        success: false,
        message: `Rubric criteria total (${rubricTotal}) must equal maxMarks (${maxMarks}).`,
      });
    }

    // ── Due date validation ────────────────────────────────
    const due = new Date(dueDate);
    if (isNaN(due.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date format.",
      });
    }

    // ── Create the assignment ──────────────────────────────
    // req.user._id is set by the protect middleware
    const assignment = await Assignment.create({
      title,
      description,
      instructions,
      subject,
      maxMarks: Number(maxMarks),
      rubric,
      dueDate: due,
      createdBy: req.user._id, // The logged-in teacher's ID
    });

    // Populate teacher details in the response
    await assignment.populate("createdBy", "firstName lastName email");

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      assignment,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================
//  GET ALL ASSIGNMENTS
//  GET /api/assignments
//  Access: All logged-in users
//
//  Behavior differs by role:
//  - Teacher → sees only THEIR OWN assignments
//  - Student → sees ALL active assignments
//
//  Why this difference?
//  Teachers manage their own assignments.
//  Students need to see all available work from any teacher.
// =============================================================
export const getAssignments = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === "teacher") {
      // Teachers see only their own assignments
      filter.createdBy = req.user._id;
    } else {
      // Students see all active assignments
      filter.isActive = true;
    }

    const assignments = await Assignment.find(filter)
      .populate("createdBy", "firstName lastName") // Embed teacher name
      .sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      success: true,
      count: assignments.length,
      assignments,
    });
  } catch (error) {
    next(error);
  }
};

// =============================================================
//  GET SINGLE ASSIGNMENT
//  GET /api/assignments/:id
//  Access: All logged-in users
// =============================================================
export const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate(
      "createdBy",
      "firstName lastName email"
    );

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    // Students can only view active assignments
    if (req.user.role === "student" && !assignment.isActive) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    return res.status(200).json({
      success: true,
      assignment,
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId format
    if (error.name === "CastError") {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }
    next(error);
  }
};

// =============================================================
//  UPDATE ASSIGNMENT
//  PUT /api/assignments/:id
//  Access: Teacher who CREATED it only
// =============================================================
export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    // ── OWNERSHIP CHECK ────────────────────────────────────
    // This is the critical security gate.
    // Even if a user is a teacher, they can't edit other teachers' assignments.
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only edit your own assignments.",
      });
    }

    const {
      title,
      description,
      instructions,
      subject,
      maxMarks,
      rubric,
      dueDate,
      isActive,
    } = req.body;

    // ── Re-validate rubric total if rubric or maxMarks is being updated
    if (rubric || maxMarks) {
      const newRubric = rubric || assignment.rubric;
      const newMax = Number(maxMarks || assignment.maxMarks);
      const rubricTotal = newRubric.reduce((sum, c) => sum + Number(c.maxMarks), 0);
      if (rubricTotal !== newMax) {
        return res.status(400).json({
          success: false,
          message: `Rubric criteria total (${rubricTotal}) must equal maxMarks (${newMax}).`,
        });
      }
    }

    // Build update object — only include fields that were sent
    // This pattern lets teachers do partial updates
    const updateData = {};
    if (title !== undefined)        updateData.title = title;
    if (description !== undefined)  updateData.description = description;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (subject !== undefined)      updateData.subject = subject;
    if (maxMarks !== undefined)     updateData.maxMarks = Number(maxMarks);
    if (rubric !== undefined)       updateData.rubric = rubric;
    if (dueDate !== undefined)      updateData.dueDate = new Date(dueDate);
    if (isActive !== undefined)     updateData.isActive = isActive;

    const updated = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,           // Return the updated document, not the old one
        runValidators: true, // Run schema validators on update too
      }
    ).populate("createdBy", "firstName lastName email");

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      assignment: updated,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }
    next(error);
  }
};

// =============================================================
//  DELETE ASSIGNMENT
//  DELETE /api/assignments/:id
//  Access: Teacher who CREATED it only
// =============================================================
export const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: "Assignment not found.",
      });
    }

    // ── OWNERSHIP CHECK ────────────────────────────────────
    if (assignment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own assignments.",
      });
    }

    await Assignment.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully.",
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ success: false, message: "Assignment not found." });
    }
    next(error);
  }
};
