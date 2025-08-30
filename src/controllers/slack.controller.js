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
    const { code } = req.query;
    const { error } = redirectSchema({ code });
    if (error)
      return res.status(400).json({ success: false, message: error.message });

    const oauthResponse = await oauth({ code });
    if (!oauthResponse.success) {
      return res
        .status(400)
        .json({ success: false, message: oauthResponse.message });
    }

    const { team, authed_user, access_token, bot_user_id } = oauthResponse.data;

    console.log("oauthResponse", oauthResponse.data);

    const organization = {
      team_id: team.id,
      team_name: team.name,
      bot_user_id: bot_user_id,
      authed_user_id: authed_user.id,
      bot_access_token: access_token,
    };

    const user = {
      team_id: team.id,
      user_id: authed_user.id,
      access_token: authed_user.access_token,
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
    console.error("Redirect error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const events = async (req, res) => {
  try {
    const { type, event, team_id, challenge } = req.body;

    if (type === constants.URL_VERIFICATION) {
      return res.json({ challenge });
    }

    res.sendStatus(200);

    const workspace = await Workspace.findOne({ team_id });
    if (!workspace) return;

    const botAccessToken = workspace.bot_access_token;

    switch (event.type) {
      case "app_home_opened": {
        const template = await handleAppHomePage();
        await openHomePage({
          user: event.user,
          bot_access_token: botAccessToken,
          template,
        });
        break;
      }

      case "message": {
        if (skipTranslation(event, workspace.bot_user_id)) return;

        const user = await User.findOne({ team_id, user_id: event.user });

        if (!user) {
          return sendMessage({
            channel: event.channel,
            message:
              event.channel_type === "im"
                ? constants.MESSAGES.SET_TRANSLATION_MESSAGE
                : constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
            bot_access_token: botAccessToken,
          });
        }

        if (["group", "channel"].includes(event.channel_type)) {
          const setting = await Setting.findOne({ team_id });
          if (!setting || !setting.channels.includes(event.channel)) {
            return sendMessage({
              channel: event.channel,
              message: constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
              bot_access_token: botAccessToken,
            });
          }
        }

        return handleTranslation(
          event,
          user,
          botAccessToken,
          workspace.bot_user_id
        );
      }

      case "app_mention": {
        await sendMessage({
          channel: event.channel,
          message: constants.MESSAGES.ENABLE_TRANSLATION_MESSAGE,
          bot_access_token: botAccessToken,
        });
        break;
      }
    }
  } catch (error) {
    console.error("Events error:", error);
  }
};

export const interactiveEvents = async (req, res) => {
  try {
    const payload = JSON.parse(req.body.payload);
    const { type, team } = payload;

    res.status(200).send();

    const workspace = await Workspace.findOne({ team_id: team.id });
    if (!workspace) return;

    const token = workspace.bot_access_token;

    if (type === "view_submission") {
      await handleViewSubmission(payload, token);
    } else if (type === "block_actions") {
      await handleBlockActions(payload, token);
    }
  } catch (error) {
    console.error("Interactive events error:", error);
    res.sendStatus(500);
  }
};

export const slashCommands = async (req, res) => {
  res.sendStatus(200);

  try {
    const { command, text, user_id, team_id, channel_id } = req.body;

    const workspace = await Workspace.findOne({ team_id });
    if (!workspace) return;

    const token = workspace.bot_access_token;

    const reply = (message) =>
      sendEphemeralMessage({
        channel: channel_id,
        user: user_id,
        message,
        bot_access_token: token,
      });

    if (command === "/set-translation") {
      const params = Object.fromEntries(
        text.split(" ").map((p) => {
          const [key, value] = p.split(":");
          return [key, value];
        })
      );

      const { primary, target, style } = params;

      if (!primary || !target) {
        return reply(
          "Please provide both `primary:<lang>` and `target:<lang>`.\n\nExample: `/set-translation primary:en target:ja style:formal`"
        );
      }

      if (!validateLang(primary)) {
        return reply(
          `Invalid primary language: \`${primary}\`. Use ISO 639-1 codes (e.g. \`en\`, \`ja\`).`
        );
      }

      if (!validateLang(target)) {
        return reply(
          `Invalid target language: \`${target}\`. Use ISO 639-1 codes (e.g. \`en\`, \`ja\`).`
        );
      }

      if (
        style &&
        ![
          constants.LANGUAGE_STYLES.FORMAL,
          constants.LANGUAGE_STYLES.CASUAL,
        ].includes(style)
      ) {
        return reply("Invalid style. Use either `formal` or `casual`.");
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

      return reply(
        "Your translation preferences have been updated successfully!"
      );
    }

    if (command === "/translate-toggle") {
      const setting = await Setting.findOneAndUpdate(
        { team_id },
        [
          {
            $set: {
              channels: {
                $cond: [
                  { $in: [channel_id, { $ifNull: ["$channels", []] }] },
                  {
                    $setDifference: [
                      { $ifNull: ["$channels", []] },
                      [channel_id],
                    ],
                  },
                  {
                    $concatArrays: [
                      { $ifNull: ["$channels", []] },
                      [channel_id],
                    ],
                  },
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
      return reply(`Translation has been ${status} for this channel.`);
    }
  } catch (error) {
    console.error("SLASH COMMAND ERROR:", error);
  }
};
