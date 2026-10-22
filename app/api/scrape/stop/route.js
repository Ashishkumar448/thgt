import { NextResponse } from 'next/server';
import { stopJob } from '@/lib/scraper';

export async function POST() {
  const stopped = stopJob();
  return NextResponse.json({
    success: stopped,
    message: stopped ? 'Stop signal sent to scraper.' : 'No active job to stop.',
  });
}
