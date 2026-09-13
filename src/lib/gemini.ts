import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;

function getClient() {
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateTopics(courseContent: string): Promise<string[]> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are an academic study assistant. Based on the following course material, generate a list of 8-12 important topics/questions that a student should be able to answer in a viva/oral examination.

Return ONLY a JSON array of strings, each being a topic or question. No markdown, no explanation.

Example format: ["Explain process states and transitions", "What is virtual memory and how does demand paging work?"]

Course Material:
${courseContent}`,
  });

  const text = response.text?.trim() || '[]';
  try {
    // Try to parse the JSON, handling potential markdown wrapping
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    return JSON.parse(cleaned);
  } catch {
    // Fallback: split by newlines and clean up
    return text.split('\n').filter(line => line.trim().length > 0).map(line => line.replace(/^\d+\.\s*/, '').replace(/^["\-*]\s*/, '').trim());
  }
}

export interface EvaluationResult {
  score: number;
  conceptAccuracy: number;
  coverage: number;
  completeness: number;
  clarity: number;
  covered: string[];
  missed: string[];
  feedback: string;
}

export async function evaluateAnswer(
  topic: string,
  transcript: string,
  courseContent: string
): Promise<EvaluationResult> {
  const client = getClient();
  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `You are an academic examiner evaluating a student's viva/oral answer.

The student was asked about: "${topic}"

The student's spoken answer (transcript):
"${transcript}"

The course material (ground truth):
${courseContent}

Evaluate the student's answer STRICTLY based on the course material provided. Do NOT use external knowledge.

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "score": <number 0-100>,
  "conceptAccuracy": <number 0-100>,
  "coverage": <number 0-100>,
  "completeness": <number 0-100>,
  "clarity": <number 0-100>,
  "covered": [<list of key concepts the student correctly mentioned>],
  "missed": [<list of important concepts from the course material that the student missed>],
  "feedback": "<constructive feedback paragraph>"
}`,
  });

  const text = response.text?.trim() || '{}';
  try {
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    const result = JSON.parse(cleaned);
    return {
      score: result.score ?? 0,
      conceptAccuracy: result.conceptAccuracy ?? 0,
      coverage: result.coverage ?? 0,
      completeness: result.completeness ?? 0,
      clarity: result.clarity ?? 0,
      covered: result.covered ?? [],
      missed: result.missed ?? [],
      feedback: result.feedback ?? 'Unable to generate feedback.',
    };
  } catch {
    return {
      score: 0,
      conceptAccuracy: 0,
      coverage: 0,
      completeness: 0,
      clarity: 0,
      covered: [],
      missed: [],
      feedback: 'Error parsing AI evaluation. Raw response: ' + text.substring(0, 500),
    };
  }
}
