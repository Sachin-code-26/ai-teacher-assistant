// =============================================================
//  server/services/geminiService.js
//
//  Calls the Gemini API to evaluate a student's PDF submission
//  against an assignment's rubric.
//
//  HOW IT WORKS:
//  1. We read the PDF file as a base64 buffer.
//  2. We build a structured prompt containing:
//     - The assignment instructions
//     - The rubric (each criterion + maxMarks)
//     - The PDF as inline data (Gemini supports PDF natively)
//  3. We ask Gemini to return ONLY valid JSON matching our schema.
//  4. We parse and validate the JSON.
//  5. Return the structured evaluation result.
//
//  ERROR HANDLING:
//  If Gemini fails or returns invalid JSON, we throw an error.
//  The submissionController catches this and marks status="failed".
// =============================================================

import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// NOTE: ai client is created inside evaluateSubmission() — not at module level —
// so that process.env.GEMINI_API_KEY is guaranteed to be loaded by dotenv first.

// =============================================================
//  EVALUATE SUBMISSION
//
//  @param {string} filePath   - Absolute path to the temporary PDF
//  @param {object} assignment - The full assignment document from MongoDB
//
//  @returns {object} evaluation result with shape:
//  {
//    criteriaResults: [{ criterion, maxMarks, marksAwarded, feedback }],
//    totalMarks:      number,
//    maxMarks:        number,
//    percentage:      number,
//    strengths:       string[],
//    weaknesses:      string[],
//    overallFeedback: string,
//  }
// =============================================================
export const evaluateSubmission = async (filePath, assignment) => {
  // Create client here so dotenv has already run by the time this is called
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // 1. Read the PDF file as base64
  const pdfBuffer = fs.readFileSync(filePath);
  const pdfBase64 = pdfBuffer.toString("base64");

  // 2. Build the rubric description for the prompt
  const rubricText = assignment.rubric
    .map(
      (c, i) =>
        `${i + 1}. Criterion: "${c.criterion}" — ${c.description} (Max marks: ${c.maxMarks})`
    )
    .join("\n");

  // 3. Build the strict prompt
  const prompt = `
You are an expert academic evaluator. Evaluate the student's PDF submission against the assignment instructions and rubric provided below.

## Assignment Details
**Title:** ${assignment.title}
**Subject:** ${assignment.subject}
**Instructions:** ${assignment.instructions}

## Grading Rubric (Total: ${assignment.maxMarks} marks)
${rubricText}

## Instructions for Evaluation
- Read the student's answer carefully.
- Grade each rubric criterion independently.
- marksAwarded must be between 0 and the criterion's maxMarks (inclusive).
- Provide specific, constructive feedback for each criterion.
- Identify 2–4 overall strengths and 2–4 areas for improvement.
- Write a concise overallFeedback paragraph (2–4 sentences).

## Output Format
Respond with ONLY valid JSON — no markdown fences, no extra text, no explanation. The JSON must exactly match this schema:

{
  "criteriaResults": [
    {
      "criterion": "exact criterion name from rubric",
      "maxMarks": <number>,
      "marksAwarded": <number between 0 and maxMarks>,
      "feedback": "specific feedback for this criterion"
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "weaknesses": ["area for improvement 1", "area for improvement 2"],
  "overallFeedback": "overall evaluation summary paragraph"
}
`.trim();

  // 4. Call Gemini with the PDF inline
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
          { text: prompt },
        ],
      },
    ],
  });

  const rawText = response.text.trim();

  // 5. Parse the JSON response
  let parsed;
  try {
    // Strip markdown code fences if Gemini added them despite instructions
    const jsonText = rawText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(jsonText);
  } catch {
    console.error("❌ Gemini returned non-JSON:", rawText.slice(0, 500));
    throw new Error("AI returned an invalid response. Please try again.");
  }

  // 6. Validate the parsed result
  if (
    !Array.isArray(parsed.criteriaResults) ||
    parsed.criteriaResults.length === 0 ||
    !parsed.overallFeedback
  ) {
    throw new Error("AI response was incomplete. Please try again.");
  }

  // 7. Clamp marks and compute totals
  const criteriaResults = parsed.criteriaResults.map((cr) => {
    // Find the matching rubric item to get the correct maxMarks
    const rubricItem = assignment.rubric.find(
      (r) => r.criterion === cr.criterion
    );
    const max = rubricItem ? rubricItem.maxMarks : cr.maxMarks;
    const awarded = Math.min(Math.max(0, Number(cr.marksAwarded)), max);
    return {
      criterion: cr.criterion,
      maxMarks: max,
      marksAwarded: awarded,
      feedback: cr.feedback || "",
    };
  });

  const totalMarks = criteriaResults.reduce(
    (sum, c) => sum + c.marksAwarded,
    0
  );
  const percentage = Math.round((totalMarks / assignment.maxMarks) * 100);

  return {
    criteriaResults,
    totalMarks,
    maxMarks: assignment.maxMarks,
    percentage,
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
    overallFeedback: parsed.overallFeedback,
  };
};
