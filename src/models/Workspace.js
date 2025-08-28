import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    team_id: {
      type: String,
      required: true,
      unique: true,
    },
    team_name: {
      type: String,
      required: true,
    },
    authed_user_id: {
      type: String,
      required: true,
    },
    bot_access_token: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

const Workspace = mongoose.model("Workspace", workspaceSchema);

export default Workspace;
