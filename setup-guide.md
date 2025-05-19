# Prompt Game Slack Notifier - Setup Guide

This guide will help you set up and run the Prompt Game Slack Notifier with your Supabase database.

## Prerequisites

1. Node.js and npm installed
2. A Supabase account with a database containing your prompts
3. A Slack workspace with permissions to create a bot

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# PostgreSQL Connection
DATABASE_URL=postgres://your-supabase-connection-string
# Get this from Supabase dashboard > Project Settings > Database > Connection string

# Slack Bot Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token
# Get this from https://api.slack.com/apps > Your App > OAuth & Permissions > Bot User OAuth Token

SLACK_CHANNEL_ID=C01234ABCDE
# Get this from Slack by right-clicking on the channel and selecting "Copy Link"
# The channel ID is the part after the last / in the URL

# API Secret Token (for manual triggering)
API_SECRET_TOKEN=your-secret-token
# Create a secure random string, e.g., use: openssl rand -hex 32

# Notification Hour (24-hour format)
NOTIFICATION_HOUR=9

# Environment
NODE_ENV=development
```

## Setting up a Slack Bot

1. Go to https://api.slack.com/apps and click "Create New App"
2. Choose "From scratch" and give your app a name, then select your workspace
3. Under "Add features and functionality", click "Bots"
4. Click "Add a Bot User" and configure your bot's display name
5. Go to "OAuth & Permissions" in the sidebar
6. Under "Scopes" > "Bot Token Scopes", add the following permissions:
   - `chat:write` (Send messages as the app)
   - `channels:read` (If you plan to post in public channels)
   - `groups:read` (If you plan to post in private channels)
7. At the top of the page, click "Install to Workspace" and authorize the app
8. Copy the "Bot User OAuth Token" (starts with `xoxb-`) for your `.env.local` file
9. Invite your bot to the channel where you want it to post by typing `/invite @your-bot-name` in that channel
10. Get the channel ID by right-clicking on the channel name and selecting "Copy Link"

## Database Structure

Based on the Supabase screenshot, ensure your database has a table named `daily_images` with at least these columns:
- `id`: Unique identifier (UUID)
- `created_at`: Timestamp when the prompt was created
- `image_url`: URL to the image 
- `prompt`: The actual prompt text
- `embedding`: Embedding vector data

## Running Locally

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env.local` file with your environment variables (copy from env.example)

3. Run the test script:
   ```
   npm start
   ```

4. If you're not seeing any results, try running with a specific date:
   ```
   node test-local.js --date=2025-05-15
   ```
   
   Replace the date with a date you know has data in your database.

5. To only test the database connection without posting to Slack:
   ```
   node test-local.js --date=2025-05-15 --skip-slack
   ```

## Troubleshooting

### Database Connection Issues
- Make sure your DATABASE_URL is correct
- If using Windows, you might need to add `?sslmode=require` to your connection string
- Check if your IP is allowed in Supabase

### Slack Connection Issues
- Ensure your bot token is correct and starts with `xoxb-`
- Verify your bot has been invited to the channel
- Check that the channel ID is correct

## Deploying to Vercel

1. Push your code to a GitHub repository

2. Connect to Vercel:
   ```
   npx vercel login
   npx vercel link
   ```

3. Set up environment variables in Vercel:
   ```
   npx vercel env add DATABASE_URL
   npx vercel env add SLACK_BOT_TOKEN
   npx vercel env add SLACK_CHANNEL_ID
   npx vercel env add API_SECRET_TOKEN
   ```

4. Deploy to Vercel:
   ```
   npx vercel --prod
   ```

5. The cron job will automatically run at 9 AM daily according to the configuration in `vercel.json`

## Testing

To test if your function works:

1. Visit your deployed function URL with the force parameter:
   ```
   https://your-vercel-project.vercel.app/api/post-slack-answer?force=true
   ```
   
2. Include the Authorization header if testing via API client:
   ```
   Authorization: Bearer YOUR_API_SECRET_TOKEN
   ``` 