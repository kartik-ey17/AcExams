'use client';

import { useEffect, useMemo, useState } from 'react';

const unlockKeys = ['v', 'i', 'v', 'a'];
const burstWords = ['VIVA', 'FOCUS', 'NOTES', 'AI', 'SCORE', 'READY'];

export default function AppChrome({ children }: { children: React.ReactNode }) {
  const [typed, setTyped] = useState('');
  const [showBoost, setShowBoost] = useState(false);
  const [burstId, setBurstId] = useState(0);

  const bursts = useMemo(
    () =>
      burstWords.map((word, index) => ({
        word,
        left: `${18 + index * 12}%`,
        delay: `${index * 80}ms`,
      })),
    []
  );

  useEffect(() => {
    const root = document.documentElement;

    const handlePointerMove = (event: PointerEvent) => {
      root.style.setProperty('--mx', `${event.clientX}px`);
      root.style.setProperty('--my', `${event.clientY}px`);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const next = `${typed}${event.key.toLowerCase()}`.slice(-unlockKeys.length);
      setTyped(next);

      if (next === unlockKeys.join('')) {
        setShowBoost(true);
        setBurstId(id => id + 1);
        window.setTimeout(() => setShowBoost(false), 1800);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [typed]);

  return (
    <>
      <div className="ambient-layer" aria-hidden="true">
        <div className="scanline" />
        <div className="cursor-signal" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <nav className="app-shell sticky top-3 z-20 flex items-center justify-between rounded-lg px-3 py-2.5 sm:px-4">
          <a href="/" className="group flex min-w-0 items-center gap-2 text-slate-950">
            <span className="logo-tile grid h-8 w-8 shrink-0 place-items-center rounded-md bg-slate-950 text-sm font-black text-emerald-300">
              A
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black leading-tight">AcExams</span>
              <span className="mono-label hidden text-[10px] uppercase text-slate-500 sm:block">
                resource-grounded exam prep
              </span>
            </span>
          </a>
          <div className="flex items-center gap-1 rounded-md bg-slate-100/80 p-1">
            <a href="/study" className="nav-chip rounded px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-cyan-700 sm:px-3">
              Study
            </a>
            <a href="/contribute" className="nav-chip rounded px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-emerald-700 sm:px-3">
              Contribute
            </a>
            <a href="/leaderboard" className="nav-chip rounded px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-white hover:text-amber-700 sm:px-3">
              Leaderboard
            </a>
          </div>
        </nav>
        <main className="flex-1 py-6 sm:py-8">{children}</main>
      </div>

      {showBoost && (
        <div key={burstId} className="boost-toast" role="status">
          <span className="mono-label text-[10px] font-black uppercase text-emerald-300">focus streak</span>
          <span className="text-sm font-black text-white">Viva mode warmed up</span>
          {bursts.map(item => (
            <span
              key={`${burstId}-${item.word}`}
              className="burst-word mono-label"
              style={{ left: item.left, animationDelay: item.delay }}
            >
              {item.word}
            </span>
          ))}
        </div>
      )}
    </>
  );
}
