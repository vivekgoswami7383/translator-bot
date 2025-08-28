import OpenAI from "openai";
import { constants } from "../helpers/constants.js";
import { sendMessage } from "./slack.service.js";

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

export const translateMessage = async ({ message, fromLang, toLang }) => {
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
          6. If the text is already in the target language, return it unchanged.
          
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

// const response = await translateMessage({
//   message:
//     ":wave: Hello team!  \n\nI'm the Translation Bot here to help. Use `/set-translation primary:ja target:en` to configure me, and `/translate-toggle` to switch translation on or off in this channel.  \n\n*Features:*  \n1. :sparkles: Automatic translation of messages  \n2. _Preserves Slack formatting_ like *bold*, _italic_, ~strikethrough~, and :emoji:  \n3. Keeps code intact, e.g. `const x = 10;` or shell commands like `npm install`  \n4. Works with links like <https://openai.com>, <https://www.youtube.com/watch?v=dQw4w9WgXcQ>, and mailto: links  \n\n*Example usage:*  \n```js\nfunction greet() {\n  console.log(\"Hello, world! :wave:\");\n}\ngreet();\n```\n\nAnother block (SQL):  \n```sql\nSELECT * FROM users WHERE status = 'active' AND company_id = 123;\n```\n\nQuotes and blockquotes:  \n&gt; This is a motivational quote: \"Stay hungry, stay foolish.\"  \n&gt; &lt;&lt;Do not translate this marker text&gt;&gt;  \n\nLists with nesting:  \n- Primary features  \n  - Subfeature A (*important*)  \n  - Subfeature B (:rocket:)  \n\n:warning: Please remember: Do **NOT** translate code, emojis, Slack commands (`/something`), or anything inside &lt;&lt;double brackets&gt;&gt;.  \n\nThat's all — now try translating me into Japanese! :jp:",
//   fromLang: "en",
//   toLang: "ja",
// });

// console.log(response.data);

// const a = await sendMessage({
//   channel: "C06JG6Q5BSM",
//   message: response.data,
//   bot_access_token: "xoxb-5857795078823-6614993765410-wKyk4u08GBDd74IaiUPx5UeV",
// });

// console.log(a);
