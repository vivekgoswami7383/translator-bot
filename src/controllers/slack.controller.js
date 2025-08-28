import { constants } from "../helpers/constants.js";
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { redirectSchema } from "../validations/slack.validations.js";
import {
  oauth,
  openHomePage,
  sendEphemeralMessage,
  sendMessage,
} from "../services/slack.service.js";
import {
  handleBlockActions,
  handleViewSubmission,
  handleTranslation,
  handleAppHomePage,
} from "../handlers/slack.handler.js";
import { skipTranslation, validateLang } from "../helpers/functions.js";
import Setting from "../models/Setting.js";

export const redirect = async (req, res) => {
  try {
    const code = req.query.code;

    const { error } = redirectSchema({ code });
    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const oauthResponse = await oauth({ code });
    if (!oauthResponse.success) {
      return res
        .status(400)
        .json({ success: false, message: oauthResponse.message });
    }

    const organization = {
      team_id: oauthResponse.data.team.id,
      team_name: oauthResponse.data.team.name,
      authed_user_id: oauthResponse.data.authed_user.id,
      bot_access_token: oauthResponse.data.access_token,
    };

    const user = {
      team_id: oauthResponse.data.team.id,
      user_id: oauthResponse.data.authed_user.id,
      access_token: oauthResponse.data.authed_user.access_token,
    };

    await Workspace.findOneAndUpdate(
      { team_id: organization.team_id },
      organization,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await User.findOneAndUpdate({ user_id: user.user_id }, user, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    await sendMessage({
      channel: organization.authed_user_id,
      message: constants.MESSAGES.WELCOME_MESSAGE,
      bot_access_token: organization.bot_access_token,
    });

    return res.redirect(
      `${constants.SLACK.REDIRECT_TO_WORKSPACE}/?workspaceTeamId=${organization.team_id}`
    );
  } catch (error) {
    console.log("ERROR", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const events = async (req, res) => {
  try {
    if (req.body.type === constants.URL_VERIFICATION) {
      return res.json({ challenge: req.body.challenge });
    }

    res.status(200).send();

    const { event, team_id } = req.body;

    console.log(JSON.stringify(req.body));

    const workspace = await Workspace.findOne({ team_id });
    if (!workspace) {
      return res.status(404);
    }

    const botAccessToken = workspace.bot_access_token;

    switch (event.type) {
      case "app_home_opened": {
        const template = await handleAppHomePage();

        await openHomePage({
          user: event.user,
          bot_access_token: botAccessToken,
          template: template,
        });
        break;
      }

      case "message": {
        if (skipTranslation(event)) return;

        const user = await User.findOne({
          team_id: team_id,
          user_id: event.user,
        });

        if (!user) {
          return await sendMessage({
            channel: event.channel,
            message:
              event.channel_type === "im"
                ? constants.MESSAGES.SET_TRANSLATION_MESSAGE
                : constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
            bot_access_token: botAccessToken,
          });
        }

        switch (event.channel_type) {
          case "group":
          case "channel": {
            const setting = await Setting.findOne({
              team_id: team_id,
            });

            if (!setting || !setting.channels.includes(event.channel)) {
              return await sendMessage({
                channel: event.channel,
                message: constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
                bot_access_token: botAccessToken,
              });
            }

            return await handleTranslation(event, user, botAccessToken);
          }

          case "im": {
            return await handleTranslation(event, user, botAccessToken);
          }
        }
        break;
      }

      case "app_mention": {
        await sendMessage({
          channel: event.channel,
          message: constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
          bot_access_token: botAccessToken,
          ts: event.ts,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Events error:", error);
    return res.status(500);
  }
};

export const interactiveEvents = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, team } = payload;

    console.log("-----payload", payload);

    const workspace = await Workspace.findOne({ team_id: team.id });
    if (!workspace) {
      return res.status(404);
    }

    switch (type) {
      case "view_submission":
        await handleViewSubmission(payload, workspace.bot_access_token);
        break;
      case "block_actions":
        await handleBlockActions(payload, workspace.bot_access_token);
        break;
    }

    return res.status(200).send();
  } catch (error) {
    console.error("Interactive events error:", error);
    return res.status(500).send();
  }
};

export const slashCommands = async (req, res) => {
  res.status(200).send();

  try {
    const payload = req.body;

    const { command, text, user_id, team_id, channel_id } = payload;

    const workspace = await Workspace.findOne({ team_id });
    if (!workspace) {
      return res.status(404);
    }

    switch (command) {
      case "/set-translation": {
        const params = Object.fromEntries(
          text.split(" ").map((p) => {
            const [key, value] = p.split(":");
            return [key, value];
          })
        );

        const { primary, target, style } = params;

        if (!primary || !target) {
          await sendEphemeralMessage({
            channel: channel_id,
            user: user_id,
            message:
              "Please provide both `primary:<lang>` and `target:<lang>` codes.\n\nExample: `/set-translation primary:en target:ja style:formal`",
            bot_access_token: workspace.bot_access_token,
          });
          break;
        }

        if (!validateLang(primary)) {
          await sendEphemeralMessage({
            channel: channel_id,
            user: user_id,
            message: `Invalid primary language code: \`${primary}\`. Please use a valid ISO 639-1 code (e.g., \`en\`, \`ja\`).`,
            bot_access_token: workspace.bot_access_token,
          });
          break;
        }

        if (!validateLang(target)) {
          await sendEphemeralMessage({
            channel: channel_id,
            user: user_id,
            message: `Invalid target language code: \`${target}\`. Please use a valid ISO 639-1 code (e.g., \`en\`, \`ja\`).`,
            bot_access_token: workspace.bot_access_token,
          });
          break;
        }

        if (style && !["formal", "causal"].includes(style)) {
          await sendEphemeralMessage({
            channel: channel_id,
            user: user_id,
            message:
              "Invalid style. It should be one of the following: `formal`, `causal`.",
            bot_access_token: workspace.bot_access_token,
          });
          break;
        }

        await User.findOneAndUpdate(
          { team_id, user_id },
          {
            team_id,
            user_id,
            primary_language: primary,
            target_language: target,
            style,
          },
          { upsert: true, new: true }
        );

        await sendEphemeralMessage({
          channel: channel_id,
          user: user_id,
          message: `Your translation have been updated successfully!`,
          bot_access_token: workspace.bot_access_token,
        });
        break;
      }

      case "/translate-toggle": {
        const setting = await Setting.findOneAndUpdate(
          { team_id },
          [
            {
              $set: {
                channels: {
                  $cond: [
                    { $in: [channel_id, "$channels"] },
                    { $setDifference: ["$channels", [channel_id]] },
                    { $concatArrays: ["$channels", [channel_id]] },
                  ],
                },
              },
            },
          ],
          { new: true, upsert: true }
        );

        const status = setting.channels.includes(channel_id)
          ? "enabled"
          : "disabled";

        await sendEphemeralMessage({
          channel: channel_id,
          user: user_id,
          message: `Translation has been ${status} for this channel.`,
          bot_access_token: workspace.bot_access_token,
        });
      }
    }
    return res.status(200).send();
  } catch (error) {
    console.error("SLASH COMMAND ERROR:", error);
    return res.status(500).send();
  }
};
