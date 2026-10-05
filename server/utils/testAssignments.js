// =============================================================
//  server/utils/testAssignments.js — Phase 4 Test Script
//
//  Run with: node --env-file=.env utils/testAssignments.js
//
//  Tests cover:
//  1.  Setup: create teacher A, teacher B, student
//  2.  POST /assignments — teacher creates assignment ✅
//  3.  POST /assignments — rubric total ≠ maxMarks (fail 400)
//  4.  POST /assignments — student tries to create (fail 403)
//  5.  POST /assignments — unauthenticated (fail 401)
//  6.  GET  /assignments — teacher sees own only
//  7.  GET  /assignments — student sees all active
//  8.  GET  /assignments/:id — valid assignment
//  9.  GET  /assignments/:id — bad ID format (fail 404)
//  10. PUT  /assignments/:id — owner updates successfully
//  11. PUT  /assignments/:id — non-owner teacher (fail 403)
//  12. PUT  /assignments/:id — rubric mismatch on update (fail 400)
//  13. DELETE /assignments/:id — non-owner teacher (fail 403)
//  14. DELETE /assignments/:id — owner deletes successfully
//  15. Cleanup
// =============================================================

import http from "http";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import Assignment from "../models/Assignment.js";

dotenv.config();

let passed = 0;
let failed = 0;
const ids = { users: [], assignments: [] };

const check = (label, condition) => {
  if (condition) { console.log(`   ✅ ${label}`); passed++; }
  else           { console.log(`   ❌ ${label}`); failed++; }
};
const log = (emoji, msg) => console.log(`\n${emoji}  ${msg}`);

// ── HTTP helper ───────────────────────────────────────────────
function req(method, path, body = null, cookie = "") {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost", port: 5000, path, method,
      headers: {
        "Content-Type": "application/json",
        ...(cookie && { Cookie: cookie }),
        ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
      },
    };
    const request = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({
        status: res.statusCode,
        body: JSON.parse(data || "{}"),
        cookie: (res.headers["set-cookie"] || []).join("; "),
      }));
    });
    request.on("error", reject);
    if (payload) request.write(payload);
    request.end();
  });
}

// ── Quick login helper ────────────────────────────────────────
async function login(email, password) {
  const r = await req("POST", "/api/auth/login", { email, password });
  return r.cookie;
}

// ── Valid assignment payload ──────────────────────────────────
const validAssignment = () => ({
  title: `Sorting Algorithms — ${Date.now()}`,
  description: "Explain bubble sort and merge sort.",
  instructions: "Write a detailed explanation with examples and pseudocode.",
  subject: "Computer Science",
  maxMarks: 10,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  rubric: [
    { criterion: "Explanation",  description: "Clear explanation", maxMarks: 6 },
    { criterion: "Pseudocode",   description: "Correct pseudocode", maxMarks: 4 },
  ],
});

// ─────────────────────────────────────────────────────────────
async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("═".repeat(60));
  console.log("   AI Teacher Assistant — Phase 4 Assignment Tests");
  console.log("═".repeat(60));

  const ts = Date.now();
  const emailA   = `teacher_a_${ts}@test.com`;
  const emailB   = `teacher_b_${ts}@test.com`;
  const emailStu = `student_${ts}@test.com`;
  const pw = "Password123";

  // ── SETUP: Create test users ──────────────────────────────
  log("⚙️ ", "SETUP: Creating test users");
  const [userA, userB, userStu] = await Promise.all([
    User.create({ firstName: "Alice", lastName: "Teacher", email: emailA, password: pw, role: "teacher" }),
    User.create({ firstName: "Bob",   lastName: "Teacher", email: emailB, password: pw, role: "teacher" }),
    User.create({ firstName: "Carol", lastName: "Student", email: emailStu, password: pw, role: "student" }),
  ]);
  ids.users.push(userA._id, userB._id, userStu._id);
  console.log("   ✅ Teacher A, Teacher B, Student created");

  // Get cookies
  const cookieA   = await login(emailA, pw);
  const cookieB   = await login(emailB, pw);
  const cookieStu = await login(emailStu, pw);

  let assignmentId = "";

  // ── TEST 1: Teacher creates assignment ─────────────────────
  log("📋", "TEST 1: Teacher A creates assignment");
  {
    const r = await req("POST", "/api/assignments", validAssignment(), cookieA);
    check(`Status 201 (got ${r.status})`, r.status === 201);
    check("success: true", r.body.success === true);
    check("assignment returned", !!r.body.assignment?._id);
    check("createdBy populated", !!r.body.assignment?.createdBy?.firstName);
    check("rubric saved (2 criteria)", r.body.assignment?.rubric?.length === 2);
    assignmentId = r.body.assignment?._id;
    if (assignmentId) ids.assignments.push(assignmentId);
  }

  // ── TEST 2: Rubric total ≠ maxMarks ────────────────────────
  log("🚫", "TEST 2: Rubric total ≠ maxMarks (should fail 400)");
  {
    const bad = validAssignment();
    bad.rubric[0].maxMarks = 7; // Total = 11, but maxMarks = 10
    const r = await req("POST", "/api/assignments", bad, cookieA);
    check(`Status 400 (got ${r.status})`, r.status === 400);
    check("Mismatch error message", r.body.message?.includes("must equal maxMarks"));
  }

  // ── TEST 3: Student tries to create ────────────────────────
  log("🚫", "TEST 3: Student tries to create assignment (should fail 403)");
  {
    const r = await req("POST", "/api/assignments", validAssignment(), cookieStu);
    check(`Status 403 (got ${r.status})`, r.status === 403);
    check("Access denied message", r.body.message?.includes("Teachers only"));
  }

  // ── TEST 4: Unauthenticated create ─────────────────────────
  log("🚫", "TEST 4: Unauthenticated create (should fail 401)");
  {
    const r = await req("POST", "/api/assignments", validAssignment());
    check(`Status 401 (got ${r.status})`, r.status === 401);
  }

  // ── TEST 5: Teacher sees own assignments only ───────────────
  log("📋", "TEST 5: Teacher A sees only their assignments");
  {
    const r = await req("GET", "/api/assignments", null, cookieA);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("Teacher gets own assignments", r.body.assignments?.length >= 1);
    const allOwned = r.body.assignments?.every(
      a => a.createdBy?._id === userA._id.toString() ||
           a.createdBy === userA._id.toString()
    );
    check("All returned assignments belong to Teacher A", allOwned);
  }

  // ── TEST 6: Student sees all active assignments ─────────────
  log("📋", "TEST 6: Student sees all active assignments");
  {
    const r = await req("GET", "/api/assignments", null, cookieStu);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("Student can view assignments", r.body.assignments?.length >= 1);
  }

  // ── TEST 7: Get single assignment (valid) ───────────────────
  log("🔍", "TEST 7: Get single assignment by ID");
  {
    const r = await req("GET", `/api/assignments/${assignmentId}`, null, cookieStu);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("Correct assignment returned", r.body.assignment?._id === assignmentId);
    check("Rubric included", Array.isArray(r.body.assignment?.rubric));
  }

  // ── TEST 8: Bad ID format ───────────────────────────────────
  log("🚫", "TEST 8: Bad assignment ID format (should fail 404)");
  {
    const r = await req("GET", "/api/assignments/not-a-valid-id", null, cookieA);
    check(`Status 404 (got ${r.status})`, r.status === 404);
  }

  // ── TEST 9: Owner updates assignment ───────────────────────
  log("✏️ ", "TEST 9: Teacher A updates their own assignment");
  {
    const r = await req("PUT", `/api/assignments/${assignmentId}`,
      { title: "Updated Title", description: "Updated description" },
      cookieA
    );
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("Title updated", r.body.assignment?.title === "Updated Title");
  }

  // ── TEST 10: Non-owner teacher tries to update ──────────────
  log("🚫", "TEST 10: Teacher B tries to update Teacher A's assignment (should fail 403)");
  {
    const r = await req("PUT", `/api/assignments/${assignmentId}`,
      { title: "Hijacked Title" },
      cookieB
    );
    check(`Status 403 (got ${r.status})`, r.status === 403);
    check("Ownership error message", r.body.message?.includes("your own"));
  }

  // ── TEST 11: Rubric mismatch on update ──────────────────────
  log("🚫", "TEST 11: Update with rubric/maxMarks mismatch (should fail 400)");
  {
    const r = await req("PUT", `/api/assignments/${assignmentId}`,
      {
        maxMarks: 20,
        // Rubric still totals 10 — mismatch!
        rubric: [
          { criterion: "Part A", description: "Part A description", maxMarks: 6 },
          { criterion: "Part B", description: "Part B description", maxMarks: 4 },
        ]
      },
      cookieA
    );
    check(`Status 400 (got ${r.status})`, r.status === 400);
    check("Mismatch error caught", r.body.message?.includes("must equal maxMarks"));
  }

  // ── TEST 12: Non-owner tries to delete ──────────────────────
  log("🚫", "TEST 12: Teacher B tries to delete Teacher A's assignment (should fail 403)");
  {
    const r = await req("DELETE", `/api/assignments/${assignmentId}`, null, cookieB);
    check(`Status 403 (got ${r.status})`, r.status === 403);
  }

  // ── TEST 13: Owner deletes their assignment ─────────────────
  log("🗑️ ", "TEST 13: Teacher A deletes their own assignment");
  {
    const r = await req("DELETE", `/api/assignments/${assignmentId}`, null, cookieA);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("success: true", r.body.success === true);
    // Confirm it's actually gone
    const verify = await req("GET", `/api/assignments/${assignmentId}`, null, cookieA);
    check("Assignment no longer accessible (404)", verify.status === 404);
    ids.assignments = ids.assignments.filter(id => id !== assignmentId);
  }

  // ── CLEANUP ───────────────────────────────────────────────
  log("🧹", "Cleanup");
  await Assignment.deleteMany({ _id: { $in: ids.assignments } });
  await User.deleteMany({ _id: { $in: ids.users } });
  console.log("   ✅ All test data deleted");

  // ── SUMMARY ───────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log(`   Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) console.log("🎉  ALL ASSIGNMENT TESTS PASSED — Phase 4 complete!");
  else              console.log(`⚠️   ${failed} test(s) failed — check output above`);
  console.log("═".repeat(60));

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => { console.error("Fatal:", err); process.exit(1); });
