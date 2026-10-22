'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [status, setStatus] = useState({
    isRunning: false,
    status: 'idle',
    currentKeyword: null,
    currentIndex: 0,
    totalKeywords: 0,
    countdownSeconds: 0,
    delaySeconds: 90,
    logs: [],
    history: [],
  });

  const [keywords, setKeywords] = useState([]);
  const [categories, setCategories] = useState({});
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [newKeyword, setNewKeyword] = useState('');
  const [singleKeyword, setSingleKeyword] = useState('');
  const [singleLoading, setSingleLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [totalDbCount, setTotalDbCount] = useState(0);
  const [selectedResult, setSelectedResult] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'keywords' | 'database'
  const logEndRef = useRef(null);

  // Poll status from server
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/scrape/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to poll status', e);
    }
  };

  // Poll keywords
  const fetchKeywords = async () => {
    try {
      const res = await fetch('/api/keywords');
      if (res.ok) {
        const data = await res.json();
        setKeywords(data.keywords || []);
        setCategories(data.categories || {});
      }
    } catch (e) {
      console.error('Failed to fetch keywords', e);
    }
  };

  // Poll database records
  const fetchResults = async () => {
    try {
      const q = encodeURIComponent(searchFilter);
      const res = await fetch(`/api/results?q=${q}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setTotalDbCount(data.totalCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch results', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchKeywords();
    fetchResults();

    const interval = setInterval(
      () => {
        fetchStatus();
      },
      status.isRunning ? 1000 : 3000
    );

    return () => clearInterval(interval);
  }, [status.isRunning]);

  useEffect(() => {
    fetchResults();
  }, [searchFilter]);

  const handleStartQueue = async (customKeywords = null) => {
    try {
      const targetKeywords = customKeywords || (
        selectedCategory === 'All'
          ? keywords
          : (categories[selectedCategory] || keywords)
      );

      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: targetKeywords }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to start');
      } else {
        fetchStatus();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStopQueue = async () => {
    try {
      await fetch('/api/scrape/stop', { method: 'POST' });
      fetchStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddKeyword = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;
    const updated = [...keywords, newKeyword.trim()];
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: updated }),
      });
      if (res.ok) {
        setKeywords(updated);
        setNewKeyword('');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemoveKeyword = async (targetKw) => {
    const updated = keywords.filter((k) => k !== targetKw);
    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: updated }),
      });
      if (res.ok) {
        setKeywords(updated);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSingleScrape = async (e) => {
    e.preventDefault();
    if (!singleKeyword.trim()) return;
    setSingleLoading(true);
    try {
      const res = await fetch('/api/scrape/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords: [singleKeyword.trim()] }),
      });
      if (res.ok) {
        setSingleKeyword('');
        fetchStatus();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setSingleLoading(false);
    }
  };

  const displayedKeywords = selectedCategory === 'All'
    ? keywords
    : (categories[selectedCategory] || []);

  const progressPercent = status.totalKeywords
    ? Math.round((status.currentIndex / status.totalKeywords) * 100)
    : 0;

  const gapPercent = status.delaySeconds
    ? Math.max(0, Math.min(100, (status.countdownSeconds / status.delaySeconds) * 100))
    : 0;

  return (
    <main style={{ padding: '32px 24px', maxWidth: '1480px', margin: '0 auto' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px',
          paddingBottom: '24px',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: status.isRunning ? 'var(--accent-emerald)' : 'var(--accent-cyan)',
                boxShadow: status.isRunning ? 'var(--glow-emerald)' : 'var(--glow-cyan)',
              }}
            />
            <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.02em' }}>
              Decodo Intelligence Scraper
            </h1>
            <span className="badge badge-cyan">2 Pages / Keyword</span>
            <span className="badge badge-amber">90s Throttle Gap</span>
            <span className="badge badge-emerald">MongoDB Connected</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Multi-keyword CSE threat discovery engine with 90-second rate-limiting cooldown and full MongoDB persistence.
          </p>
        </div>

        {/* Action Controls & Export Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Export Buttons */}
          <a
            href="/api/export?format=csv"
            download
            className="btn btn-secondary"
            style={{ borderColor: 'var(--accent-emerald)', color: 'var(--accent-emerald)' }}
            title="Export all database records to CSV spreadsheet"
          >
            📥 Export CSV
          </a>
          <a
            href="/api/export?format=json"
            download
            className="btn btn-secondary"
            style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            title="Export all raw database records as JSON"
          >
            💾 Export JSON
          </a>

          {/* Queue Start/Stop */}
          {!status.isRunning ? (
            <button
              onClick={() => handleStartQueue()}
              className="btn btn-primary"
              style={{ padding: '12px 22px', fontSize: '14px' }}
            >
              ▶ Start Scraper Queue ({keywords.length})
            </button>
          ) : (
            <button
              onClick={handleStopQueue}
              className="btn btn-danger"
              style={{ padding: '12px 22px', fontSize: '14px' }}
            >
              ⏹ Stop Scraper
            </button>
          )}

          <button onClick={() => { fetchStatus(); fetchResults(); }} className="btn btn-secondary">
            ↻
          </button>
        </div>
      </header>

      {/* Primary KPI Status Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {/* Metric 1: State */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            ENGINE STATUS
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700' }}>
            {status.isRunning ? (
              status.status === 'waiting_gap' ? (
                <span style={{ color: 'var(--accent-amber)' }}>Waiting 90s Gap</span>
              ) : (
                <span style={{ color: 'var(--accent-emerald)' }}>Scraping Decodo</span>
              )
            ) : (
              <span style={{ color: 'var(--text-muted)' }}>Idle / Standby</span>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Active: {status.currentKeyword ? `"${status.currentKeyword}"` : 'None'}
          </div>
        </div>

        {/* Metric 2: Progress */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            QUEUE PROGRESS
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
            {status.currentIndex} / {status.totalKeywords || keywords.length} ({progressPercent}%)
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {Math.max(0, (status.totalKeywords || keywords.length) - status.currentIndex)} keywords remaining
          </div>
        </div>

        {/* Metric 3: Throttle Cooldown */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            90S THROTTLE COOLDOWN
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-amber)', fontFamily: 'JetBrains Mono' }}>
            {status.status === 'waiting_gap' ? `${status.countdownSeconds}s remaining` : '0s (Not waiting)'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Fixed 90s safety delay between searches
          </div>
        </div>

        {/* Metric 4: Stored in DB */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
            STORED IN MONGODB
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--accent-emerald)' }}>
            {totalDbCount} Keywords Saved
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Collection: <code>decodo_scrapes</code>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className="btn"
          style={{
            background: activeTab === 'dashboard' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'dashboard' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: activeTab === 'dashboard' ? '1px solid var(--border-glow)' : '1px solid transparent',
          }}
        >
          📊 Live Progress & Console
        </button>
        <button
          onClick={() => setActiveTab('keywords')}
          className="btn"
          style={{
            background: activeTab === 'keywords' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'keywords' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: activeTab === 'keywords' ? '1px solid var(--border-glow)' : '1px solid transparent',
          }}
        >
          📋 Keywords Categories ({keywords.length})
        </button>
        <button
          onClick={() => setActiveTab('database')}
          className="btn"
          style={{
            background: activeTab === 'database' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
            color: activeTab === 'database' ? 'var(--accent-cyan)' : 'var(--text-muted)',
            border: activeTab === 'database' ? '1px solid var(--border-glow)' : '1px solid transparent',
          }}
        >
          🗄️ MongoDB Records & Export ({totalDbCount})
        </button>
      </div>

      {/* TAB 1: LIVE PROGRESS & CONSOLE */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '24px' }}>
          {/* Left Column: Progress details & Throttle gap */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Live Progress Card */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700' }}>Execution Progress</h3>
                {status.isRunning ? (
                  <span className="badge badge-emerald">RUNNING</span>
                ) : (
                  <span className="badge badge-dim">STANDBY</span>
                )}
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  <span>Completed: {status.currentIndex} of {status.totalKeywords || keywords.length}</span>
                  <strong style={{ color: 'var(--accent-cyan)' }}>{progressPercent}%</strong>
                </div>
                <div style={{ height: '10px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '5px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${progressPercent}%`,
                      background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>

              {/* 90-Second Throttle Countdown Box */}
              {status.status === 'waiting_gap' ? (
                <div
                  style={{
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '24px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--accent-amber)', fontWeight: '700', letterSpacing: '0.05em' }}>
                    ⏳ 90-SECOND GAP THROTTLE ACTIVE
                  </div>
                  <div style={{ fontSize: '48px', fontWeight: '900', fontFamily: 'JetBrains Mono', color: 'var(--accent-amber)', margin: '8px 0' }}>
                    {status.countdownSeconds}s
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                    Waiting before scraping next keyword to prevent upstream rate limiting.
                  </p>
                  <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${gapPercent}%`,
                        background: 'var(--accent-amber)',
                        transition: 'width 1s linear',
                      }}
                    />
                  </div>
                </div>
              ) : status.isRunning ? (
                <div
                  style={{
                    background: 'rgba(56, 189, 248, 0.08)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    padding: '24px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                    🔍 SEARCHING DECODO (2 PAGES)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff', margin: '10px 0' }}>
                    &quot;{status.currentKeyword}&quot;
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Fetching Google CSE rendered channels via Decodo Lambda...
                  </p>
                </div>
              ) : null}

              {/* Quick Single Keyword Scrape */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Test Single Keyword</h4>
                <form onSubmit={handleSingleScrape} style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    placeholder="Enter any keyword to scrape immediately..."
                    value={singleKeyword}
                    onChange={(e) => setSingleKeyword(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#fff',
                      outline: 'none',
                    }}
                  />
                  <button type="submit" disabled={singleLoading || status.isRunning} className="btn btn-primary">
                    {singleLoading ? 'Scraping...' : 'Scrape'}
                  </button>
                </form>
              </div>
            </div>

            {/* Quick Export Panel */}
            <div className="glass-panel" style={{ padding: '22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>Export Collected Data</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Export all {totalDbCount} scraped keyword results and telegram channels.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <a href="/api/export?format=csv" download className="btn btn-primary" style={{ fontSize: '13px' }}>
                    📊 CSV Spreadsheet
                  </a>
                  <a href="/api/export?format=json" download className="btn btn-secondary" style={{ fontSize: '13px' }}>
                    📁 Raw JSON
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Console */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Live Engine Console</h3>
              <span className="badge badge-dim">{status.logs.length} events logged</span>
            </div>

            <div
              className="terminal-window"
              style={{
                flex: 1,
                minHeight: '450px',
                maxHeight: '520px',
                overflowY: 'auto',
                padding: '16px',
              }}
            >
              {status.logs.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  Console idle. Press &quot;Start Scraper Queue&quot; to begin scraping the keywords with 90s throttle.
                </div>
              ) : (
                status.logs.map((log, i) => (
                  <div key={i} style={{ marginBottom: '6px', wordBreak: 'break-word' }}>
                    <span style={{ color: 'var(--text-dim)', marginRight: '8px' }}>[{log.time}]</span>
                    <span
                      style={{
                        color:
                          log.type === 'error'
                            ? 'var(--accent-rose)'
                            : log.type === 'success'
                            ? 'var(--accent-emerald)'
                            : log.type === 'warn'
                            ? 'var(--accent-amber)'
                            : 'var(--accent-cyan)',
                        fontWeight: '500',
                      }}
                    >
                      {log.msg}
                    </span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORDS CATEGORIES */}
      {activeTab === 'keywords' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Target Keyword Bank</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Total unique keywords loaded: {keywords.length} across {Object.keys(categories).length} categories.
              </p>
            </div>

            {/* Category Selector */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setSelectedCategory('All')}
                className="btn"
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  background: selectedCategory === 'All' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                  color: selectedCategory === 'All' ? '#000' : '#fff',
                }}
              >
                All ({keywords.length})
              </button>
              {Object.keys(categories).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="btn"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    background: selectedCategory === cat ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                    color: selectedCategory === cat ? '#000' : '#fff',
                  }}
                >
                  {cat} ({categories[cat]?.length || 0})
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions for Selected Category */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '14px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Viewing: <strong style={{ color: '#fff' }}>{selectedCategory}</strong> ({displayedKeywords.length} keywords)
            </span>
            <button
              onClick={() => handleStartQueue(displayedKeywords)}
              disabled={status.isRunning}
              className="btn btn-primary"
              style={{ fontSize: '13px' }}
            >
              ▶ Scrape Only &quot;{selectedCategory}&quot; ({displayedKeywords.length})
            </button>
          </div>

          {/* Add Keyword */}
          <form onSubmit={handleAddKeyword} style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Add custom keyword to list..."
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                color: '#fff',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary">
              + Add to Bank
            </button>
          </form>

          {/* Keywords Display Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {displayedKeywords.map((kw, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '11px', marginRight: '6px' }}>#{idx + 1}</span>
                  <span style={{ fontWeight: '500', fontSize: '13px' }}>{kw}</span>
                </div>
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-dim)',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: MONGODB RECORDS & EXPORT */}
      {activeTab === 'database' && (
        <div className="glass-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                Stored MongoDB Collection: <code>decodo_scrapes</code>
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Total records: {totalDbCount} keywords saved with 2-page channel discovery
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Search keyword or channel in DB..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: '280px',
                  padding: '10px 14px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#fff',
                  outline: 'none',
                }}
              />
              <a href="/api/export?format=csv" download className="btn btn-primary" style={{ fontSize: '13px' }}>
                📥 Export CSV
              </a>
              <a href="/api/export?format=json" download className="btn btn-secondary" style={{ fontSize: '13px' }}>
                💾 Export JSON
              </a>
            </div>
          </div>

          {results.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)' }}>
              No records found in MongoDB. Start the scraper queue to collect and save channels.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
              {results.map((doc) => (
                <div
                  key={doc._id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span className="badge badge-cyan">{doc.keyword}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        {new Date(doc.scrapedAt || doc.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      <div>Channels: <strong style={{ color: '#fff' }}>{doc.channelsCount || 0}</strong></div>
                      <div>Pages: <strong style={{ color: '#fff' }}>{doc.pagesFetched || 2}</strong></div>
                    </div>

                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '14px' }}>
                      Channels: {doc.channel_names?.slice(0, 4).join(', ') || 'None found'}
                      {doc.channel_names?.length > 4 && ` (+${doc.channel_names.length - 4} more)`}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedResult(doc)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '13px' }}
                  >
                    View All {doc.channelsCount || 0} Channels
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal for Channel Details */}
      {selectedResult && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
          onClick={() => setSelectedResult(null)}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '850px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '28px',
              background: '#0d121d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Keyword: &quot;{selectedResult.keyword}&quot;</h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Total {selectedResult.channelsCount || 0} channels extracted from Decodo (2 pages)
                </span>
              </div>
              <button onClick={() => setSelectedResult(null)} className="btn btn-secondary">
                ✕ Close
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(selectedResult.channels && selectedResult.channels.length > 0) ? (
                selectedResult.channels.map((ch, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--accent-cyan)' }}>
                        {ch.title || ch.name || `Channel #${i + 1}`}
                      </strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
                        @{ch.name || 'unknown'}
                      </span>
                    </div>
                    {ch.description && (
                      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                        {ch.description}
                      </p>
                    )}
                    {ch.link && (
                      <a
                        href={ch.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', color: 'var(--accent-blue)', display: 'inline-block', marginTop: '6px' }}
                      >
                        {ch.link} ↗
                      </a>
                    )}
                  </div>
                ))
              ) : (
                (selectedResult.channel_names || []).map((name, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    @{name}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
