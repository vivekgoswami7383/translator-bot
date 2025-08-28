export const divider = {
  type: "divider",
};

export const extraSpace = {
  type: "context",
  elements: [
    {
      type: "image",
      image_url:
        "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
      alt_text: "placeholder",
    },
  ],
};

export const manageTermsModal = ({ terms = [] }) => {
  const options = terms.map((term) => ({
    text: {
      type: "plain_text",
      text: term,
      emoji: true,
    },
    value: term,
  }));

  return {
    type: "modal",
    callback_id: "manage_terms_callback",
    title: {
      type: "plain_text",
      text: "📖 Manage Terms",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Save",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        optional: true,
        block_id: "added_term_data",
        element: {
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "Enter a new term (e.g. MyNumber)",
          },
          action_id: "added_term",
        },
        label: {
          type: "plain_text",
          text: "➕ Add a New Term",
          emoji: true,
        },
      },
      ...(options.length > 0
        ? [
            {
              type: "input",
              optional: true,
              block_id: "terms_data",
              element: {
                type: "multi_static_select",
                placeholder: {
                  type: "plain_text",
                  text: "Deselect terms to remove them",
                  emoji: true,
                },
                options,
                initial_options: options,
                action_id: "terms",
              },
              label: {
                type: "plain_text",
                text: "📖 Current Terms (deselect to remove)",
                emoji: true,
              },
            },
          ]
        : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "_No terms yet. Add your first one above!_",
              },
            },
          ]),
    ],
  };
};

export const manageMappingModal = ({ mapping = [] }) => {
  const options = mapping
    .map((item) => {
      let source, target;
      if (typeof item === "string") {
        [source, target] = item.split(":");
        source = source?.trim();
        target = target?.trim();
      } else {
        source = item.source;
        target = item.target;
      }

      return {
        text: {
          type: "plain_text",
          text: `${source} → ${target}`,
          emoji: true,
        },
        value: `${source}:${target}`,
      };
    })
    .filter((option) => option.text.text !== " → ");

  return {
    type: "modal",
    callback_id: "manage_mapping_callback",
    title: {
      type: "plain_text",
      text: "🔄 Manage Mapping",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Save",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    blocks: [
      {
        type: "input",
        optional: true,
        block_id: "added_source_data",
        element: {
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "Enter source term (e.g. 源泉徴収)",
          },
          action_id: "added_source",
        },
        label: {
          type: "plain_text",
          text: "🔑 Source Term",
          emoji: true,
        },
      },
      {
        type: "input",
        optional: true,
        block_id: "added_target_data",
        element: {
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "Enter target term (e.g. withholding tax)",
          },
          action_id: "added_target",
        },
        label: {
          type: "plain_text",
          text: "🎯 Target Term",
          emoji: true,
        },
      },
      divider,
      ...(options.length > 0
        ? [
            {
              type: "input",
              optional: true,
              block_id: "mapping_data",
              element: {
                type: "multi_static_select",
                placeholder: {
                  type: "plain_text",
                  text: "Deselect mappings to remove them",
                  emoji: true,
                },
                options,
                initial_options: options,
                action_id: "mappings",
              },
              label: {
                type: "plain_text",
                text: "🔄 Current Mappings (deselect to remove)",
                emoji: true,
              },
            },
          ]
        : [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: "_No mappings yet. Add your first one above!_",
              },
            },
          ]),
    ],
  };
};

export const translationFeedbackModal = ({
  channel_id,
  message_ts,
  original_text,
  current_translation,
  from_lang,
  to_lang,
}) => {
  return {
    type: "modal",
    callback_id: "translation_feedback_callback",
    title: {
      type: "plain_text",
      text: "🔄 Suggest Translation",
      emoji: true,
    },
    submit: {
      type: "plain_text",
      text: "Submit",
      emoji: true,
    },
    close: {
      type: "plain_text",
      text: "Cancel",
      emoji: true,
    },
    private_metadata: JSON.stringify({
      channel_id,
      message_ts,
      original_text,
      current_translation,
      from_lang,
      to_lang,
    }),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Original Text:*\n${original_text}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Current Translation:*\n${current_translation}`,
        },
      },
      divider,
      {
        type: "input",
        block_id: "improved_translation_data",
        element: {
          type: "plain_text_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Enter your improved translation here...",
            emoji: true,
          },
          action_id: "improved_translation",
        },
        label: {
          type: "plain_text",
          text: "🎯 Improved Translation",
          emoji: true,
        },
      },
      {
        type: "input",
        block_id: "reason_data",
        optional: true,
        element: {
          type: "plain_text_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Why is this translation better? (optional)",
            emoji: true,
          },
          action_id: "reason",
        },
        label: {
          type: "plain_text",
          text: "💭 Reason for Change",
          emoji: true,
        },
      },
    ],
  };
};

export const translationButtons = ({
  message_ts,
  original_text,
  translation,
  from_lang,
  to_lang,
}) => {
  return {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🔄 Suggest Better Translation",
          emoji: true,
        },
        action_id: "suggest_better_translation",
        value: JSON.stringify({
          message_ts,
          original_text,
          translation,
          from_lang,
          to_lang,
        }),
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "🙈 Hide Translation",
          emoji: true,
        },
        action_id: "hide_translation",
        value: JSON.stringify({ message_ts }),
        style: "danger",
      },
    ],
  };
};
