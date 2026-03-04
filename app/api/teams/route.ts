import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { createAgent } from '@/lib/bolna';
import { getAgentPromptTemplate } from '@/lib/prompt-builder';
import { v4 as uuid } from 'uuid';

export async function POST(req: Request) {
  const { name, bolna_agent_id } = await req.json();

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  let agentId = bolna_agent_id;

  if (!agentId) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const result = await createAgent({
        agentName: `FieldPulse - ${name}`,
        webhookUrl: `${appUrl}/api/webhook/bolna`,
        systemPrompt: getAgentPromptTemplate(),
      });
      agentId = result.agent_id;
    } catch (err) {
      console.error('Failed to create Bolna agent:', err);
      return NextResponse.json({ error: 'Failed to create Bolna agent' }, { status: 500 });
    }
  }

  const id = uuid();
  const db = getDb();
  db.prepare('INSERT INTO teams (id, name, bolna_agent_id) VALUES (?, ?, ?)').run(id, name, agentId || '');

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
  return NextResponse.json({ team });
}

export async function GET() {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
  return NextResponse.json({ teams });
}
