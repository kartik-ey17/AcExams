import { NextResponse } from 'next/server';
import { getCombinedResourceText } from '@/lib/courses';
import { evaluateAnswer } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { courseId, topic, transcript } = await request.json();

    if (!courseId || !topic || !transcript) {
      return NextResponse.json(
        { error: 'courseId, topic, and transcript are required' },
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

    const evaluation = await evaluateAnswer(topic, transcript, courseContent);
    return NextResponse.json(evaluation);
  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate answer. Check your GEMINI_API_KEY.' },
      { status: 500 }
    );
  }
}
