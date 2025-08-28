# Translation Bot for Slack

A powerful Slack bot that automatically translates messages in channels and direct messages based on user language preferences.

## Features

- **Automatic Translation**: Translates messages based on detected language and user preferences
- **Language Preferences**: Users can set primary and target languages using slash commands
- **Channel Toggle**: Enable/disable translation per channel
- **Feedback System**: Users can suggest better translations and provide feedback
- **Learning System**: Bot learns from corrections and applies them to similar messages
- **Markdown Preservation**: Preserves Slack formatting, code blocks, mentions, and links
- **Glossary Protection**: Preserves accounting terms and technical jargon
- **Direct Messages**: Supports translation in DMs

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/translator-bot

# Slack Configuration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your_slack_signing_secret

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
```

### 2. Slack App Configuration

Create a Slack app with the following settings:

#### OAuth Scopes
- `chat:write`
- `chat:write.public`
- `app_mentions:read`
- `channels:history`
- `groups:history`
- `im:history`
- `commands`
- `users:read`

#### Event Subscriptions
Subscribe to the following events:
- `message.channels`
- `message.groups`
- `message.im`
- `app_mention`

#### Slash Commands
Create the following slash commands:
- `/set-translation` - Set user language preferences
- `/translate-toggle` - Toggle translation for current channel

#### Interactive Components
Enable interactive components for buttons and modals.

### 3. Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up MongoDB (local or cloud)
4. Configure environment variables
5. Start the application:
   ```bash
   npm run dev
   ```

### 4. Slack App Installation

1. Navigate to your Slack app's OAuth & Permissions page
2. Install the app to your workspace
3. The bot will send a welcome message to the installation channel

## Usage

### Setting Language Preferences

Use the `/set-translation` command to set your language preferences:

```
/set-translation primary:ja target:en
```

This tells the bot:
- If a message is in Japanese (primary), translate it to English (target)
- If a message is in English (target), don't translate it
- If a message is in any other language, translate it to English (target)

### Enabling Translation in Channels

Use the `/translate-toggle` command in any channel to enable/disable translation:

```
/translate-toggle
```

### Translation Feedback

When a message is translated, you'll see two buttons:
- **🔄 Suggest Better Translation**: Opens a modal to provide a better translation
- **🙈 Hide Translation**: Removes the translation from the channel

## Supported Languages

- English (en)
- Japanese (ja)
- Spanish (es)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Russian (ru)
- Korean (ko)
- Chinese (zh)
- Arabic (ar)
- Hindi (hi)

## API Endpoints

- `GET /slack/redirect` - OAuth callback
- `POST /slack/events` - Slack events webhook
- `POST /slack/slash-commands` - Slash commands handler
- `POST /slack/interactive-events` - Interactive components handler

## Database Schema

### UserPreferences
- `user_id`: Slack user ID
- `team_id`: Slack team ID
- `primary_language`: User's primary language code
- `target_language`: User's target language code

### ChannelSettings
- `channel_id`: Slack channel ID
- `team_id`: Slack team ID
- `translation_enabled`: Boolean flag for translation status

### Corrections
- `user_id`: User who provided the correction
- `team_id`: Slack team ID
- `original_text`: Original message text
- `old_translation`: Previous translation
- `new_translation`: Corrected translation
- `reason`: Optional reason for the correction
- `from_language`: Source language
- `to_language`: Target language

## Deployment

The bot is ready for deployment on platforms like:
- Heroku
- Railway
- Render
- AWS
- Google Cloud Platform

Make sure to:
1. Set environment variables in your deployment platform
2. Configure MongoDB connection
3. Update Slack app URLs to point to your deployed instance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License
