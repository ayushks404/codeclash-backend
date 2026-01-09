//Routes for login/register

import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
//import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public Routes
router.post("/register", registerUser);
router.post("/login", loginUser);



// Private Route
// router.get("/profile", protect, getProfile);

export default router;


// Why?
// This defines all API endpoints for authentication:

// POST /register → Create account

// POST /login → Authenticate & get token

// GET /profile → Fetch logged-in user details (requires JWT)