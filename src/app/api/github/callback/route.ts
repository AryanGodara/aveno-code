import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'Missing GitHub OAuth env vars' }, { status: 500 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  const cookieState = req.cookies.get('github_oauth_state')?.value;
  const rawReturnTo = req.cookies.get('github_return_to')?.value || '/dashboard';

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect('/?error=oauth_state');
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      // Must match the one used in /login
      redirect_uri: (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '') + '/api/github/callback',
    }),
    });
  } catch (e) {
    return NextResponse.json({ error: 'oauth_network_error', details: (e as Error).message }, { status: 502 });
  }

  if (!tokenRes.ok) {
    return NextResponse.redirect('/?error=oauth_token');
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;

  if (!accessToken) {
    return NextResponse.redirect('/?error=oauth_token_missing');
  }

  // Build absolute redirect URL (NextResponse.redirect requires absolute URLs in some runtimes)
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
  const safePath = rawReturnTo.startsWith('/') ? rawReturnTo : '/dashboard';
  const redirectUrl = new URL(safePath, baseUrl).toString();
  const res = NextResponse.redirect(redirectUrl);

  // Store token in HttpOnly cookie
  res.cookies.set('gh_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  // Cleanup transient cookies
  res.cookies.set('github_oauth_state', '', { path: '/', maxAge: 0 });
  res.cookies.set('github_return_to', '', { path: '/', maxAge: 0 });

  return res;
}
