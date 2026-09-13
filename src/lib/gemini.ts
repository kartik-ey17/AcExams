import { GoogleGenAI } from '@google/genai';

function getClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export async function generateTopics(courseContent: string): Promise<string[]> {
  const client = getClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an academic study assistant. Generate 8-15 important viva topics for a university student.

Use ONLY the course resources below. Every topic must represent an important concept actually present in the resources. Do not add topics from general knowledge.

Return ONLY a JSON array of concise strings. No markdown formatting, no code fences, no introductory text.

Example format: ["Process states and transitions", "Demand paging and page faults", "Semaphores and critical section synchronization"]

Course Material:
${courseContent}`,
      });

      const text = response.text?.trim() || '[]';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeTopics(parsed);
      }
    } catch (error) {
      console.warn('Gemini generateTopics call failed, using grounded fallback generator:', error);
    }
  }

  // Grounded fallback extraction from course content:
  return normalizeTopics(extractTopicsFromContent(courseContent));
}

export async function generateQuestion(topic: string, courseContent: string): Promise<string> {
  const client = getClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are a university viva examiner.

Create one concise speaking prompt for this selected topic:
"${topic}"

Use ONLY the course resources below. The prompt should ask the student to explain the concept in a way that can be evaluated from the material. Do not introduce unrelated concepts.

Return ONLY the prompt text, one or two sentences maximum.

Course Material:
${selectRelevantContentForTopic(topic, courseContent)}`,
      });

      const prompt = response.text?.replace(/^```(?:text)?\s*/i, '').replace(/\s*```$/i, '').trim();
      if (prompt && prompt.length > 10) {
        return prompt;
      }
    } catch (error) {
      console.warn('Gemini generateQuestion call failed, using grounded fallback prompt:', error);
    }
  }

  return `Explain ${topic} as taught in the uploaded course resources. Include the key definitions, mechanisms, and important related concepts from the material.`;
}

function normalizeTopics(rawTopics: unknown[]): string[] {
  const seen = new Set<string>();
  const topics: string[] = [];

  for (const item of rawTopics) {
    if (typeof item !== 'string') continue;
    const topic = item
      .replace(/^\s*\d+[\.\)]\s*/, '')
      .replace(/^explain\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (topic.length < 4) continue;
    const key = topic.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      topics.push(topic);
    }
  }

  return topics.slice(0, 15);
}

function extractTopicsFromSingleChunk(header: string, text: string): string[] {
  const topics: string[] = [];

  // If header has a descriptive title (e.g. "Module 5: Concurrency and Synchronization"), add it
  const cleanHeader = header.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (cleanHeader.length > 8 && !['OS Exam Questions', 'Question Bank'].includes(cleanHeader)) {
    topics.push(cleanHeader);
  }

  // 1. Look for numbered questions in this chunk
  const questionMatches = text.match(/^\s*\d+[\.\)]\s+((?:Explain|What|How|Differentiate|Compare|Describe|Discuss|Why).+)$/gim);
  if (questionMatches) {
    for (const q of questionMatches) {
      const clean = q.replace(/^\s*\d+[\.\)]\s+/, '').trim();
      if (clean.length > 15 && !topics.includes(clean)) {
        topics.push(clean);
      }
    }
  }

  // 2. Look for section headings / key definitions in this chunk
  const headingMatches = text.match(/^([A-Z][A-Za-z\s\(\)\/-]+):/gm);
  if (headingMatches) {
    for (const h of headingMatches) {
      const clean = h.replace(/:$/, '').trim();
      if (clean.length > 4 && !['New', 'Running', 'Waiting', 'Ready', 'Terminated', 'FIFO', 'LRU', 'Optimal'].includes(clean)) {
        const topic = `${clean} and its core mechanisms`;
        if (!topics.includes(topic)) {
          topics.push(topic);
        }
      }
    }
  }

  // 3. Any other numbered items if needed
  if (topics.length < 2) {
    const allNumbered = text.match(/^\s*\d+[\.\)]\s+(.+)$/gm);
    if (allNumbered) {
      for (const q of allNumbered) {
        const clean = q.replace(/^\s*\d+[\.\)]\s+/, '').trim();
        if (clean.length > 15 && !topics.includes(clean)) {
          topics.push(clean);
        }
      }
    }
  }

  return topics;
}

