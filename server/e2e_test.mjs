// =============================================================
//  E2E test — uses form-data package for multipart upload
// =============================================================
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import FormData from "form-data";  // node form-data package

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:5000/api";

let teacherCookie = "";
let studentCookie = "";

const log  = (emoji, msg) => console.log(`\n${emoji}  ${msg}`);
const ok   = (msg) => console.log(`   ✅ ${msg}`);
const fail = (msg) => console.log(`   ❌ ${msg}`);
const info = (msg) => console.log(`   ℹ️  ${msg}`);

async function request(method, path, body = null, cookie = "") {
  const opts = {
    method,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = await res.json();
  return { status: res.status, data, headers: res.headers };
}

// ── Create minimal but valid PDF with text ────────────────────
function createTestPdf(filePath) {
  const lines = [
    "Biology Assignment: Photosynthesis",
    "",
    "Photosynthesis is the process used by plants, algae, and cyanobacteria to convert",
    "light energy into chemical energy stored in glucose.",
    "",
    "Chemical Equation: 6CO2 + 6H2O + light energy -> C6H12O6 + 6O2",
    "Carbon dioxide and water are converted into glucose and oxygen using sunlight.",
    "",
    "Stage 1: Light-Dependent Reactions (Thylakoid Membranes)",
    "Chlorophyll absorbs sunlight. Water molecules are split (photolysis) releasing oxygen.",
    "ATP and NADPH are produced. These energy carriers power the next stage.",
    "",
    "Stage 2: Light-Independent Reactions - Calvin Cycle (Stroma)",
    "Carbon dioxide is fixed using the ATP and NADPH from Stage 1.",
    "Through a series of enzyme-driven reactions, glucose is synthesized.",
    "The cycle regenerates RuBP to continue fixing CO2.",
    "",
    "Factors Affecting Rate of Photosynthesis:",
    "1. Light Intensity: Higher light levels increase the rate up to a saturation point.",
    "2. CO2 Concentration: More CO2 available means faster carbon fixation in the Calvin Cycle.",
    "3. Temperature: Enzymes work optimally at 25-35 degrees Celsius for most plants.",
    "4. Water Availability: Stomata close in drought, limiting CO2 intake and slowing photosynthesis.",
    "",
    "Conclusion: Photosynthesis is the foundation of life on Earth, producing oxygen and",
    "organic compounds that support nearly all food chains and ecosystems.",
  ];

  let pageContent = "";
  let y = 750;
  for (const line of lines) {
    const escaped = line.replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    pageContent += `BT /F1 10 Tf 50 ${y} Td (${escaped}) Tj ET\n`;
    y -= 14;
    if (y < 50) break;
  }

  const pdfText = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]
   /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${pageContent.length} >>
stream
${pageContent}endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000${(400 + pageContent.length).toString().padStart(6, "0")} 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${550 + pageContent.length}
%%EOF`;

  fs.writeFileSync(filePath, pdfText);
  return filePath;
}

// ── Multipart upload using form-data package ─────────────────
async function uploadPdf(assignmentId, pdfPath, cookie) {
  const form = new FormData();
  form.append("assignmentId", assignmentId);
  form.append("file", fs.createReadStream(pdfPath), {
    filename: "student_answer.pdf",
    contentType: "application/pdf",
  });

  const res = await fetch(`${BASE_URL}/submissions`, {
    method: "POST",
    headers: { ...form.getHeaders(), Cookie: cookie },
    body: form,
  });
  const data = await res.json();
  return { status: res.status, data };
}

// ── MAIN TEST RUNNER ─────────────────────────────────────────
async function runTests() {
  console.log("=".repeat(60));
  console.log("  AI Teacher Assistant — End-to-End Test");
  console.log("=".repeat(60));

  const ts = Date.now();
  const teacherEmail = `teacher_${ts}@test.com`;
  const studentEmail = `student_${ts}@test.com`;
  const password = "Test@1234";
  let assignmentId = null;
  let submissionId = null;

  // 1. Health
  log("🔧", "STEP 1: Health Check");
  const health = await request("GET", "/health");
  if (health.status === 200) ok(`Server up — ${health.data.message}`);
  else { fail("Server not responding!"); process.exit(1); }

  // 2. Register teacher
  log("👩‍🏫", "STEP 2: Register Teacher");
  const tReg = await request("POST", "/auth/register", { firstName: "Sarah", lastName: "Smith", email: teacherEmail, password, role: "teacher" });
  if (tReg.status === 201) {
    ok(`Teacher registered: ${teacherEmail}`);
    teacherCookie = tReg.headers.get("set-cookie")?.split(";")[0] || "";
    info(`Cookie: ${teacherCookie ? "✓" : "✗"}`);
  } else fail(`Failed: ${JSON.stringify(tReg.data)}`);

  // 3. Register student
  log("👨‍🎓", "STEP 3: Register Student");
  const sReg = await request("POST", "/auth/register", { firstName: "Alex", lastName: "Johnson", email: studentEmail, password, role: "student" });
  if (sReg.status === 201) {
    ok(`Student registered: ${studentEmail}`);
    studentCookie = sReg.headers.get("set-cookie")?.split(";")[0] || "";
    info(`Cookie: ${studentCookie ? "✓" : "✗"}`);
  } else fail(`Failed: ${JSON.stringify(sReg.data)}`);

  // 4. Create assignment
  log("📝", "STEP 4: Teacher Creates Assignment");
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 7);
  const cRes = await request("POST", "/assignments", {
    title: "Explain Photosynthesis",
    description: "Biology assignment on plant energy processes.",
    instructions: "Write a detailed explanation of photosynthesis including: the balanced chemical equation, both stages (light-dependent and Calvin Cycle), and three or more factors affecting the rate.",
    subject: "Biology", maxMarks: 30,
    dueDate: tomorrow.toISOString(),
    rubric: [
      { criterion: "Chemical Equation & Overview", description: "Correct balanced equation and clear overview", maxMarks: 10 },
      { criterion: "Two Stages Explained",         description: "Accurate description of both reaction stages", maxMarks: 12 },
      { criterion: "Factors Affecting Rate",       description: "At least 3 correct factors explained",          maxMarks: 8 },
    ],
  }, teacherCookie);
  if (cRes.status === 201) {
    assignmentId = cRes.data.assignment._id;
    ok(`Assignment created: "${cRes.data.assignment.title}" (ID: ${assignmentId})`);
  } else { fail(`Failed: ${JSON.stringify(cRes.data)}`); process.exit(1); }

  // 5. Student views list
  log("📋", "STEP 5: Student Views Assignment List");
  const listRes = await request("GET", "/assignments", null, studentCookie);
  if (listRes.status === 200) {
    ok(`Sees ${listRes.data.count} assignment(s)`);
    info(listRes.data.assignments.find(a => a._id === assignmentId) ? "New assignment visible ✓" : "Not found ✗");
  } else fail(`Failed: ${JSON.stringify(listRes.data)}`);

  // 6. Student views detail
  log("📄", "STEP 6: Student Views Assignment Detail");
  const dRes = await request("GET", `/assignments/${assignmentId}`, null, studentCookie);
  if (dRes.status === 200) ok(`Loaded: "${dRes.data.assignment.title}" — ${dRes.data.assignment.rubric.length} rubric criteria`);
  else fail(`Failed: ${JSON.stringify(dRes.data)}`);

  // 7. Student uploads PDF
  log("📤", "STEP 7: Student Uploads PDF (AI Grading triggered)");
  const pdfPath = path.join(process.cwd(), `test_sub_${ts}.pdf`);
  createTestPdf(pdfPath);
  info(`Test PDF created (${fs.statSync(pdfPath).size} bytes)`);
  info("Sending to server... Gemini will grade it (15-30 seconds)");

  const upRes = await uploadPdf(assignmentId, pdfPath, studentCookie);
  if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

  if (upRes.status === 201) {
    submissionId = upRes.data.submission._id;
    ok(`Submission accepted! Status: ${upRes.data.submission.status}`);
    if (upRes.data.evaluation) {
      const ev = upRes.data.evaluation;
      ok(`🤖 AI Grading Complete!`);
      info(`Score: ${ev.totalMarks} / ${ev.maxMarks} (${ev.percentage}%)`);
      console.log("\n   📊 Criterion Breakdown:");
      for (const cr of ev.criteriaResults) {
        console.log(`      • ${cr.criterion}: ${cr.marksAwarded}/${cr.maxMarks}`);
        console.log(`        → ${cr.feedback.slice(0, 90)}${cr.feedback.length > 90 ? "..." : ""}`);
      }
      if (ev.strengths?.length) { console.log("\n   💪 Strengths:"); ev.strengths.forEach(s => console.log(`      + ${s}`)); }
      if (ev.weaknesses?.length) { console.log("\n   ⚡ Improve:"); ev.weaknesses.forEach(w => console.log(`      - ${w}`)); }
      console.log(`\n   💬 Overall: ${ev.overallFeedback?.slice(0, 150)}...`);
    } else {
      info(`Status: ${upRes.data.submission.status} — ${upRes.data.message}`);
    }
  } else {
    fail(`Upload returned ${upRes.status}: ${JSON.stringify(upRes.data).slice(0,200)}`);
  }

  // 8. Student views submissions
  log("📜", "STEP 8: Student Views Submission History");
  const myRes = await request("GET", "/submissions/my", null, studentCookie);
  if (myRes.status === 200) {
    ok(`Student has ${myRes.data.count} submission(s)`);
    const sub = myRes.data.submissions[0];
    if (sub?.evaluationId) info(`Score: ${sub.evaluationId.totalMarks}/${sub.evaluationId.maxMarks}`);
  } else fail(`Failed: ${JSON.stringify(myRes.data)}`);

  // 9. Teacher dashboard
  log("👩‍🏫", "STEP 9: Teacher Dashboard — All Submissions");
  const tSubsRes = await request("GET", "/submissions/teacher/all", null, teacherCookie);
  if (tSubsRes.status === 200) ok(`Teacher sees ${tSubsRes.data.count} submission(s)`);
  else fail(`Failed: ${JSON.stringify(tSubsRes.data)}`);

  // 10. Teacher views submission
  log("🔍", "STEP 10: Teacher Views Submission Detail");
  if (submissionId) {
    const sdRes = await request("GET", `/submissions/${submissionId}`, null, teacherCookie);
    if (sdRes.status === 200) {
      const sub = sdRes.data.submission;
      ok(`Teacher views submission by ${sub.studentId?.firstName} — Status: ${sub.status}`);
    } else fail(`Failed: ${JSON.stringify(sdRes.data)}`);
  } else info("Skipped — no submission ID");

  // 11. Teacher override
  log("✏️", "STEP 11: Teacher Overrides Grade");
  if (submissionId) {
    const revRes = await request("PATCH", `/submissions/${submissionId}/review`, {
      teacherFinalMarks: 27,
      teacherComments: "Excellent work! Very thorough. Minor deduction for not mentioning chlorophyll detail.",
    }, teacherCookie);
    if (revRes.status === 200) {
      const ev = revRes.data.evaluation;
      ok(`Override saved! AI: ${ev.totalMarks}/${ev.maxMarks} → Teacher: ${ev.teacherFinalMarks}/${ev.maxMarks}`);
      info(`Comment: "${ev.teacherComments}"`);
    } else fail(`Failed: ${JSON.stringify(revRes.data)}`);
  } else info("Skipped — no evaluated submission");

  // 12. Security
  log("🔒", "STEP 12: Security Checks");
  const sec1 = await request("POST", "/assignments", { title: "x", subject: "x", instructions: "x", maxMarks: 10, dueDate: new Date().toISOString(), rubric: [{ criterion: "x", description: "x", maxMarks: 10 }] }, studentCookie);
  ok(`Student blocked from teacher route: ${sec1.status === 403 ? "✅ 403 Forbidden" : "❌ " + sec1.status}`);
  const sec2 = await request("GET", "/submissions/my", null, teacherCookie);
  ok(`Teacher blocked from student route: ${sec2.status === 403 ? "✅ 403 Forbidden" : "❌ " + sec2.status}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  ✅ ALL TESTS COMPLETE!");
  console.log("=".repeat(60));
  console.log(`\n  🌐 Frontend: http://localhost:5174`);
  console.log(`  📡 Backend:  http://localhost:5000`);
  console.log(`\n  Test accounts (log in at http://localhost:5174):`);
  console.log(`  👩‍🏫 Teacher: ${teacherEmail} / ${password}`);
  console.log(`  👨‍🎓 Student: ${studentEmail} / ${password}\n`);
}

runTests().catch(e => { console.error("Unexpected error:", e); process.exit(1); });
