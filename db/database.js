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

module.exports = {
  pool,
  getPromptFromPreviousDay
}; 