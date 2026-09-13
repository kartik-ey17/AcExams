'use client';

import { useState, useEffect } from 'react';

interface Course {
  id: string;
  name: string;
  description: string;
}

export default function ContributePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState('');
  const [resourceType, setResourceType] = useState('pdf');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState('');
  const [contributorName, setContributorName] = useState('');
  const [contributorUrl, setContributorUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // For new course creation
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(setCourses)
      .catch(() => setError('Failed to load courses'));
  }, []);

  const createCourse = async () => {
    if (!newCourseName.trim()) return;
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName, description: newCourseDesc }),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) { setError('Please select a course'); return; }
    if (!file && !textContent.trim()) { setError('Please upload a file or enter text content'); return; }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('courseId', courseId);
      formData.append('type', resourceType);
      formData.append('title', title || file?.name || 'Untitled Resource');
      if (file) formData.append('file', file);
      if (textContent) formData.append('textContent', textContent);
      if (contributorName) formData.append('contributorName', contributorName);
      if (contributorUrl) formData.append('contributorUrl', contributorUrl);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(`Resource "${data.resource.title}" added successfully!`);
      // Reset form
      setFile(null);
      setTextContent('');
      setTitle('');
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">📤 Contribute Resources</h1>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✅ {success}
          <button onClick={() => setSuccess('')} className="ml-2 font-bold">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Course Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Course *</label>
          <div className="flex gap-2">
            <select
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="flex-1 border rounded-lg p-2 text-sm"
            >
              <option value="">Select a course...</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewCourse(!showNewCourse)}
              className="px-3 py-2 bg-gray-100 border rounded-lg hover:bg-gray-200 text-sm"
            >
              + New
            </button>
          </div>

          {showNewCourse && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-2">
              <input
                type="text"
                placeholder="Course name"
                value={newCourseName}
                onChange={e => setNewCourseName(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={newCourseDesc}
                onChange={e => setNewCourseDesc(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
              <button
                type="button"
                onClick={createCourse}
                className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Create Course
              </button>
            </div>
          )}
        </div>

        {/* Resource Type */}
        <div>
          <label className="block text-sm font-medium mb-2">Resource Type</label>
          <select
            value={resourceType}
            onChange={e => setResourceType(e.target.value)}
            className="border rounded-lg p-2 text-sm"
          >
            <option value="pdf">PDF Document</option>
            <option value="notes">Handwritten / Typed Notes</option>
            <option value="question-bank">Question Bank</option>
            <option value="topics">Important Topics</option>
            <option value="lecture">Lecture Notes / Module</option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">Resource Title</label>
          <input
            type="text"
            placeholder="e.g. Chapter 3 - Memory Management"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Upload File (PDF)</label>
          <input
            type="file"
            accept=".pdf,.txt,.md"
            onChange={e => setFile(e.target.files?.[0] || null)}
            className="w-full border rounded-lg p-2 text-sm"
          />
        </div>

        {/* OR Text Content */}
        <div>
          <label className="block text-sm font-medium mb-2">Or paste text content directly</label>
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            placeholder="Paste your notes, questions, or topics here..."
            className="w-full h-32 border rounded-lg p-3 text-sm"
          />
        </div>

        {/* Contributor Info (Optional) */}
        <div className="border-t pt-4">
          <p className="text-sm text-gray-500 mb-3">Optional: Contributor Info</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Your Name</label>
              <input
                type="text"
                placeholder="John Doe"
                value={contributorName}
                onChange={e => setContributorName(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GitHub / Portfolio URL</label>
              <input
                type="url"
                placeholder="https://github.com/username"
                value={contributorUrl}
                onChange={e => setContributorUrl(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
        >
          {loading ? '⏳ Uploading...' : '📤 Submit Resource'}
        </button>
      </form>
    </div>
  );
}
