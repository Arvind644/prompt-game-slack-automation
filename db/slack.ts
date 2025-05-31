import axios from 'axios';

// Slack Bot token and channel should be stored in environment variables
const slackToken = process.env.SLACK_BOT_TOKEN;
const slackChannel = process.env.SLACK_CHANNEL_ID;

interface SlackResponse {
  success: boolean;
  ts?: string;
  channel?: string;
  error?: string;
}

interface PromptData {
  _id?: number;
  promptText?: string;
  imageUrl?: string;
  embedding?: any;
  date?: Date;
}

interface FormattedPromptMessage {
  message: string;
  imageUrl: string | null;
}

interface LeaderboardEntry {
  username: string;
  similarity: number;
  percentage: number;
}

export async function postToSlack(message: string, imageUrl: string | null = null): Promise<SlackResponse> {
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
    
    // Prepare the message payload
    let messagePayload: any = {
      channel: slackChannel,
      text: message // Fallback text for notifications
    };

    // If we have an image URL, use blocks for better formatting
    if (imageUrl) {
      messagePayload.blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: message
          }
        },
        {
          type: "image",
          image_url: imageUrl,
          alt_text: "Prompt Game Image"
        }
      ];
    }
    
    // Use Slack's Web API to post a message
    const response = await axios.post('https://slack.com/api/chat.postMessage', messagePayload, {
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
  } catch (error: any) {
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

export function formatPromptMessage(prompt: PromptData | null): FormattedPromptMessage {
  console.log('Formatting prompt message...');
  
  if (!prompt) {
    console.log('No prompt provided, returning default message');
    return {
      message: 'No prompt was found for yesterday.',
      imageUrl: null
    };
  }

  console.log('Prompt data available:', Object.keys(prompt).join(', '));
  
  // Create a nicely formatted message with the prompt information
  let message = '📣 *Prompt Game Answer Reveal* 📣\n\n';
  
  // Clean and construct the full image URL
  let cleanImageUrl: string | null = null;
  if (prompt.imageUrl) {
    let imageFileName = prompt.imageUrl;
    
    // Remove @ symbol if it exists at the beginning
    if (imageFileName.startsWith('@')) {
      imageFileName = imageFileName.substring(1);
    }
    
    // If it's just a filename (UUID.png), construct the full URL
    if (!imageFileName.startsWith('http')) {
      cleanImageUrl = `https://campus-uploads.buildclub.ai/${imageFileName}`;
    } else {
      cleanImageUrl = imageFileName;
    }
    
    console.log('Constructed image URL:', cleanImageUrl);
  }
  
  message += `*Yesterday's Prompt:* ${prompt.promptText || 'Not provided'}\n`;
  
  // Based on the Supabase structure, we no longer have description and additionalInfo
  // Instead we can display other information if needed in the future
  
  message += '\nHow did your guesses compare? 🤔';
  
  console.log('Message formatted successfully');
  return {
    message: message,
    imageUrl: cleanImageUrl
  };
}

export function formatLeaderboardMessage(prompt: string, leaderboard: LeaderboardEntry[], imageUrl: string | null = null): FormattedPromptMessage {
  console.log('Formatting leaderboard message...');
  
  let message = '📣 *Prompt Game Answer Reveal* 📣\n\n';
  message += `*Yesterday's Prompt:* ${prompt}\n\n`;
  
  if (leaderboard.length === 0) {
    message += 'No submissions found for this prompt.\n\n';
  } else {
    // Add each leaderboard entry
    leaderboard.forEach((entry, index) => {
      message += `- ${entry.username} - ${entry.percentage}%\n`;
    });
    message += '\n';
  }
  
  message += 'What score did you get? Comment below!\n\n';
  message += 'P.S. a new image is out for today try it to test your prompting skills here: https://games.buildclub.ai';
  
  // Clean and construct the full image URL (same logic as formatPromptMessage)
  let cleanImageUrl: string | null = null;
  if (imageUrl) {
    let imageFileName = imageUrl;
    
    // Remove @ symbol if it exists at the beginning
    if (imageFileName.startsWith('@')) {
      imageFileName = imageFileName.substring(1);
    }
    
    // If it's just a filename (UUID.png), construct the full URL
    if (!imageFileName.startsWith('http')) {
      cleanImageUrl = `https://campus-uploads.buildclub.ai/${imageFileName}`;
    } else {
      cleanImageUrl = imageFileName;
    }
    
    console.log('Constructed leaderboard image URL:', cleanImageUrl);
  }
  
  console.log('Leaderboard message formatted successfully');
  return {
    message: message,
    imageUrl: cleanImageUrl
  };
} 