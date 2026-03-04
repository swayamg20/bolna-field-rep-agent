import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Params {
  params: { id: string };
}

export async function PATCH(_req: Request, { params }: Params) {
  const { id } = params;
  const db = getDb();

  const result = db.prepare('UPDATE alerts SET resolved = 1 WHERE id = ?').run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
