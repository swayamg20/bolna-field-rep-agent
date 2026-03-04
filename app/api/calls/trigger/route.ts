import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { makeCall, CallUserData } from '@/lib/bolna';
import { buildCallContext, buildUserData } from '@/lib/prompt-builder';
import { v4 as uuid } from 'uuid';

interface Rep { id: string; team_id: string; name: string; phone: string; territory: string }
interface Team { id: string; name: string; bolna_agent_id: string }

export async function POST(req: Request) {
  const { rep_id } = await req.json();

  if (!rep_id) {
    return NextResponse.json({ error: 'rep_id is required' }, { status: 400 });
  }

  const db = getDb();
  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(rep_id) as Rep | undefined;
  if (!rep) {
    return NextResponse.json({ error: 'Rep not found' }, { status: 404 });
  }

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(rep.team_id) as Team | undefined;
  if (!team || !team.bolna_agent_id) {
    return NextResponse.json({ error: 'Team not found or no Bolna agent configured' }, { status: 400 });
  }

  const context = buildCallContext(rep.id, team.id);
  const userData = buildUserData(context);

  try {
    const response = await makeCall(
      team.bolna_agent_id,
      rep.phone,
      userData as unknown as CallUserData
    );

    const callId = uuid();
    db.prepare(
      "INSERT INTO calls (id, rep_id, team_id, bolna_execution_id, status, called_at) VALUES (?, ?, ?, ?, 'calling', datetime('now'))"
    ).run(callId, rep_id, rep.team_id, response.execution_id);

    return NextResponse.json({
      call_id: callId,
      execution_id: response.execution_id,
      status: 'calling',
    });
  } catch (err) {
    console.error('Failed to trigger call:', err);
    return NextResponse.json({ error: 'Failed to trigger call' }, { status: 500 });
  }
}
