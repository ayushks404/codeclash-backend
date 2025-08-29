import dotenv from "dotenv";

dotenv.config(); // Load variables from .env file

export const PORT = process.env.PORT || 4000;
export const MONGO_URI = process.env.MONGO_URI;
export const JUDGE0_API_URL = process.env.JUDGE0_API_URL;
export const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
export const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
