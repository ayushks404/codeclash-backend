// backend/scripts/createAdmin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = process.argv[2];
    const pwd = process.argv[3] || "admin123";

    if (!email) {
      console.log("Usage: node scripts/createAdmin.js <email> [password]");
      process.exit(1);
    }

    let user = await User.findOne({ email });

    if (!user) {
      const hash = await bcrypt.hash(pwd, 10);
      user = new User({
        name: email.split("@")[0],
        email,
        passwordHash: hash,
        role: "admin",
        isAdmin: true,
      });
      await user.save();
      console.log("✅ Admin user created:", user.email);
    } else {
      user.isAdmin = true;
      user.role = "admin";
      if (pwd) {
        user.passwordHash = await bcrypt.hash(pwd, 10);
      }
      await user.save();
      console.log("✅ User promoted to admin:", user.email);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
};

run();
