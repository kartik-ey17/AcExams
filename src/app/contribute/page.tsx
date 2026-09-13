'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Course {
  id: string;
  name: string;
  description: string;
  resources?: { id: string; title: string }[];
}

interface SubmittedResource {
  id: string;
  title: string;
  type: string;
  courseId: string;
  contributorName?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export default function ContributePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [resourceType, setResourceType] = useState('Lecture Notes');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [successResource, setSuccessResource] = useState<SubmittedResource | null>(null);
  const [error, setError] = useState('');

  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(data => {
        setCourses(data);
        if (data.length > 0 && !courseId) setCourseId(data[0].id);
      })
      .catch(() => setError('Failed to load courses'));
  }, [courseId]);

  const createCourse = async () => {
    if (!newCourseName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName.trim(), description: newCourseDesc.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCourses(prev => [...prev, data]);
      setCourseId(data.id);
      setShowNewCourse(false);
      setNewCourseName('');
      setNewCourseDesc('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create course');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setFile(selected);
    if (selected && !title) setTitle(selected.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) {
      setError('Please select a course for your resource');
      return;
    }
    if (!file && !textContent.trim()) {
      setError('Please select a PDF file to upload or paste text notes');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessResource(null);

    try {
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('type', resourceType);
      formData.append('title', title.trim() || file?.name || 'Untitled Resource');
      if (file) formData.append('file', file);
      if (textContent.trim()) formData.append('textContent', textContent.trim());
      if (contributorName.trim()) formData.append('contributorName', contributorName.trim());
      if (githubUrl.trim()) formData.append('githubUrl', githubUrl.trim());
      if (portfolioUrl.trim()) formData.append('portfolioUrl', portfolioUrl.trim());

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessResource(data.resource);
      setFile(null);
      setTextContent('');
      setTitle('');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseName = courses.find(c => c.id === courseId)?.name || 'the course';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="surface overflow-hidden rounded-lg">
        <div className="signal-band h-1.5" />
        <div className="grid gap-5 p-6 sm:p-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="mono-label text-xs font-black uppercase text-emerald-700">resource drop</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Contribute Course Resources</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add lecture notes, modules, question banks, or important topics. Once saved, they appear in Study Mode and become part of the AI viva knowledge base.
            </p>
          </div>
          <Link href="/leaderboard" className="inline-flex justify-center rounded-md bg-amber-100 px-4 py-2.5 text-sm font-bold text-amber-900 ring-1 ring-amber-200 hover:bg-amber-200">
            View Contributor Leaderboard
          </Link>
        </div>
      </header>

      {successResource && (
        <div className="bg-green-50 rounded-lg border border-emerald-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mono-label text-xs font-black uppercase text-emerald-700">published</p>
              <h3 className="mt-1 text-lg font-black text-emerald-950">Contribution Successful!</h3>
              <p className="mt-1 text-sm text-emerald-800">
                <strong>&quot;{successResource.title}&quot;</strong> ({successResource.type}) has been added to <strong>{selectedCourseName}</strong>.
              </p>
              {(successResource.contributorName || successResource.githubUrl || successResource.portfolioUrl) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-800">
                  <span className="font-semibold">Contributor Perk:</span>
                  {successResource.contributorName && <span>{successResource.contributorName}</span>}
                  {successResource.githubUrl && <a href={successResource.githubUrl} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline">GitHub</a>}
                  {successResource.portfolioUrl && <a href={successResource.portfolioUrl} target="_blank" rel="noreferrer" className="font-semibold text-cyan-700 underline">Portfolio / Project</a>}
                </div>
              )}
            </div>
            <button onClick={() => setSuccessResource(null)} className="text-sm font-black text-emerald-700 hover:text-emerald-950">x</button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 border-t border-emerald-200 pt-4">
            <Link href="/study" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-950">
              Practice with this Resource in Study Mode
            </Link>
            <button onClick={() => setSuccessResource(null)} className="rounded-md border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              Contribute Another Resource
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span className="text-sm">{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-bold hover:text-red-900">x</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface rounded-lg p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">1. Select Course <span className="text-red-500">*</span></label>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <select value={courseId} onChange={e => setCourseId(e.target.value)} className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowNewCourse(!showNewCourse)} className="rounded-md bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                  + New Course
                </button>
              </div>
              {showNewCourse && (
                <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <h4 className="mono-label text-xs font-black uppercase text-slate-500">Create New Course</h4>
                  <input type="text" placeholder="Course Name (e.g. Distributed Systems)" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" />
                  <input type="text" placeholder="Course Description (optional)" value={newCourseDesc} onChange={e => setNewCourseDesc(e.target.value)} className="w-full rounded-md border border-slate-300 p-2.5 text-sm" />
                  <button type="button" onClick={createCourse} className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-800">Save Course</button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">2. Resource Type <span className="text-red-500">*</span></label>
              <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100">
                <option value="Lecture Notes">Lecture Notes</option>
                <option value="Module">Module</option>
                <option value="Question Bank">Question Bank</option>
                <option value="Important Topics">Important Topics</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-800">Resource Title (Optional)</label>
              <input type="text" placeholder="e.g. Module 4 - Memory Management & Paging" value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-md border border-slate-300 px-3.5 py-2.5 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-bold text-slate-800">3. Upload Resource File (PDF) <span className="text-red-500">*</span></label>
              <p className="mb-2 text-xs text-slate-500">PDF text is extracted automatically and used as the AI knowledge base.</p>
              <div className="rounded-lg border-2 border-dashed border-cyan-200 bg-cyan-50/50 p-5 text-center transition hover:border-cyan-400">
                <input type="file" accept=".pdf,.txt,.md" onChange={handleFileChange} className="block w-full cursor-pointer text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-700 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-cyan-800" />
                {file && <p className="mt-2 text-xs font-semibold text-cyan-800">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mono-label mb-1 block text-xs font-black uppercase text-slate-500">Or Paste Notes / Text Directly</label>
              <textarea value={textContent} onChange={e => setTextContent(e.target.value)} placeholder="Paste syllabus modules, lecture summaries, or question bank lists here..." className="h-36 w-full rounded-md border border-slate-300 p-3 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100" />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-800">Contributor Perks (Optional)</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">Show your name and one project link beside the resource and on the leaderboard.</p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Contributor Name</label>
                  <input type="text" placeholder="e.g. Alex Rivera" value={contributorName} onChange={e => setContributorName(e.target.value)} className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">GitHub Profile URL</label>
                  <input type="url" placeholder="https://github.com/username" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Portfolio / Project URL</label>
                  <input type="url" placeholder="https://portfolio.dev" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} className="w-full rounded-md border border-slate-300 px-3.5 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100" />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Extracting Text & Saving Resource...
                </>
              ) : (
                'Save & Publish Resource'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
