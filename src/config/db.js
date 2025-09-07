import mongoose from "mongoose";
import { MONGO_URI } from "./env.js";

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1); // Stop app if DB fails
  }
};


// Add this to the end of your db.js file
mongoose.connection.on('connected', async () => {
  console.log('[Mongo] Debug: Successfully connected to MongoDB.');
  try {
    const questionsCount = await mongoose.connection.db.collection('questions').countDocuments();
    const contestsCount = await mongoose.connection.db.collection('contests').countDocuments();
    console.log(`[Mongo] Debug: Collection counts -> questions=${questionsCount}, contests=${contestsCount}`);
  } catch (err) {
    console.error('[Mongo] Debug: Error counting collections:', err);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('[Mongo] Debug: Connection error:', err);
});