function extractTopicsFromContent(courseContent: string): string[] {
  // Split content by resource chunks delimited by --- Title (type) ---
  const rawParts = courseContent.split(/---\s*(.+?)\s*---/);
  const resourceTopicSets: string[][] = [];

  if (rawParts.length >= 3) {
    for (let i = 1; i < rawParts.length; i += 2) {
      const header = rawParts[i]?.trim() || '';
      const body = rawParts[i + 1]?.trim() || '';
      const chunkTopics = extractTopicsFromSingleChunk(header, body);
      if (chunkTopics.length > 0) {
        resourceTopicSets.push(chunkTopics);
      }
    }
  } else {
    resourceTopicSets.push(extractTopicsFromSingleChunk('', courseContent));
  }

  // Interleave topics across all resources so every uploaded resource is well-represented
  const finalTopics: string[] = [];
  const maxRounds = 4;
  for (let round = 0; round < maxRounds; round++) {
    for (const topicList of resourceTopicSets) {
      if (round < topicList.length && !finalTopics.includes(topicList[round])) {
        finalTopics.push(topicList[round]);
      }
    }
  }

  if (finalTopics.length === 0) {
    finalTopics.push(
      "Explain the key concepts covered in the course material",
      "Describe the main architecture and components discussed",
      "Compare the primary algorithms or mechanisms presented",
      "Discuss common challenges and their solutions in this domain"
    );
  }

  return finalTopics.slice(0, 15);
}

