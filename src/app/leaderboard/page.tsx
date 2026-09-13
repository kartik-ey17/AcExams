'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Contributor {
  name: string;
  count: number;
  githubUrl?: string;
  portfolioUrl?: string;
  contributorUrl?: string;
}

export default function LeaderboardPage() {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contributors')
      .then(r => r.json())
      .then(data => setContributors(data.contributors || []))
      .catch(err => console.error('Failed to load contributors:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="surface overflow-hidden rounded-lg">
        <div className="signal-band h-1.5" />
        <div className="p-6 sm:p-7">
          <p className="mono-label text-xs font-black uppercase text-amber-700">campus credits</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">Contributor Leaderboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            A simple thank-you board for students who upload useful course resources. Counts are based on saved resources, not likes or followers.
          </p>
        </div>
      </header>

      <div className="surface overflow-hidden rounded-lg">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase text-slate-500">
          <span>Rank & Contributor</span>
          <span>Contributions</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <span className="mb-2 inline-block h-6 w-6 animate-spin rounded-full border-2 border-cyan-700 border-t-transparent" />
            <p>Loading leaderboard...</p>
          </div>
        ) : contributors.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            No contributions recorded yet. Be the first to contribute.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contributors.map((c, i) => {
              const projectUrl = c.portfolioUrl || c.githubUrl || c.contributorUrl;
              return (
                <div key={c.name} className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50/80">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-xs font-black ${
                      i === 0 ? 'bg-amber-100 text-amber-900' :
                      i === 1 ? 'bg-slate-200 text-slate-800' :
                      i === 2 ? 'bg-emerald-100 text-emerald-900' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                      {projectUrl && (
                        <div className="mt-0.5">
                          <a href={projectUrl} target="_blank" rel="noreferrer" className="inline-flex text-xs font-semibold text-cyan-700 hover:text-cyan-900 hover:underline">
                            View Project / Contributor Perk
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="shrink-0 rounded-md bg-slate-100 px-3 py-1 text-sm font-bold text-gray-700">
                    {c.count} contribution{c.count === 1 ? '' : 's'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/contribute" className="inline-flex rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700">
          Contribute a Resource & Join Leaderboard
        </Link>
      </div>
    </div>
  );
}
