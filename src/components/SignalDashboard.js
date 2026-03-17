import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { runSignalEngine, CRYPTO_PAIRS, FOREX_PAIRS, CATEGORIES } from '../utils/signalEngine';

const TIMEFRAMES = [
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
];

// ─── Consensus Gauge SVG ───────────────────────────────────────────────────
function ConsensusGauge({ longPct, shortPct, consensus }) {
  const score = longPct - shortPct; // -100 to +100
  const angle = (score / 100) * 90; // -90 to +90 degrees
  const rad = (angle - 90) * Math.PI / 180;
  const cx = 120, cy = 110, r = 85;
  const nx = cx + r * 0.75 * Math.cos(rad);
  const ny = cy + r * 0.75 * Math.sin(rad);

  const colors = {
    'STRONG LONG': '#00e676',
    'LONG': '#0ecb81',
    'NEUTRAL': '#f0b90b',
    'SHORT': '#f6465d',
    'STRONG SHORT': '#ff1744',
  };
  const color = colors[consensus] || '#f0b90b';

  return (
    <svg viewBox="0 0 240 140" style={{ width: '100%', maxWidth: 300, display: 'block', margin: '0 auto' }}>
      {/* Background arc segments */}
      <path d="M 20 110 A 100 100 0 0 1 70 30" fill="none" stroke="#ff1744" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      <path d="M 70 30 A 100 100 0 0 1 120 15" fill="none" stroke="#f6465d" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      <path d="M 105 16 A 100 100 0 0 1 135 16" fill="none" stroke="#f0b90b" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      <path d="M 120 15 A 100 100 0 0 1 170 30" fill="none" stroke="#0ecb81" strokeWidth="12" strokeLinecap="round" opacity="0.3" />
      <path d="M 170 30 A 100 100 0 0 1 220 110" fill="none" stroke="#00e676" strokeWidth="12" strokeLinecap="round" opacity="0.3" />

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill={color} />

      {/* Labels */}
      <text x="15" y="125" fontSize="9" fill="#f6465d" fontWeight="700">SHORT</text>
      <text x="185" y="125" fontSize="9" fill="#0ecb81" fontWeight="700">LONG</text>

      {/* Value */}
      <text x={cx} y={cy + 25} textAnchor="middle" fontSize="13" fill={color} fontWeight="700" fontFamily="monospace">
        {consensus}
      </text>
    </svg>
  );
}

// ─── Category Bar ──────────────────────────────────────────────────────────
function CategoryBar({ name, data }) {
  if (!data) return null;
  const longPct = data.total ? (data.long / data.total) * 100 : 0;
  const shortPct = data.total ? (data.short / data.total) * 100 : 0;
  const signal = longPct > shortPct ? 'LONG' : shortPct > longPct ? 'SHORT' : 'NEUTRAL';
  const color = signal === 'LONG' ? '#0ecb81' : signal === 'SHORT' ? '#f6465d' : '#f0b90b';

  return (
    <div className="sig-cat-bar">
      <div className="sig-cat-header">
        <span className="sig-cat-name">{name}</span>
        <span className="sig-cat-signal" style={{ color }}>{signal}</span>
        <span className="sig-cat-count">{data.long}L / {data.short}S / {data.neutral}N</span>
      </div>
      <div className="sig-cat-progress">
        <div className="sig-cat-long" style={{ width: `${longPct}%` }} />
        <div className="sig-cat-short" style={{ width: `${shortPct}%` }} />
      </div>
    </div>
  );
}

// ─── Signal Row ────────────────────────────────────────────────────────────
function SignalRow({ signal }) {
  const color = signal.signal === 'LONG' ? '#0ecb81' : signal.signal === 'SHORT' ? '#f6465d' : '#848e9c';
  const bg = signal.signal === 'LONG' ? 'rgba(14,203,129,0.1)' : signal.signal === 'SHORT' ? 'rgba(246,70,93,0.1)' : 'transparent';
  return (
    <div className="sig-row" style={{ background: bg }}>
      <span className="sig-row-id">{signal.id}</span>
      <span className="sig-row-name">{signal.name}</span>
      <span className="sig-row-cat">{signal.category}</span>
      <span className="sig-row-signal" style={{ color, fontWeight: 700 }}>
        {signal.signal === 'LONG' ? '▲ LONG' : signal.signal === 'SHORT' ? '▼ SHORT' : '— NEUTRAL'}
      </span>
      <span className="sig-row-value">{typeof signal.value === 'number' ? signal.value.toFixed(2) : '—'}</span>
    </div>
  );
}

