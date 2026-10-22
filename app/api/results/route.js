import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const filter = {};
    if (query) {
      filter.$or = [
        { keyword: { $regex: query, $options: 'i' } },
        { channel_names: { $regex: query, $options: 'i' } },
      ];
    }

    const results = await ScrapeResult.find(filter)
      .sort({ scrapedAt: -1 })
      .limit(limit)
      .lean();

    const totalCount = await ScrapeResult.countDocuments(filter);

    return NextResponse.json({
      results,
      totalCount,
      collection: process.env.DECODO_COLLECTION || 'decodo_scrapes',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch MongoDB results' },
      { status: 500 }
    );
  }
}
