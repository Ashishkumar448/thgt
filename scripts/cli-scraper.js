const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
} else {
  require('dotenv').config();
}

const MONGO_URI = process.env.MONGO_URI;
const SCRAPER_URL = process.env.SCRAPER_URL;
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;
const DELAY_SECONDS = parseInt(process.env.DELAY_SECONDS || "120", 10);
const COLLECTION_NAME = process.env.DECODO_COLLECTION || "decodo_scrapes";

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI is missing. Please define it in your .env file.');
  process.exit(1);
}

if (!SCRAPER_URL) {
  console.error('❌ Error: SCRAPER_URL is missing. Please define it in your .env file.');
  process.exit(1);
}

const ScrapeSchema = new mongoose.Schema(
  {
    keyword: { type: String, required: true, index: true },
    channel_names: [{ type: String }],
    channels: [{ type: mongoose.Schema.Types.Mixed }],
    channelsCount: { type: Number, default: 0 },
    pagesFetched: { type: Number, default: 2 },
    source: { type: String, default: 'tg-decodo' },
    scrapedAt: { type: Date, default: Date.now },
    rawResponse: { type: mongoose.Schema.Types.Mixed },
  },
  { collection: COLLECTION_NAME, timestamps: true, strict: false }
);

const ScrapeModel = mongoose.models.ScrapeResult || mongoose.model('ScrapeResult', ScrapeSchema);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function countdown(seconds) {
  for (let s = seconds; s > 0; s--) {
    process.stdout.write(`⏳ Waiting gap before next keyword: ${s}s remaining... \r`);
    await sleep(1000);
  }
  process.stdout.write(' '.repeat(65) + '\r');
}

async function fetchDecodo(keyword) {
  const headers = { 'Content-Type': 'application/json' };
  if (SCRAPER_API_KEY) {
    headers['x-api-key'] = SCRAPER_API_KEY;
  }
  const response = await axios.post(
    SCRAPER_URL,
    { search_query: keyword },
    { headers, timeout: 60000 }
  );
  return response.data;
}

async function run() {
  console.log('====================================================');
  console.log('🤖 DECODO 2-PAGE KEYWORD SCRAPER (CLI)');
  console.log('====================================================');
  console.log(`📡 Decodo Endpoint: ${SCRAPER_URL}`);
  console.log(`⏱️  Gap between searches: ${DELAY_SECONDS} seconds`);
  console.log(`🗄️  Collection: [${COLLECTION_NAME}]`);

  // Load keywords
  const keywordsPath = path.join(__dirname, '..', 'keywords.js');
  if (!fs.existsSync(keywordsPath)) {
    console.error('❌ keywords.js not found at:', keywordsPath);
    process.exit(1);
  }

  const keywords = require(keywordsPath);
  if (!Array.isArray(keywords) || keywords.length === 0) {
    console.warn('⚠️ No keywords in keywords.js');
    process.exit(0);
  }

  console.log(`📋 Total keywords to scrape: ${keywords.length}`);
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log(' Connected to MongoDB!\n');

  for (let i = 0; i < keywords.length; i++) {
    const keyword = keywords[i].trim();
    if (!keyword) continue;

    console.log(`[${i + 1}/${keywords.length}] Searching Decodo for 2 pages: "${keyword}"...`);
    const start = Date.now();

    try {
      const data = await fetchDecodo(keyword);
      const channelNames = Array.isArray(data?.channel_names) ? data.channel_names : [];
      const channels = Array.isArray(data?.channels) ? data.channels : [];
      const channelsCount = channels.length || channelNames.length;
      const ms = Date.now() - start;

      await ScrapeModel.findOneAndUpdate(
        { keyword: keyword.toLowerCase() },
        {
          $set: {
            keyword: keyword.toLowerCase(),
            channel_names: channelNames,
            channels: channels,
            channelsCount: channelsCount,
            pagesFetched: 2,
            source: 'tg-decodo',
            scrapedAt: new Date(),
            rawResponse: data,
          },
        },
        { upsert: true, new: true }
      );

      console.log(` Saved "${keyword}" -> ${channelsCount} channels found (${ms}ms)`);
    } catch (err) {
      console.error(` Error scraping "${keyword}":`, err.response?.data?.error || err.message);
    }

    if (i < keywords.length - 1) {
      await countdown(DELAY_SECONDS);
    }
  }

  console.log('\n Scraper finished successfully for all keywords.');
  await mongoose.disconnect();
  console.log('🔒 Disconnected from MongoDB. Exiting.');
}

run().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
