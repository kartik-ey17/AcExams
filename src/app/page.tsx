import Link from "next/link";

const steps = [
  {
    label: "01",
    title: "Upload notes",
    copy: "Add PDFs, modules, question banks, or pasted notes to a course.",
  },
  {
    label: "02",
    title: "Pick a viva topic",
    copy: "StudySpeak generates topics only from the material students uploaded.",
  },
  {
    label: "03",
    title: "Speak and get scored",
    copy: "Practice out loud, then see covered concepts, missed concepts, and concise feedback.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <section className="surface overflow-hidden rounded-lg">
        <div className="signal-band h-2" />
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="mono-label rounded bg-slate-950 px-2.5 py-1 text-xs font-bold uppercase text-emerald-300">
                Ace Your Exams
              </span>
              <span className="rounded bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-800 ring-1 ring-cyan-100">
                grounded AI exam prep
              </span>
            </div>

            <h1 className="max-w-2xl text-4xl font-black tracking-normal text-slate-950 sm:text-5xl">
              AcExams
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Turn class resources into exam practice. Upload course material,
              choose a generated topic, speak your answer, and get feedback that
              is checked against the notes your batch actually uses.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/study"
                className="inline-flex items-center justify-center rounded-md bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-cyan-950"
              >
                Start Study Mode
              </Link>
              <Link
                href="/contribute"
                className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                Contribute Resources
              </Link>
            </div>
          </div>

          <div className="soft-panel rounded-lg p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="mono-label text-xs font-bold uppercase text-slate-500">live practice loop</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-3">
              <div className="rounded-md bg-white p-4 ring-1 ring-slate-200">
                <p className="mono-label text-[11px] font-bold uppercase text-cyan-700">Resource</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  Module 5: Concurrency and Synchronization
                </p>
              </div>
              <div className="rounded-md bg-slate-950 p-4 text-white">
                <p className="mono-label text-[11px] font-bold uppercase text-emerald-300">Viva prompt</p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  Explain semaphores and the critical section problem using the uploaded module.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md bg-white p-3 text-center ring-1 ring-slate-200">
                  <p className="text-xl font-black text-slate-950">84</p>
                  <p className="mono-label text-[10px] uppercase text-slate-500">score</p>
                </div>
                <div className="rounded-md bg-white p-3 text-center ring-1 ring-slate-200">
                  <p className="text-xl font-black text-emerald-700">6</p>
                  <p className="mono-label text-[10px] uppercase text-slate-500">covered</p>
                </div>
                <div className="rounded-md bg-white p-3 text-center ring-1 ring-slate-200">
                  <p className="text-xl font-black text-amber-700">2</p>
                  <p className="mono-label text-[10px] uppercase text-slate-500">missing</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map(step => (
          <div key={step.label} className="surface rounded-lg p-5">
            <span className="mono-label text-xs font-black text-cyan-700">{step.label}</span>
            <h2 className="mt-3 text-lg font-bold text-slate-950">{step.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{step.copy}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
