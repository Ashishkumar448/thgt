import { NextResponse } from 'next/server';
import { startScraperQueue, getJobState } from '@/lib/scraper';
import keywordsData from '@/keywords.js';

export async function POST(req) {
  try {
    const currentState = getJobState();
    if (currentState.isRunning) {
      return NextResponse.json(
        { error: 'A scrape job is already running.' },
        { status: 400 }
      );
    }

    let keywords = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.keywords) && body.keywords.length > 0) {
        keywords = body.keywords;
      }
    } catch {
      // Body not provided or not JSON, fall back to default keywordsData
    }

    if (keywords.length === 0) {
      keywords = Array.isArray(keywordsData) ? keywordsData : [];
    }

    const cleanKeywords = (keywords || [])
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter(Boolean);

    if (cleanKeywords.length === 0) {
      return NextResponse.json(
        { error: 'No valid keywords provided in request or keywords.js.' },
        { status: 400 }
      );
    }

    const result = await startScraperQueue(cleanKeywords);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to start scraper' },
      { status: 500 }
    );
  }
}
