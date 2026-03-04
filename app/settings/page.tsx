'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Settings() {
  const [toast, setToast] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Add rep form
  const [repForm, setRepForm] = useState({ name: '', phone: '', territory: '', team_id: '' });
  const [addingRep, setAddingRep] = useState(false);

  // Add store form
  const [storeForm, setStoreForm] = useState({ name: '', area: '', rep_id: '', team_id: '' });
  const [addingStore, setAddingStore] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        showToast('Demo data seeded successfully');
      }
    } finally {
      setSeeding(false);
    }
  };

  const handleAddRep = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingRep(true);
    try {
      // Get team_id from existing teams
      const teamsRes = await fetch('/api/teams');
      const { teams } = await teamsRes.json();
      if (!teams || teams.length === 0) {
        showToast('No team found. Seed data first.');
        return;
      }

      const res = await fetch('/api/reps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...repForm, team_id: teams[0].id }),
      });
      if (res.ok) {
        showToast('Rep added');
        setRepForm({ name: '', phone: '', territory: '', team_id: '' });
      } else {
        const err = await res.json();
        showToast(`Error: ${err.error}`);
      }
    } finally {
      setAddingRep(false);
    }
  };

  const handleAddStore = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStore(true);
    try {
      const teamsRes = await fetch('/api/teams');
      const { teams } = await teamsRes.json();
      if (!teams || teams.length === 0) {
        showToast('No team found. Seed data first.');
        return;
      }

      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...storeForm, team_id: teams[0].id }),
      });
      if (res.ok) {
        showToast('Store added');
        setStoreForm({ name: '', area: '', rep_id: '', team_id: '' });
      } else {
        const err = await res.json();
        showToast(`Error: ${err.error}`);
      }
    } finally {
      setAddingStore(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold mt-2">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Seed Data */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-2">Demo Data</h2>
          <p className="text-sm text-gray-500 mb-4">
            Seed or reset the database with demo data including a team, 3 reps, 9 stores, and pre-existing alerts.
          </p>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </button>
        </section>

        {/* Add Rep */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Add Rep</h2>
          <form onSubmit={handleAddRep} className="space-y-3">
            <input
              type="text"
              placeholder="Name"
              value={repForm.name}
              onChange={(e) => setRepForm({ ...repForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Phone (+91...)"
              value={repForm.phone}
              onChange={(e) => setRepForm({ ...repForm, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Territory"
              value={repForm.territory}
              onChange={(e) => setRepForm({ ...repForm, territory: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <button
              type="submit"
              disabled={addingRep}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {addingRep ? 'Adding...' : 'Add Rep'}
            </button>
          </form>
        </section>

        {/* Add Store */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Add Store</h2>
          <form onSubmit={handleAddStore} className="space-y-3">
            <input
              type="text"
              placeholder="Store Name"
              value={storeForm.name}
              onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Area"
              value={storeForm.area}
              onChange={(e) => setStoreForm({ ...storeForm, area: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <input
              type="text"
              placeholder="Rep ID (paste from rep detail page URL)"
              value={storeForm.rep_id}
              onChange={(e) => setStoreForm({ ...storeForm, rep_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              required
            />
            <button
              type="submit"
              disabled={addingStore}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {addingStore ? 'Adding...' : 'Add Store'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
