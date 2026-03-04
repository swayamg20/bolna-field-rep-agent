import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { makeCall, CallUserData } from '@/lib/bolna';
import { buildCallQueue } from '@/lib/scheduler';
import { buildCallContext, buildUserData } from '@/lib/prompt-builder';
import { v4 as uuid } from 'uuid';

interface Team { id: string; name: string; bolna_agent_id: string }

export async function POST(req: Request) {
  const { team_id, max_concurrent = 3 } = await req.json();

  if (!team_id) {
    return NextResponse.json({ error: 'team_id is required' }, { status: 400 });
  }

  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(team_id) as Team | undefined;
  if (!team || !team.bolna_agent_id) {
    return NextResponse.json({ error: 'Team not found or no Bolna agent configured' }, { status: 400 });
  }

  const queue = buildCallQueue(team_id);
  const toCall = queue.slice(0, max_concurrent);
  const remaining = queue.slice(max_concurrent);

  const triggered: Array<{
    rep_id: string;
    rep_name: string;
    call_id: string;
    execution_id: string;
    priority_score: number;
    priority_reasons: string[];
  }> = [];

  for (const item of toCall) {
    try {
      const context = buildCallContext(item.rep_id, team_id);
      const userData = buildUserData(context);

      const response = await makeCall(
        team.bolna_agent_id,
        item.phone,
        userData as unknown as CallUserData
      );

      const callId = uuid();
      db.prepare(
        "INSERT INTO calls (id, rep_id, team_id, bolna_execution_id, status, called_at) VALUES (?, ?, ?, ?, 'calling', datetime('now'))"
      ).run(callId, item.rep_id, team_id, response.execution_id);

      triggered.push({
        rep_id: item.rep_id,
        rep_name: item.rep_name,
        call_id: callId,
        execution_id: response.execution_id,
        priority_score: item.priority_score,
        priority_reasons: item.priority_reasons,
      });
    } catch (err) {
      console.error(`Failed to trigger smart call for ${item.rep_name}:`, err);
    }
  }

  return NextResponse.json({
    triggered,
    queued: remaining.map(item => ({
      rep_id: item.rep_id,
      rep_name: item.rep_name,
      priority_score: item.priority_score,
      priority_reasons: item.priority_reasons,
    })),
    total: queue.length,
  });
}
