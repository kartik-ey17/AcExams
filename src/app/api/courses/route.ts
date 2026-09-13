import { NextResponse } from 'next/server';
import { getAllCourses, addCourse } from '@/lib/courses';

export async function GET() {
  const courses = getAllCourses();
  return NextResponse.json(courses);
}

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: 'Course name is required' }, { status: 400 });
    }
    const course = addCourse(name, description || '');
    return NextResponse.json(course);
  } catch {
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
