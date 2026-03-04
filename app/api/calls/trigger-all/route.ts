import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { makeCall } from '@/lib/bolna';
import { v4 as uuid } from 'uuid';

interface Rep { id: string; team_id: string; name: string; phone: string; territory: string }
interface Team { id: string; name: string; bolna_agent_id: string }
interface Store { name: string }
interface Call { call_summary: string | null }

export async function POST(req: Request) {
  const { team_id } = await req.json();

  if (!team_id) {
    return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
  }

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id) as Team | undefined;
  if (!team || !team.bolna_agent_id) {
    return NextResponse.json({ error: 'Team not found or no Bolna agent configured' }, { status: 400 });
  }

  const reps = db.prepare('SELECT * FROM reps WHERE team_id = ?').all(team_id) as Rep[];
  let triggered = 0;

  for (const rep of reps) {
    try {
      const stores = db.prepare('SELECT name FROM stores WHERE rep_id = ?').all(rep.id) as Store[];
      const lastCall = db.prepare(
        "SELECT call_summary FROM calls WHERE rep_id = ? AND status = 'completed' ORDER BY called_at DESC LIMIT 1"
      ).get(rep.id) as Call | undefined;

      const response = await makeCall(team.bolna_agent_id, rep.phone, {
        rep_name: rep.name,
        company_name: team.name,
        territory_name: rep.territory,
        store_list: stores.map(s => s.name).join(', '),
        last_call_context: lastCall?.call_summary || 'This is the first check-in call',
      });

      const callId = uuid();
      db.prepare(
        "INSERT INTO calls (id, rep_id, team_id, bolna_execution_id, status, called_at) VALUES (?, ?, ?, ?, 'calling', datetime('now'))"
      ).run(callId, rep.id, team_id, response.execution_id);

      triggered++;
    } catch (err) {
      console.error(`Failed to trigger call for ${rep.name}:`, err);
    }
  }

  return NextResponse.json({ triggered });
}
