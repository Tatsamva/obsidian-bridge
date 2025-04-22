import mongoose from "mongoose";

// Define a simple Achievement schema
const achievementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  earnedAt: { type: Date, default: Date.now },
  description: { type: String }
}, { _id: false });

// Define the MineUser schema (NO TTL)
const mineUserSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  uuid: { type: String, required: true },
  discordId: { type: String, required: false }, // initially null until linked
  achievements: [achievementSchema],
  createdAt: { type: Date, default: Date.now } // Just a timestamp now, no auto-delete
});

export const MineUser = mongoose.model("MineUser", mineUserSchema);