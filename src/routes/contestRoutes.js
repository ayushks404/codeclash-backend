// src/routes/contestRoutes.js
import express from "express";
import {
  createContest,
  joinContest,
  getContest,
  getContests,
  assignRandomQuestions,
  getLeaderboard,
  getContestQuestions,
  getstatus
} from "../controllers/contestController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createContest);
router.get("/", getContests);
router.post("/:id/join", protect, joinContest);
router.get("/:id", protect, getContest);
router.get("/:id/questions", protect, getContestQuestions);
router.post("/:id/assign-random", protect, assignRandomQuestions);
router.get("/:id/leaderboard", protect, getLeaderboard);
router.get("/:id/status" , protect , getstatus);

export default router;
