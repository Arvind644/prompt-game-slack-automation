export const dynamic = 'force-dynamic'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

// Note: You need to create these modules in the Next.js project:
// - demo/app/api/db/database.ts
// - demo/app/api/db/slack.ts
// They should export the same functions as the original files
import { getPromptFromPreviousDay } from '@/db/database';
import { postToSlack, formatPromptMessage } from '@/db/slack';

/**
 * Next.js API route to post yesterday's prompt to Slack
 * This function can be triggered:
 * 1. Via a scheduled cron job (using Vercel Cron)
 * 2. Via direct HTTP call with proper authorization
 */
export async function GET(req: NextRequest) {
  try {
    // Check if this is a scheduled execution or an HTTP request
    const isScheduled = req.headers.get('x-vercel-cron') === 'true';
    const authHeader = req.headers.get('authorization');

    // Only check authorization for scheduled cron jobs
    if (isScheduled) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.log('Unauthorized, cron secret token is not correct');
        return new Response('Unauthorized', {
          status: 401,
        });
      }
    }
    
    // For manual requests, check if we're in the correct time window
    // Skip this check if a 'force' parameter is provided
    if (!isScheduled) {
      const { searchParams } = new URL(req.url);
      const force = searchParams.get('force');
      
      if (!force) {
        const currentHour = dayjs().hour();
        const targetHour = parseInt(process.env.NOTIFICATION_HOUR || '9', 10);
        
        if (currentHour !== targetHour) {
          return NextResponse.json({ 
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
      return NextResponse.json({ 
        message: 'Successfully posted to Slack',
        promptId: yesterdayPrompt?._id || null
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to post to Slack',
        details: slackResponse.error
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in slack notification function:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}
