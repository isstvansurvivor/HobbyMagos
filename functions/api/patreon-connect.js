export async function onRequestGet(context) {
  const clientId = context.env.PATREON_CLIENT_ID;
  if (!clientId) {
    return new Response('Patreon not configured', { status: 500 });
  }

  const { searchParams } = new URL(context.request.url);
  const state = searchParams.get('state') || '';

  const redirectUri = 'https://hobbymagos.com/api/patreon-auth';
  const scope = 'identity identity.memberships';

  const url = new URL('https://www.patreon.com/oauth2/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', scope);
  url.searchParams.set('state', state);

  return Response.redirect(url.toString(), 302);
}
