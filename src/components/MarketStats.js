import React from 'react';

function fmtBig(n) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(2)}`;
}

export default function MarketStats({ globalData, compact = false }) {
  if (!globalData) {
    return (
      <div className={`market-stats ${compact ? '' : 'full'}`}>
        <div className="ms-item">
          <span className="ms-label">Market</span>
          <span className="ms-value">Loading...</span>
        </div>
      </div>
    );
  }

  const totalMcap = globalData.total_market_cap?.usd;
  const totalVol = globalData.total_volume?.usd;
  const btcDom = globalData.market_cap_percentage?.btc;
  const ethDom = globalData.market_cap_percentage?.eth;
  const activeCrypto = globalData.active_cryptocurrencies;
  const mcapChange = globalData.market_cap_change_percentage_24h_usd;

  if (compact) {
    return (
      <div className="market-stats">
        <div className="ms-item">
          <span className="ms-label">MCap</span>
          <span className="ms-value">{fmtBig(totalMcap)}</span>
        </div>
        <div className="ms-item">
          <span className="ms-label">24h Vol</span>
          <span className="ms-value">{fmtBig(totalVol)}</span>
        </div>
        <div className="ms-item">
          <span className="ms-label">BTC Dom</span>
          <span className="ms-value">{btcDom?.toFixed(1)}%</span>
        </div>
        <div className="ms-item">
          <span className="ms-label">ETH Dom</span>
          <span className="ms-value">{ethDom?.toFixed(1)}%</span>
        </div>
        {mcapChange != null && (
          <div className="ms-item">
            <span className="ms-label">MCap 24h</span>
            <span className={`ms-value ${mcapChange >= 0 ? 'pos' : 'neg'}`}>
              {mcapChange >= 0 ? '+' : ''}{mcapChange?.toFixed(2)}%
            </span>
          </div>
        )}
      </div>
    );
  }

  // Dominance bar
  const btcDomPct = btcDom || 0;
  const ethDomPct = ethDom || 0;
  const otherPct = 100 - btcDomPct - ethDomPct;

  return (
    <div className="full-market-stats">
      <div className="panel-header">
        <span className="panel-title">Global Market</span>
        {mcapChange != null && (
          <span className={`ms-value ${mcapChange >= 0 ? 'pos' : 'neg'}`} style={{ fontSize: 11 }}>
            {mcapChange >= 0 ? '+' : ''}{mcapChange.toFixed(2)}% 24h
          </span>
        )}
      </div>

      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div className="ms-item">
            <span className="ms-label">Total Market Cap</span>
            <span className="ms-value" style={{ fontSize: 14 }}>{fmtBig(totalMcap)}</span>
          </div>
          <div className="ms-item">
            <span className="ms-label">24h Volume</span>
            <span className="ms-value">{fmtBig(totalVol)}</span>
          </div>
          <div className="ms-item">
            <span className="ms-label">Active Cryptos</span>
            <span className="ms-value">{activeCrypto?.toLocaleString()}</span>
          </div>
        </div>

        {/* Dominance bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text3)', marginBottom: 4 }}>
            <span style={{ color: 'var(--yellow)' }}>BTC {btcDomPct.toFixed(1)}%</span>
            <span style={{ color: '#627eea' }}>ETH {ethDomPct.toFixed(1)}%</span>
            <span>Others {otherPct.toFixed(1)}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
            <div style={{ width: `${btcDomPct}%`, background: 'var(--yellow)' }} />
            <div style={{ width: `${ethDomPct}%`, background: '#627eea' }} />
            <div style={{ flex: 1, background: 'var(--bg3)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
