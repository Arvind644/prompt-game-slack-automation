const { Pool } = require('pg');

// PostgreSQL connection config should be stored in environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function getPromptFromPreviousDay() {
  try {
    console.log('Connecting to database...');
    console.log('Database URL configured:', process.env.DATABASE_URL ? 'Yes' : 'No');
    
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Calculate the date for day before yesterday (2 days ago) in YYYY-MM-DD format
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    const dayBeforeYesterdayStr = dayBeforeYesterday.toISOString().split('T')[0];
    
    console.log(`Querying for prompts from date: ${dayBeforeYesterdayStr}`);
    
    // Raw SQL query to get the prompt from day before yesterday
    // Updated to use daily_images table instead of prompts
    const query = `
      SELECT id, prompt, image_url, embedding
      FROM daily_images
      WHERE DATE(created_at) = $1
      LIMIT 1
    `;
    
    const result = await pool.query(query, [dayBeforeYesterdayStr]);
    
    console.log(`Query returned ${result.rows.length} results`);
    
    if (result.rows.length === 0) {
      console.log('No prompts found for the day before yesterday');
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
      date: new Date(dayBeforeYesterdayStr)
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

async function getTopSubmissionsForDay(day) {
  try {
    console.log('Getting top submissions for day:', day);
    
    // Test the connection
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');
    
    // Get the prompt for the specified day by finding the daily_images record for that day
    // We need to calculate the date based on the day number
    // Assuming day 0 is the most recent, day 1 is yesterday, etc.
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - day);
    const targetDateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`Looking for prompt on date: ${targetDateStr} (day ${day})`);
    
    const promptQuery = `
      SELECT prompt, image_url
      FROM daily_images
      WHERE DATE(created_at) = $1
      LIMIT 1
    `;
    
    const promptResult = await pool.query(promptQuery, [targetDateStr]);
    
    if (promptResult.rows.length === 0) {
      throw new Error(`No prompt found for day ${day} (date: ${targetDateStr})`);
    }
    
    const prompt = promptResult.rows[0].prompt;
    const imageUrl = promptResult.rows[0].image_url;
    
    // Get top 3 submissions with usernames for the same date as the prompt
    // Query by submission date instead of day column to ensure consistency
    // Group by username to show only the best submission per user
    const leaderboardQuery = `
      SELECT u.username, MAX(s.similarity) as similarity
      FROM image_prompt_guessing_game_submissions s
      JOIN users u ON s.user_id = u.user_id
      WHERE DATE(s.created_at) = $1
      GROUP BY u.username
      ORDER BY MAX(s.similarity) DESC
      LIMIT 3
    `;
    
    const leaderboardResult = await pool.query(leaderboardQuery, [targetDateStr]);
    
    console.log(`Found ${leaderboardResult.rows.length} submissions for date ${targetDateStr}`);
    
    // Convert similarity to percentage
    const leaderboard = leaderboardResult.rows.map(row => ({
      username: row.username,
      similarity: row.similarity,
      percentage: Math.round(row.similarity * 10000) / 100 // Convert to percentage with 2 decimal places
    }));
    
    return {
      prompt,
      imageUrl,
      leaderboard
    };
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

module.exports = {
  pool,
  getPromptFromPreviousDay,
  getTopSubmissionsForDay
}; 