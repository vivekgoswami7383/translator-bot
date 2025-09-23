import ISO6391 from "iso-639-1";
import stringSimilarity from "string-similarity";
import { translationButtons } from "./templates.js";
import { sendMessage, updateMessage } from "../services/slack.service.js";
import { constants } from "../helpers/constants.js";

/** 🔧 Helpers to reduce duplication */
export const buildTranslationText = (
  original,
  translation,
  lang,
  includeOriginal
) => {
  const base = `${lang.flag} *Translation (${lang.name}):* ${translation}`;
  return includeOriginal ? `${original}\n\n${base}` : base;
};

/**
 * Validate if the given language code is ISO-639-1 compliant.
 */
export const validateLang = (lang) => ISO6391.validate(lang);

/**
 * Check if detected language matches expectations.
 * Returns true if translation should continue, false if skipped.
 */
export const checkLanguage = (detectedLang, primaryLang, targetLang) => {
  if (detectedLang === primaryLang) return true;
  if (detectedLang === targetLang) return false;
  return true;
};

/**
 * Remove bot mention from message text using the bot user ID
 */
export const removeBotMention = (text, botUserId) => {
  if (!text || !botUserId) return text;

  // Remove bot mention in format <@U123456789>
  const mentionPattern = new RegExp(`<@${botUserId}>`, "g");
  return text.replace(mentionPattern, "").trim();
};

/**
 * Determine if a Slack message should be skipped for translation.
 */
export const skipTranslation = (message, botUserId = null) => {
  if (!message || message.bot_id || !message.text) return true;

  // If we have the bot user ID, check if message is only a bot mention
  if (botUserId && message.text.trim() === `<@${botUserId}>`) {
    return true;
  }

  // Fallback: check if it's only any user mention
  if (/^<@U[A-Z0-9]+>$/.test(message.text.trim())) return true;

  let textContent = "";

  if (Array.isArray(message.blocks)) {
    for (const block of message.blocks) {
      if (block.type === "rich_text") {
        for (const el of block.elements || []) {
          if (el.type === "rich_text_section") {
            textContent += (el.elements || [])
              .filter((sub) => sub.type === "text")
              .map((sub) => sub.text)
              .join(" ");
          }
        }
      }
      if (block.type === "section" && block.text?.type === "mrkdwn") {
        textContent += block.text.text + " ";
      }
    }
  }

  if (!textContent && message.text) textContent = message.text;

  return textContent.trim().length < 3;
};

/**
 * Apply glossary transformations before translation.
 */
export const handleGlossary = (text, glossary = {}) => {
  const { terms = [], mapping = [] } = glossary;

  // Protect glossary terms
  for (const term of terms) {
    if (term?.trim()) {
      const regex = new RegExp(`\\b${term.trim()}\\b`, "gi");
      text = text.replace(regex, `<<KEEP:${term.trim()}>>`);
    }
  }

  // Map source terms to target replacements
  for (const item of mapping) {
    let source, target;
    if (!item) continue;

    if (typeof item === "string") {
      [source, target] = item.split(":").map((s) => s?.trim());
    } else {
      ({ source, target } = item);
    }

    if (source && target) {
      const regex = new RegExp(`\\b${source}\\b`, "gi");
      text = text.replace(regex, `<<MAP:${source}:${target}>>`);
    }
  }

  return text;
};

/**
 * Restore glossary terms after translation.
 */
export const postProcessTranslation = (translatedText) =>
  translatedText
    .replace(/<<KEEP:([^>]+)>>/g, (_, term) => term)
    .replace(/<<MAP:[^:]+:([^>]+)>>/g, (_, target) => target);

/**
 * Calculate Jaccard similarity between two texts.
 */
export const calculateSimilarity = (text1, text2) => {
  return stringSimilarity.compareTwoStrings(
    text1.toLowerCase(),
    text2.toLowerCase()
  );
};

export const sendOrUpdateMessage = async ({
  event,
  user,
  botToken,
  originalText,
  translation,
  fromLang,
  toLang,
}) => {
  const lang = constants.LANGUAGES[toLang];
  const buttons = translationButtons({
    message_ts: event.ts,
    original_text: event.text,
    translation,
    from_lang: fromLang,
    to_lang: toLang,
  });

  const thread_ts = event.thread_ts || event.ts;

  try {
    const text = buildTranslationText(
      user.access_token ? event.text : null,
      translation,
      lang,
      !!user.access_token
    );

    const textBlocks = chunkText(text).map((chunk) => ({
      type: "section",
      text: { type: "mrkdwn", text: chunk },
    }));

    const buttonValueLength = (buttons?.elements?.[0]?.value || "").length;
    const includeButtons = buttonValueLength <= 1800;

    const blocks = [...textBlocks, ...(includeButtons ? [buttons] : [])];

    let res;
    if (user.access_token) {
      res = await updateMessage({
        channel: event.channel,
        ts: event.ts,
        text,
        user_access_token: user.access_token,
        blocks,
      });
    } else {
      res = await sendMessage({
        channel: event.channel,
        bot_access_token: botToken,
        ts: event.ts,
        blocks,
      });
    }

    if (
      !res.data.ok &&
      (res.data.error === "msg_too_long" || res.data.error === "block_mismatch")
    ) {
      await sendMessage({
        channel: event.channel,
        bot_access_token: botToken,
        message: `⚠️ The translation was too long to post in one message. Here it is instead:\n\n${translation}`,
        ts: thread_ts,
      });
    }
    return res;
  } catch (err) {
    await sendMessage({
      channel: event.channel,
      bot_access_token: botToken,
      message: `⚠️ Could not send translation due to an error: ${err.message}`,
      ts: thread_ts,
    });
  }
};

const chunkText = (text, chunkSize = 2900) => {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize));
    start += chunkSize;
  }
  return chunks;
};
