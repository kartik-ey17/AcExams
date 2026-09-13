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
  const [useFallbackInput, setUseFallbackInput] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load courses
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isRecording, timeLeft]);

  const selectCourse = (course: Course) => {
    setSelectedCourse(course);
    setStep('course-detail');
    setError('');
  };

  const generateTopics = async () => {
    if (!selectedCourse) return;
    setLoading('Generating topics from course resources...');
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
    setStep('test');
  };

  const startRandomTest = () => {
    if (topics.length === 0) return;
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    startTest(randomTopic);
  };

  const startRecording = useCallback(() => {
    setTranscript('');
    setTimeLeft(duration * 60);

    // Check for Speech Recognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setUseFallbackInput(true);
      setIsRecording(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript + interim);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-available') {
          setUseFallbackInput(true);
        }
      };

      recognition.onend = () => {
        // Restart if still recording
        if (recognitionRef.current) {
          try { recognition.start(); } catch { /* ignore */ }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      setUseFallbackInput(true);
      setIsRecording(true);
    }
  }, [duration]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const submitAnswer = async () => {
    if (!selectedCourse || !transcript.trim()) {
      setError('Please provide an answer before submitting.');
      return;
    }
    setLoading('AI is evaluating your answer...');
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
    setStep('topics');
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
        <p className="text-gray-600">{loading}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">🎓 Study Mode</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">✕</button>
        </div>
      )}

      {/* Step 1: Select Course */}
      {step === 'select-course' && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Course</h2>
          <div className="grid gap-4">
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="text-left bg-white p-4 rounded-lg shadow hover:shadow-md border hover:border-blue-300 transition"
              >
                <h3 className="font-semibold text-lg">{course.name}</h3>
                <p className="text-gray-500 text-sm">{course.description}</p>
                <p className="text-xs text-gray-400 mt-1">{course.resources.length} resource(s)</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Course Detail */}
      {step === 'course-detail' && selectedCourse && (
        <div>
          <button onClick={() => setStep('select-course')} className="text-blue-600 text-sm mb-4 block">← Back to courses</button>
          <h2 className="text-xl font-semibold mb-2">{selectedCourse.name}</h2>
          <p className="text-gray-500 mb-4">{selectedCourse.description}</p>

          <h3 className="font-semibold mb-2">Resources ({selectedCourse.resources.length})</h3>
          {selectedCourse.resources.length === 0 ? (
            <p className="text-gray-400 italic">No resources yet. <a href="/contribute" className="text-blue-600">Add some!</a></p>
          ) : (
            <ul className="mb-6 space-y-2">
              {selectedCourse.resources.map(r => (
                <li key={r.id} className="bg-white p-3 rounded border text-sm">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-gray-400 ml-2">({r.type})</span>
                </li>
              ))}
            </ul>
          )}

          {selectedCourse.resources.length > 0 && (
            <button
              onClick={generateTopics}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🚀 Start AI Test
            </button>
          )}
        </div>
      )}

      {/* Step 3: Topics */}
      {step === 'topics' && (
        <div>
          <button onClick={() => setStep('course-detail')} className="text-blue-600 text-sm mb-4 block">← Back to course</button>
          <h2 className="text-xl font-semibold mb-4">AI-Generated Topics</h2>
          <p className="text-gray-500 text-sm mb-4">Pick a topic or get a random one:</p>

          <button
            onClick={startRandomTest}
            className="mb-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            🎲 Random Topic
          </button>

          <div className="grid gap-2">
            {topics.map((topic, i) => (
              <button
                key={i}
                onClick={() => startTest(topic)}
                className="text-left bg-white p-3 rounded-lg border hover:border-blue-300 hover:bg-blue-50 transition text-sm"
              >
                {i + 1}. {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Test / Recording */}
      {step === 'test' && (
        <div>
          <button onClick={() => { stopRecording(); setStep('topics'); }} className="text-blue-600 text-sm mb-4 block">← Back to topics</button>
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h2 className="font-semibold text-lg mb-1">Topic:</h2>
            <p className="text-blue-800">{currentTopic}</p>
          </div>

          {!isRecording && !transcript && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Speaking Duration:</label>
              <div className="flex gap-2">
                {[1, 3, 5, 10].map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`px-4 py-2 rounded-lg border ${duration === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isRecording && !transcript && (
            <button
              onClick={startRecording}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              🎤 Start Speaking
            </button>
          )}

          {isRecording && (
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-4">
                <span className="inline-flex items-center gap-2 text-red-600 font-semibold">
                  <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
                  Recording
                </span>
                <span className="text-2xl font-mono font-bold">{formatTime(timeLeft)}</span>
                <button
                  onClick={stopRecording}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  ⏹ Stop
                </button>
              </div>

              {useFallbackInput && (
                <div className="mb-4">
                  <p className="text-sm text-amber-600 mb-2">⚠️ Microphone not available. Type your answer instead:</p>
                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    className="w-full h-40 p-3 border rounded-lg text-sm"
                    placeholder="Type your answer here..."
                  />
                </div>
              )}
            </div>
          )}

          {transcript && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Your Answer (Transcript):</h3>
              <div className="bg-white p-4 rounded-lg border text-sm whitespace-pre-wrap max-h-60 overflow-y-auto">
                {transcript || <span className="text-gray-400 italic">No speech detected yet...</span>}
              </div>
            </div>
          )}

          {!isRecording && transcript && (
            <div className="flex gap-3">
              <button
                onClick={submitAnswer}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                📝 Submit for Evaluation
              </button>
              <button
                onClick={() => { setTranscript(''); setUseFallbackInput(false); }}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                🔄 Re-record
              </button>
            </div>
          )}

          {/* Fallback text input when not recording */}
          {!isRecording && !transcript && (
            <div className="mt-6 border-t pt-4">
              <p className="text-sm text-gray-500 mb-2">Or type your answer instead:</p>
              <textarea
                className="w-full h-32 p-3 border rounded-lg text-sm"
                placeholder="Type your answer here..."
                onChange={e => setTranscript(e.target.value)}
              />
              {transcript && (
                <button
                  onClick={submitAnswer}
                  className="mt-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  📝 Submit for Evaluation
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Evaluation */}
      {step === 'evaluation' && evaluation && (
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 AI Evaluation</h2>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="text-center mb-6">
              <div className="text-6xl font-bold text-blue-600 mb-1">{evaluation.score}</div>
              <div className="text-gray-500">out of 100</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Accuracy', value: evaluation.conceptAccuracy },
                { label: 'Coverage', value: evaluation.coverage },
                { label: 'Completeness', value: evaluation.completeness },
                { label: 'Clarity', value: evaluation.clarity },
              ].map(item => (
                <div key={item.label} className="text-center bg-gray-50 p-3 rounded-lg">
                  <div className="text-2xl font-bold">{item.value}</div>
                  <div className="text-xs text-gray-500">{item.label}</div>
                </div>
              ))}
            </div>

            {evaluation.covered.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-green-700 mb-2">✅ What You Covered:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {evaluation.covered.map((item, i) => (
                    <li key={i} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.missed.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-red-700 mb-2">❌ What You Missed:</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {evaluation.missed.map((item, i) => (
                    <li key={i} className="text-gray-700">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4">
              <h3 className="font-semibold mb-2">💡 Feedback:</h3>
              <p className="text-sm text-gray-700 bg-blue-50 p-4 rounded-lg">{evaluation.feedback}</p>
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold mb-2 text-sm text-gray-500">Your Transcript:</h3>
              <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">{transcript}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={tryAnotherTopic}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🔄 Try Another Topic
            </button>
            <button
              onClick={() => { setStep('select-course'); setSelectedCourse(null); setTopics([]); setEvaluation(null); setTranscript(''); }}
              className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              📚 Change Course
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
