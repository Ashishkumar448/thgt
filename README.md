# Decodo Intelligence Scraper (Next.js)

Automated Google CSE intelligence scraper powered by Decodo Lambda proxy, featuring a **90-second safety cooldown throttle** between keyword queries and direct **MongoDB persistence**.

---

## ⚡ Quick Start

### 1. Configure `.env`
Your `.env` in `decodo-scraper/.env` is already configured with your MongoDB cluster and Decodo endpoints:
```ini
MONGO_URI="mongodb+srv://<username>:<password>@cluster.mongodb.net/darkmap"
SCRAPER_URL="https://your-api-gateway.amazonaws.com/prod/tg-decodo"
SCRAPER_API_KEY="your_api_key_here"
DELAY_SECONDS=120
DECODO_COLLECTION="decodo_scrapes"
```

### 2. Run the Next.js Web App
```bash
cd decodo-scraper
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🖥️ Web Interface Features

- **Live Progress Monitor**:
  - Live active keyword display with glowing radar indicator.
  - Overall queue percentage and remaining counts.
  - **90-Second Cooldown Countdown** with animated progress meter between each search.
- **Export Data**:
  - **Export CSV** (1-click download with full flattened channels, titles, links, descriptions, dates).
  - **Export JSON** (1-click raw MongoDB export).
- **Keyword Categories Bank**:
  - Contains all requested categories:
    - *Countries*
    - *Regions*
    - *Generic keywords*
    - *Crypto-financial terms*
    - *Terror Groups*
    - *Drugs, weapons, and illicit goods*
    - *Piracy and stolen digital products*
  - Choose to scrape all keywords or filter by category.
- **MongoDB Stored Data Explorer**:
  - Search and inspect saved results.
  - View individual Telegram channels with direct `@handle` links and descriptions.

---

## 💻 CLI Mode (Run in Terminal)

If you prefer to run the scraper directly from the terminal without a browser:
```bash
npm run scrape
```
This executes `scripts/cli-scraper.js`, connecting directly to MongoDB, querying Decodo for 2 pages per keyword, and counting down 90 seconds between each search.
