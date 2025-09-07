
// backend/src/controllers/contestController.js

import Contest from "../models/Contest.js";
import Question from "../models/Question.js";
import Submission from "../models/Submission.js";
import User from "../models/User.js";

// Helper: assign random questions
// const assignRandomIfEmpty = async (contest, size = 5) => {
//     const requested = Number(size) || Number(contest.numQuestions) || 5;
//     const total = await Question.countDocuments();
//     const finalSize = Math.min(requested, total);
//     if (contest.questions && contest.questions.length >= finalSize) return;
//     const sample = await Question.aggregate([{ $sample: { size: finalSize } }]);
//     contest.questions = sample.map((q) => q._id);
//     await contest.save();
// };


const assignRandomIfEmpty = async (contest, size = 5) => {
  const requested = Number(size) || Number(contest.numQuestions) || 5;
  const total = await Question.countDocuments();
  const finalSize = Math.min(requested, total);

  console.log(`[assignRandomIfEmpty] Debug: requested=${requested}, totalInDB=${total}, finalSize=${finalSize}`);

  if (contest.questions && contest.questions.length >= finalSize) {
    console.log('[assignRandomIfEmpty] Debug: Contest already has enough questions:', contest.questions.length);
    return;
  }

  if (finalSize === 0) {
    console.warn('[assignRandomIfEmpty] Debug: finalSize is 0. No questions available in DB to assign.');
    contest.questions = [];
    await contest.save();
    return;
  }

  const sample = await Question.aggregate([{ $sample: { size: finalSize } }]);
  console.log(`[assignRandomIfEmpty] Debug: Sampled ${sample.length} questions from DB.`);
  contest.questions = sample.map((q) => q._id);
  await contest.save();
  console.log(`[assignRandomIfEmpty] Debug: Saved contest ${contest._id} with ${contest.questions.length} questions.`);
};






export const getContests = async (req, res) => {
    try {
        const contests = await Contest.find({}).sort({ startTime: 1 }).lean();
        return res.status(200).json(contests);
    } catch (err) {
        return res.status(500).json({ error: err.message || "Server error" });
    }
};

// export const getContest = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const contest = await Contest.findById(id);
//         if (!contest) return res.status(404).json({ error: "Contest not found" });

//         const now = Date.now();
//         const start = new Date(contest.startTime).getTime();
//         const end = new Date(contest.endTime).getTime();

//         let status = "upcoming";
//         if (now >= start && now <= end) status = "live";
//         else if (now > end) status = "ended";

//         if (status === "live" && (!contest.questions || contest.questions.length === 0)) {
//             await assignRandomIfEmpty(contest, contest.numQuestions || 5);
//         }

//         const populated = await Contest.findById(id)
//             .populate("questions", "title difficulty description")
//             .populate("participants", "name email");

//         return res.json({ contest: populated, status, serverTime: now });
//     } catch (e) {
//         return res.status(500).json({ error: e.message });
//     }
// };



export const getContest = async (req, res) => {
    try {
        const { id } = req.params;
        // Fetch the contest document just once
        const contest = await Contest.findById(id);

        if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
        }

        const now = Date.now();
        const start = new Date(contest.startTime).getTime();
        const end = new Date(contest.endTime).getTime();

        let status = "upcoming";
        if (now >= start && now <= end) status = "live";
        else if (now > end) status = "ended";

        // Check if questions need to be assigned
        if (status === "live" && (!contest.questions || contest.questions.length === 0)) {
            // This helper function saves the contest after adding questions
            await assignRandomIfEmpty(contest, contest.numQuestions || 5);
        }

        // Now, populate the fields on the *same contest object* we've been working with
        const populatedContest = await contest.populate([
            { path: "questions", select: "title difficulty description" },
            { path: "participants", select: "name email" }
        ]);

        return res.json({ contest: populatedContest, status, serverTime: now });

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};




// export const createContest = async (req, res) => {
//     try {
//         const { name, startTime, endTime, numQuestions = 5 } = req.body;
//         if (!name || !startTime || !endTime) {
//             return res.status(400).json({ error: "name, startTime, endTime are required" });
//         }
//         const contest = await Contest.create({
//             name: name.trim(),
//             startTime: new Date(startTime),
//             endTime: new Date(endTime),
//             createdBy: req.user._id,
//             participants: [req.user._id], // Creator is the first participant
//             numQuestions: Number(numQuestions) || 5,
//         });
//         await assignRandomIfEmpty(contest, Number(numQuestions) || 5);
//         const populated = await Contest.findById(contest._id).populate("questions", "title difficulty");
//         return res.status(201).json(populated);
//     } catch (e) {
//         return res.status(500).json({ error: e.message });
//     }
// };



