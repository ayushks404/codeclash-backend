import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { codeReview } from "../services/aiService.js";

const router = express.Router();

router.post("/code-review",protect, codeReview);

export default router;
