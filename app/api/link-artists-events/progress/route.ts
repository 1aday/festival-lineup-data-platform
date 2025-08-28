import { NextRequest, NextResponse } from 'next/server';

// Store progress in memory (in production, use Redis or similar)
export const linkingProgress = new Map<string, {
  progress: number;
  message: string;
  stats?: any;
  completed: boolean;
}>();

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  
  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
  }

  const progress = linkingProgress.get(sessionId) || {
    progress: 0,
    message: 'Not started',
    completed: false
  };

  return NextResponse.json(progress);
}
