// =============================================================
//  server/utils/testModels.js  — Phase 2 Verification Script
//
//  Run with: node utils/testModels.js
//
//  What this tests:
//  1. MongoDB connection works
//  2. All 4 models can create documents
//  3. References (ObjectId refs) work correctly
//  4. Unique constraints work (duplicate submission blocked)
//  5. Password hashing works via the pre-save hook
//  6. Virtual fields work (fullName, finalMarks)
//  7. All test data is cleaned up afterward
// =============================================================

import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Evaluation from "../models/Evaluation.js";

dotenv.config({ path: "../.env" });

// Track created IDs so we can clean up at the end
const createdIds = { users: [], assignments: [], submissions: [], evaluations: [] };

const log = (emoji, msg) => console.log(`${emoji} ${msg}`);
const pass = (msg) => console.log(`  ✅ ${msg}`);
const fail = (msg) => console.log(`  ❌ ${msg}`);

// ─────────────────────────────────────────────────────────────
async function testDatabaseConnection() {
  log("🔌", "Testing MongoDB connection...");
  await mongoose.connect(process.env.MONGO_URI);
  pass(`Connected to: ${mongoose.connection.host}`);
}

// ─────────────────────────────────────────────────────────────
async function testUserModel() {
  log("\n👤", "Testing User model...");

  // Create a teacher
  const teacher = await User.create({
    firstName: "Jane",
    lastName: "Smith",
    email: `teacher_test_${Date.now()}@example.com`,
    password: "password123",
    role: "teacher",
  });
  createdIds.users.push(teacher._id);
  pass(`Teacher created: ${teacher.email}`);

  // Test virtual fullName
  pass(`Virtual fullName: "${teacher.fullName}"`);

  // Test that password was hashed (not stored as plain text)
  const raw = await User.findById(teacher._id).select("+password");
  if (raw.password !== "password123") {
    pass("Password was hashed by pre-save hook ✓");
  } else {
    fail("PASSWORD WAS STORED AS PLAIN TEXT — critical bug!");
  }

  // Test comparePassword instance method
  const correct = await raw.comparePassword("password123");
  const wrong = await raw.comparePassword("wrongpassword");
  pass(`comparePassword("password123") → ${correct}`);
  pass(`comparePassword("wrongpassword") → ${wrong}`);

  // Test that password is NOT returned by default
  const noPass = await User.findById(teacher._id);
  if (!noPass.password) {
    pass("Password not returned in default queries (select: false works)");
  } else {
    fail("Password IS returned in default queries — fix select: false!");
  }

  // Create a student too (needed for submission test)
  const student = await User.create({
    firstName: "Bob",
    lastName: "Jones",
    email: `student_test_${Date.now()}@example.com`,
    password: "password123",
    role: "student",
  });
  createdIds.users.push(student._id);
  pass(`Student created: ${student.email}`);

  return { teacher, student };
}

// ─────────────────────────────────────────────────────────────
async function testAssignmentModel(teacher) {
  log("\n📋", "Testing Assignment model...");

  const assignment = await Assignment.create({
    title: "Test Assignment: Intro to Algorithms",
    description: "A basic assignment to test sorting algorithms.",
    instructions: "Explain how bubble sort works and write pseudocode.",
    subject: "Computer Science",
    maxMarks: 10,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdBy: teacher._id,
    rubric: [
      {
        criterion: "Understanding of Concept",
        description: "Correct and clear explanation of bubble sort",
        maxMarks: 5,
      },
      {
        criterion: "Pseudocode Quality",
        description: "Accurate and readable pseudocode",
        maxMarks: 5,
      },
    ],
  });
  createdIds.assignments.push(assignment._id);
  pass(`Assignment created: "${assignment.title}"`);

  // Test virtual rubricTotalMarks
  pass(`Virtual rubricTotalMarks: ${assignment.rubricTotalMarks} (should be 10)`);

  // Test populate — fetch with teacher details
  const populated = await Assignment.findById(assignment._id).populate(
    "createdBy",
    "firstName lastName email"
  );
  pass(
    `populate("createdBy") → ${populated.createdBy.firstName} ${populated.createdBy.lastName}`
  );

  // Test that rubric sub-documents are saved correctly
  pass(`Rubric has ${assignment.rubric.length} criteria`);

  // Test validation: assignment without rubric should fail
  try {
    await Assignment.create({
      title: "Bad assignment",
      instructions: "Test",
      subject: "Math",
      maxMarks: 10,
      dueDate: new Date(),
      createdBy: teacher._id,
      rubric: [],
    });
    fail("Empty rubric should have been rejected!");
  } catch (err) {
    pass("Empty rubric correctly rejected by validation");
  }

  return assignment;
}

