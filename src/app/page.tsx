import Link from "next/link";

export default function Home() {
  return (
    <div className="text-center py-16">
      <h1 className="text-5xl font-bold mb-4">📚 StudySpeak</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
        Turn your course material into an AI-powered viva examination.
        Upload notes, PDFs, and question banks — then practice speaking your answers
        and get instant AI feedback.
      </p>

      <div className="flex gap-4 justify-center mb-12">
        <Link
          href="/contribute"
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          📤 Contribute Resources
        </Link>
        <Link
          href="/study"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          🎓 Start Studying
        </Link>
      </div>

      <div className="text-left max-w-2xl mx-auto bg-white rounded-lg p-8 shadow">
        <h2 className="text-2xl font-bold mb-4">How It Works</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">1</span>
            <div>
              <h3 className="font-semibold">Upload Course Resources</h3>
              <p className="text-gray-600 text-sm">Add PDFs, notes, question banks, or important topics to any course.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">2</span>
            <div>
              <h3 className="font-semibold">AI Generates Topics</h3>
              <p className="text-gray-600 text-sm">Our AI reads your uploaded material and generates important viva topics.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">3</span>
            <div>
              <h3 className="font-semibold">Speak Your Answer</h3>
              <p className="text-gray-600 text-sm">Choose a topic, set a timer (1-10 min), and speak into your microphone.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">4</span>
            <div>
              <h3 className="font-semibold">Get AI Evaluation</h3>
              <p className="text-gray-600 text-sm">Receive a score, see what you covered, what you missed, and get actionable feedback.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
