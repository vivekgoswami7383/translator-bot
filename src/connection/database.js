import mongoose from "mongoose";
import { constants } from "../helpers/constants.js";

export default async function databaseConnection() {
  try {
    await mongoose.connect(constants.AUTHENTICATION.DATABASE.URL);
  } catch (error) {
    console.error("Error connecting to database: ", error);
    process.exit(1);
  }
}
