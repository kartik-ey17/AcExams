import { NextResponse } from 'next/server';
import { getCombinedResourceText } from '@/lib/courses';
import { generateQuestion } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { courseId, topic } = await request.json();

    if (!courseId || !topic) {
      return NextResponse.json(
        { error: 'courseId and topic are required' },
        { status: 400 }
      );
    }

    const courseContent = getCombinedResourceText(courseId);
    if (!courseContent.trim()) {
      return NextResponse.json(
        { error: 'No resources found for this course. Please add resources first.' },
        { status: 400 }
      );
    }

    const question = await generateQuestion(topic, courseContent);
    return NextResponse.json({ question });
  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json(
      { error: 'Could not generate a viva question from the course resources. Please try another topic.' },
      { status: 500 }
    );
  }
}
