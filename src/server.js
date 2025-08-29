import express from "express";
import cors from "cors";
import { PORT } from "./config/env.js";
import dotenv from "dotenv";
import {connectDB} from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import contestRoutes from "./routes/contestRoutes.js";


dotenv.config();


const app = express();
app.use(express.json());
app.use(cors());

// Connect DB
connectDB();

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/contest", contestRoutes);


app.get("/", (req, res) => res.send("API is running..."));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
