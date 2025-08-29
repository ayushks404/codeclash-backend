// src/routes/submissionRoutes.js
import express from "express";
import { createSubmission, getSubmission } from "../controllers/submissionController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createSubmission);
router.get("/:id", protect, getSubmission);

export default router;
