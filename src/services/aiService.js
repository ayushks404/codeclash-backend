import axios from "axios";

export const codeReview = async (req, res) => {
  try {
    const { code, language, problem } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    const prompt = `
You are a senior competitive programming reviewer and give review in a frinedly and give real criticism .

Analyze the following solution and respond with:
1. Logical bugs
2. Time & space complexity
3. Optimization ideas
4. Clean code suggestions

Language: ${language}

Problem:
${problem}

Code:
${code}
`;

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 600
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "CodeClash"
        },
        timeout: 30000
      }
    );

    const review =
      response.data?.choices?.[0]?.message?.content ||
      "AI did not return a review.";

    res.json({ review });

  } catch (err) {
    console.error("OpenRouter AI error:", err?.response?.data || err.message);
    res.status(500).json({ error: "AI review failed" });
  }
};
