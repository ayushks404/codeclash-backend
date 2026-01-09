
// backend/src/controllers/contestController.js

import Contest from "../models/Contest.js";
import Question from "../models/Question.js";
import Submission from "../models/Submission.js";
import User from "../models/User.js";


const assignRandomIfEmpty = async (contest, size = 5) => {
  // If questions are already assigned, do nothing
  if (contest.questions?.length) return;

  // Decide how many questions we need
  const requested = Number(size) || contest.numQuestions || 5;

  // Total questions available in DB
  const totalQuestions = await Question.countDocuments();

  // We cannot assign more than what exists
  const finalCount = Math.min(requested, totalQuestions);

  // If DB has no questions
  if (finalCount === 0) {
   
    return;
  }

  // Pick random questions from DB
  const randomQuestions = await Question.aggregate([
    { $sample: { size: finalCount } }
  ]);

  const questionIds = randomQuestions.map(q => q._id);

  //avoids race conditions, when two users join at same time
  await Contest.updateOne(
    { _id: contest, questions: { $size: 0 } },
    { $set: { questions: questionIds } }
  );
  await contest.save();
};






/*
   GET /contest
   Used on homepage (list view)
    */
export const getContests = async (req, res) => {
  try {
    const contests = await Contest.find({})
      .sort({ startTime: 1 }) // upcoming first
      .lean();

    res.json(contests);
  } catch {
    res.status(500).json({ error: "Failed to fetch contests" });
  }
};






export const getContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate("participants", "name email")
      .select("-questions"); // hide questions

    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    const now = Date.now();
    const start = new Date(contest.startTime).getTime();
    const end = new Date(contest.endTime).getTime();

    let status = "upcoming";
    if (now >= start && now <= end) status = "live";
    else if (now > end) status = "ended";

    res.json({
      contest,
      status,
      serverTime: now
    });

  } catch {
    res.status(500).json({ error: "Failed to load contest" });
  }
};





export const createContest = async (req, res) => {
  try {
    const { name, startTime, endTime, numQuestions = 5 } = req.body;

    if (!name || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const contest = await Contest.create({
      name: name.trim(),
      startTime,
      endTime,
      numQuestions: Number(numQuestions),
      createdBy: req.user._id,
      participants: [req.user._id],
      questions: []
    });

    
    const populatedContest = await contest.populate(
      "questions",
      "title difficulty"
    );

    res.status(201).json(populatedContest);

  } catch {
    res.status(500).json({ error: "Contest creation failed" });
  }
};









export const joinContest = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (Date.now() > new Date(contest.endTime).getTime()) {
      return res.status(403).json({ error: "Contest already ended" });
    }


    // Add user safely (no duplicates)
    contest.participants.addToSet(req.user._id);
    await contest.save();

    await assignRandomIfEmpty(contest, contest.numQuestions);

    // Track joined contests for user
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { joinedContests: contest._id } }
    );

    res.json({ message: "Joined contest successfully" });

  } catch {
    res.status(500).json({ error: "Failed to join contest" });
  }
};






export const assignRandomQuestions = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    // Only creator can reset questions
    if (!contest.createdBy.equals(req.user._id)) {
      return res.status(403).json({ error: "Only contest creator allowed" });
    }

    contest.questions = [];
    await assignRandomIfEmpty(contest, req.body.numQuestions);

    const populated = await contest.populate(
      "questions",
      "title difficulty"
    );

    res.json(populated);

  } catch {
    res.status(500).json({ error: "Failed to reassign questions" });
  }
};







export const getContestQuestions = async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate("questions", "title difficulty description");

    if (!contest) {
      return res.status(404).json({ error: "Contest not found" });
    }

    if (!contest.participants.includes(req.user._id)) {
      return res.status(403).json({
        error: "Join contest to view questions"
      });
    }

    const now = Date.now();
    const start = new Date(contest.startTime).getTime();

    if (now < start) {
      return res.status(403).json({
        error: "Questions not visible before contest starts"
      });
    }

    res.json(contest.questions);

  } catch {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
};






// backend/src/controllers/contestController.js
export const getLeaderboard = async (req, res) => {
  try {
    const contestId = req.params.id;
    const contest = await Contest.findById(contestId)
      .populate("participants", "name email")
      .populate("questions", "difficulty")
      .lean();

    if (!contest) return res.status(404).json({ error: "Contest not found" });

    const now = Date.now();
    const end = new Date(contest.endTime).getTime();
    const contestEnded = end <= now;

    // If contest ended and snapshot already stored -> return snapshot
    if (contestEnded && Array.isArray(contest.leaderboardSnapshot) && contest.leaderboardSnapshot.length > 0) {
      return res.json({ leaderboard: contest.leaderboardSnapshot, snapshot: true });
    }

    // Compute leaderboard (only accepted submissions)
    const SCORE = { Easy: 3, Medium: 5, Hard: 7 };
    const scoreboard = new Map();

    for (const p of contest.participants || []) {
      const idStr = String(p._id);
      scoreboard.set(idStr, { userId: idStr, name: p.name || p.email, score: 0, solvedSet: new Set() });
    }

    const submissions = await Submission.find({ contest: contestId }).lean();

    for (const s of submissions) {
      if (!s.user) continue;
      const u = scoreboard.get(String(s.user));
      if (!u) continue;

      const qId = String(s.question);
      const isAccepted = s.verdict && String(s.verdict).toLowerCase() === "accepted";
      if (isAccepted && !u.solvedSet.has(qId)) {
        u.solvedSet.add(qId);
        u.score += SCORE[(contest.questions.find(q => String(q._id) === qId) || {}).difficulty] || SCORE.Easy;
      }
    }

    const leaderboard = [...scoreboard.values()].map(u => ({
      userId: u.userId,
      name: u.name,
      score: u.score,
      solved: u.solvedSet.size
    })).sort((a,b) => b.score - a.score || b.solved - a.solved);

    // If contest ended and snapshot empty -> save snapshot for future
    if (contestEnded) {
      try {
        await Contest.findByIdAndUpdate(contestId, {
          leaderboardSnapshot: leaderboard,
          leaderboardSnapshotUpdatedAt: new Date()
        });
      } catch (saveErr) {
        // Log but do not block returning leaderboard
        console.error("Failed to save leaderboard snapshot:", saveErr);
      }
    }

    return res.json({ leaderboard, snapshot: false });

  } catch (err) {
    console.error("getLeaderboard error:", err);
    return res.status(500).json({ error: "Failed to generate leaderboard" });
  }
};
