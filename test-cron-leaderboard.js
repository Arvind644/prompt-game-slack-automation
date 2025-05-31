// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });
const { getTopSubmissionsForDay } = require('./db/database');
const { formatLeaderboardMessage, postToSlack } = require('./db/slack');

// Parse command line arguments
const args = process.argv.slice(2);
const skipSlack = args.includes('--skip-slack');
const postToSlackFlag = args.includes('--post-slack');

// Function to simulate the cron job functionality
async function testCronLeaderboard() {
  try {
    console.log('🚀 Testing cron leaderboard functionality...');
    console.log('📋 Environment check:', {
      DATABASE_URL: process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗',
      SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? 'Set ✓' : 'Missing ✗',
      SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID ? 'Set ✓' : 'Missing ✗'
    });
    
    // Use day 2 to maintain the same timing as before (day before yesterday)
    const day = 2;
    console.log(`\n🏆 Getting leaderboard for day ${day} (day before yesterday)...`);
    
    // Get the leaderboard data from the database
    const { prompt, imageUrl, leaderboard } = await getTopSubmissionsForDay(day);
    
    console.log('📊 Database result:', {
      promptFound: !!prompt,
      hasImageUrl: !!imageUrl,
      leaderboardEntries: leaderboard.length
    });
    
    if (leaderboard.length > 0) {
      console.log('🏆 Top entries:', leaderboard.map(entry => `${entry.username}: ${entry.percentage}%`).join(', '));
    }
    
    console.log('\n📝 Formatting leaderboard message...');
    // Format the message
    const messageData = formatLeaderboardMessage(prompt, leaderboard, imageUrl);
    
    console.log('📝 Message formatted, length:', messageData.message.length);
    console.log('🖼️ Image URL:', messageData.imageUrl ? 'Present' : 'None');
    
    console.log('\n✅ Formatted cron message:');
    console.log('─'.repeat(60));
    console.log(messageData.message);
    console.log('─'.repeat(60));
    
    // Post to Slack if requested
    if (postToSlackFlag && !skipSlack) {
      console.log('\n📤 Posting to Slack...');
      const slackResponse = await postToSlack(messageData.message, messageData.imageUrl);
      
      if (slackResponse.success) {
        console.log('✅ Successfully posted leaderboard to Slack!');
        console.log('- Message timestamp:', slackResponse.ts);
        console.log('- Channel:', slackResponse.channel);
        
        return {
          success: true,
          message: 'Successfully posted leaderboard to Slack',
          day: day,
          prompt: prompt.substring(0, 100) + '...',
          entriesCount: leaderboard.length
        };
      } else {
        console.log('❌ Failed to post to Slack:', slackResponse.error);
        return {
          success: false,
          error: 'Failed to post to Slack',
          details: slackResponse.error
        };
      }
    } else if (!postToSlackFlag) {
      console.log('\n💡 To post to Slack, add --post-slack flag');
      return {
        success: true,
        message: 'Cron test completed (no Slack posting)',
        day: day,
        prompt: prompt.substring(0, 100) + '...',
        entriesCount: leaderboard.length
      };
    }
    
  } catch (error) {
    console.error('💥 Error in cron leaderboard test:', error);
    return {
      success: false,
      error: 'Internal server error',
      message: error.message
    };
  }
}

// Run the function
async function runTest() {
  console.log('🏆 Starting cron leaderboard test execution...\n');
  
  const result = await testCronLeaderboard();
  
  if (result.success) {
    console.log('\n✅ Cron test completed successfully!');
    console.log('Result:', result);
  } else {
    console.log('\n❌ Cron test failed:', result.error);
  }
}

// Show usage
console.log('Usage: node test-cron-leaderboard.js [--post-slack] [--skip-slack]');
console.log('');
console.log('Examples:');
console.log('  node test-cron-leaderboard.js                    # Test cron logic, don\'t post to Slack');
console.log('  node test-cron-leaderboard.js --post-slack       # Test cron logic and post to Slack');
console.log('  node test-cron-leaderboard.js --skip-slack       # Test cron logic, skip Slack entirely');
console.log('');

runTest(); 