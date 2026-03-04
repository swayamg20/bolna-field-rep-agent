import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const { team_id, name, phone, territory } = await req.json();

  if (!team_id || !name || !phone || !territory) {
    return NextResponse.json({ error: 'team_id, name, phone, and territory are required' }, { status: 400 });
  }

  const id = uuid();
  const db = getDb();
  db.prepare('INSERT INTO reps (id, team_id, name, phone, territory) VALUES (?, ?, ?, ?, ?)').run(id, team_id, name, phone, territory);

  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(id);
  return NextResponse.json({ rep });
}

export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get('team_id');

  if (!teamId) {
    return NextResponse.json({ error: 'team_id query param required' }, { status: 400 });
  }

  const db = getDb();
  const reps = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM stores WHERE rep_id = r.id) as store_count
    FROM reps r
    WHERE r.team_id = ?
    ORDER BY r.name
  `).all(teamId);

  return NextResponse.json({ reps });
}
