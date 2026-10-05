// =============================================================
//  server/utils/testAuth.js  — Phase 3 Auth Test Script
//
//  Run with: node --env-file=.env utils/testAuth.js
//
//  Tests:
//  1.  POST /api/auth/register — teacher
//  2.  POST /api/auth/register — student
//  3.  POST /api/auth/register — duplicate email (should fail 409)
//  4.  POST /api/auth/register — missing fields (should fail 400)
//  5.  POST /api/auth/login    — correct credentials
//  6.  POST /api/auth/login    — wrong password (should fail 401)
//  7.  POST /api/auth/login    — non-existent email (should fail 401)
//  8.  GET  /api/auth/me       — with valid cookie
//  9.  GET  /api/auth/me       — without cookie (should fail 401)
//  10. GET  /api/auth/me       — student role check
//  11. POST /api/auth/logout   — clears cookie
//  12. GET  /api/auth/me       — after logout (should fail 401)
//  13. Cleanup test users
// =============================================================

import http from "http";
import https from "https";
import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";

dotenv.config();

const BASE_URL = "http://localhost:5000";
let cookieJar = ""; // Store cookies between requests

const log  = (emoji, msg) => console.log(`${emoji}  ${msg}`);
const pass = (msg) => console.log(`   ✅ ${msg}`);
const fail = (msg) => console.log(`   ❌ ${msg}`);