export interface EvaluationResult {
  overall_score: number;
  concept_accuracy: number;
  covered_concepts: string[];
  missing_concepts: string[];
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
  const groundedCourseContent = selectRelevantContentForTopic(topic, courseContent);
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an academic examiner conducting an oral viva examination.

The student was asked this topic/question:
"${topic}"

Student's spoken answer (transcript):
"${transcript}"

Relevant course material (ground truth knowledge base):
${groundedCourseContent}

Evaluate the student's answer STRICTLY grounded in the provided course material.
Prioritize what the uploaded resources teach. Do not reward unrelated facts from general knowledge.
If the answer contradicts the course material, identify the contradiction in missing_concepts or feedback.
If an important concept from the resources is missing, identify it.
Keep feedback concise and suitable for rendering in the UI.

Evaluate:
1. concept_accuracy (0-100): Are definitions and explanations correct according to the material?
2. Coverage (0-100): How many relevant points from the course material on this topic did they touch upon?
3. Completeness (0-100): Did they provide a thorough answer with sufficient depth?
4. Clarity (0-100): Is the explanation structured, coherent, and well-articulated?
5. overall_score (0-100).
6. covered_concepts: Specific key concepts from the course material that the student successfully explained.
7. missing_concepts: Important concepts from the course material that the student missed or contradicted.
8. feedback: 2-3 constructive sentences explaining what they did well and specifically what they should add from the course material to improve.

Return ONLY a valid JSON object with NO markdown formatting, NO backticks:
{
  "overall_score": 85,
  "concept_accuracy": 90,
  "coverage": 80,
  "completeness": 80,
  "clarity": 90,
  "covered_concepts": ["Process states", "PCB components"],
  "missing_concepts": ["Context switch overhead", "fork() and exec()"],
  "feedback": "Great overview of the process lifecycle and PCB. To improve, mention context switching overhead and how child processes are created."
}`,
      });

      const text = response.text?.trim() || '{}';
      const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const result = JSON.parse(cleaned);

      const covered = Array.isArray(result.covered_concepts) ? result.covered_concepts : result.covered;
      const missed = Array.isArray(result.missing_concepts) ? result.missing_concepts : result.missed;

      return normalizeEvaluation({
        score: clampScore(result.overall_score ?? result.score ?? 70),
        conceptAccuracy: clampScore(result.concept_accuracy ?? result.conceptAccuracy ?? 70),
        coverage: clampScore(result.coverage ?? 70),
        completeness: clampScore(result.completeness ?? 70),
        clarity: clampScore(result.clarity ?? 70),
        covered: Array.isArray(covered) ? covered : [],
        missed: Array.isArray(missed) ? missed : [],
        feedback: typeof result.feedback === 'string' ? result.feedback : 'Solid explanation of the topic.',
      });
    } catch (error) {
      console.warn('Gemini evaluateAnswer failed, using grounded fallback evaluation:', error);
    }
  }

  // Fallback evaluation grounded in course content
  return normalizeEvaluation(fallbackEvaluation(topic, transcript, groundedCourseContent));
}

function clampScore(value: unknown): number {
  return Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
}

function normalizeEvaluation(
  result: Omit<EvaluationResult, 'overall_score' | 'concept_accuracy' | 'covered_concepts' | 'missing_concepts'>
): EvaluationResult {
  return {
    overall_score: result.score,
    concept_accuracy: result.conceptAccuracy,
    covered_concepts: result.covered,
    missing_concepts: result.missed,
    ...result,
  };
}

function fallbackEvaluation(
  topic: string,
  transcript: string,
  courseContent: string
): Omit<EvaluationResult, 'overall_score' | 'concept_accuracy' | 'covered_concepts' | 'missing_concepts'> {
  const transcriptLower = transcript.toLowerCase();
  const candidateSource = selectRelevantContentForTopic(topic, courseContent);
  
  // Extract technical terms from course content:
  // 1. Acronyms (e.g. PCB, MMU, TLB, IPC, CPU, FIFO, LRU)
  const acronyms = candidateSource.match(/\b([A-Z]{2,5})\b/g) || [];
  
  // 2. Headings and definitions (e.g. "Process States", "Context Switch", "Demand Paging", "Page Fault")
  const technicalTerms: string[] = [];
  const lines = candidateSource.split('\n');
  for (const line of lines) {
    // Matches like "Context Switch:", "Demand Paging:", "Process States:"
    const defMatch = line.match(/^([A-Z][A-Za-z\s\/-]+):/);
    if (defMatch) {
      const term = defMatch[1].trim();
      if (term.length > 3 && !['New', 'Running', 'Waiting', 'Ready', 'Terminated', 'Operating Systems'].includes(term)) {
        technicalTerms.push(term);
      }
    }
    // Matches like "1. New:", "2. Running:" -> add individual process states
    const stateMatch = line.match(/^\d+\.\s+([A-Z][a-z]+):/);
    if (stateMatch) {
      technicalTerms.push(stateMatch[1].trim());
    }
  }

  // Combine and deduplicate
  const allCandidates = Array.from(new Set([...acronyms, ...technicalTerms])).filter(
    term => !['THIS', 'THAT', 'NOTE', 'NOTES', 'EXAM', 'QUESTIONS'].includes(term.toUpperCase())
  );

  // Keep course concepts that the student explicitly mentioned, even when the
  // topic title is broad like "Module 5: Concurrency and Synchronization".
  const explicitlyMentioned = allCandidates.filter(c =>
    transcriptLower.includes(c.toLowerCase())
  );

  // Filter candidates relevant to the current topic
  const topicWords = topic.toLowerCase().split(/[\s,.-]+/).filter(w => w.length > 3);
  let relevantCandidates = allCandidates.filter(c => {
    const cLower = c.toLowerCase();
    return topicWords.some(tw => cLower.includes(tw) || tw.includes(cLower));
  });

  relevantCandidates = Array.from(new Set([...explicitlyMentioned, ...relevantCandidates]));

  // If topic filter is too narrow, use candidates from the general pool
  if (relevantCandidates.length < 5) {
    const remaining = allCandidates.filter(c => !relevantCandidates.includes(c));
    relevantCandidates = [...relevantCandidates, ...remaining.slice(0, 8 - relevantCandidates.length)];
  }

  const covered: string[] = [];
  const missed: string[] = [];

  for (const concept of relevantCandidates) {
    const conceptLower = concept.toLowerCase();
    // Check if transcript contains concept
    if (transcriptLower.includes(conceptLower)) {
      covered.push(concept);
    } else {
      missed.push(concept);
    }
  }

  // Additional check for common keywords if student answered well
  const additionalCheck = [
    'process',
    'thread',
    'memory',
    'cpu',
    'registers',
    'stack',
    'heap',
    'paging',
    'cache',
    'concurrency',
    'synchronization',
    'critical section',
    'mutual exclusion',
    'bounded waiting',
    'semaphores',
    'deadlock',
    'banker algorithm',
    'safe state',
  ];
  for (const kw of additionalCheck) {
    if (transcriptLower.includes(kw) && !covered.some(c => c.toLowerCase() === kw)) {
      const capitalized = kw.charAt(0).toUpperCase() + kw.slice(1);
      if (!covered.includes(capitalized) && covered.length < 6) {
        covered.push(capitalized);
      }
    }
  }

  // Word count and depth scoring
  const wordCount = transcript.trim().split(/\s+/).length;
  const depthBonus = Math.min(25, Math.floor(wordCount / 4));
  const conceptScore = relevantCandidates.length > 0
    ? Math.round((covered.length / Math.max(covered.length + missed.length, 1)) * 50)
    : 35;
  
  const score = Math.min(96, Math.max(30, 35 + conceptScore + depthBonus));
  const accuracy = Math.min(95, Math.max(40, 45 + conceptScore));
  const coverage = Math.min(95, Math.max(25, Math.round((covered.length / Math.max(1, relevantCandidates.length)) * 100)));
  const completeness = Math.min(95, Math.max(30, 35 + depthBonus * 2));
  const clarity = wordCount > 15 ? 88 : 60;

  let feedback = `Good technical effort articulating your viva response. `;
  if (covered.length > 0) {
    feedback += `You clearly addressed key concepts such as ${covered.slice(0, 3).join(', ')}. `;
  }
  if (missed.length > 0) {
    feedback += `To achieve top marks, incorporate further details on ${missed.slice(0, 3).join(', ')} from the course material.`;
  } else {
    feedback += `Your explanation comprehensively addresses the course syllabus for this topic.`;
  }

  return {
    score,
    conceptAccuracy: accuracy,
    coverage,
    completeness,
    clarity,
    covered: covered.slice(0, 6),
    missed: missed.slice(0, 6),
    feedback,
  };
}

function selectRelevantContentForTopic(topic: string, courseContent: string): string {
  const ignoredWords = new Set([
    'explain',
    'taught',
    'uploaded',
    'course',
    'resources',
    'include',
    'important',
    'related',
    'concepts',
    'material',
    'definitions',
    'mechanisms',
    'student',
    'university',
    'viva',
    'speaking',
    'prompt',
  ]);
  const topicWords = topic
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter(w => w.length > 4 && !ignoredWords.has(w));
  const rawParts = courseContent.split(/---\s*(.+?)\s*---/);

  if (rawParts.length < 3 || topicWords.length === 0) {
    return courseContent;
  }

  let bestChunk = '';
  let bestScore = 0;

  for (let i = 1; i < rawParts.length; i += 2) {
    const header = rawParts[i]?.trim() || '';
    const body = rawParts[i + 1]?.trim() || '';
    const searchable = `${header}\n${body}`.toLowerCase();
    const score = topicWords.reduce((total, word) => (
      searchable.includes(word) ? total + 1 : total
    ), 0);

    if (score > bestScore) {
      bestScore = score;
      bestChunk = `${header}\n${body}`;
    }
  }

  return bestScore > 0 ? bestChunk : courseContent;
}
