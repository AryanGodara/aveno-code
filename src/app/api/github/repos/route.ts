import { NextRequest, NextResponse } from 'next/server';

const GITHUB_API = 'https://api.github.com';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('gh_token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const perPage = url.searchParams.get('per_page') || '20';
  const page = url.searchParams.get('page') || '1';

  let resp: Response;
  try {
    resp = await fetch(`${GITHUB_API}/user/repos?visibility=all&sort=updated&per_page=${perPage}&page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });
  } catch (e) {
    return NextResponse.json({ error: 'github_network_error', details: (e as Error).message }, { status: 502 });
  }

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json({ error: 'github_error', details: text }, { status: resp.status });
  }

  const data = await resp.json();

  return NextResponse.json(data);
}
