// backend/src/models/Submission.js
import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
    contest: { type: mongoose.Schema.Types.ObjectId, ref: "Contest" },
    code: { type: String, required: true },
    language: { type: String, required: true },
    verdict: { type: String, default: "Pending" },
    executionTime: { type: Number }, // milliseconds
    judgeToken: { type: String },
    status: { type: mongoose.Schema.Types.Mixed },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

export default mongoose.model("Submission", submissionSchema);
