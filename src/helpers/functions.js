import ISO6391 from "iso-639-1";
import { constants } from "./constants.js";

export const validateLang = (lang) => ISO6391.validate(lang);

export const checkLanguage = (detectedLang, primaryLang, targetLang) => {
  if (detectedLang === primaryLang) return true;
  if (detectedLang === targetLang) return false;
  return true;
};

export const skipTranslation = (message) => {
  if (!message || message.bot_id || !message.text || message.subtype)
    return true;

  let textContent = "";

  if (Array.isArray(message.blocks)) {
    for (const block of message.blocks) {
      if (block.type === "rich_text") {
        for (const element of block.elements || []) {
          if (element.type === "rich_text_section") {
            for (const sub of element.elements || []) {
              if (sub.type === "text") {
                textContent += sub.text + " ";
              }
            }
          }
        }
      }
      if (block.type === "section" && block.text?.type === "mrkdwn") {
        textContent += block.text.text + " ";
      }
    }
  }

  if (!textContent && message.text) {
    textContent = message.text;
  }

  const hasEnoughText = textContent.trim().length >= 3;

  return !hasEnoughText;
};

export const handleGlossary = (text, glossary = {}) => {
  const { terms = [], mapping = [] } = glossary;

  terms.forEach((term) => {
    if (term && term.trim()) {
      const regex = new RegExp(`\\b${term.trim()}\\b`, "gi");
      text = text.replace(regex, `<<KEEP:${term.trim()}>>`);
    }
  });

  mapping.forEach((mappingItem) => {
    if (mappingItem) {
      let source, target;

      if (typeof mappingItem === "string") {
        [source, target] = mappingItem.split(":");
        source = source?.trim();
        target = target?.trim();
      } else {
        source = mappingItem.source;
        target = mappingItem.target;
      }

      if (source && target) {
        const regex = new RegExp(`\\b${source}\\b`, "gi");
        text = text.replace(regex, `<<MAP:${source}:${target}>>`);
      }
    }
  });

  if (!glossary || (!terms.length && !mapping.length)) {
    constants.GLOSSARY.ACCOUNTING_TERMS.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      text = text.replace(regex, `<<KEEP:${term}>>`);
    });
  }

  return text;
};

export const postProcessTranslation = (translatedText) => {
  let processedText = translatedText;

  processedText = processedText.replace(/<<KEEP:([^>]+)>>/g, (match, term) => {
    return term;
  });

  processedText = processedText.replace(
    /<<MAP:[^:]+:([^>]+)>>/g,
    (match, target) => {
      return target;
    }
  );

  return processedText;
};

// Levenshtein distance calculation
export const levenshteinDistance = (str1, str2) => {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
};

export const calculateSimilarity = (text1, text2) => {
  const longer = text1.length > text2.length ? text1 : text2;
  const shorter = text1.length > text2.length ? text2 : text1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
};

export const restorePreservedElements = (translatedText) => {
  if (!translatedText) return "";

  return translatedText
    .replace(/<<MENTION:([^>]+)>>/g, "$1")
    .replace(/<<CHANNEL:([^>]+)>>/g, "$1")
    .replace(/<<LINK:([^>]+)>>/g, "$1")
    .replace(/<<CODEBLOCK:([^>]+)>>/g, (match, base64) => {
      try {
        return Buffer.from(base64, "base64").toString("utf8");
      } catch {
        return match;
      }
    })
    .replace(/<<INLINECODE:([^>]+)>>/g, (match, base64) => {
      try {
        return Buffer.from(base64, "base64").toString("utf8");
      } catch {
        return match;
      }
    })
    .replace(/<<BOLD:([^>]+)>>/g, "**$1**")
    .replace(/<<ITALIC:([^>]+)>>/g, "*$1*")
    .replace(/<<UNDERLINE:([^>]+)>>/g, "_$1_")
    .replace(/<<STRIKE:([^>]+)>>/g, "~$1~")
    .replace(/<<EMOJI:([^>]+)>>/g, "$1")
    .replace(/<<DATE:([^>]+)>>/g, "$1")
    .replace(/<<CURRENCY:([^>]+)>>/g, "$1")
    .replace(/<<PERCENTAGE:([^>]+)>>/g, "$1")
    .replace(/<<KEEP:([^>]+)>>/g, "$1");
};
