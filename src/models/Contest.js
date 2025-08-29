// backend/src/models/Contest.js
import mongoose from "mongoose";

const contestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    numQuestions: { type: Number, default: 5 },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    leaderboardSnapshot: { type: mongoose.Schema.Types.Mixed }, // optional snapshot
  },
  { timestamps: true }
);

export default mongoose.model("Contest", contestSchema);
