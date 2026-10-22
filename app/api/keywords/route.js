import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import keywordsData from '@/keywords.js';

export async function GET() {
  try {
    const keywordsPath = path.join(process.cwd(), 'keywords.js');
    let keywords = Array.isArray(keywordsData) ? [...keywordsData] : [];
    let categories = keywordsData?.categories || {};

    // If keywords.js was updated on disk with plain array, load it
    if (fs.existsSync(keywordsPath)) {
      try {
        const raw = fs.readFileSync(keywordsPath, 'utf8');
        // If it was written as JSON array in module.exports = [...]
        const match = raw.match(/module\.exports\s*=\s*(\[[\s\S]*?\]);/);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            keywords = parsed;
          }
        }
      } catch {
        // Fallback to static import
      }
    }

    return NextResponse.json({
      keywords,
      categories,
      totalCount: keywords.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const keywords = (body?.keywords || [])
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter(Boolean);

    const keywordsPath = path.join(process.cwd(), 'keywords.js');
    const fileContent = `/**
 * Decodo Scraper Keywords List
 */
const flatKeywords = ${JSON.stringify(keywords, null, 2)};
module.exports = flatKeywords;
`;

    fs.writeFileSync(keywordsPath, fileContent, 'utf-8');
    return NextResponse.json({ success: true, count: keywords.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
