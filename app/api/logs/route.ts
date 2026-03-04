import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('team_id');

  if (!teamId) {
    return NextResponse.json({ error: 'team_id required' }, { status: 400 });
  }

  const db = getDb();
  const logs = db.prepare(`
    SELECT * FROM processing_logs
    WHERE team_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).all(teamId);

  return NextResponse.json({ logs });
}
