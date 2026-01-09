import { judge0Client } from "../config/judge0.js";

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const executeCode = async (languageId, sourceCode, stdin = "") => {
  try {
    // 1. Submit code
    const submitRes = await judge0Client.post("/submissions", {
      language_id: languageId,
      source_code: sourceCode,
      stdin,
    });

    const token = submitRes.data.token;
    if (!token) {
      throw new Error("Judge0 did not return submission token");
    }

    // 2. Poll with limit
    const MAX_ATTEMPTS = 15;
    let attempt = 0;

    while (attempt < MAX_ATTEMPTS) {
      await sleep(1000);

      const res = await judge0Client.get(`/submissions/${token}`);
      const statusId = res.data?.status?.id;

      
      if (statusId === 1 || statusId === 2) {
        attempt++;
        continue;
      }

      return res.data; // Finished execution
    }

    throw new Error("Execution timed out");

  } catch (err) {
    console.error("Judge0 execution error:", err?.response?.data || err.message);
    throw err;
  }
};
