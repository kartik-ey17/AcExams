import { NextResponse } from 'next/server';
import { getCombinedResourceText } from '@/lib/courses';
import { generateTopics } from '@/lib/gemini';

export async function POST(request: Request) {
  try {
    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    const courseContent = getCombinedResourceText(courseId);
    if (!courseContent.trim()) {
      return NextResponse.json(
        { error: 'No resources found for this course. Please add resources first.' },
        { status: 400 }
      );
    }

    const topics = await generateTopics(courseContent);
    return NextResponse.json({ topics });
  } catch (error) {
    console.error('Topic generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate topics. Check your GEMINI_API_KEY.' },
      { status: 500 }
    );
  }
}
