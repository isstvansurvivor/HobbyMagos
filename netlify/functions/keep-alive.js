// Supabase keep-alive ping
// Schedule this via Netlify CRON in netlify.toml — runs every 5 days at 9am UTC

exports.handler = async function () {
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_KEY;

  if (!url || !key) {
    console.log('Keep-alive: missing env vars, skipping.');
    return { statusCode: 200, body: 'skipped' };
  }

  try {
    const res = await fetch(`${url}/rest/v1/profiles?limit=1`, {
      headers: {
        apikey:        key,
        Authorization: `Bearer ${key}`,
      },
    });
    console.log(`Keep-alive ping status: ${res.status}`);
    return { statusCode: 200, body: `ping ${res.status}` };
  } catch (err) {
    console.error('Keep-alive error:', err.message);
    return { statusCode: 500, body: err.message };
  }
};
