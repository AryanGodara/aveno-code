import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const url = new URL(req.url);
  
  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      hasGitHubClientId: !!process.env.GITHUB_CLIENT_ID,
      hasGitHubClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
      nextPublicAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      appUrl: process.env.APP_URL,
      currentOrigin: url.origin,
      expectedCallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || url.origin}/api/github/callback`
    }
  });
} 