const dayjs = require('dayjs');
const { getPromptFromPreviousDay } = require('../db/database');
const { postToSlack, formatPromptMessage } = require('../db/slack');

/**
 * Vercel serverless function to post yesterday's prompt to Slack
 * This function can be triggered:
 * 1. Via a scheduled cron job (using Vercel Cron)
 * 2. Via direct HTTP call with proper authorization
 */
module.exports = async (req, res) => {
  try {
    // Check if this is a scheduled execution or an HTTP request
    const isScheduled = req.headers['x-vercel-cron'] === 'true';
    
    // If it's an HTTP request, add basic authorization check
    if (!isScheduled) {
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.API_SECRET_TOKEN;
      
      if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if we're in the correct time window (e.g., between 9 AM and 10 AM)
      // Skip this check if a 'force' parameter is provided
      if (!req.query.force) {
        const currentHour = dayjs().hour();
        const targetHour = parseInt(process.env.NOTIFICATION_HOUR || '9', 10);
        
        if (currentHour !== targetHour) {
          return res.status(200).json({ 
            message: 'Not the correct time window for posting', 
            currentHour,
            targetHour
          });
        }
      }
    }
    
    // Get yesterday's prompt from the database
    const yesterdayPrompt = await getPromptFromPreviousDay();
    
    // Format the message
    const message = formatPromptMessage(yesterdayPrompt);
    
    // Post the message to Slack
    const slackResponse = await postToSlack(message);
    
    // Return the result
    if (slackResponse.success) {
      return res.status(200).json({ 
        message: 'Successfully posted to Slack',
        promptId: yesterdayPrompt?._id || null
      });
    } else {
      return res.status(500).json({ 
        error: 'Failed to post to Slack',
        details: slackResponse.error
      });
    }
  } catch (error) {
    console.error('Error in slack notification function:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}; 