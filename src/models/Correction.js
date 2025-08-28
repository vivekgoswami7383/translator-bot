import mongoose from "mongoose";

const correctionSchema = new mongoose.Schema(
  {
    team_id: {
      type: String,
      required: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    original_text: {
      type: String,
      required: true,
    },
    old_translation: {
      type: String,
      required: true,
    },
    new_translation: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: "",
    },
    from_language: {
      type: String,
      required: true,
    },
    to_language: {
      type: String,
      required: true,
    },
    channel_id: {
      type: String,
      required: true,
    },
    message_ts: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

correctionSchema.index({ team_id: 1, original_text: 1 });
correctionSchema.index({ team_id: 1, user_id: 1 });

const Correction = mongoose.model("Correction", correctionSchema);

export default Correction;
