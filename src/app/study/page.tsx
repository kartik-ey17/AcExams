'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Course {
  id: string;
  name: string;
  description: string;
  resources: { id: string; title: string; type: string }[];
}

interface EvaluationResult {
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

  // Load courses on mount
  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(setCourses)
      .catch(() => setError('Failed to load courses'));
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isRecording && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    } else if (isRecording && timeLeft === 0) {
      stopRecording();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRecording, timeLeft]);

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

  const startTest = (topic: string) => {
    setCurrentTopic(topic);
    setTranscript('');
    setEvaluation(null);
    setMicNotice('');
    setStep('test');
  };

  const startRandomTest = () => {
    if (topics.length === 0) return;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    startTest(randomTopic);
  };

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

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
        } else if (event.error === 'service-not-available') {
          setMicNotice('Speech recognition service temporarily unavailable. You can type your viva answer below.');
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            /* ignore */
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
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border p-8">
        <div className="animate-spin inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Analyzing Material...</h3>
        <p className="text-gray-500 text-sm max-w-md mx-auto">{loading}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">🎓 Study Mode</h1>
        {selectedCourse && (
          <span className="text-sm bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
            Course: {selectedCourse.name}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="font-bold hover:text-red-900 ml-4">✕</button>
        </div>
      )}

      {/* STEP 1: Select Course */}
      {step === 'select-course' && (
        <div>
          <h2 className="text-xl font-semibold mb-3">Choose a Course</h2>
          <p className="text-gray-600 text-sm mb-5">
            Select a course to examine its notes, question banks, and start an AI-powered viva.
          </p>
          <div className="grid gap-4">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="text-left bg-white p-5 rounded-xl shadow-sm hover:shadow-md border border-gray-200 hover:border-blue-400 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{course.name}</h3>
                    <p className="text-gray-500 text-sm mt-1">{course.description}</p>
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                    {course.resources.length} resource{course.resources.length === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Course Detail & Resources */}
      {step === 'course-detail' && selectedCourse && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={() => setStep('select-course')}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center font-medium"
          >
            ← Back to all courses
          </button>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedCourse.name}</h2>
          <p className="text-gray-600 text-sm mb-6">{selectedCourse.description}</p>

          <div className="border-t pt-5 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Course Resources ({selectedCourse.resources.length})
            </h3>
            {selectedCourse.resources.length === 0 ? (
              <p className="text-gray-400 text-sm italic">
                No resources uploaded yet.{' '}
                <a href="/contribute" className="text-blue-600 underline">
                  Contribute notes or a PDF!
                </a>
              </p>
            ) : (
              <ul className="space-y-2.5">
                {selectedCourse.resources.map(r => (
                  <li
                    key={r.id}
                    className="p-3.5 bg-gray-50 rounded-lg border border-gray-200 text-sm flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-800">📄 {r.title}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded capitalize font-medium">
                      {r.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selectedCourse.resources.length > 0 && (
            <button
              onClick={generateTopics}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm transition flex items-center justify-center gap-2"
            >
              🚀 Start AI Test
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Topic Selection */}
      {step === 'topics' && (
        <div>
          <button
            onClick={() => setStep('course-detail')}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center font-medium"
          >
            ← Back to course material
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI-Generated Topics</h2>
              <p className="text-gray-500 text-sm">
                Generated from the course knowledge base. Select one or let AI pick:
              </p>
            </div>
            <button
              onClick={startRandomTest}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              🎲 Random Topic
            </button>
          </div>

          <div className="grid gap-2.5">
            {topics.map((topic, i) => (
              <button
                key={i}
                onClick={() => startTest(topic)}
                className="text-left bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 shadow-sm transition group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono group-hover:bg-blue-100 group-hover:text-blue-700">
                    {i + 1}
                  </span>
                  <span className="font-medium text-gray-800 group-hover:text-blue-900 text-sm leading-relaxed">
                    {topic}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Viva Test & Answer Recording */}
      {step === 'test' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <button
            onClick={() => {
              stopRecording();
              setStep('topics');
            }}
            className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-flex items-center font-medium"
          >
            ← Back to topic list
          </button>

          {/* Active Question Banner */}
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-6">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">
              Viva Question / Topic
            </span>
            <p className="text-blue-950 font-semibold text-lg">{currentTopic}</p>
          </div>

          {/* Controls: Duration & Recording */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Speaking Duration:
              </label>
              <div className="flex gap-1.5">
                {[1, 3, 5, 10].map(d => (
                  <button
                    key={d}
                    disabled={isRecording}
                    onClick={() => setDuration(d)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
                      duration === d
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                  <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-medium text-sm">
                    <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
                    <span className="font-mono font-bold text-base">{formatTime(timeLeft)}</span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-black text-sm font-medium transition shadow-sm"
                  >
                    ⏹ Stop Recording
                  </button>
                </>
              ) : (
                <button
                  onClick={startRecording}
                  className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition shadow-sm flex items-center gap-2"
                >
                  🎤 Start Speaking
                </button>
              )}
            </div>
          </div>

          {/* Microphone Notice if permissions / service fail */}
          {micNotice && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3.5 py-2.5 rounded-lg mb-4">
              {micNotice}
            </div>
          )}

          {/* Transcript / Answer Area */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-semibold text-gray-800">
                Your Spoken Answer (Transcript & Text):
              </label>
              {transcript && (
                <button
                  onClick={() => setTranscript('')}
                  className="text-xs text-gray-400 hover:text-red-600 transition"
                >
                  Clear Answer
                </button>
              )}
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Your spoken words will appear here in real time. You can also type or edit your answer directly..."
              className="w-full h-44 p-4 border border-gray-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              💡 You can speak into your microphone or type/edit your response directly in the box above.
            </p>
          </div>

          {/* Submission Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={submitAnswer}
              disabled={!transcript.trim()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-sm transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              📝 Submit for Evaluation
            </button>
            {transcript && (
              <button
                onClick={() => {
                  stopRecording();
                  setTranscript('');
                }}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition"
              >
                🔄 Re-record
              </button>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: AI Evaluation Results */}
      {step === 'evaluation' && evaluation && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Evaluated Topic
                </span>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">{currentTopic}</h2>
              </div>
              <div className="text-center bg-blue-50 border border-blue-100 rounded-xl px-6 py-3 min-w-[130px]">
                <div className="text-4xl font-extrabold text-blue-600">{evaluation.score}</div>
                <div className="text-xs font-medium text-blue-700">out of 100</div>
              </div>
            </div>

            {/* 4 Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
              {[
                { label: 'Concept Accuracy', value: evaluation.conceptAccuracy },
                { label: 'Topic Coverage', value: evaluation.coverage },
                { label: 'Completeness', value: evaluation.completeness },
                { label: 'Clarity & Delivery', value: evaluation.clarity },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3.5 text-center">
                  <div className="text-2xl font-bold text-gray-800">{item.value}%</div>
                  <div className="text-xs text-gray-500 font-medium mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>

            {/* Strengths / Covered */}
            {evaluation.covered.length > 0 && (
              <div className="mb-5 bg-green-50/50 border border-green-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-green-800 flex items-center gap-1.5 mb-2">
                  ✅ What You Covered:
                </h3>
                <ul className="list-disc list-inside text-sm text-green-900 space-y-1">
                  {evaluation.covered.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Missing Concepts */}
            {evaluation.missed.length > 0 && (
              <div className="mb-5 bg-red-50/50 border border-red-100 rounded-xl p-4">
                <h3 className="text-sm font-bold text-red-800 flex items-center gap-1.5 mb-2">
                  ❌ Key Material Missed:
                </h3>
                <ul className="list-disc list-inside text-sm text-red-900 space-y-1">
                  {evaluation.missed.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Feedback */}
            <div className="mb-6 bg-blue-50/50 border border-blue-100 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5 mb-2">
                💡 AI Examiner Feedback:
              </h3>
              <p className="text-sm text-blue-950 leading-relaxed">{evaluation.feedback}</p>
            </div>

            {/* Student's Answer */}
            <div className="border-t border-gray-100 pt-4">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                Your Evaluated Answer:
              </span>
              <p className="text-xs text-gray-600 bg-gray-50 p-3.5 rounded-lg leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {transcript}
              </p>
            </div>
          </div>

          {/* Post-evaluation Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={tryAnotherTopic}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm transition shadow-sm"
            >
              🔄 Try Another Topic
            </button>
            <button
              onClick={() => {
                setStep('select-course');
                setSelectedCourse(null);
                setTopics([]);
                setEvaluation(null);
                setTranscript('');
              }}
              className="px-5 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-sm transition"
            >
              📚 Choose Different Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
