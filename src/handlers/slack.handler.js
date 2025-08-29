import Correction from "../models/Correction.js";
import { openModel, deleteMessage } from "../services/slack.service.js";
import {
  detectLanguage,
  translateMessage,
} from "../services/openai.service.js";
import {
  calculateSimilarity,
  handleGlossary,
  checkLanguage,
  postProcessTranslation,
  removeBotMention,
  sendOrUpdateMessage,
} from "../helpers/functions.js";
import {
  translationFeedbackModal,
  divider,
  extraSpace,
  manageTermsModal,
  manageMappingModal,
} from "../helpers/templates.js";
import Setting from "../models/Setting.js";
import User from "../models/User.js";

/** 🔑 Handle View Submission */
export const handleViewSubmission = async (payload, botToken) => {
  const { view } = payload;

  switch (view.callback_id) {
    case "manage_terms_callback": {
      const values = view.state.values;
      const addedTerm = values.added_term_data?.added_term?.value?.trim();
      const selectedTerms = values.terms_data?.terms?.selected_options || [];

      const setting = await Setting.findOne({ team_id: payload.team.id });
      let currentTerms = (setting?.glossary?.terms || []).filter(Boolean);

      if (addedTerm && !currentTerms.includes(addedTerm)) {
        currentTerms.push(addedTerm);
      }

      if (setting?.glossary?.terms?.length > 0) {
        const selectedValues = selectedTerms.map((o) => o.value);
        currentTerms = currentTerms.filter(
          (term) =>
            selectedValues.includes(term) || (addedTerm && term === addedTerm)
        );
      }

      await Setting.updateOne(
        { team_id: payload.team.id },
        { $set: { "glossary.terms": currentTerms } }
      );
      break;
    }

    case "manage_mapping_callback": {
      const values = view.state.values;
      const addedSource = values.added_source_data?.added_source?.value?.trim();
      const addedTarget = values.added_target_data?.added_target?.value?.trim();
      const selectedMappings =
        values.mapping_data?.mappings?.selected_options || [];

      const setting = await Setting.findOne({ team_id: payload.team.id });
      let currentMapping = (setting?.glossary?.mapping || [])
        .map((m) =>
          typeof m === "string"
            ? {
                source: m.split(":")[0]?.trim(),
                target: m.split(":")[1]?.trim(),
              }
            : m
        )
        .filter((m) => m.source && m.target);

      if (addedSource && addedTarget) {
        const newMapping = { source: addedSource, target: addedTarget };
        if (
          !currentMapping.some(
            (m) =>
              m.source === newMapping.source && m.target === newMapping.target
          )
        ) {
          currentMapping.push(newMapping);
        }
      }

      if (setting?.glossary?.mapping?.length > 0) {
        const selectedValues = selectedMappings.map((o) => o.value);
        currentMapping = currentMapping.filter((m) =>
          selectedValues.includes(`${m.source}:${m.target}`)
        );
      }

      await Setting.updateOne(
        { team_id: payload.team.id },
        { $set: { "glossary.mapping": currentMapping } }
      );
      break;
    }

    case "translation_feedback_callback": {
      const {
        original_text,
        current_translation,
        from_lang,
        to_lang,
        channel_id,
        message_ts,
      } = JSON.parse(view.private_metadata);

      const { improved_translation_data, reason_data } = view.state.values;
      const improvedTranslation =
        improved_translation_data.improved_translation.value;
      const reason = reason_data?.reason?.value || "";

      const user = await User.findOne({ user_id: payload.user.id });

      await Correction.create({
        user_id: payload.user.id,
        team_id: payload.team.id,
        original_text,
        old_translation: current_translation,
        new_translation: improvedTranslation,
        reason,
        from_language: from_lang,
        to_language: to_lang,
        channel_id,
        message_ts,
      });

      await sendOrUpdateMessage({
        event: { ts: message_ts, channel: channel_id },
        user,
        botToken,
        originalText: original_text,
        translation: improvedTranslation,
        fromLang: from_lang,
        toLang: to_lang,
      });
      break;
    }
  }
};

