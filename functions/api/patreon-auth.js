export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const code = searchParams.get('code');
  const userId = searchParams.get('state'); // we pass supabase user id as state

  if (!code) {
    return redirectToApp('error=patreon_denied');
  }

  const clientId     = context.env.PATREON_CLIENT_ID;
  const clientSecret = context.env.PATREON_CLIENT_SECRET;
  const supabaseUrl  = context.env.SUPABASE_URL;
  const supabaseKey  = context.env.SUPABASE_SERVICE_KEY;

  if (!clientId || !clientSecret || !supabaseUrl || !supabaseKey) {
    return redirectToApp('error=config_missing');
  }

  // ── 1. Exchange code for access token ──────────────────────────────────
  let tokenData;
  try {
    const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type:    'authorization_code',
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  'https://hobbymagos.com/api/patreon-auth',
      }),
    });
    tokenData = await tokenRes.json();
  } catch {
    return redirectToApp('error=token_exchange_failed');
  }

  if (!tokenData.access_token) {
    return redirectToApp('error=no_access_token');
  }

  // ── 2. Fetch Patreon identity + memberships ─────────────────────────────
  let identity;
  try {
    const identityRes = await fetch(
      'https://www.patreon.com/api/oauth2/v2/identity' +
      '?include=memberships.currently_entitled_tiers' +
      '&fields[member]=patron_status,currently_entitled_amount_cents' +
      '&fields[tier]=title',
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    identity = await identityRes.json();
  } catch {
    return redirectToApp('error=identity_fetch_failed');
  }

  // ── 3. Check for active Artisan tier ───────────────────────────────────
  const memberships = identity.included?.filter(i => i.type === 'member') || [];
  const tiers       = identity.included?.filter(i => i.type === 'tier') || [];

  const artisanTier = tiers.find(t =>
    t.attributes?.title?.toLowerCase() === 'artisan'
  );

  const isArtisan = artisanTier && memberships.some(m =>
    m.attributes?.patron_status === 'active_patron' &&
    m.relationships?.currently_entitled_tiers?.data?.some(
      t => t.id === artisanTier.id
    )
  );

  const isActivePaidPatron = !isArtisan && memberships.some(m =>
    m.attributes?.patron_status === 'active_patron' &&
    (m.attributes?.currently_entitled_amount_cents || 0) >= 500
  );

  const isPatron = isArtisan || isActivePaidPatron;

  // ── 4. Update Supabase profile ─────────────────────────────────────────
  if (userId) {
    try {
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type':  'application/json',
          apikey:          supabaseKey,
          Authorization:   `Bearer ${supabaseKey}`,
          Prefer:          'return=minimal',
        },
        body: JSON.stringify({
          is_patron:             isPatron,
          patreon_access_token:  tokenData.access_token,
          patreon_refresh_token: tokenData.refresh_token || null,
        }),
      });
    } catch {
      // Non-fatal — still redirect with result
    }
  }

  // ── 5. Redirect back to app ────────────────────────────────────────────
  if (isPatron) {
    return redirectToApp('patreon=verified');
  } else {
    // Not a patron — send to Patreon signup page
    return Response.redirect('https://www.patreon.com/c/HobbyMagos', 302);
  }
}

function redirectToApp(params) {
  return Response.redirect(
    `https://hobbymagos.com/materiel?${params}`,
    302
  );
}
