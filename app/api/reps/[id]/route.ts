import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = params;
  const db = getDb();

  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(id);
  if (!rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
  }

  const stores = db.prepare(
    'SELECT * FROM stores WHERE rep_id = ? ORDER BY flag DESC, name'
  ).all(id);

  const calls = db.prepare(
    'SELECT * FROM calls WHERE rep_id = ? ORDER BY called_at DESC'
  ).all(id);

  return NextResponse.json({ rep, stores, calls });
}
