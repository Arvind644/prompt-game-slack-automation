// Load environment variables from .env.local file
require('dotenv').config({ path: '.env.local' });
const { getPromptFromPreviousDay } = require('./db/database');
const { formatPromptMessage, postToSlack } = require('./db/slack');

// Parse command line arguments
const args = process.argv.slice(2);
const testDate = args.find(arg => arg.startsWith('--date='))?.split('=')[1];
const skipSlack = args.includes('--skip-slack');

// Function to test only the database connection with a specific date
async function testDatabaseOnly(dateStr) {
  try {
    // Override the getPromptFromPreviousDay function for testing
    const originalFn = getPromptFromPreviousDay;
    
    // Create a monkey-patched version that uses the provided date
    global.getPromptFromPreviousDay = async function() {
      console.log(`Using override date for testing: ${dateStr}`);
      
      // Copy implementation but use the specific date
      try {
        console.log('Connecting to database...');
        console.log('Database URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
        
        const { pool } = require('./db/database');
        
        // Test the connection
        await pool.query('SELECT NOW()');
        console.log('Database connection successful');
        
        console.log(`Querying for prompts from date: ${dateStr}`);
        
        // Raw SQL query with the provided date
        const query = `
          SELECT id, prompt, image_url, embedding
          FROM daily_images
          WHERE DATE(created_at) = $1
          LIMIT 1
        `;
        
        const result = await pool.query(query, [dateStr]);
        
        console.log(`Query returned ${result.rows.length} results`);
        
        if (result.rows.length === 0) {
          console.log('No prompts found for the specified date');
          return null;
        }
        
        // Transform the PostgreSQL result to match the expected format
        const prompt = result.rows[0];
        console.log('Found prompt:', {
          id: prompt.id,
          promptText: prompt.prompt,
          hasImage: !!prompt.image_url
        });
        
        return {
          _id: prompt.id,
          promptText: prompt.prompt,
          imageUrl: prompt.image_url,
          embedding: prompt.embedding,
          date: new Date(dateStr)
        };
      } catch (error) {
        console.error('Database query error:', error);
        throw error;
      }
    };
    
    // Run just the database part
    const prompt = await getPromptFromPreviousDay();
    
    if (prompt && !skipSlack) {
      console.log('Testing Slack message formatting...');
      const message = formatPromptMessage(prompt);
      console.log('Formatted message:', message);
      
      console.log('Testing Slack posting...');
      const slackResult = await postToSlack(message);
      console.log('Slack result:', slackResult);
    }
    
    // Restore the original function
    global.getPromptFromPreviousDay = originalFn;
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

// Run the entire prompt-game flow with simulated Next.js handlers
async function runNextStyleTest() {
  try {
    console.log('Testing Next.js API route flow...');
    console.log('This simulates how the Next.js API route would function');
    
    // Create simulated NextRequest and NextResponse
    const req = {
      headers: {
        get: (name) => {
          if (name === 'x-vercel-cron') return 'false';
          if (name === 'authorization') return `Bearer ${process.env.API_SECRET_TOKEN}`;
          return null;
        }
      },
      url: `http://localhost:3000/api/cron/promptgame?force=true`,
      nextUrl: new URL(`http://localhost:3000/api/cron/promptgame?force=true`)
    };
    
    // Get yesterday's prompt from the database
    console.log('Getting yesterday\'s prompt...');
    const yesterdayPrompt = await getPromptFromPreviousDay();
    
    if (!yesterdayPrompt) {
      console.log('No prompt found for yesterday');
      return { 
        status: 404,
        data: { message: 'No prompt found for yesterday' }
      };
    }
    
    // Format the message
    console.log('Formatting prompt message...');
    const message = formatPromptMessage(yesterdayPrompt);
    
    // Post the message to Slack
    console.log('Posting to Slack...');
    const slackResponse = await postToSlack(message);
    
    // Return the result
    if (slackResponse.success) {
      console.log('Successfully posted to Slack');
      return {
        status: 200,
        data: { 
          message: 'Successfully posted to Slack',
          promptId: yesterdayPrompt?._id || null
        }
      };
    } else {
      console.error('Failed to post to Slack:', slackResponse.error);
      return {
        status: 500,
        data: { 
          error: 'Failed to post to Slack',
          details: slackResponse.error
        }
      };
    }
  } catch (error) {
    console.error('Error in Next.js route simulation:', error);
    return {
      status: 500,
      data: { 
        error: 'Internal server error',
        message: error.message
      }
    };
  }
}

// Run the function
async function runTest() {
  console.log('Starting test execution...');
  console.log('Using environment:');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
  console.log('- SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN ? 'Set ✓' : 'Missing ✗');
  console.log('- SLACK_CHANNEL_ID:', process.env.SLACK_CHANNEL_ID ? 'Set ✓' : 'Missing ✗');
  console.log('- API_SECRET_TOKEN:', process.env.API_SECRET_TOKEN ? 'Set ✓' : 'Missing ✗');
  
  // If a specific date was provided, test with that date
  if (testDate) {
    console.log(`Running in test mode with specific date: ${testDate}`);
    await testDatabaseOnly(testDate);
    console.log('Test completed.');
    return;
  }
  
  try {
    // Run the test that simulates the Next.js API route
    const result = await runNextStyleTest();
    console.log('Test result:', result);
    console.log('Test completed.');
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

runTest(); 