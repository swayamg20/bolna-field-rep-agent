import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { buildCallContext } from '@/lib/prompt-builder';

interface Rep { id: string; team_id: string }

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const repId = params.id;

  const db = getDb();
  const rep = db.prepare('SELECT id, team_id FROM reps WHERE id = ?').get(repId) as Rep | undefined;

  if (!rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
  }

  try {
    const context = buildCallContext(repId, rep.team_id);
    return NextResponse.json({ context });
  } catch (err) {
    console.error('Failed to build call context:', err);
    return NextResponse.json({ error: 'Failed to build call context' }, { status: 500 });
  }
}
