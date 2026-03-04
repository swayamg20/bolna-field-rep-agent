import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { patchAgentWebhook } from '@/lib/bolna';

interface Team { id: string; name: string; bolna_agent_id: string }

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const webhookUrl = `${appUrl}/api/webhook/bolna`;

  try {
    await patchAgentWebhook(team.bolna_agent_id, webhookUrl);
    return NextResponse.json({ success: true, webhook_url: webhookUrl });
  } catch (err) {
    console.error('Failed to update webhook URL:', err);
    return NextResponse.json({ error: 'Failed to update webhook URL' }, { status: 500 });
  }
}
