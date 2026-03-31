export default {
  // Runs every 5 days at 9am UTC
  async scheduled(event, env, ctx) {
    const url = env.SUPABASE_URL;
    const key = env.SUPABASE_KEY;

    if (!url || !key) {
      console.log('Keep-alive: missing env vars, skipping.');
      return;
    }

    try {
      const res = await fetch(`${url}/rest/v1/profiles?limit=1`, {
        headers: {
          apikey:        key,
          Authorization: `Bearer ${key}`,
        },
      });
      console.log(`Keep-alive ping status: ${res.status}`);
    } catch (err) {
      console.error('Keep-alive error:', err.message);
    }
  },
};
