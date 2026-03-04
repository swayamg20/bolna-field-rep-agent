import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { patchAgentPrompt } from '@/lib/bolna';
import { getAgentPromptTemplate } from '@/lib/prompt-builder';

interface Team { id: string; name: string; bolna_agent_id: string }

/**
 * POST /api/agent/setup-prompt
 *
 * One-time setup: patches the Bolna agent's system prompt with the
 * {variable} template. After this, every makeCall() that passes user_data
 * will have the variables substituted automatically by Bolna.
 *
 * Body: { team_id: string }
 */
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

  try {
    const template = getAgentPromptTemplate();
    await patchAgentPrompt(team.bolna_agent_id, template);

    return NextResponse.json({
      success: true,
      agent_id: team.bolna_agent_id,
      message: 'Agent prompt updated with dynamic variable template. Variables like {rep_name}, {priority_stores}, etc. will be substituted from user_data on each call.',
    });
  } catch (err) {
    console.error('Failed to setup agent prompt:', err);
    return NextResponse.json({ error: 'Failed to patch agent prompt' }, { status: 500 });
  }
}
