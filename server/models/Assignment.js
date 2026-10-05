// =============================================================
//  server/models/Assignment.js
//
//  The Assignment model represents a task created by a teacher.
//
//  KEY CONCEPT — Nested Schemas (Subdocuments):
//  The `rubric` field is an ARRAY of objects, each with their
//  own shape. Mongoose handles this with a sub-schema.
//
//  KEY CONCEPT — Refs (References / Population):
//  `createdBy: { type: ObjectId, ref: "User" }`
//  This stores just the user's _id in MongoDB (like a foreign key).
//  When you query, you can use .populate("createdBy") to
//  replace that _id with the full User document automatically.
//
//  Example:
//    Without populate: { createdBy: "64abc123..." }
//    With populate:    { createdBy: { firstName: "Jane", email: "..." } }
// =============================================================

import mongoose from "mongoose";

// =============================================================
//  RUBRIC CRITERION SUB-SCHEMA
//
//  Each rubric item defines ONE grading criterion.
//  Example: { criterion: "Code Quality", maxMarks: 10, description: "..." }
//
//  _id: false → Don't create an _id for each sub-document.
//               Keeps the document lean and cleaner to work with.
// =============================================================
const rubricCriterionSchema = new mongoose.Schema(
  {
    criterion: {
      type: String,
      required: [true, "Criterion name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Criterion description is required"],
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, "Maximum marks for criterion is required"],
      min: [1, "Max marks must be at least 1"],
    },
  },
  { _id: false }
);

// =============================================================
//  ASSIGNMENT SCHEMA
// =============================================================
const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Assignment title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // The actual question or task the student must answer
    instructions: {
      type: String,
      required: [true, "Assignment instructions are required"],
      trim: true,
    },

    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
    },

    maxMarks: {
      type: Number,
      required: [true, "Maximum marks is required"],
      min: [1, "Max marks must be at least 1"],
    },

    // Array of rubric criteria — the grading breakdown
    rubric: {
      type: [rubricCriterionSchema],
      validate: {
        validator: function (rubric) {
          // Must have at least one criterion
          return rubric && rubric.length > 0;
        },
        message: "Assignment must have at least one rubric criterion",
      },
    },

    // Reference to the teacher who created this assignment
    // ObjectId is MongoDB's unique ID type
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",           // The "User" model — enables .populate()
      required: true,
    },

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },

    isActive: {
      type: Boolean,
      default: true,         // Teachers can deactivate assignments
    },
  },
  {
    timestamps: true,        // Adds createdAt and updatedAt automatically
  }
);

// =============================================================
//  VIRTUAL: rubricTotalMarks
//
//  Calculates the sum of all rubric criterion max marks.
//  We use this to cross-validate against the assignment's maxMarks.
//
//  Usage: assignment.rubricTotalMarks
// =============================================================
assignmentSchema.virtual("rubricTotalMarks").get(function () {
  return this.rubric.reduce((sum, criterion) => sum + criterion.maxMarks, 0);
});

// =============================================================
//  INDEX
//  Add an index on `createdBy` so we can quickly find all
//  assignments by a specific teacher without a full scan.
// =============================================================
assignmentSchema.index({ createdBy: 1 });
assignmentSchema.index({ isActive: 1 });

const Assignment = mongoose.model("Assignment", assignmentSchema);

export default Assignment;
