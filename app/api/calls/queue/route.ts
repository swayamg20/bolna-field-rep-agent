import { NextResponse } from 'next/server';
import { buildCallQueue } from '@/lib/scheduler';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('team_id');

  if (!teamId) {
    return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
  }

  try {
    const queue = buildCallQueue(teamId);
    return NextResponse.json({ queue });
  } catch (err) {
    console.error('Failed to build call queue:', err);
    return NextResponse.json({ error: 'Failed to build call queue' }, { status: 500 });
  }
}
