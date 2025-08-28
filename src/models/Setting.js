import mongoose from "mongoose";

const settingSchema = new mongoose.Schema(
  {
    team_id: {
      type: String,
      required: true,
    },
    channels: {
      type: Array,
      default: [],
    },
    glossary: {
      terms: {
        type: Array,
        default: [],
      },
      mapping: {
        type: Array,
        default: [],
      },
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

settingSchema.index({ team_id: 1 }, { unique: true });

const Setting = mongoose.model("Settings", settingSchema);

export default Setting;
