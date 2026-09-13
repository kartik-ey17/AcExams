'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Course {
  id: string;
  name: string;
  description: string;
  resources: {
    id: string;
    title: string;
    type: string;
    contributorName?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    contributorUrl?: string;
  }[];
}

interface EvaluationResult {
  overall_score?: number;
  concept_accuracy?: number;
  covered_concepts?: string[];
  missing_concepts?: string[];
  score: number;
  conceptAccuracy: number;
  coverage: number;
  completeness: number;
  clarity: number;
  covered: string[];
  missed: string[];
  feedback: string;
}

type Step = 'select-course' | 'course-detail' | 'topics' | 'test' | 'evaluation';

export default function StudyPage() {
  const [step, setStep] = useState<Step>('select-course');
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [duration, setDuration] = useState(3);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [micNotice, setMicNotice] = useState('');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(setCourses)
      .catch(() => setError('Failed to load courses'));
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* browser may already have stopped recording */
      }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRecording, timeLeft, stopRecording]);

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setStep('course-detail');
    setError('');
  };

  const generateTopics = async () => {
    if (!selectedCourse) return;
    setLoading('AI is analyzing course resources and generating viva topics...');
    setError('');
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTopics(data.topics);
      setStep('topics');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate topics');
    } finally {
      setLoading('');
    }
  };

  const startTest = async (topic: string) => {
    if (!selectedCourse) return;
    setLoading('AI is creating a viva prompt from the selected course resources...');
    setError('');
    setCurrentTopic(topic);
    setCurrentQuestion('');
    setTranscript('');
    setEvaluation(null);
    setMicNotice('');
    try {
      const res = await fetch('/api/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse.id, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentQuestion(data.question || `Explain ${topic} using the uploaded course resources.`);
      setStep('test');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate a viva question. Please try another topic.');
    } finally {
      setLoading('');
    }
  };

  const startRandomTest = () => {
    if (topics.length === 0) return;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    void startTest(randomTopic);
  };

  const startRecording = useCallback(() => {
    setTimeLeft(duration * 60);
    setMicNotice('');

    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setMicNotice('Speech recognition is not supported in this browser. Please type your answer directly in the box below.');
      setIsRecording(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let accumulated = transcript ? transcript + ' ' : '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            accumulated += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(accumulated + interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition status:', event.error);
        if (event.error === 'not-allowed') {
          setMicNotice('Microphone permission was denied. You can type your viva answer below.');
        } else if (event.error === 'service-not-available' || event.error === 'audio-capture') {
          setMicNotice('Speech recognition is not available right now. You can type your viva answer below.');
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            /* ignore restart race */
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      console.warn('Speech recognition init error:', e);
      setMicNotice('Could not start microphone. You can type your viva answer below.');
      setIsRecording(true);
    }
  }, [duration, transcript]);

  const submitAnswer = async () => {
    if (!selectedCourse || !transcript.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    stopRecording();
    setLoading('AI is evaluating your viva answer against the course material...');
    setError('');
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          topic: currentTopic,
          question: currentQuestion,
          transcript: transcript.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvaluation(data);
      setStep('evaluation');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to evaluate answer');
    } finally {
      setLoading('');
    }
  };

  const tryAnotherTopic = () => {
    setEvaluation(null);
    setTranscript('');
    setMicNotice('');
    setStep('topics');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="surface rounded-lg p-10 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-cyan-700 border-t-transparent" />
        <h3 className="text-lg font-bold text-slate-950">Reading the resource stack</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{loading}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="surface overflow-hidden rounded-lg">
        <div className="signal-band h-1.5" />
        <div className="flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-end">
          <div>
            <p className="mono-label text-xs font-black uppercase text-cyan-700">practice lab</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">Study Mode</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Pick a course, inspect its resources, then answer a viva prompt generated from those exact materials.
            </p>
          </div>
          {selectedCourse && (
            <span className="self-start rounded-md bg-cyan-50 px-3 py-1.5 text-sm font-semibold text-cyan-800 ring-1 ring-cyan-100 sm:self-auto">
              Course: {selectedCourse.name}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-4 font-bold hover:text-red-900">x</button>
        </div>
      )}

      {step === 'select-course' && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Choose a Course</h2>
            <p className="mt-1 text-sm text-slate-600">
              Select a course to examine its notes, question banks, and start an AI-powered viva.
            </p>
          </div>
          <div className="grid gap-4">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="surface group rounded-lg p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-950 group-hover:text-cyan-800">{course.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{course.description}</p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {course.resources.length} resource{course.resources.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'course-detail' && selectedCourse && (
        <section className="surface rounded-lg p-6">
          <button onClick={() => setStep('select-course')} className="mb-4 text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            Back to all courses
          </button>
          <h2 className="text-2xl font-black text-slate-950">{selectedCourse.name}</h2>
          <p className="mt-2 text-sm text-slate-600">{selectedCourse.description}</p>

          <div className="my-6 border-t border-slate-200 pt-5">
            <h3 className="mb-3 text-lg font-bold text-slate-950">Course Resources ({selectedCourse.resources.length})</h3>
            {selectedCourse.resources.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No resources uploaded yet. <a href="/contribute" className="font-semibold text-cyan-700 underline">Contribute notes or a PDF.</a>
              </p>
            ) : (
              <ul className="space-y-2.5">
                {selectedCourse.resources.map(r => (
                  <li key={r.id} className="flex flex-col justify-between gap-2 rounded-md border border-slate-200 bg-slate-50/80 p-3.5 text-sm sm:flex-row sm:items-center">
                    <div>
                      <span className="font-semibold text-slate-800">{r.title}</span>
                      {(r.contributorName || r.githubUrl || r.portfolioUrl || r.contributorUrl) && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                          <span>Contributed by:</span>
                          <span className="font-semibold text-slate-700">{r.contributorName || 'Anonymous'}</span>
                          {r.githubUrl && <a href={r.githubUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-700 hover:underline">[GitHub]</a>}
                          {(r.portfolioUrl || r.contributorUrl) && <a href={r.portfolioUrl || r.contributorUrl} target="_blank" rel="noreferrer" className="font-medium text-cyan-700 hover:underline">[Portfolio]</a>}
                        </div>
                      )}
                    </div>
                    <span className="self-start rounded bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800 sm:self-center">{r.type}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedCourse.resources.length > 0 && (
            <button onClick={generateTopics} className="flex w-full justify-center rounded-md bg-slate-950 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-cyan-950 sm:w-auto">
              Start AI Test
            </button>
          )}
        </section>
      )}

      {step === 'topics' && (
        <section className="space-y-5">
          <button onClick={() => setStep('course-detail')} className="text-sm font-semibold text-cyan-700 hover:text-cyan-900">
            Back to course material
          </button>
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-black text-slate-950">AI-Generated Topics</h2>
              <p className="text-sm text-slate-500">Generated from uploaded course resources. Select one or let AI pick.</p>
            </div>
            <button onClick={startRandomTest} className="self-start rounded-md bg-cyan-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800 sm:self-auto">
              Random Topic
            </button>
          </div>
          <div className="grid gap-2.5">
            {topics.map((topic, i) => (
              <button key={i} onClick={() => void startTest(topic)} className="surface group rounded-lg p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300">
                <div className="flex items-start gap-3">
                  <span className="mono-label rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 group-hover:bg-cyan-100 group-hover:text-cyan-800">{i + 1}</span>
                  <span className="text-sm font-semibold leading-relaxed text-slate-800 group-hover:text-cyan-900">{topic}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 'test' && (
        <section className="surface rounded-lg p-6">
          <button
            onClick={() => {
              stopRecording();
              setStep('topics');
            }}
            className="mb-4 text-sm font-semibold text-cyan-700 hover:text-cyan-900"
          >
            Back to topic list
          </button>

          <div className="mb-6 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
            <span className="mono-label mb-1 block text-xs font-black uppercase text-cyan-700">Viva Question / Topic</span>
            <p className="text-blue-950 text-lg font-bold">{currentQuestion || currentTopic}</p>
            {currentQuestion && currentQuestion !== currentTopic && (
              <p className="mt-2 text-xs text-cyan-800">Topic: {currentTopic}</p>
            )}
          </div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <label className="mono-label mb-2 block text-xs font-black uppercase text-slate-500">Speaking Duration</label>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map(d => (
                  <button
                    key={d}
                    disabled={isRecording}
                    onClick={() => setDuration(d)}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-bold transition ${
                      duration === d ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    } disabled:opacity-50`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isRecording ? (
                <>
                  <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-600">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                    <span className="mono-label text-base font-black">{formatTime(timeLeft)}</span>
                  </div>
                  <button onClick={stopRecording} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-black">
                    Stop Recording
                  </button>
                </>
              ) : (
                <button onClick={startRecording} className="rounded-md bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700">
                  Start Speaking
                </button>
              )}
            </div>
          </div>

          {micNotice && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800">{micNotice}</div>
          )}

          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-bold text-slate-800">Your Spoken Answer (Transcript & Text)</label>
              {transcript && <button onClick={() => setTranscript('')} className="text-xs font-semibold text-slate-400 transition hover:text-red-600">Clear Answer</button>}
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Your spoken words will appear here in real time. You can also type or edit your answer directly..."
              className="h-44 w-full resize-y rounded-lg border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-800 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-100"
            />
            <p className="mt-1 text-xs text-slate-400">You can speak into your microphone or type/edit your response directly in the box above.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={submitAnswer} disabled={!transcript.trim()} className="rounded-md bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
              Submit for Evaluation
            </button>
            {transcript && (
              <button
                onClick={() => {
                  stopRecording();
                  setTranscript('');
                }}
                className="rounded-md bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
              >
                Re-record
              </button>
            )}
          </div>
        </section>
      )}

      {step === 'evaluation' && evaluation && (
        <section className="space-y-5">
          <div className="surface rounded-lg p-6">
            <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
              <div>
                <span className="mono-label text-xs font-black uppercase text-slate-400">Evaluated Topic</span>
                <h2 className="mt-1 text-lg font-black text-slate-950">{currentQuestion || currentTopic}</h2>
              </div>
              <div className="min-w-[130px] rounded-lg border border-cyan-100 bg-cyan-50 px-6 py-3 text-center">
                <div className="text-4xl font-black text-cyan-700">{evaluation.score}</div>
                <div className="text-xs font-semibold text-cyan-800">out of 100</div>
              </div>
            </div>

            <div className="my-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Concept Accuracy', value: evaluation.conceptAccuracy },
                { label: 'Topic Coverage', value: evaluation.coverage },
                { label: 'Completeness', value: evaluation.completeness },
                { label: 'Clarity & Delivery', value: evaluation.clarity },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-center">
                  <div className="text-2xl font-black text-slate-800">{item.value}%</div>
                  <div className="mt-0.5 text-xs font-semibold text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>

            {evaluation.covered.length > 0 && (
              <div className="mb-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                <h3 className="mb-2 text-sm font-black text-emerald-800">What You Covered:</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-green-900">
                  {evaluation.covered.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}

            {evaluation.missed.length > 0 && (
              <div className="mb-5 rounded-lg border border-red-100 bg-red-50 p-4">
                <h3 className="mb-2 text-sm font-black text-red-800">Key Material Missed:</h3>
                <ul className="list-inside list-disc space-y-1 text-sm text-red-900">
                  {evaluation.missed.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            )}

            <div className="mb-6 rounded-lg border border-cyan-100 bg-cyan-50 p-4">
              <h3 className="mb-2 text-sm font-black text-cyan-950">AI Examiner Feedback:</h3>
              <p className="text-sm leading-relaxed text-blue-950">{evaluation.feedback}</p>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <span className="mono-label mb-1.5 block text-xs font-black uppercase text-slate-400">Your Evaluated Answer</span>
              <p className="max-h-32 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">{transcript}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={tryAnotherTopic} className="rounded-md bg-cyan-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800">
              Try Another Topic
            </button>
            <button
              onClick={() => {
                setStep('select-course');
                setSelectedCourse(null);
                setTopics([]);
                setEvaluation(null);
                setTranscript('');
              }}
              className="rounded-md bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
            >
              Choose Different Course
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