/** 🔑 Handle Block Actions */
export const handleBlockActions = async (payload, botToken) => {
  const { actions, channel, user, message } = payload;
  const action = actions[0];
  const setting = await Setting.findOne({ team_id: payload.team.id });

  switch (action.action_id) {
    case "manage_terms":
      return openModel({
        trigger_id: payload.trigger_id,
        bot_access_token: botToken,
        template: manageTermsModal({ terms: setting?.glossary?.terms || [] }),
      });

    case "manage_mapping":
      return openModel({
        trigger_id: payload.trigger_id,
        bot_access_token: botToken,
        template: manageMappingModal({
          mapping: setting?.glossary?.mapping || [],
        }),
      });

    case "suggest_better_translation": {
      const translationData = JSON.parse(action.value);
      return openModel({
        trigger_id: payload.trigger_id,
        bot_access_token: botToken,
        template: translationFeedbackModal({
          channel_id: channel.id,
          message_ts: translationData.message_ts,
          original_text: translationData.original_text,
          current_translation: translationData.translation,
          from_lang: translationData.from_lang,
          to_lang: translationData.to_lang,
        }),
      });
    }

    case "hide_translation":
      return deleteMessage({
        channel: channel.id,
        ts: message.ts,
        bot_access_token: botToken,
      });
  }
};

/** 🔑 Handle App Home Page */
export const handleAppHomePage = async () => ({
  type: "home",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: ":wave::skin-tone-2: Welcome to Translator Bot!",
        emoji: true,
      },
      block_id: "header",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `I can help translate messages in your channels. Use \`/set-translation primary:ja target:en\` to set your language preferences and \`/translate-toggle\` to enable/disable translation in channels.`,
      },
      block_id: "details_header",
    },
    divider,
    extraSpace,
    {
      type: "section",
      text: { type: "mrkdwn", text: ":gear: *Glossary Management*" },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "📖 Manage Terms", emoji: true },
          action_id: "manage_terms",
        },
        {
          type: "button",
          text: { type: "plain_text", text: "🔄 Manage Mapping", emoji: true },
          action_id: "manage_mapping",
        },
      ],
    },
    divider,
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Manage your *Do Not Translate* terms and *Mapping List* here.",
        },
      ],
    },
  ],
});

/** 🔑 Handle Translation */
export const handleTranslation = async (event, user, botToken, botUserId) => {
  const teamId = user.team_id;

  const textWithoutBotMention = removeBotMention(event.text, botUserId);

  if (!textWithoutBotMention.trim()) return;

  const detectedLangResponse = await detectLanguage(textWithoutBotMention);
  if (!detectedLangResponse.success) return;

  const detectedLang = detectedLangResponse.data;

  if (!checkLanguage(detectedLang, user.primary_language, user.target_language))
    return;

  const setting = await Setting.findOne({ team_id: teamId });
  const glossary = setting?.glossary || {};
  const cleanText = handleGlossary(textWithoutBotMention, glossary);
  if (!cleanText.trim()) return textWithoutBotMention;

  // Check for exact correction
  const existingCorrection = await Correction.findOne({
    team_id: teamId,
    original_text: textWithoutBotMention,
    from_language: detectedLang,
    to_language: user.target_language,
  }).sort({ created_at: -1 });

  if (existingCorrection) {
    return sendOrUpdateMessage({
      event,
      user,
      botToken,
      originalText: textWithoutBotMention,
      translation: existingCorrection.new_translation,
      fromLang: detectedLang,
      toLang: user.target_language,
    });
  }

  // Fuzzy match
  const corrections = await Correction.find({
    team_id: teamId,
    from_language: detectedLang,
    to_language: user.target_language,
  }).sort({ created_at: -1 });

  let bestMatch = null;
  let bestSim = 0;

  for (const c of corrections) {
    const sim = calculateSimilarity(textWithoutBotMention, c.original_text);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = c;
    }
  }

  if (bestSim < 0.8) bestMatch = null;

  if (bestMatch) {
    return sendOrUpdateMessage({
      event,
      user,
      botToken,
      originalText: textWithoutBotMention,
      translation: bestMatch.new_translation,
      fromLang: detectedLang,
      toLang: user.target_language,
    });
  }

  // Fresh translation
  const translatedResponse = await translateMessage({
    message: cleanText,
    fromLang: detectedLang,
    toLang: user.target_language,
  });
  if (!translatedResponse.success) return;

  const translatedMessage = postProcessTranslation(translatedResponse.data);

  return sendOrUpdateMessage({
    event,
    user,
    botToken,
    originalText: textWithoutBotMention,
    translation: translatedMessage,
    fromLang: detectedLang,
    toLang: user.target_language,
  });
};
