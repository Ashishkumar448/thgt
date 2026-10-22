import axios from 'axios';
import connectToDatabase from './mongodb';
import ScrapeResult from './models/ScrapeResult';

const SCRAPER_URL = process.env.SCRAPER_URL || '';
const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '';
const DEFAULT_DELAY = parseInt(process.env.DELAY_SECONDS || '120', 10);

// Global in-memory job runner state for Next.js server instance
let jobState = {
  isRunning: false,
  shouldStop: false,
  status: 'idle', // 'idle' | 'running' | 'waiting_gap' | 'completed' | 'stopped' | 'error'
  currentKeyword: null,
  currentIndex: 0,
  totalKeywords: 0,
  countdownSeconds: 0,
  startedAt: null,
  finishedAt: null,
  delaySeconds: DEFAULT_DELAY,
  logs: [],
  history: [],
};

function addLog(msg, type = 'info') {
  const time = new Date().toLocaleTimeString();
  const entry = { time, msg, type };
  jobState.logs.unshift(entry);
  if (jobState.logs.length > 200) {
    jobState.logs.pop();
  }
  console.log(`[DecodoScraper ${time}] [${type.toUpperCase()}] ${msg}`);
}

export function getJobState() {
  return { ...jobState };
}

export function stopJob() {
  if (jobState.isRunning) {
    jobState.shouldStop = true;
    jobState.status = 'stopping';
    addLog('Stop requested by user. Finishing current operation...', 'warn');
    return true;
  }
  return false;
}

/**
 * Fetch 2 pages of data for a single keyword from Decodo
 */
export async function scrapeKeyword(keyword) {
  const headers = { 'Content-Type': 'application/json' };
  if (SCRAPER_API_KEY) {
    headers['x-api-key'] = SCRAPER_API_KEY;
  }

  addLog(`Requesting Decodo (2 pages) for: "${keyword}"...`);
  const response = await axios.post(
    SCRAPER_URL,
    { search_query: keyword },
    {
      headers,
      timeout: 60000,
    }
  );

  return response.data;
}

/**
 * Save scraped Decodo data to MongoDB
 */
export async function saveScrapeResult(keyword, data) {
  await connectToDatabase();

  const channelNames = Array.isArray(data?.channel_names) ? data.channel_names : [];
  const channels = Array.isArray(data?.channels) ? data.channels : [];
  const cleanKeyword = keyword.trim().toLowerCase();

  const doc = await ScrapeResult.findOneAndUpdate(
    { keyword: cleanKeyword },
    {
      $set: {
        keyword: cleanKeyword,
        channel_names: channelNames,
        channels: channels,
        channelsCount: channels.length || channelNames.length,
        pagesFetched: 2,
        source: 'tg-decodo',
        scrapedAt: new Date(),
        rawResponse: data,
      },
    },
    { upsert: true, new: true }
  );

  addLog(
    `Saved "${keyword}" -> ${doc.channelsCount} channels into MongoDB`,
    'success'
  );
  return doc;
}

/**
 * Sleep helper with abort check
 */
async function sleepWithCountdown(seconds) {
  jobState.countdownSeconds = seconds;
  for (let i = seconds; i > 0; i--) {
    if (jobState.shouldStop) {
      break;
    }
    jobState.countdownSeconds = i;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  jobState.countdownSeconds = 0;
}

/**
 * Execute the full keywords queue with the 90-second gap between each keyword
 */
export async function startScraperQueue(keywordsList, customDelay = null) {
  if (jobState.isRunning) {
    throw new Error('A scrape job is already currently running.');
  }

  const delay = customDelay !== null ? customDelay : (parseInt(process.env.DELAY_SECONDS || '90', 10));

  jobState.isRunning = true;
  jobState.shouldStop = false;
  jobState.status = 'running';
  jobState.startedAt = new Date();
  jobState.finishedAt = null;
  jobState.delaySeconds = delay;
  jobState.totalKeywords = keywordsList.length;
  jobState.currentIndex = 0;
  jobState.currentKeyword = null;
  jobState.logs = [];
  jobState.history = [];

  addLog(`Queue started with ${keywordsList.length} keywords. Gap between requests: ${delay} seconds.`);

  // Ensure DB connected
  try {
    await connectToDatabase();
    addLog('MongoDB connection verified.', 'success');
  } catch (err) {
    addLog(`MongoDB connection failed: ${err.message}`, 'error');
    jobState.isRunning = false;
    jobState.status = 'error';
    return;
  }

  // Run asynchronously without blocking HTTP response
  (async () => {
    for (let i = 0; i < keywordsList.length; i++) {
      if (jobState.shouldStop) {
        addLog('Job stopped as requested by user.', 'warn');
        jobState.status = 'stopped';
        break;
      }

      const keyword = keywordsList[i].trim();
      jobState.currentIndex = i + 1;
      jobState.currentKeyword = keyword;
      jobState.status = 'running';

      try {
        const rawData = await scrapeKeyword(keyword);
        const savedDoc = await saveScrapeResult(keyword, rawData);

        jobState.history.push({
          keyword,
          channelsCount: savedDoc.channelsCount,
          time: new Date().toLocaleTimeString(),
          success: true,
        });
      } catch (err) {
        const errMsg = err.response?.data?.error || err.message;
        addLog(`Error scraping "${keyword}": ${errMsg}`, 'error');
        jobState.history.push({
          keyword,
          channelsCount: 0,
          time: new Date().toLocaleTimeString(),
          success: false,
          error: errMsg,
        });
      }

      // If there are more keywords to process, wait 90 seconds
      if (i < keywordsList.length - 1 && !jobState.shouldStop) {
        jobState.status = 'waiting_gap';
        addLog(
          `Waiting ${delay}s gap before next keyword (${i + 2}/${keywordsList.length}: "${keywordsList[i + 1]}")...`,
          'info'
        );
        await sleepWithCountdown(delay);
      }
    }

    jobState.isRunning = false;
    jobState.finishedAt = new Date();
    if (jobState.status !== 'stopped') {
      jobState.status = 'completed';
      addLog('All keywords completed successfully!', 'success');
    }
  })().catch((err) => {
    jobState.isRunning = false;
    jobState.status = 'error';
    addLog(`Fatal job runner error: ${err.message}`, 'error');
  });

  return { success: true, message: `Scraper queue launched for ${keywordsList.length} keywords.` };
}
