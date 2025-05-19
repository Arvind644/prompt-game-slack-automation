# Prompt Game Slack Notifier

A Vercel serverless function that posts yesterday's prompt from the Prompt Game to a Slack channel using a Slack bot.

## How It Works

This serverless function:
1. Retrieves the prompt from the previous day from the PostgreSQL database
2. Formats it into a nice Slack message
3. Posts it to a specific Slack channel via a Slack bot
4. Runs automatically every day at 9:00 AM via Vercel Cron

## Setup Instructions

### Environment Variables

Set up the following environment variables in your Vercel project:

- `DATABASE_URL`: Your PostgreSQL connection string
- `SLACK_BOT_TOKEN`: Your Slack bot's OAuth token (starts with `xoxb-`)
- `SLACK_CHANNEL_ID`: The ID of the Slack channel to post to
- `API_SECRET_TOKEN`: A secret token for authorizing API calls
- `NOTIFICATION_HOUR`: The hour of the day (0-23) when notifications should be sent (defaults to 9)
- `NODE_ENV`: Environment (set to "production" for deployment)

### Vercel Deployment

1. Push this code to a GitHub repository
2. Connect the repository to Vercel
3. Configure the environment variables in Vercel
4. Deploy the project

### Manual Triggering

You can manually trigger the function by making a POST request to:

```
https://your-vercel-project.vercel.app/api/post-slack-answer
```

Include an Authorization header:
```
Authorization: Bearer YOUR_API_SECRET_TOKEN
```

Add `?force=true` to the URL to bypass the time window check.

## Database Schema

The function expects your PostgreSQL database to have a 'daily_images' table with columns:
- `id`: Primary key
- `prompt`: The actual prompt text
- `image_url`: URL to the image
- `embedding`: Embedding vector data
- `created_at`: Timestamp when the prompt was created/active

## Testing Locally

You can test the function locally by running:

```
npm start
```

This will:
1. Load environment variables from `.env.local`
2. Test the connection to your database
3. Check for yesterday's prompt
4. Format and post the message to Slack

### Advanced Testing Options

To test with a specific date:

```
node test-local.js --date=2025-05-15
```

To test without posting to Slack:

```
node test-local.js --date=2025-05-15 --skip-slack
```

See the detailed setup guide in `setup-guide.md` for full instructions on setting up your Slack bot and configuring the environment.

## Customization

- Edit `db/slack.js` to change the message format
- Edit `vercel.json` to change the schedule (default is daily at 9:00 AM, format: `0 9 * * *`) 