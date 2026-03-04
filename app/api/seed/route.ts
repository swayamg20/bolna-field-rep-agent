import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

export async function POST() {
  const db = getDb();

  // Clear existing data
  db.exec(`
    DELETE FROM processing_logs;
    DELETE FROM alerts;
    DELETE FROM calls;
    DELETE FROM stores;
    DELETE FROM reps;
    DELETE FROM teams;
  `);

  const teamId = uuid();
  db.prepare(
    'INSERT INTO teams (id, name, bolna_agent_id) VALUES (?, ?, ?)'
  ).run(teamId, 'FreshCo FMCG - North India', process.env.BOLNA_AGENT_ID || '');

  // Reps
  const reps = [
    { id: uuid(), name: 'Rahul Kumar', phone: '+918957370095', territory: 'South Delhi Zone' },
    { id: uuid(), name: 'Priya Singh', phone: '+918957370095', territory: 'East Delhi Zone' },
    { id: uuid(), name: 'Amit Verma', phone: '+919889789389', territory: 'Noida Sector Zone' },
  ];

  const insertRep = db.prepare(
    'INSERT INTO reps (id, team_id, name, phone, territory, performance_score, total_calls) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  reps[0] && insertRep.run(reps[0].id, teamId, reps[0].name, reps[0].phone, reps[0].territory, 3.8, 12);
  reps[1] && insertRep.run(reps[1].id, teamId, reps[1].name, reps[1].phone, reps[1].territory, 3.2, 8);
  reps[2] && insertRep.run(reps[2].id, teamId, reps[2].name, reps[2].phone, reps[2].territory, 2.1, 5);

  // Stores
  const storesData = [
    // Rahul's stores
    { id: uuid(), repId: reps[0].id, name: 'Sharma General Store', area: 'Lajpat Nagar', dso: 3, flag: 'normal' as const },
    { id: uuid(), repId: reps[0].id, name: 'Gupta Medicals', area: 'Sarojini Nagar', dso: 18, flag: 'at_risk' as const },
    { id: uuid(), repId: reps[0].id, name: 'Krishna Supermart', area: 'Green Park', dso: 5, flag: 'normal' as const },
    // Priya's stores
    { id: uuid(), repId: reps[1].id, name: 'Agarwal Kirana', area: 'Preet Vihar', dso: 2, flag: 'normal' as const },
    { id: uuid(), repId: reps[1].id, name: 'New Delhi Pharmacy', area: 'Laxmi Nagar', dso: 7, flag: 'normal' as const },
    { id: uuid(), repId: reps[1].id, name: 'Singh Brothers Wholesale', area: 'Patparganj', dso: 10, flag: 'normal' as const },
    // Amit's stores
    { id: uuid(), repId: reps[2].id, name: 'Metro Grocers', area: 'Sector 18', dso: 4, flag: 'normal' as const },
    { id: uuid(), repId: reps[2].id, name: 'Verma General Store', area: 'Sector 62', dso: 35, flag: 'lost' as const },
    { id: uuid(), repId: reps[2].id, name: 'PharmEasy Retail', area: 'Sector 44', dso: 8, flag: 'normal' as const },
  ];

  const insertStore = db.prepare(
    'INSERT INTO stores (id, rep_id, team_id, name, area, days_since_order, flag) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const s of storesData) {
    insertStore.run(s.id, s.repId, teamId, s.name, s.area, s.dso, s.flag);
  }

  // Pre-existing alerts
  const guptaStore = storesData.find(s => s.name === 'Gupta Medicals')!;
  const vermaStore = storesData.find(s => s.name === 'Verma General Store')!;

  const insertAlert = db.prepare(
    'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id, related_store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  insertAlert.run(
    uuid(), teamId, 'at_risk_store', 'medium',
    "Gupta Medicals hasn't reordered in 18 days",
    'Rep Rahul Kumar did not report reorder. Store may need attention.',
    reps[0].id, guptaStore.id
  );

  insertAlert.run(
    uuid(), teamId, 'at_risk_store', 'high',
    'Verma General Store lost — no order in 35 days',
    'Rep Amit Verma has not secured reorder. Potential lost account.',
    reps[2].id, vermaStore.id
  );

  return NextResponse.json({ success: true, team_id: teamId });
}
