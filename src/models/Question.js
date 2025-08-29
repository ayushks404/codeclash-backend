import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
  examples: [
    {
      input: String,
      output: String,
      explanation: String
    }
  ],
  constraints: [String],
  defaultCode: {
    cpp: String,
    python: String,
    java: String
  },
  testCases: [
    {
      input: String,
      expectedOutput: String
    }
  ]
}, { timestamps: true });

export default mongoose.model("Question", questionSchema);