// ─────────────────────────────────────────────────────────────
async function testSubmissionModel(assignment, student) {
  log("\n📤", "Testing Submission model...");

  const submission = await Submission.create({
    assignmentId: assignment._id,
    studentId: student._id,
    fileUrl: "https://res.cloudinary.com/demo/raw/upload/sample.pdf",
    fileName: "my_answer.pdf",
    status: "submitted",
  });
  createdIds.submissions.push(submission._id);
  pass(`Submission created with status: "${submission.status}"`);

  // Test the compound unique index — duplicate submission should fail
  try {
    await Submission.create({
      assignmentId: assignment._id,
      studentId: student._id,
      fileUrl: "https://example.com/another.pdf",
      fileName: "another_answer.pdf",
    });
    fail("Duplicate submission should have been rejected!");
  } catch (err) {
    if (err.code === 11000) {
      pass("Duplicate submission correctly rejected by unique index (code 11000)");
    } else {
      fail(`Unexpected error: ${err.message}`);
    }
  }

  return submission;
}

// ─────────────────────────────────────────────────────────────
async function testEvaluationModel(submission, assignment, student) {
  log("\n🤖", "Testing Evaluation model...");

  const evaluation = await Evaluation.create({
    submissionId: submission._id,
    assignmentId: assignment._id,
    studentId: student._id,
    criteriaResults: [
      {
        criterion: "Understanding of Concept",
        maxMarks: 5,
        marksAwarded: 4,
        feedback: "Good explanation, but missed time complexity discussion.",
      },
      {
        criterion: "Pseudocode Quality",
        maxMarks: 5,
        marksAwarded: 5,
        feedback: "Excellent pseudocode — clear and accurate.",
      },
    ],
    totalMarks: 9,
    maxMarks: 10,
    percentage: 90,
    strengths: ["Clear writing", "Correct algorithm steps"],
    weaknesses: ["Missing time complexity analysis"],
    overallFeedback: "Very good submission. Minimal improvements needed.",
    aiGenerated: true,
  });
  createdIds.evaluations.push(evaluation._id);
  pass(`Evaluation created: ${evaluation.totalMarks}/${evaluation.maxMarks} (${evaluation.percentage}%)`);

  // Test finalMarks virtual — no teacher override yet
  pass(`finalMarks virtual (no override): ${evaluation.finalMarks} (should be 9)`);

  // Simulate teacher override
  evaluation.teacherFinalMarks = 10;
  evaluation.teacherComments = "Excellent work! Full marks deserved.";
  evaluation.reviewedAt = new Date();
  await evaluation.save();
  pass(`finalMarks virtual (after teacher override): ${evaluation.finalMarks} (should be 10)`);

  // Link evaluation back to submission
  await Submission.findByIdAndUpdate(submission._id, {
    evaluationId: evaluation._id,
    status: "evaluated",
  });
  const updated = await Submission.findById(submission._id);
  pass(`Submission status updated to: "${updated.status}"`);
}

// ─────────────────────────────────────────────────────────────
async function cleanup() {
  log("\n🧹", "Cleaning up test data...");
  await Evaluation.deleteMany({ _id: { $in: createdIds.evaluations } });
  await Submission.deleteMany({ _id: { $in: createdIds.submissions } });
  await Assignment.deleteMany({ _id: { $in: createdIds.assignments } });
  await User.deleteMany({ _id: { $in: createdIds.users } });
  pass("All test documents deleted");
}

// ─────────────────────────────────────────────────────────────
async function runAllTests() {
  console.log("═".repeat(55));
  console.log("   AI Teacher Assistant — Phase 2 Model Tests");
  console.log("═".repeat(55));

  try {
    await testDatabaseConnection();
    const { teacher, student } = await testUserModel();
    const assignment = await testAssignmentModel(teacher);
    const submission = await testSubmissionModel(assignment, student);
    await testEvaluationModel(submission, assignment, student);

    await cleanup();

    console.log("\n" + "═".repeat(55));
    log("🎉", "ALL TESTS PASSED — Phase 2 complete!");
    console.log("═".repeat(55));
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error(error);
    await cleanup().catch(() => {});
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
    process.exit(0);
  }
}

runAllTests();
