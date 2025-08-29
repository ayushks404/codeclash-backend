import { judge0Client } from "../config/judge0.js";

export const executeCode = async (languageId, sourceCode, stdin = "") => {
  try {
    // Step 1: Create a submission
    const submissionRes = await judge0Client.post("/submissions", {
      language_id: languageId,
      source_code: sourceCode,
      stdin: stdin,
    });

    const token = submissionRes.data.token;

    // Step 2: Fetch the result until it's ready
    let result;
    while (true) {
      const res = await judge0Client.get(`/submissions/${token}`);
      if (res.data.status.id <= 2) {
        // Status <= 2 means "In Queue" or "Processing"
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s
        continue;
      }
      result = res.data;
      break;
    }

    return result;
  } catch (error) {
    console.error("Judge0 execution error:", error.message);
    throw new Error("Code execution failed");
  }
};
