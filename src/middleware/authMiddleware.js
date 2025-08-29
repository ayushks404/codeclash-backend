// src/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/env.js";

export const protect = async(req, res, next) => {
    try {
        const header = req.headers.authorization || req.cookies ?.token;
        if (!header) return res.status(401).json({ error: "Not authenticated" });

        const token = header.startsWith("Bearer ") ? header.split(" ")[1] : header;
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) return res.status(401).json({ error: "User not found" });

        req.user = user;
        next();
    } catch (e) {
        console.error("auth error:", e.message);
        return res.status(401).json({ error: "Not authorized" });
    }
};