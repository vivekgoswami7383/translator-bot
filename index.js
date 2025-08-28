import express from "express";
import { constants } from "./src/helpers/constants.js";
import databaseConnection from "./src/connection/database.js";

const app = express();
const port = constants.AUTHENTICATION.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import slackRouter from "./src/routers/slack.routes.js";

app.use("/slack", slackRouter);

app.get("/health", (req, res) => {
  return res.status(200).send("Server is up!");
});

databaseConnection()
  .then(async () => {
    app.listen(port, async () => {
      console.log(`Server running on port ${port}`);
      console.log("✅ Connected to database");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });
