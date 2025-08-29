import bcrypt from "bcryptjs";

const run = async () => {
  const hashed = await bcrypt.hash("admin123", 10);
  console.log("Hashed password:", hashed);
};

run();
