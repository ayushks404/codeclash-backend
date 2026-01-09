import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {connectDB} from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import contestRoutes from "./routes/contestRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";

dotenv.config();



const app = express();
app.use(express.json());
app.use(cors());


connectDB();



app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/contest", contestRoutes);
app.use("/api/ai", aiRoutes);


app.get("/", (req, res) => res.send("API is running..."));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
