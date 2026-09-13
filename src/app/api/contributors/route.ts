import { NextResponse } from 'next/server';
import { getContributorLeaderboard } from '@/lib/courses';

export async function GET() {
  try {
    const leaderboard = getContributorLeaderboard();
    return NextResponse.json({ contributors: leaderboard });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}
