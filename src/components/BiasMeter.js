import React, { useState, useEffect, useCallback } from 'react';
import { runSignalEngine } from '../utils/signalEngine';

const BIAS_CONFIG = {
  'STRONG LONG':  { label: 'STRONG BULL', color: '#00e676', bg: 'rgba(0,230,118,0.12)', icon: '▲▲' },
  'LONG':         { label: 'BULLISH',      color: '#0ecb81', bg: 'rgba(14,203,129,0.1)', icon: '▲'  },
  'NEUTRAL':      { label: 'NEUTRAL',      color: '#f0b90b', bg: 'rgba(240,185,11,0.1)', icon: '—'  },
  'SHORT':        { label: 'BEARISH',      color: '#f6465d', bg: 'rgba(246,70,93,0.1)',  icon: '▼'  },
  'STRONG SHORT': { label: 'STRONG BEAR',  color: '#ff1744', bg: 'rgba(255,23,68,0.12)', icon: '▼▼' },
};

export default function BiasMeter({ symbol, timeframe = '1h' }) {
  const [bias, setBias] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastSymbol, setLastSymbol] = useState(null);

  const fetchBias = useCallback(async (sym, tf) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${sym}&interval=${tf}&limit=300`
      );
      const raw = await res.json();
      if (!Array.isArray(raw) || raw.length < 50) throw new Error('insufficient data');
      const ohlcv = raw.map(k => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
      }));
      const result = runSignalEngine(ohlcv, { assetType: 'crypto' });
      setBias(result.summary);
      setLastSymbol(sym);
    } catch {
      setBias(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!symbol) return;
    fetchBias(symbol, timeframe);
  }, [symbol, timeframe, fetchBias]);

  if (!bias && !loading) return null;

  if (loading && !bias) {
    return (
      <div className="bias-meter bias-loading">
        <span className="bias-spinner" /> Computing bias...
      </div>
    );
  }

  if (!bias) return null;

  const cfg = BIAS_CONFIG[bias.consensus] || BIAS_CONFIG['NEUTRAL'];
  const score = bias.longPct - bias.shortPct; // -100 to +100
  const barWidth = Math.abs(score);
  const barColor = score > 0 ? '#0ecb81' : score < 0 ? '#f6465d' : '#f0b90b';

  return (
    <div className="bias-meter" style={{ '--bias-color': cfg.color, '--bias-bg': cfg.bg }}>
      {/* Left: icon + label */}
      <div className="bias-label-group">
        <span className="bias-icon" style={{ color: cfg.color }}>{cfg.icon}</span>
        <span className="bias-label" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {/* Center: bar */}
      <div className="bias-bar-wrap">
        <div className="bias-bar-track">
          {/* Center line */}
          <div className="bias-bar-center" />
          {/* Fill from center */}
          <div
            className="bias-bar-fill"
            style={{
              width: `${barWidth / 2}%`,
              background: barColor,
              left: score >= 0 ? '50%' : `${50 - barWidth / 2}%`,
            }}
          />
        </div>
        <div className="bias-score-labels">
          <span style={{ color: '#f6465d' }}>{bias.short} Bear</span>
          <span style={{ color: 'var(--text3)', fontSize: 9 }}>{bias.neutral} Neutral</span>
          <span style={{ color: '#0ecb81' }}>{bias.long} Bull</span>
        </div>
      </div>

      {/* Right: score + refresh */}
      <div className="bias-right">
        <span className="bias-score" style={{ color: cfg.color }}>
          {score > 0 ? '+' : ''}{score.toFixed(0)}
        </span>
        <span className="bias-total">/ 100</span>
        <button
          className="bias-refresh"
          onClick={() => fetchBias(symbol, timeframe)}
          disabled={loading}
          title="Refresh bias"
        >
          {loading ? '·' : '↻'}
        </button>
      </div>
    </div>
  );
}
