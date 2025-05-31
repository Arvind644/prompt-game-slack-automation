// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });
const { getTopSubmissionsForDay } = require('./db/database');
const { formatLeaderboardMessage, postToSlack } = require('./db/slack');

// Parse command line arguments
const args = process.argv.slice(2);
const dayParam = args.find(arg => arg.startsWith('--day='))?.split('=')[1];
const skipSlack = args.includes('--skip-slack');
const postToSlackFlag = args.includes('--post-slack');

// Function to test the leaderboard functionality
async function testLeaderboard(day) {
  try {
    console.log(`Testing leaderboard for day: ${day}`);
    console.log('Environment check:');
    console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
    console.log('- SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'Set ✓' : 'Missing ✗');
    console.log('- SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID ? 'Set ✓' : 'Missing ✗');
    
    // Get the leaderboard data
    console.log('\n📊 Getting leaderboard data...');
    const { prompt, leaderboard, imageUrl } = await getTopSubmissionsForDay(day);
    
    console.log('✅ Leaderboard data retrieved:');
    console.log('- Prompt:', prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''));
    console.log('- Entries found:', leaderboard.length);
    console.log('- Image URL:', imageUrl ? imageUrl.substring(0, 50) + '...' : 'None');
    
    if (leaderboard.length > 0) {
      console.log('- Top entries:');
      leaderboard.forEach((entry, index) => {
        console.log(`  ${index + 1}. ${entry.username} - ${entry.percentage}% (${entry.similarity})`);
      });
    }
    
    // Format the message
    console.log('\n📝 Formatting leaderboard message...');
    const messageData = formatLeaderboardMessage(prompt, leaderboard, imageUrl);
    
    console.log('✅ Formatted message:');
    console.log('─'.repeat(60));
    console.log(messageData.message);
    console.log('─'.repeat(60));
    console.log('🖼️ Image URL:', messageData.imageUrl ? 'Present' : 'None');
    
    // Post to Slack if requested
    if (postToSlackFlag && !skipSlack) {
      console.log('\n📤 Posting to Slack...');
      const slackResult = await postToSlack(messageData.message, messageData.imageUrl);
      
      if (slackResult.success) {
        console.log('✅ Successfully posted to Slack!');
        console.log('- Message timestamp:', slackResult.ts);
        console.log('- Channel:', slackResult.channel);
      } else {
        console.log('❌ Failed to post to Slack:', slackResult.error);
      }
    } else if (!postToSlackFlag) {
      console.log('\n💡 To post to Slack, add --post-slack flag');
    }
    
    return {
      success: true,
      day,
      prompt,
      imageUrl,
      leaderboard,
      message: messageData.message
    };
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the function
async function runTest() {
  console.log('🏆 Starting leaderboard test execution...\n');
  
  const day = dayParam ? parseInt(dayParam) : 0;
  
  if (isNaN(day)) {
    console.error('❌ Invalid day parameter. Please provide a valid number.');
    console.log('Usage: node test-leaderboard.js --day=0 [--post-slack] [--skip-slack]');
    return;
  }
  
  const result = await testLeaderboard(day);
  
  if (result.success) {
    console.log('\n✅ Test completed successfully!');
  } else {
    console.log('\n❌ Test failed:', result.error);
  }
}

// Show usage if no day parameter provided
if (!dayParam) {
  console.log('Usage: node test-leaderboard.js --day=0 [--post-slack] [--skip-slack]');
  console.log('');
  console.log('Examples:');
  console.log('  node test-leaderboard.js --day=0                    # Test day 0, don\'t post to Slack');
  console.log('  node test-leaderboard.js --day=0 --post-slack       # Test day 0 and post to Slack');
  console.log('  node test-leaderboard.js --day=1 --skip-slack       # Test day 1, skip Slack entirely');
  console.log('');
  process.exit(1);
}

runTest(); 