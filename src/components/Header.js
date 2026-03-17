import React, { useState, useEffect } from 'react';

const TICKER_COINS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI'];

export default function Header({ ticker, globalData, selectedSymbol }) {
  const [clock, setClock] = useState('');
  const [miniTickers, setMiniTickers] = useState({});

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClock(now.toUTCString().slice(17, 25) + ' UTC');
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // Mini tickers via Binance WebSocket all-market stream
  useEffect(() => {
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!miniTicker@arr');
    ws.onmessage = (e) => {
      try {
        const arr = JSON.parse(e.data);
        const map = {};
        arr.forEach(t => {
          const sym = t.s.replace('USDT', '');
          if (TICKER_COINS.includes(sym)) {
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
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  // Double the coins for seamless loop
  const tickerItems = [...TICKER_COINS, ...TICKER_COINS];

  const btcPrice = miniTickers['BTC']?.price;
  const totalMcap = globalData?.total_market_cap?.usd;
  const btcDom = globalData?.market_cap_percentage?.btc;

  return (
    <header className="header">
      {/* Logo */}
      <div className="header-logo">
        <div className="header-logo-icon">T</div>
        <span className="header-logo-text">TRADING TERMINAL</span>
      </div>

      {/* Ticker Tape */}
      <div className="header-ticker-tape">
        <div className="ticker-tape-inner">
          {tickerItems.map((sym, i) => {
            const t = miniTickers[sym];
            if (!t) return (
              <div key={`${sym}-${i}`} className="ticker-item">
                <span className="t-sym">{sym}/USDT</span>
                <span className="t-price">—</span>
              </div>
            );
            return (
              <div key={`${sym}-${i}`} className="ticker-item">
                <span className="t-sym">{sym}</span>
                <span className="t-price">${fmtPrice(t.price)}</span>
                <span className={`t-chg ${t.change >= 0 ? 'pos' : 'neg'}`}>
                  {t.change >= 0 ? '+' : ''}{t.change.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Info */}
      <div className="header-right">
        {totalMcap && (
          <div className="header-btc-price">
            <span className="sym">TOTAL MCap</span>
            <span className="prc">${(totalMcap / 1e12).toFixed(2)}T</span>
          </div>
        )}
        {btcDom != null && (
          <div className="header-btc-price">
            <span className="sym">BTC Dom</span>
            <span className="prc">{btcDom.toFixed(1)}%</span>
          </div>
        )}
        {btcPrice != null && (
          <div className="header-btc-price">
            <span className="sym">BTC</span>
            <span className="prc">${fmtPrice(btcPrice)}</span>
          </div>
        )}
        <div className="header-clock">{clock}</div>
      </div>
    </header>
  );
}
