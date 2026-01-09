import axios from "axios";
import dotenv from "dotenv";


dotenv.config();


export const judge0Client = axios.create({
  
  baseURL: process.env.JUDGE0_API_URL,
  headers: {
    "Content-Type": "application/json",
    "X-RapidAPI-Key":  process.env.JUDGE0_API_KEY,
    "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
  },
});
