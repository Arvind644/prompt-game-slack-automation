export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// Import the working JavaScript modules using ES module syntax
import { getTopSubmissionsForDay } from '../../../../db/database.js';
import { postToSlack, formatLeaderboardMessage } from '../../../../db/slack.js';

/**
 * Next.js API route to post leaderboard results to Slack
 * This function can be triggered:
 * 1. Via a scheduled cron job (using Vercel Cron)
 * 2. Via direct HTTP call with proper authorization
 */
export async function GET(req: NextRequest) {
  console.log('🚀 Cron route started');
  console.log('📋 Environment check:', {
    DATABASE_URL: process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗',
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN ? 'Set ✓' : 'Missing ✗',
    SLACK_CHANNEL_ID: process.env.SLACK_CHANNEL_ID ? 'Set ✓' : 'Missing ✗',
    CRON_SECRET: process.env.CRON_SECRET ? 'Set ✓' : 'Missing ✗',
    NODE_ENV: process.env.NODE_ENV
  });

  try {
    // Check if this is a scheduled execution or an HTTP request
    const isScheduled = req.headers.get('x-vercel-cron') === 'true';
    const authHeader = req.headers.get('authorization');
    
    console.log('🔍 Request analysis:', {
      isScheduled,
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : null
    });

    // Only check authorization for scheduled cron jobs
    if (isScheduled) {
      console.log('🤖 Processing as scheduled cron job');
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('❌ Unauthorized, cron secret token is not correct');
        return new Response('Unauthorized', {
          status: 401,
        });
      }
      console.log('✅ Cron authorization successful');
    }
    
    // Use day 2 to maintain the same timing as before (day before yesterday)
    const day = 2;
    console.log(`🏆 Getting leaderboard for day ${day} (day before yesterday)...`);
    
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
    
    console.log('📝 Formatting leaderboard message...');
    // Format the message
    const messageData = formatLeaderboardMessage(prompt, leaderboard, imageUrl);
    
    console.log('📝 Message formatted, length:', messageData.message.length);
    console.log('🖼️ Image URL:', messageData.imageUrl ? 'Present' : 'None');
    console.log('📤 Posting to Slack...');
    
    // Post the message to Slack
    const slackResponse = await postToSlack(messageData.message, messageData.imageUrl);
    
    console.log('📤 Slack response:', {
      success: slackResponse.success,
      hasTs: !!slackResponse.ts,
      hasChannel: !!slackResponse.channel,
      error: slackResponse.error
    });
    
    // Return the result
    if (slackResponse.success) {
      console.log('✅ Successfully completed cron job');
      return NextResponse.json({ 
        message: 'Successfully posted leaderboard to Slack',
        day: day,
        prompt: prompt.substring(0, 100) + '...',
        entriesCount: leaderboard.length
      });
    } else {
      console.log('❌ Failed to post to Slack:', slackResponse.error);
      return NextResponse.json({ 
        error: 'Failed to post to Slack',
        details: slackResponse.error
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('💥 Error in slack notification function:', error);
    console.error('💥 Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