// ─── Helper: Forex OHLCV via Frankfurter (direct browser call) ─────────────
async function fetchForexOHLCV(symbol) {
  const base = symbol.substring(0, 3);
  const quote = symbol.substring(3, 6);
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 600 * 86400000).toISOString().split('T')[0];
  const res = await fetch(`https://api.frankfurter.app/${startDate}..${endDate}?from=${base}&to=${quote}`);
  const data = await res.json();
  const rates = data.rates || {};
  const dates = Object.keys(rates).sort();
  return dates.map((date, i) => {
    const rate = rates[date][quote];
    const prevRate = i > 0 ? rates[dates[i - 1]][quote] : rate;
    const v = Math.abs(rate - prevRate) * 0.3;
    return {
      time: new Date(date).getTime(),
      open: prevRate,
      high: Math.max(rate, prevRate) + v,
      low: Math.min(rate, prevRate) - v,
      close: rate,
      volume: 1000000 + Math.random() * 500000,
    };
  });
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function SignalDashboard({ fearGreedValue, fearGreedPrev, btcDominance, btcDominancePrev, globalMarketCap, globalMarketCapPrev, onSymbolSelect }) {
  const [assetType, setAssetType] = useState('crypto');
  const [selectedAsset, setSelectedAsset] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [filterSignal, setFilterSignal] = useState('All');
  const [search, setSearch] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [scanResults, setScanResults] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [fundingRate, setFundingRate] = useState(null);
  const [longShortRatio, setLongShortRatio] = useState(null);
  const [marketCap, setMarketCap] = useState(null);

  const assets = assetType === 'crypto' ? CRYPTO_PAIRS : FOREX_PAIRS;

  // Fetch Binance futures sentiment data for crypto
  useEffect(() => {
    if (assetType !== 'crypto') return;
    const futuresSymbol = selectedAsset.replace('USDT', '') + 'USDT';
    // Funding rate
    fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${futuresSymbol}`)
      .then(r => r.json())
      .then(d => setFundingRate(d.lastFundingRate ? parseFloat(d.lastFundingRate) : null))
      .catch(() => setFundingRate(null));
    // Long/Short ratio
    fetch(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${futuresSymbol}&period=1h&limit=2`)
      .then(r => r.json())
      .then(d => setLongShortRatio(Array.isArray(d) && d[0] ? parseFloat(d[0].longShortRatio) : null))
      .catch(() => setLongShortRatio(null));
  }, [assetType, selectedAsset]);

  // Fetch OHLCV and run engine
  const analyze = useCallback(async (symbol, tf) => {
    setLoading(true);
    try {
      let ohlcv;
      if (assetType === 'crypto') {
        const res = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${tf}&limit=500`
        );
        const raw = await res.json();
        if (!Array.isArray(raw)) throw new Error('Invalid data');
        ohlcv = raw.map(k => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }));
      } else {
        ohlcv = await fetchForexOHLCV(symbol);
      }

      if (ohlcv.length < 50) throw new Error('Not enough data');
      const engineResult = runSignalEngine(ohlcv, {
        fearGreedValue: fearGreedValue ? parseInt(fearGreedValue) : null,
        fearGreedPrev: fearGreedPrev ? parseInt(fearGreedPrev) : null,
        fundingRate,
        longShortRatio,
        btcDominance,
        btcDominancePrev,
        globalMarketCap,
        globalMarketCapPrev,
        marketCap,
        assetType,
      });
      setResults(engineResult);
    } catch (e) {
      console.error('Signal analysis error:', e);
      setResults(null);
    }
    setLoading(false);
  }, [assetType, fearGreedValue, fearGreedPrev, fundingRate, longShortRatio, btcDominance, btcDominancePrev, globalMarketCap, globalMarketCapPrev, marketCap]);

  useEffect(() => {
    analyze(selectedAsset, timeframe);
  }, [selectedAsset, timeframe, analyze]);

  // Scanner: run engine on all assets
  const runScan = useCallback(async () => {
    setScanning(true);
    const scanList = assetType === 'crypto' ? CRYPTO_PAIRS : FOREX_PAIRS;
    const results = [];

    for (const asset of scanList) {
      try {
        let ohlcv;
        if (assetType === 'crypto') {
          const res = await fetch(
            `https://api.binance.com/api/v3/klines?symbol=${asset.symbol}&interval=${timeframe}&limit=500`
          );
          const raw = await res.json();
          if (!Array.isArray(raw)) continue;
          ohlcv = raw.map(k => ({
            time: k[0], open: parseFloat(k[1]), high: parseFloat(k[2]),
            low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]),
          }));
        } else {
          ohlcv = await fetchForexOHLCV(asset.symbol);
        }

        if (ohlcv.length < 50) continue;
        const r = runSignalEngine(ohlcv, { fearGreedValue: fearGreedValue ? parseInt(fearGreedValue) : null, assetType });
        results.push({
          ...asset,
          ...r.summary,
          price: ohlcv[ohlcv.length - 1].close,
        });
      } catch (e) {
        continue;
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    results.sort((a, b) => b.longPct - a.longPct);
    setScanResults(results);
    setScanning(false);
  }, [assetType, timeframe, fearGreedValue]);

  // Filtered signals
  const filteredSignals = useMemo(() => {
    if (!results) return [];
    return results.signals.filter(s => {
      if (filterCat !== 'All' && s.category !== filterCat) return false;
      if (filterSignal !== 'All' && s.signal !== filterSignal) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [results, filterCat, filterSignal, search]);

  return (
    <div className="signal-dashboard">
      {/* Sentiment Info Bar */}
      {assetType === 'crypto' && (fundingRate != null || longShortRatio != null) && (
        <div className="sig-sentiment-bar">
          {fundingRate != null && (
            <span style={{ color: fundingRate > 0.0005 ? '#f6465d' : fundingRate < -0.0001 ? '#0ecb81' : '#848e9c' }}>
              Funding: {(fundingRate * 100).toFixed(4)}%
            </span>
          )}
          {longShortRatio != null && (
            <span style={{ color: longShortRatio > 1.5 ? '#f6465d' : longShortRatio < 0.7 ? '#0ecb81' : '#848e9c' }}>
              L/S Ratio: {longShortRatio.toFixed(2)}
            </span>
          )}
          {btcDominance != null && (
            <span style={{ color: '#f0b90b' }}>
              BTC Dom: {btcDominance.toFixed(1)}%
            </span>
          )}
          {fearGreedValue != null && (
            <span style={{ color: fearGreedValue < 25 ? '#0ecb81' : fearGreedValue > 75 ? '#f6465d' : '#848e9c' }}>
              Fear&Greed: {fearGreedValue}
            </span>
          )}
        </div>
      )}

      {/* Controls Bar */}
      <div className="sig-controls">
        <div className="sig-controls-left">
          {/* Asset Type Toggle */}
          <div className="sig-toggle">
            <button className={assetType === 'crypto' ? 'active' : ''} onClick={() => { setAssetType('crypto'); setSelectedAsset('BTCUSDT'); }}>Crypto</button>
            <button className={assetType === 'forex' ? 'active' : ''} onClick={() => { setAssetType('forex'); setSelectedAsset('EURUSD'); }}>Forex</button>
          </div>

          {/* Asset Selector */}
          <select
            className="sig-select"
            value={selectedAsset}
            onChange={e => setSelectedAsset(e.target.value)}
          >
            {assets.map(a => (
              <option key={a.symbol} value={a.symbol}>{a.base} — {a.name}</option>
            ))}
          </select>

          {/* Timeframe */}
          <div className="sig-tf-group">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf.value}
                className={`tf-btn ${timeframe === tf.value ? 'active' : ''}`}
                onClick={() => setTimeframe(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sig-controls-right">
          <button className={`sig-scan-btn ${scanMode ? 'active' : ''}`} onClick={() => setScanMode(!scanMode)}>
            {scanMode ? 'Single' : 'Scanner'}
          </button>
          {scanMode && (
            <button className="sig-run-scan" onClick={runScan} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Run Scan'}
            </button>
          )}
          <button className="sig-refresh-btn" onClick={() => analyze(selectedAsset, timeframe)} disabled={loading}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Scanner Mode */}
      {scanMode ? (
        <div className="sig-scanner">
          <div className="sig-scanner-header">
            <div className="panel-header">
              <span className="panel-title">Market Scanner — {assetType.toUpperCase()} — {timeframe}</span>
              <span style={{ fontSize: 10, color: 'var(--text3)' }}>{scanResults.length} assets scanned</span>
            </div>
          </div>

          <div className="sig-scanner-table-header">
            <span>Asset</span>
            <span>Price</span>
            <span>Signal</span>
            <span>Long %</span>
            <span>Details</span>
          </div>

          <div className="sig-scanner-body">
            {scanResults.length === 0 && !scanning && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>
                Click "Run Scan" to analyze all {assetType} pairs
              </div>
            )}
            {scanning && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--yellow)' }}>
                Scanning... Please wait (analyzing ~{assets.length} pairs)
              </div>
            )}
            {scanResults.map(r => {
              const color = r.consensus.includes('LONG') ? '#0ecb81' : r.consensus.includes('SHORT') ? '#f6465d' : '#f0b90b';
              return (
                <div
                  key={r.symbol}
                  className="sig-scanner-row"
                  onClick={() => { setSelectedAsset(r.symbol); setScanMode(false); if (onSymbolSelect) onSymbolSelect(r.symbol); }}
                >
                  <span className="sig-scanner-sym">
                    <strong>{r.base}</strong>
                    <small>{r.name}</small>
                  </span>
                  <span className="sig-scanner-price" style={{ fontFamily: 'var(--font-mono)' }}>
                    {r.price >= 1 ? r.price.toFixed(2) : r.price.toFixed(6)}
                  </span>
                  <span style={{ color, fontWeight: 700, fontSize: 12 }}>{r.consensus}</span>
                  <span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 60, height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${r.longPct}%`, height: '100%', background: '#0ecb81', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color }}>{r.longPct.toFixed(0)}%</span>
                    </div>
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {r.long}L / {r.short}S / {r.neutral}N
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Single Asset Mode */
        <>
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
              Analyzing {selectedAsset} ({timeframe})... Running 100 indicators
            </div>
          )}

          {results && !loading && (
            <div className="sig-content">
              {/* Top Summary Row */}
              <div className="sig-summary-row">
                {/* Gauge */}
                <div className="sig-gauge-card">
                  <ConsensusGauge
                    longPct={results.summary.longPct}
                    shortPct={results.summary.shortPct}
                    consensus={results.summary.consensus}
                  />
                  <div className="sig-counts">
                    <div className="sig-count long">
                      <span className="sig-count-num">{results.summary.long}</span>
                      <span className="sig-count-label">LONG</span>
                    </div>
                    <div className="sig-count neutral">
                      <span className="sig-count-num">{results.summary.neutral}</span>
                      <span className="sig-count-label">NEUTRAL</span>
                    </div>
                    <div className="sig-count short">
                      <span className="sig-count-num">{results.summary.short}</span>
                      <span className="sig-count-label">SHORT</span>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="sig-categories-card">
                  <div className="panel-header">
                    <span className="panel-title">Category Breakdown</span>
                  </div>
                  <div className="sig-categories-list">
                    {CATEGORIES.map(cat => (
                      <CategoryBar key={cat} name={cat} data={results.categories[cat]} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Signal Table */}
              <div className="sig-table-card">
                <div className="sig-table-controls">
                  <input
                    type="text"
                    placeholder="Search indicator..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="sig-search"
                  />
                  <select className="sig-select small" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                    <option value="All">All Categories</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="sig-select small" value={filterSignal} onChange={e => setFilterSignal(e.target.value)}>
                    <option value="All">All Signals</option>
                    <option value="LONG">LONG only</option>
                    <option value="SHORT">SHORT only</option>
                    <option value="NEUTRAL">NEUTRAL only</option>
                  </select>
                  <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {filteredSignals.length} / {results.summary.total} signals
                  </span>
                </div>

                <div className="sig-table-header">
                  <span>#</span>
                  <span>Indicator</span>
                  <span>Category</span>
                  <span>Signal</span>
                  <span>Value</span>
                </div>

                <div className="sig-table-body">
                  {filteredSignals.map(s => <SignalRow key={s.id} signal={s} />)}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
