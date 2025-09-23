import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';

const SCOPES = ['read:user', 'repo'];

export async function GET(req: NextRequest) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'Missing GITHUB_CLIENT_ID' }, { status: 500 });
  }

  const url = new URL(req.url);
  const returnTo = url.searchParams.get('returnTo') || '/dashboard';

  const state = crypto.randomBytes(16).toString('hex');
  // Use a stable base URL to avoid redirect_uri mismatches
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || url.origin).replace(/\/$/, '');
  const redirectUri = `${baseUrl}/api/github/callback`;

  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', SCOPES.join(' '));
  authorizeUrl.searchParams.set('state', state);

  const res = NextResponse.redirect(authorizeUrl.toString());

  res.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 300, // 5 minutes
  });

  res.cookies.set('github_return_to', returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });

  return res;
}
