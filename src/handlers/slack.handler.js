import Correction from "../models/Correction.js";
import { constants } from "../helpers/constants.js";
import {
  sendMessage,
  openModel,
  updateMessage,
  deleteMessage,
} from "../services/slack.service.js";
import {
  detectLanguage,
  translateMessage,
} from "../services/openai.service.js";
import {
  calculateSimilarity,
  handleGlossary,
  checkLanguage,
  postProcessTranslation,
} from "../helpers/functions.js";
import {
  translationFeedbackModal,
  translationButtons,
  divider,
  extraSpace,
  manageTermsModal,
  manageMappingModal,
} from "../helpers/templates.js";
import Setting from "../models/Setting.js";

export const handleViewSubmission = async (payload, botToken) => {
  const { view } = payload;

  switch (view.callback_id) {
    case "manage_terms_callback": {
      const values = view.state.values;
      const addedTerm = values.added_term_data?.added_term?.value?.trim();
      const selectedTerms = values.terms_data?.terms?.selected_options || [];

      const setting = await Setting.findOne({ team_id: payload.team.id });
      let currentTerms = setting?.glossary?.terms || [];

      currentTerms = currentTerms.filter((t) => t && t.trim() !== "");

      if (addedTerm && !currentTerms.includes(addedTerm)) {
        currentTerms.push(addedTerm);
      }

      if (setting?.glossary?.terms && setting.glossary.terms.length > 0) {
        const selectedValues = selectedTerms.map((option) => option.value);
        currentTerms = currentTerms.filter((term) => {
          return (
            selectedValues.includes(term) || (addedTerm && term === addedTerm)
          );
        });
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
      let currentMapping = setting?.glossary?.mapping || [];

      currentMapping = currentMapping
        .map((mapping) => {
          if (typeof mapping === "string") {
            const [source, target] = mapping.split(":");
            return { source: source?.trim(), target: target?.trim() };
          }
          return mapping;
        })
        .filter((mapping) => mapping.source && mapping.target);

      if (addedSource && addedTarget) {
        const newMapping = { source: addedSource, target: addedTarget };
        const exists = currentMapping.some(
          (m) =>
            m.source === newMapping.source && m.target === newMapping.target
        );
        if (!exists) {
          currentMapping.push(newMapping);
        }
      }

      if (setting?.glossary?.mapping && setting.glossary.mapping.length > 0) {
        const selectedValues = selectedMappings.map((option) => option.value);
        currentMapping = currentMapping.filter((mapping) => {
          const mappingValue = `${mapping.source}:${mapping.target}`;
          return selectedValues.includes(mappingValue);
        });
      }

      await Setting.updateOne(
        { team_id: payload.team.id },
        { $set: { "glossary.mapping": currentMapping } }
      );
      break;
    }

    case "translation_feedback_callback": {
      const metadata = JSON.parse(view.private_metadata);
      const values = view.state.values;

      const improvedTranslation =
        values.improved_translation_data.improved_translation.value;
      const reason = values.reason_data?.reason?.value || "";

      await Correction.create({
        user_id: payload.user.id,
        team_id: payload.team.id,
        original_text: metadata.original_text,
        old_translation: metadata.current_translation,
        new_translation: improvedTranslation,
        reason: reason,
        from_language: metadata.from_lang,
        to_language: metadata.to_lang,
        channel_id: metadata.channel_id,
        message_ts: metadata.message_ts,
      });

      const updatedText = `🌍 *Translation (${
        constants.LANGUAGES[metadata.to_lang].name
      }):* ${improvedTranslation}`;

      await sendMessage({
        channel: metadata.channel_id,
        message: `✅ Thank you for the feedback! Translation has been updated and will be used for similar texts in the future.`,
        bot_access_token: botToken,
        ts: metadata.message_ts,
      });
    }
  }
};

export const handleBlockActions = async (payload, botToken) => {
  const { actions, channel, user, message } = payload;
  const action = actions[0];

  const setting = await Setting.findOne({ team_id: payload.team.id });

  switch (action.action_id) {
    case "manage_terms": {
      await openModel({
        trigger_id: payload.trigger_id,
        bot_access_token: botToken,
        template: manageTermsModal({
          terms: setting?.glossary?.terms || [],
        }),
      });
      break;
    }

    case "manage_mapping": {
      await openModel({
        trigger_id: payload.trigger_id,
        bot_access_token: botToken,
        template: manageMappingModal({
          mapping: setting?.glossary?.mapping || [],
        }),
      });
      break;
    }

    case "suggest_better_translation": {
      const translationData = JSON.parse(action.value);
      await openModel({
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
      break;
    }

    case "hide_translation": {
      const hideData = JSON.parse(action.value);
      await deleteMessage({
        channel: channel.id,
        ts: message.ts,
        bot_access_token: botToken,
      });
    }
  }
};

export const handleAppHomePage = async () => {
  return {
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
        text: {
          type: "mrkdwn",
          text: ":gear: *Glossary Management*",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "📖 Manage Terms",
              emoji: true,
            },
            action_id: "manage_terms",
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🔄 Manage Mapping",
              emoji: true,
            },
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
  };
};

export const handleTranslation = async (event, user, botToken) => {
  const message = event.text;
  const teamId = user.team_id;

  const detectedLangResponse = await detectLanguage(message);
  if (!detectedLangResponse.success) return;

  const detectedLang = detectedLangResponse.data;
  const primaryLang = user.primary_language;
  const targetLang = user.target_language;

  if (!checkLanguage(detectedLang, primaryLang, targetLang)) return;

  const setting = await Setting.findOne({ team_id: teamId });
  const glossary = setting?.glossary || {};

  const cleanText = handleGlossary(message, glossary);
  if (!cleanText.trim()) return message;

  const existingCorrection = await Correction.findOne({
    team_id: teamId,
    original_text: message,
    from_language: detectedLang,
    to_language: targetLang,
  }).sort({ created_at: -1 });

  if (existingCorrection) return existingCorrection.new_translation;

  const fuzzyCorrections = await Correction.find({
    team_id: teamId,
    from_language: detectedLang,
    to_language: targetLang,
  })
    .sort({ created_at: -1 })
    .limit(5);

  let bestMatch = null;
  let bestSimilarity = 0;

  for (const correction of fuzzyCorrections) {
    const similarity = calculateSimilarity(message, correction.original_text);
    if (similarity > 0.8 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = correction;
    }
  }

  if (bestMatch) return bestMatch.new_translation;

  const translatedMessageResponse = await translateMessage({
    message: cleanText,
    fromLang: detectedLang,
    toLang: targetLang,
  });
  if (!translatedMessageResponse.success) return;

  const translatedMessage = postProcessTranslation(
    translatedMessageResponse.data
  );

  const buttons = translationButtons({
    message_ts: event.ts,
    original_text: message,
    translation: translatedMessage,
    from_lang: detectedLang,
    to_lang: targetLang,
  });

  if (user.access_token) {
    const updatedText = `${message}\n\n${constants.LANGUAGES[targetLang].flag} *Translation (${constants.LANGUAGES[targetLang].name}):* ${translatedMessage}`;

    await updateMessage({
      channel: event.channel,
      ts: event.ts,
      // text: updatedText,
      user_access_token: user.access_token,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: updatedText,
          },
        },
        buttons,
      ],
    });
  } else {
    const updatedText = `${constants.LANGUAGES[targetLang].flag} *Translation (${constants.LANGUAGES[targetLang].name}):* ${translatedMessage}`;

    await sendMessage({
      channel: event.channel,
      bot_access_token: botToken,
      ts: event.ts,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: updatedText,
          },
        },
        buttons,
      ],
    });
  }
};
