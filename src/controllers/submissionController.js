

// backend/src/controllers/submissionController.js

import { judge0Client } from "../config/judge0.js";
import Submission from "../models/Submission.js";
import Contest from "../models/Contest.js";
import Question from "../models/Question.js";

/**
 * This function runs the actual judging in the background.
 * It iterates through all test cases for a question.
 */
const processSubmission = async (submissionId) => {
  try {
    const submission = await Submission.findById(submissionId);
    if (!submission) throw new Error("Submission not found for processing");

    const question = await Question.findById(submission.question);
    if (!question || !question.testCases || question.testCases.length === 0) {
      await Submission.findByIdAndUpdate(submissionId, { verdict: 'System Error: No Test Cases' });
      return;
    }

    // Loop through each test case for the question
    for (const testCase of question.testCases) {
      console.log(`\n--- Judging Submission ${submissionId} ---`);
      
      const response = await judge0Client.post("/submissions?base64_encoded=false&wait=true", {
        language_id: Number(submission.language),
        source_code: submission.code,
        stdin: testCase.input,
        // This is the critical line that sends our "answer key" to Judge0
        expected_output: testCase.expectedOutput, 
      });

      const result = response.data;
      
     

      const statusId = result.status.id;
      // Status ID 3 is "Accepted". If it's anything else, the submission has failed.
      if (statusId !== 3) { 
        await Submission.findByIdAndUpdate(submissionId, {
          verdict: result.status.description,
          status: result,
          executionTime: (result.time || 0) * 1000,
        });
        return; // Stop judging immediately on the first failed test case
      }
    }

    // If the loop completes, it means all test cases passed.
    await Submission.findByIdAndUpdate(submissionId, { verdict: 'Accepted' });

  } catch (error) {
    console.error(`Error processing submission ${submissionId}:`, error?.response?.data || error.message);
    await Submission.findByIdAndUpdate(submissionId, { verdict: 'System Error' }).catch(e => console.error("Failed to update submission with error status", e));
  }
};


/**
 * API Endpoint: POST /api/submissions
 */
export const createSubmission = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { language_id, source_code, questionId, contestId } = req.body;
    if (!language_id || !source_code || !questionId || !contestId) {
      return res.status(400).json({ error: "All fields are required" });
    }
    
    const contest = await Contest.findById(contestId).lean();
    if (!contest) return res.status(44).json({ error: "Contest not found." });
    
    const isParticipant = contest.participants.map(p => p.toString()).includes(req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ error: "You must join the contest before submitting." });
    }

    const newSubmission = await Submission.create({
      user: req.user._id,
      question: questionId,
      contest: contestId,
      code: source_code,
      language: String(language_id),
      verdict: "Judging",
    });

    // Start the judging process in the background. Do not wait for it.
    processSubmission(newSubmission._id);

    res.status(202).json({ submissionId: newSubmission._id });

  } catch (err) {
    res.status(500).json({ error: "Server error during submission" });
  }
};


/**
 * API Endpoint: GET /api/submissions/:id
 */
export const getSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id).populate("user", "name email").populate("question", "title");
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    if (!submission.user._id.equals(req.user._id)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: "Error fetching submission" });
  }
};