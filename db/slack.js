const axios = require('axios');

// Slack Bot token and channel should be stored in environment variables
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackChannel = process.env.SLACK_CHANNEL_ID;

async function postToSlack(message) {
  console.log('Preparing to post to Slack...');
  console.log('Slack token configured:', slackToken ? 'Yes' : 'No');
  console.log('Slack channel configured:', slackChannel ? 'Yes' : 'No');
  
  if (!slackToken) {
    throw new Error('Please define the SLACK_BOT_TOKEN environment variable');
  }

  if (!slackChannel) {
    throw new Error('Please define the SLACK_CHANNEL_ID environment variable');
  }

  try {
    console.log(`Posting message to Slack channel: ${slackChannel}`);
    console.log('Message length:', message.length);
    
    // Use Slack's Web API to post a message
    const response = await axios.post('https://slack.com/api/chat.postMessage', {
      channel: slackChannel,
      text: message
    }, {
      headers: {
        'Authorization': `Bearer ${slackToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Slack API response:', response.data);

    if (!response.data.ok) {
      throw new Error(`Slack API error: ${response.data.error}`);
    }

    console.log('Message successfully posted to Slack');
    return { 
      success: true,
      ts: response.data.ts,  // Message timestamp (useful for threading or referencing the message)
      channel: response.data.channel
    };
  } catch (error) {
    console.error('Error posting to Slack:', error);
    if (error.response) {
      console.error('Slack API response:', error.response.data);
    }
    return { 
      success: false, 
      error: error.message 
    };
  }
}

function formatPromptMessage(prompt) {
  console.log('Formatting prompt message...');
  
  if (!prompt) {
    console.log('No prompt provided, returning default message');
    return 'No prompt was found for yesterday.';
  }

  console.log('Prompt data available:', Object.keys(prompt).join(', '));
  
  // Create a nicely formatted message with the prompt information
  let message = '📣 *Prompt Game Answer Reveal* 📣\n\n';
  
  if (prompt.imageUrl) {
    message += `*Image:* ${prompt.imageUrl}\n`;
  }
  
  message += `*Yesterday's Prompt:* ${prompt.promptText || 'Not provided'}\n`;
  
  // Based on the Supabase structure, we no longer have description and additionalInfo
  // Instead we can display other information if needed in the future
  
  message += '\nHow did your guesses compare? 🤔';
  
  console.log('Message formatted successfully');
  return message;
}

module.exports = {
  postToSlack,
  formatPromptMessage
}; 