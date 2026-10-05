// =============================================================
//  server/models/Submission.js
//
//  Tracks a student's file upload for a specific assignment.
//
//  IMPORTANT DESIGN DECISION — Why separate Submission + Evaluation?
//
//  We could store the evaluation inside the submission, but
//  keeping them separate gives us cleaner data:
//
//  Submission = "What the student submitted and when"
//  Evaluation = "What the AI (and teacher) thought about it"
//
//  Benefits:
//  - The evaluation can be updated (teacher override) without
//    touching the original submission record.
//  - We can query submissions and evaluations independently.
//  - Follows the Single Responsibility Principle.
//
//  STATUS LIFECYCLE:
//  "submitted" → "processing" → "evaluated" → "reviewed"
//                            ↘ "failed"
//
//  submitted  = File uploaded, waiting for evaluation
//  processing = Gemini API called, waiting for response
//  evaluated  = AI grading done, result saved
//  reviewed   = Teacher has reviewed and optionally overridden
//  failed     = Gemini call failed or response was invalid
// =============================================================

import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    // Which assignment this submission is for
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    // Which student submitted this
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // URL of the uploaded PDF in cloud storage (Cloudinary/S3)
    // We store the URL — not the file — in MongoDB
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },

    // The original file name the student uploaded
    fileName: {
      type: String,
      required: [true, "File name is required"],
    },

    // Public ID from cloud storage (needed to delete the file later)
    filePublicId: {
      type: String,
    },

    // Submission status — drives UI state and processing pipeline
    status: {
      type: String,
      enum: {
        values: ["submitted", "processing", "evaluated", "reviewed", "failed"],
        message: "Invalid status value",
      },
      default: "submitted",
    },

    // When the student clicked "Submit"
    submittedAt: {
      type: Date,
      default: Date.now,
    },

    // Link to the Evaluation document (added after grading)
    evaluationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Evaluation",
      default: null,
    },

    // Error message if grading failed (helpful for debugging)
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// =============================================================
//  COMPOUND UNIQUE INDEX
//
//  A student should only be able to submit ONCE per assignment.
//  This unique compound index enforces that at the database level,
//  not just in application code.
//
//  If a student tries to submit again:
//    MongoDB will throw a duplicate key error.
//    Our error handler will catch it and return a 409 Conflict.
// =============================================================
submissionSchema.index({ assignmentId: 1, studentId: 1 }, { unique: true });

// Index to quickly find all submissions by a specific student
submissionSchema.index({ studentId: 1 });

// Index to quickly find all submissions for a specific assignment
submissionSchema.index({ assignmentId: 1 });

const Submission = mongoose.model("Submission", submissionSchema);

export default Submission;
