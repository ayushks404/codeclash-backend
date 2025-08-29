// backend/scripts/fix_submissions.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Submission from "../src/models/Submission.js";
import Contest from "../src/models/Contest.js";

dotenv.config({ path: "./backend/.env" }); // adjust if your .env is elsewhere

const MONGO = process.env.MONGO_URI || "mongodb://localhost:27017/competitive_platform";

async function main() {
  await mongoose.connect(MONGO, { dbName: "competitive_platform" });
  console.log("Connected to", MONGO);

  const subs = await Submission.find({
    $or: [{ contest: { $exists: false } }, { contest: null }]
  }).lean();

  console.log("Found", subs.length, "submissions with null/missing contest");
  for (const s of subs) {
    const q = s.question;
    const ts = s.submittedAt || new Date();

    // find contests that included this question AND for which timestamp sits inside the contest window
    const candidates = await Contest.find({
      questions: q,
      startTime: { $lte: ts },
      endTime: { $gte: ts }
    }).lean();

    if (candidates.length === 1) {
      await Submission.updateOne({ _id: s._id }, { $set: { contest: candidates[0]._id } });
      console.log(`Fixed submission ${s._id} -> contest ${candidates[0]._id}`);
    } else {
      console.warn(`MANUAL needed for submission ${s._id}. candidates: ${candidates.length}`);
    }
  }

  // Also detect submissions where contest exists but question is not inside contest.questions
  const allSubs = await Submission.find({ contest: { $ne: null } }).lean();
  for (const s of allSubs) {
    const contestDoc = await Contest.findById(s.contest).lean();
    if (!contestDoc) {
      console.warn(`Submission ${s._id} references missing contest ${s.contest}`);
      continue;
    }
    const qids = (contestDoc.questions || []).map(q => String(q));
    if (!qids.includes(String(s.question))) {
      console.warn(`Mismatch: submission ${s._id} question ${s.question} not in contest ${s.contest}`);
      // do not auto-fix here; it needs manual resolution because the question appears in multiple contests
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch(err => {
  console.error("Script error:", err);
  process.exit(1);
});
