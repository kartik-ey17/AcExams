import { NextResponse } from 'next/server';
import { addResource } from '@/lib/courses';
import { extractTextFromPDF } from '@/lib/pdf';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const courseId = formData.get('courseId') as string;
    const resourceType = (formData.get('type') as string) || 'lecture-notes';
    const title = (formData.get('title') as string) || file?.name?.replace(/\.[^/.]+$/, '') || 'Untitled Resource';
    const contributorName = formData.get('contributorName') as string | null;
    const githubUrl = formData.get('githubUrl') as string | null;
    const portfolioUrl = formData.get('portfolioUrl') as string | null;
    const contributorUrl = formData.get('contributorUrl') as string | null;
    const textContent = formData.get('textContent') as string | null;

    if (!courseId) {
      return NextResponse.json({ error: 'Please select a course for this resource' }, { status: 400 });
    }

    let content = '';

    if (file && file.size > 0) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

      if (isPdf) {
        try {
          content = await extractTextFromPDF(buffer);
        } catch (err) {
          console.error('PDF parsing error:', err);
          return NextResponse.json(
            { error: 'Failed to extract text from PDF. Please make sure the PDF contains readable text or paste its content.' },
            { status: 400 }
          );
        }
      } else {
        content = buffer.toString('utf-8');
      }
    } else if (textContent && textContent.trim()) {
      content = textContent.trim();
    } else {
      return NextResponse.json(
        { error: 'Please upload a PDF file or provide text content' },
        { status: 400 }
      );
    }

    if (!content.trim()) {
      return NextResponse.json(
        { error: 'No readable text could be found in the uploaded file' },
        { status: 400 }
      );
    }

    const resource = addResource({
      courseId,
      type: resourceType,
      title: title.trim(),
      content: content.trim(),
      fileName: file?.name,
      contributorName: contributorName?.trim() || undefined,
      githubUrl: githubUrl?.trim() || undefined,
      portfolioUrl: portfolioUrl?.trim() || undefined,
      contributorUrl: contributorUrl?.trim() || githubUrl?.trim() || portfolioUrl?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Resource "${resource.title}" successfully added to the course!`,
      resource,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing the upload' },
      { status: 500 }
    );
  }
}
