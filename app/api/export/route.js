import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import ScrapeResult from '@/lib/models/ScrapeResult';

function escapeCsv(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'json').toLowerCase();

    const docs = await ScrapeResult.find({})
      .sort({ scrapedAt: -1 })
      .lean();

    if (format === 'csv') {
      const headers = [
        'Keyword',
        'Channel Handle',
        'Channel Title',
        'Channel Link',
        'Description',
        'Total Channels Found',
        'Pages',
        'Scraped Date',
      ];

      const rows = [];
      for (const doc of docs) {
        const keyword = doc.keyword || '';
        const total = doc.channelsCount || 0;
        const pages = doc.pagesFetched || 2;
        const date = doc.scrapedAt ? new Date(doc.scrapedAt).toISOString() : '';

        if (Array.isArray(doc.channels) && doc.channels.length > 0) {
          for (const ch of doc.channels) {
            rows.push([
              escapeCsv(keyword),
              escapeCsv(ch.name || ''),
              escapeCsv(ch.title || ''),
              escapeCsv(ch.link || `https://t.me/${ch.name || ''}`),
              escapeCsv(ch.description || ''),
              escapeCsv(total),
              escapeCsv(pages),
              escapeCsv(date),
            ].join(','));
          }
        } else if (Array.isArray(doc.channel_names) && doc.channel_names.length > 0) {
          for (const name of doc.channel_names) {
            rows.push([
              escapeCsv(keyword),
              escapeCsv(name),
              escapeCsv(''),
              escapeCsv(`https://t.me/${name}`),
              escapeCsv(''),
              escapeCsv(total),
              escapeCsv(pages),
              escapeCsv(date),
            ].join(','));
          }
        } else {
          // Empty result row
          rows.push([
            escapeCsv(keyword),
            escapeCsv(''),
            escapeCsv(''),
            escapeCsv(''),
            escapeCsv('No channels found'),
            escapeCsv(total),
            escapeCsv(pages),
            escapeCsv(date),
          ].join(','));
        }
      }

      const csvContent = [headers.join(','), ...rows].join('\r\n');

      return new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="decodo_export_${Date.now()}.csv"`,
        },
      });
    }

    // Default: JSON export
    return new Response(JSON.stringify(docs, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="decodo_export_${Date.now()}.json"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}
