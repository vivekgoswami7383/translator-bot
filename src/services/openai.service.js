import OpenAI from "openai";
import { constants } from "../helpers/constants.js";

const openai = new OpenAI({
  apiKey: constants.OPENAI.API_KEY,
});

export const detectLanguage = async (message) => {
  try {
    const response = await openai.chat.completions.create({
      model: constants.OPENAI.MODEL,
      messages: [
        {
          role: "system",
          content:
            "Detect the primary language of the given text. Respond with only the ISO 639-1 language code (e.g., 'en', 'ja', 'es', 'fr', etc.).",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: constants.OPENAI.TEMPERATURE,
      max_tokens: constants.OPENAI.MAX_TOKENS,
    });

    return {
      success: true,
      data: response.choices[0].message.content.trim().toLowerCase(),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const translateMessage = async ({
  message,
  fromLang,
  toLang,
  style = constants.LANGUAGE_STYLES.FORMAL,
}) => {
  console.log("INSIDE TRANSLATE MESSAGE");

  try {
    const response = await openai.chat.completions.create({
      model: constants.OPENAI.MODEL,
      messages: [
        {
          role: "system",
          content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}.
          
          Rules:
          1. Do not translate or modify:
             - Emojis (e.g., :wave:)
             - Slack formatting (*bold*, _italic_, ~strike~, :emoji:, inline code, code blocks, and links like <https://...>)
             - Any text inside <<KEEP:...>> markers - keep the original term inside
             - Any text inside <<MAP:source:target>> markers - replace with the target term
          2. Handle special markers:
             - <<KEEP:term>> → keep "term" unchanged in the output
             - <<MAP:source:target>> → replace with "target" in the output
          3. Preserve markdown and Slack formatting exactly.
          4. Do not translate code or inline code.
          5. Keep proper nouns and technical terms unchanged when appropriate.
          6. Always translate from ${fromLang} to ${toLang}, unless the text is 100% identical to ${toLang}.

          IMPORTANT: The translation style must be ${style}.
            - If style = "${constants.LANGUAGE_STYLES.FORMAL}", use polite, respectful language.
            - If style = "${constants.LANGUAGE_STYLES.CASUAL}", use friendly, informal language.

          Return only the translated text with markers properly processed, nothing else.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: constants.OPENAI.TEMPERATURE,
      max_tokens: constants.OPENAI.MAX_TOKENS,
    });

    return { success: true, data: response.choices[0].message.content.trim() };
  } catch (error) {
    console.error("Translation error:", error);
    return { success: false, error: error.message };
  }
};
