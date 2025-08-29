// src/routes/questionRoutes.js
import express from "express";
import { addQuestion, getQuestions, getQuestionById } from "../controllers/questionController.js";
import { protect } from "../middleware/authMiddleware.js";
import { adminOnly } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post("/", protect, adminOnly, addQuestion);
router.get("/", getQuestions);
router.get("/:id", getQuestionById);

export default router;
