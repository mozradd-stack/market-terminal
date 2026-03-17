import React, { useEffect, useRef, useState } from 'react';

const MAX_TRADES = 50;

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

function fmtSize(s) {
  if (s >= 1000) return (s / 1000).toFixed(3) + 'K';
  return s.toFixed(4);
}

function fmtTime(ts) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export default function RecentTrades({ symbol }) {
  const [trades, setTrades] = useState([]);
  const wsRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    setTrades([]);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Initial fetch of recent trades
    fetch(`https://api.binance.com/api/v3/trades?symbol=${symbol}&limit=50`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const initial = data.reverse().map(t => ({
            id: t.id,
            price: parseFloat(t.price),
            qty: parseFloat(t.qty),
            isBuyerMaker: t.isBuyerMaker,
            time: t.time,
            fresh: false,
          }));
          setTrades(initial);
        }
      })
      .catch(() => {});

    // WebSocket for live trades
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@trade`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        const trade = {
          id: d.t,
          price: parseFloat(d.p),
          qty: parseFloat(d.q),
          isBuyerMaker: d.m, // true = seller is taker (red), false = buyer is taker (green)
          time: d.T,
          fresh: true,
        };
        setTrades(prev => {
          const next = [trade, ...prev.slice(0, MAX_TRADES - 1)];
          return next;
        });
      } catch (_) {}
    };

    ws.onerror = () => {};

    return () => {
      if (ws.readyState <= 1) ws.close();
    };
  }, [symbol]);

  // Stats
  const buys = trades.filter(t => !t.isBuyerMaker);
  const sells = trades.filter(t => t.isBuyerMaker);
  const buyVol = buys.reduce((s, t) => s + t.qty * t.price, 0);
  const sellVol = sells.reduce((s, t) => s + t.qty * t.price, 0);
  const totalVol = buyVol + sellVol || 1;
  const buyRatio = (buyVol / totalVol * 100).toFixed(1);

  return (
    <div className="recent-trades">
      <div className="panel-header">
        <span className="panel-title">Recent Trades</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{trades.length} trades</span>
      </div>

      {/* Buy/Sell pressure */}
      <div style={{ padding: '4px 8px', background: 'var(--bg0)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: 'var(--green)' }}>Buy {buyRatio}%</span>
          <span style={{ color: 'var(--red)' }}>{(100 - parseFloat(buyRatio)).toFixed(1)}% Sell</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${buyRatio}%`, background: 'var(--green)', borderRadius: 2 }} />
        </div>
      </div>

      <div className="rt-header">
        <span>Price</span>
        <span style={{ textAlign: 'right' }}>Size</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>

      <div className="rt-list" ref={listRef}>
        {trades.map((trade, i) => (
          <div
            key={`${trade.id}-${i}`}
            className={`rt-row ${trade.isBuyerMaker ? 'sell' : 'buy'} ${trade.fresh ? 'blink' : ''}`}
          >
            <span className="rt-price">{fmtPrice(trade.price)}</span>
            <span className="rt-size">{fmtSize(trade.qty)}</span>
            <span className="rt-time">{fmtTime(trade.time)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
