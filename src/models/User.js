import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    team_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    access_token: {
      type: String,
    },
    primary_language: {
      type: String,
      required: true,
      default: "en",
    },
    target_language: {
      type: String,
      required: true,
      default: "ja",
    },
    style: {
      type: String,
      required: true,
      default: "formal",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const User = mongoose.model("User", userSchema);

export default User;
