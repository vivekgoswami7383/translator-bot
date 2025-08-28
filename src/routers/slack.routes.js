import express from "express";
import {
  redirect,
  slashCommands,
  interactiveEvents,
  events,
} from "../controllers/slack.controller.js";

const router = express.Router();

router.get("/redirect", redirect);
router.post("/events", events);
router.post("/interactive-events", interactiveEvents);
router.post("/slash-commands", slashCommands);

export default router;