// ─────────────────────────────────────────────────────────────
//  Minimal HTTP client (no axios — pure Node.js http module)
//  Returns { status, body, cookies }
// ─────────────────────────────────────────────────────────────
function request(method, path, body = null, cookies = "") {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "localhost",
      port: 5000,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(cookies && { Cookie: cookies }),
        ...(payload && { "Content-Length": Buffer.byteLength(payload) }),
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const setCookie = res.headers["set-cookie"] || [];
        resolve({
          status: res.statusCode,
          body: JSON.parse(data || "{}"),
          cookies: setCookie.join("; "),
          rawHeaders: res.headers,
        });
      });
    });

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ─────────────────────────────────────────────────────────────
async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);

  const testEmail_teacher = `teacher_auth_${Date.now()}@test.com`;
  const testEmail_student = `student_auth_${Date.now()}@test.com`;
  const testPassword = "securePass123";

  console.log("═".repeat(58));
  console.log("   AI Teacher Assistant — Phase 3 Auth Tests");
  console.log("═".repeat(58));

  let teacherCookie = "";
  let studentCookie = "";
  let passed = 0;
  let failed = 0;

  const check = (label, condition) => {
    if (condition) { pass(label); passed++; }
    else           { fail(label); failed++; }
  };

  // ── TEST 1: Register Teacher ─────────────────────────────
  log("\n📝", "TEST 1: Register as teacher");
  {
    const r = await request("POST", "/api/auth/register", {
      firstName: "Jane", lastName: "Teacher",
      email: testEmail_teacher, password: testPassword, role: "teacher",
    });
    check(`Status 201 (got ${r.status})`, r.status === 201);
    check("success: true", r.body.success === true);
    check("user.role = teacher", r.body.user?.role === "teacher");
    check("no password in response", !r.body.user?.password);
    check("cookie set", r.cookies.includes("token="));
    teacherCookie = r.cookies;
  }

  // ── TEST 2: Register Student ─────────────────────────────
  log("\n📝", "TEST 2: Register as student");
  {
    const r = await request("POST", "/api/auth/register", {
      firstName: "Bob", lastName: "Student",
      email: testEmail_student, password: testPassword, role: "student",
    });
    check(`Status 201 (got ${r.status})`, r.status === 201);
    check("user.role = student", r.body.user?.role === "student");
    check("fullName virtual", r.body.user?.fullName === "Bob Student");
    studentCookie = r.cookies;
  }

  // ── TEST 3: Duplicate Email ──────────────────────────────
  log("\n🚫", "TEST 3: Duplicate email (should fail 409)");
  {
    const r = await request("POST", "/api/auth/register", {
      firstName: "Jane", lastName: "Dupe",
      email: testEmail_teacher, password: testPassword,
    });
    check(`Status 409 (got ${r.status})`, r.status === 409);
    check("success: false", r.body.success === false);
  }

  // ── TEST 4: Missing Fields ───────────────────────────────
  log("\n🚫", "TEST 4: Missing fields (should fail 400)");
  {
    const r = await request("POST", "/api/auth/register", {
      email: "incomplete@test.com",
    });
    check(`Status 400 (got ${r.status})`, r.status === 400);
    check("success: false", r.body.success === false);
  }

  // ── TEST 5: Login Correct ────────────────────────────────
  log("\n🔑", "TEST 5: Login with correct credentials");
  {
    const r = await request("POST", "/api/auth/login", {
      email: testEmail_teacher, password: testPassword,
    });
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("success: true", r.body.success === true);
    check("user returned", !!r.body.user);
    check("no password in response", !r.body.user?.password);
    check("cookie set on login", r.cookies.includes("token="));
    teacherCookie = r.cookies; // Refresh cookie
  }

  // ── TEST 6: Login Wrong Password ─────────────────────────
  log("\n🚫", "TEST 6: Login with wrong password (should fail 401)");
  {
    const r = await request("POST", "/api/auth/login", {
      email: testEmail_teacher, password: "wrongPassword999",
    });
    check(`Status 401 (got ${r.status})`, r.status === 401);
    check("Generic error message (no email hints)", 
      r.body.message === "Invalid email or password.");
  }

  // ── TEST 7: Login Non-existent Email ─────────────────────
  log("\n🚫", "TEST 7: Login with non-existent email (should fail 401)");
  {
    const r = await request("POST", "/api/auth/login", {
      email: "nobody@nowhere.com", password: testPassword,
    });
    check(`Status 401 (got ${r.status})`, r.status === 401);
    check("Same generic message (prevents email enumeration)",
      r.body.message === "Invalid email or password.");
  }

  // ── TEST 8: GET /me with valid cookie ────────────────────
  log("\n👤", "TEST 8: GET /api/auth/me with valid cookie");
  {
    const r = await request("GET", "/api/auth/me", null, teacherCookie);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("success: true", r.body.success === true);
    check("Returns teacher user", r.body.user?.role === "teacher");
    check("Has email", r.body.user?.email === testEmail_teacher);
  }

  // ── TEST 9: GET /me without cookie ───────────────────────
  log("\n🚫", "TEST 9: GET /api/auth/me without cookie (should fail 401)");
  {
    const r = await request("GET", "/api/auth/me"); // no cookie
    check(`Status 401 (got ${r.status})`, r.status === 401);
    check("success: false", r.body.success === false);
  }

  // ── TEST 10: Student role check ──────────────────────────
  log("\n👤", "TEST 10: GET /api/auth/me as student");
  {
    const r = await request("GET", "/api/auth/me", null, studentCookie);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("Returns student role", r.body.user?.role === "student");
  }

  // ── TEST 11: Logout ──────────────────────────────────────
  log("\n🚪", "TEST 11: Logout");
  {
    const r = await request("POST", "/api/auth/logout", null, teacherCookie);
    check(`Status 200 (got ${r.status})`, r.status === 200);
    check("success: true", r.body.success === true);
    // After logout, the cookie should be cleared (empty value or expired)
    const cookieCleared = r.cookies.includes("token=;") || 
                          r.cookies.includes("token=,") ||
                          r.cookies.includes("Expires=Thu, 01 Jan 1970") ||
                          r.cookies.includes("expires=Thu, 01 Jan 1970");
    check("Token cookie cleared", cookieCleared);
    // Use the cleared cookie for next test
    teacherCookie = r.cookies;
  }

  // ── TEST 12: GET /me after logout ────────────────────────
  log("\n🚫", "TEST 12: GET /api/auth/me after logout (should fail 401)");
  {
    const r = await request("GET", "/api/auth/me", null, teacherCookie);
    check(`Status 401 (got ${r.status})`, r.status === 401);
    check("Cannot access protected route after logout", r.body.success === false);
  }

  // ── CLEANUP ──────────────────────────────────────────────
  log("\n🧹", "Cleaning up test users...");
  await User.deleteMany({
    email: { $in: [testEmail_teacher, testEmail_student] },
  });
  pass("Test users deleted");

  // ── SUMMARY ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(58));
  console.log(`   Results: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    log("🎉", "ALL AUTH TESTS PASSED — Phase 3 complete!");
  } else {
    log("⚠️ ", `${failed} test(s) failed — check output above`);
  }
  console.log("═".repeat(58));

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
