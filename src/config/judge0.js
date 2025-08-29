import axios from "axios";
import { JUDGE0_API_URL, JUDGE0_API_KEY } from "./env.js";
import dotenv from "dotenv";


dotenv.config();


export const judge0Client = axios.create({
  baseURL: JUDGE0_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-RapidAPI-Key": JUDGE0_API_KEY, // For RapidAPI users
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  },
});
