import { NextResponse } from 'next/server';
import { addResource } from '@/lib/courses';
import { extractTextFromPDF } from '@/lib/pdf';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string;
    const resourceType = (formData.get('type') as string) || 'pdf';
    const title = (formData.get('title') as string) || file?.name || 'Untitled';
    const contributorName = formData.get('contributorName') as string | null;
    const contributorUrl = formData.get('contributorUrl') as string | null;
    const textContent = formData.get('textContent') as string | null;

    if (!courseId) {
      return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
    }

    let content = '';

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      if (file.name.endsWith('.pdf')) {
        content = await extractTextFromPDF(buffer);
      } else {
        // For non-PDF files, try to read as text
        content = buffer.toString('utf-8');
      }
    } else if (textContent) {
      content = textContent;
    } else {
      return NextResponse.json(
        { error: 'Either a file or text content is required' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'Could not extract any text from the uploaded file' },
        { status: 400 }
      );
    }

    const resource = addResource({
      courseId,
      type: resourceType as 'pdf' | 'notes' | 'question-bank' | 'topics' | 'lecture',
      title,
      content,
      fileName: file?.name,
      contributorName: contributorName || undefined,
      contributorUrl: contributorUrl || undefined,
    });

    return NextResponse.json({ success: true, resource });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload' },
      { status: 500 }
    );
  }
}
