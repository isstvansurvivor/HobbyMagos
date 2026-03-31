const { schedule } = require('@netlify/functions');

// Runs every 5 days — well within Supabase's 7-day inactivity limit
exports.handler = schedule('0 9 */5 * *', async () => {
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.log('Keep-alive: missing env vars, skipping.');
    return { statusCode: 200 };
  }

  try {
    // A lightweight REST ping — just fetches one row from profiles
    const res = await fetch(`${url}/rest/v1/profiles?limit=1`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
      },
    });
    console.log(`Keep-alive ping: ${res.status}`);
  } catch (err) {
    console.error('Keep-alive error:', err.message);
  }

  return { statusCode: 200 };
});
