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

export const calculateSimilarity = (text1, text2) => {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = [...set1].filter((w) => set2.has(w));
  const union = new Set([...words1, ...words2]);

  return intersection.length / union.size;
};
