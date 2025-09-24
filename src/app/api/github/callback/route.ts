import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('GitHub callback initiated');
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('Missing GitHub OAuth environment variables');
      return NextResponse.json({ error: 'Missing GitHub OAuth env vars' }, { status: 500 });
    }

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    console.log('OAuth parameters:', { code: !!code, state: !!state });

    const cookieState = req.cookies.get('github_oauth_state')?.value;
    const rawReturnTo = req.cookies.get('github_return_to')?.value || '/dashboard';

    console.log('Cookie state comparison:', { 
      urlState: state, 
      cookieState: cookieState, 
      match: state === cookieState 
    });

    if (!code || !state || !cookieState || state !== cookieState) {
      console.error('OAuth state validation failed');
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
      console.error('GitHub token exchange error:', e);
      return NextResponse.json({ error: 'oauth_network_error', details: (e as Error).message }, { status: 502 });
    }

    if (!tokenRes.ok) {
      console.error('GitHub token response not ok:', tokenRes.status, tokenRes.statusText);
      const errorText = await tokenRes.text();
      console.error('Token response body:', errorText);
      return NextResponse.redirect('/?error=oauth_token');
    }

    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson.access_token as string | undefined;

    console.log('Token exchange successful:', { hasToken: !!accessToken });

    if (!accessToken) {
      console.error('No access token in response:', tokenJson);
      return NextResponse.redirect('/?error=oauth_token_missing');
    }

    // Build absolute redirect URL (NextResponse.redirect requires absolute URLs in some runtimes)
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
    const safePath = rawReturnTo.startsWith('/') ? rawReturnTo : '/dashboard';
    const redirectUrl = new URL(safePath, baseUrl).toString();
    
    console.log('Preparing redirect:', { baseUrl, safePath, redirectUrl });
    
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

    console.log('OAuth callback completed successfully');
    return res;

  } catch (error) {
    console.error('Unexpected error in GitHub callback:', error);
    return NextResponse.json({ 
      error: 'internal_server_error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
