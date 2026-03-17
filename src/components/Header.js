import React, { useState, useEffect } from 'react';

// Live Binance mini-tickers for the header stats strip
const HEADER_SYMBOLS = ['BTC', 'ETH', 'SOL', 'XRP'];

export default function Header({ ticker, globalData, selectedSymbol }) {
  const [clock, setClock] = useState('');
  const [miniTickers, setMiniTickers] = useState({});

  // UTC clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toUTCString().slice(17, 25) + ' UTC');
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Mini tickers via Binance WebSocket
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    ws.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data);
        const map = {};
        arr.forEach(t => {
          const sym = t.s.replace('USDT', '');
          if (HEADER_SYMBOLS.includes(sym)) {
            map[sym] = {
              price: parseFloat(t.c),
              change: ((parseFloat(t.c) - parseFloat(t.o)) / parseFloat(t.o)) * 100,
            };
          }
        });
        setMiniTickers(prev => ({ ...prev, ...map }));
      } catch (_) {}
    };
    ws.onerror = () => {};
    return () => { if (ws.readyState <= 1) ws.close(); };
  }, []);

  const fmtPrice = (p) => {
    if (p == null) return '—';
    if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  const totalMcap = globalData?.total_market_cap?.usd;
  const btcDom = globalData?.market_cap_percentage?.btc;

  return (
    <header className="header">
      {/* Logo */}
      <div className="header-logo">
        <div className="header-logo-icon">
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path d="M8 2L14 5V11L8 14L2 11V5L8 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 2V14M2 5L14 11M14 5L2 11" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5"/>
          </svg>
        </div>
        <span className="header-logo-text">Market Terminal</span>
        <span className="header-logo-badge">PRO</span>
      </div>

      {/* Center: live price strip (no animation, static grid) */}
      <div className="header-strip">
        {HEADER_SYMBOLS.map(sym => {
          const t = miniTickers[sym];
          return (
            <div key={sym} className="header-strip-item">
              <span className="hsi-sym">{sym}</span>
              <span className="hsi-price">${fmtPrice(t?.price)}</span>
              {t && (
                <span className={`hsi-chg ${t.change >= 0 ? 'pos' : 'neg'}`}>
                  {t.change >= 0 ? '▲' : '▼'}{Math.abs(t.change).toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}

        {totalMcap && (
          <div className="header-strip-item">
            <span className="hsi-sym">MCap</span>
            <span className="hsi-price">${(totalMcap / 1e12).toFixed(2)}T</span>
          </div>
        )}
        {btcDom != null && (
          <div className="header-strip-item">
            <span className="hsi-sym">BTC Dom</span>
            <span className="hsi-price" style={{ color: 'var(--yellow)' }}>{btcDom.toFixed(1)}%</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="header-right">
        <div className="header-clock">
          <svg viewBox="0 0 14 14" width="12" height="12" fill="none" style={{ marginRight: 4, flexShrink: 0 }}>
            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 4V7L9 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          {clock}
        </div>
      </div>
    </header>
  );
}
