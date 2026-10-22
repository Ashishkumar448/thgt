import mongoose from 'mongoose';

const COLLECTION_NAME = process.env.DECODO_COLLECTION || 'decodo_scrapes';

const ScrapeResultSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      index: true,
      trim: true,
      lowercase: true,
    },
    channel_names: {
      type: [String],
      default: [],
    },
    channels: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    channelsCount: {
      type: Number,
      default: 0,
    },
    pagesFetched: {
      type: Number,
      default: 2,
    },
    source: {
      type: String,
      default: 'tg-decodo',
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    scrapedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: COLLECTION_NAME,
  }
);

export default mongoose.models.ScrapeResult || mongoose.model('ScrapeResult', ScrapeResultSchema);