export const createContest = async (req, res) => {
    try {
        const { name, startTime, endTime, numQuestions = 5 } = req.body;
        if (!name || !startTime || !endTime) {
            return res.status(400).json({ error: "name, startTime, endTime are required" });
        }
        const contest = await Contest.create({
            name: name.trim(),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            createdBy: req.user._id,
            participants: [req.user._id],
            numQuestions: Number(numQuestions) || 5,
        });

        // This function saves the contest after adding questions
        await assignRandomIfEmpty(contest, Number(numQuestions) || 5);
        
        // NOW, populate the contest object we already have in memory
        const populatedContest = await contest.populate({
            path: "questions",
            select: "title difficulty"
        });

        return res.status(201).json(populatedContest);

    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};




export const joinContest = async (req, res) => {
    try {
        if (!req.user || !req.user._id) return res.status(401).json({ error: "Authentication required" });
        const contestId = req.params.id;
        const userId = req.user._id;
        const contest = await Contest.findByIdAndUpdate(
            contestId,
            { $addToSet: { participants: userId } },
            { new: true }
        );
        if (!contest) return res.status(404).json({ error: "Contest not found" });
        await User.updateOne({ _id: userId }, { $addToSet: { joinedContests: contestId } });
        return res.json({ message: "Joined contest", contest });
    } catch (err) {
        return res.status(500).json({ error: "Server error while joining contest" });
    }
};







// --- ADDING THIS FUNCTION BACK ---
export const assignRandomQuestions = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) return res.status(404).json({ error: "Contest not found" });

        if (!contest.createdBy.equals(req.user._id)) {
            return res.status(403).json({ error: "Only contest creator can reassign" });
        }

        const numQuestions = Number(req.body.numQuestions) || contest.numQuestions || 5;
        await assignRandomIfEmpty(contest, numQuestions);
        const populated = await Contest.findById(contest._id).populate("questions", "title difficulty");
        return res.json(populated);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
};










// --- ADDING THIS FUNCTION BACK ---
export const getContestQuestions = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id).populate("questions");
        if (!contest) return res.status(404).json({ error: "Contest not found" });

        if (!contest.questions || contest.questions.length === 0) {
            await assignRandomIfEmpty(contest, contest.numQuestions || 5);
            await contest.populate("questions");
        }

        const count = Number(contest.numQuestions) || 5;
        return res.json((contest.questions || []).slice(0, count));
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// --- FINAL, VERIFIED LEADERBOARD FUNCTION WITH DEBUG LOGGING ---
export const getLeaderboard = async (req, res) => {
    console.log('\n--- Generating Leaderboard ---');
    try {
        const contestId = req.params.id;
        const contest = await Contest.findById(contestId)
            .populate("participants", "name email")
            .populate("questions", "difficulty")
            .lean();

        if (!contest) {
            return res.status(404).json({ error: "Contest not found" });
        }
        
        const scoreboard = new Map();
        console.log('Step 1: Initializing scoreboard from contest participants...');
        for (const participant of contest.participants || []) {
            const participantId = String(participant._id);
            scoreboard.set(participantId, {
                userId: participantId,
                name: participant.name || participant.email,
                score: 0,
                solved: 0,
                attempts: 0,
                solvedSet: new Set(),
            });
        }
        console.log(`Initialized with ${scoreboard.size} participants.`);

        const questionDifficultyMap = new Map(
            (contest.questions || []).map(q => [String(q._id), q.difficulty || "Easy"])
        );
        const SCORE_BY_DIFFICULTY = { Easy: 3, Medium: 5, Hard: 7 };
        
        const submissions = await Submission.find({ contest: contestId }).lean();
        console.log(`Step 2: Found ${submissions.length} total submissions for this contest.`);

        console.log('Step 3: Processing each submission...');
        for (const submission of submissions) {
            if (!submission.user) continue;

            const userId = String(submission.user);
            
            if (!scoreboard.has(userId)) {
                console.log(`  - Skipping submission from user ${userId} because they are not in the contest's participant list.`);
                continue;
            }

            const userEntry = scoreboard.get(userId);
            userEntry.attempts += 1;

            const questionId = String(submission.question);
            const isAccepted = (submission.verdict && String(submission.verdict).toLowerCase() === "accepted");

            console.log(`  - Processing submission from user: ${userEntry.name} (${userId}). Verdict: ${submission.verdict}`);

            if (isAccepted && !userEntry.solvedSet.has(questionId)) {
                userEntry.solvedSet.add(questionId);
                userEntry.solved += 1;
                
                const difficulty = questionDifficultyMap.get(questionId) || "Easy";
                const points = SCORE_BY_DIFFICULTY[difficulty] || 3;
                userEntry.score += points;
                console.log(`    -> CORRECT! User ${userEntry.name} solved a new problem. New score: ${userEntry.score}`);
            }
        }

        const leaderboard = Array.from(scoreboard.values()).map(entry => ({
            userId: entry.userId,
            name: entry.name,
            score: entry.score,
            solved: entry.solved,
        }));

        leaderboard.sort((a, b) => b.score - a.score || b.solved - a.solved);

        console.log('Step 4: Final generated leaderboard data:', leaderboard);
        console.log('--- Leaderboard Generation Complete ---\n');

        return res.json({ leaderboard });

    } catch (err) {
        console.error("getLeaderboard error:", err);
        return res.status(500).json({ error: err.message || "Server error" });
    }
};