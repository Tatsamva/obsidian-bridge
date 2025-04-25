import dotenv from "dotenv";
import { app } from "./app.js";
import connectDB from "./db/index.js";
import { registerCommands } from "./setup/registerCommands.js"; // adjust path accordingly

dotenv.config({ path: "./env" });

connectDB()
  .then(async () => {
    await registerCommands(); // 👈 Automatically register slash commands
    app.listen(process.env.PORT, () => {
      console.log("✅ Server is running on port:", process.env.PORT);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed:", err);
  });
