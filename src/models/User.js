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
      required: true,
    },
    primary_language: {
      type: String,
      optional: true,
    },
    target_language: {
      type: String,
      optional: true,
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
