export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server';
import { getTopSubmissionsForDay } from '../../../db/database.js';
import { formatLeaderboardMessage, postToSlack } from '../../../db/slack.js';

/**
 * API endpoint to generate leaderboard for a specific day
 * Usage:
 * GET /api/leaderboard?day=0&post=true
 * 
 * Query parameters:
 * - day: The day number to get leaderboard for (required)
 * - post: Whether to post to Slack (optional, default: false)
 */
export async function GET(req: NextRequest) {
  console.log('🏆 Leaderboard API route started');
  
  try {
    const { searchParams } = new URL(req.url);
    const dayParam = searchParams.get('day');
    const postParam = searchParams.get('post');
    
    if (!dayParam) {
      return NextResponse.json({ 
        error: 'Missing required parameter: day' 
      }, { status: 400 });
    }
    
    const day = parseInt(dayParam);
    const shouldPost = postParam === 'true';
    
    if (isNaN(day)) {
      return NextResponse.json({ 
        error: 'Invalid day parameter: must be a number' 
      }, { status: 400 });
    }
    
    console.log(`📊 Getting leaderboard for day ${day}, posting: ${shouldPost}`);
    
    // Get the leaderboard data
    const { prompt, leaderboard, imageUrl } = await getTopSubmissionsForDay(day);
    
    console.log('📊 Leaderboard data retrieved:', {
      prompt: prompt.substring(0, 50) + '...',
      entriesCount: leaderboard.length,
      hasImage: !!imageUrl
    });
    
    // Format the message
    const messageData = formatLeaderboardMessage(prompt, leaderboard, imageUrl);
    
    console.log('📝 Message formatted, length:', messageData.message.length);
    console.log('🖼️ Image URL:', messageData.imageUrl ? 'Present' : 'None');
    
    // Post to Slack if requested
    let slackResponse = null;
    if (shouldPost) {
      console.log('📤 Posting to Slack...');
      slackResponse = await postToSlack(messageData.message, messageData.imageUrl);
      
      if (!slackResponse.success) {
        return NextResponse.json({ 
          error: 'Failed to post to Slack',
          details: slackResponse.error,
          message: messageData.message,
          imageUrl: messageData.imageUrl,
          leaderboard
        }, { status: 500 });
      }
    }
    
    console.log('✅ Leaderboard API completed successfully');
    
    return NextResponse.json({
      success: true,
      day,
      prompt,
      imageUrl,
      leaderboard,
      message: messageData.message,
      posted: shouldPost,
      slackResponse: slackResponse ? {
        success: slackResponse.success,
        ts: slackResponse.ts,
        channel: slackResponse.channel
      } : null
    });
    
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  } catch (error: any) {
    console.error('💥 Error in leaderboard API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
} 