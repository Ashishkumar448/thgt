import { NextResponse } from 'next/server';
import { getJobState } from '@/lib/scraper';

export async function GET() {
  const state = getJobState();
  return NextResponse.json(state);
}
