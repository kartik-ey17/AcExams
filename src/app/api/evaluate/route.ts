import { NextResponse } from 'next/server';
import { getCombinedResourceText } from '@/lib/courses';
import { evaluateAnswer } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { courseId, topic, question, transcript } = await request.json();

    const evaluationPrompt = question || topic;

    if (!courseId || !evaluationPrompt || !transcript) {
      return NextResponse.json(
        { error: 'courseId, topic/question, and transcript are required' },
        { status: 400 }
      );
    }

    const courseContent = getCombinedResourceText(courseId);
    if (!courseContent.trim()) {
      return NextResponse.json(
        { error: 'No resources found for this course.' },
        { status: 400 }
      );
    }

    const evaluation = await evaluateAnswer(evaluationPrompt, transcript, courseContent);
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Could not evaluate the answer against the course resources. Please check your GEMINI_API_KEY or try again.' },
      { status: 500 }
    );
  }
}
