import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const { rep_id, team_id, name, area } = await req.json();

  if (!rep_id || !team_id || !name || !area) {
    return NextResponse.json({ error: 'rep_id, team_id, name, and area are required' }, { status: 400 });
  }

  const id = uuid();
  const db = getDb();
  db.prepare('INSERT INTO stores (id, rep_id, team_id, name, area) VALUES (?, ?, ?, ?, ?)').run(id, rep_id, team_id, name, area);

  const store = db.prepare('SELECT * FROM stores WHERE id = ?').get(id);
  return NextResponse.json({ store });
}
