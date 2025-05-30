export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

// Import the working JavaScript modules using ES module syntax
import { getPromptFromPreviousDay } from '../../../../db/database.js';
import { postToSlack, formatPromptMessage } from '../../../../db/slack.js';

/**
 * Next.js API route to post yesterday's prompt to Slack
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
    
    console.log('📊 Getting yesterday\'s prompt from database...');
    // Get yesterday's prompt from the database
    const yesterdayPrompt = await getPromptFromPreviousDay();
    
    console.log('📊 Database result:', {
      promptFound: !!yesterdayPrompt,
      promptId: yesterdayPrompt?._id,
      hasPromptText: !!yesterdayPrompt?.promptText,
      hasImageUrl: !!yesterdayPrompt?.imageUrl
    });
    
    console.log('📝 Formatting message...');
    // Format the message
    const messageData = formatPromptMessage(yesterdayPrompt);
    
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
        message: 'Successfully posted to Slack',
        promptId: yesterdayPrompt?._id || null
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
