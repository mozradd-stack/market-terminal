import React, { useEffect, useRef, useState } from 'react';

const DEPTH_LEVELS = 15;

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

function fmtSize(s) {
  if (s >= 1000000) return (s / 1000000).toFixed(2) + 'M';
  if (s >= 1000) return (s / 1000).toFixed(2) + 'K';
  return s.toFixed(4);
}

export default function OrderBook({ symbol }) {
  const [asks, setAsks] = useState([]);
  const [bids, setBids] = useState([]);
  const wsRef = useRef(null);

  useEffect(() => {
    setAsks([]);
    setBids([]);

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const stream = `${symbol.toLowerCase()}@depth20@100ms`;
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        const processLevels = (raw) =>
          raw
            .map(([price, qty]) => ({ price: parseFloat(price), qty: parseFloat(qty) }))
            .filter(l => l.qty > 0);

        const newAsks = processLevels(data.asks || []).slice(0, DEPTH_LEVELS);
        const newBids = processLevels(data.bids || []).slice(0, DEPTH_LEVELS);

        setAsks(newAsks);
        setBids(newBids);
      } catch (_) {}
    };

    ws.onerror = () => {};

    return () => {
      if (ws.readyState <= 1) ws.close();
    };
  }, [symbol]);

  // Calculate max total for depth bar width
  const maxAskTotal = asks.reduce((sum, l) => sum + l.qty, 0);
  const maxBidTotal = bids.reduce((sum, l) => sum + l.qty, 0);
  const maxTotal = Math.max(maxAskTotal, maxBidTotal, 1);

  // Running totals
  const asksWithTotal = asks.map((l, i) => ({
    ...l,
    total: asks.slice(0, i + 1).reduce((s, x) => s + x.qty, 0),
  }));

  const bidsWithTotal = bids.map((l, i) => ({
    ...l,
    total: bids.slice(0, i + 1).reduce((s, x) => s + x.qty, 0),
  }));

  const spreadPrice = asks.length && bids.length
    ? asks[0].price - bids[0].price
    : null;

  const spreadPct = asks.length && bids.length
    ? ((asks[0].price - bids[0].price) / asks[0].price * 100)
    : null;

  // Imbalance ratio
  const bidVol = bids.reduce((s, l) => s + l.qty * l.price, 0);
  const askVol = asks.reduce((s, l) => s + l.qty * l.price, 0);
  const totalVol = bidVol + askVol || 1;
  const bidRatio = (bidVol / totalVol * 100).toFixed(1);
  const askRatio = (askVol / totalVol * 100).toFixed(1);

  return (
    <div className="orderbook">
      <div className="panel-header">
        <span className="panel-title">Order Book</span>
        {spreadPct != null && (
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>
            Spread: {spreadPct.toFixed(3)}%
          </span>
        )}
      </div>

      <div className="ob-header">
        <span>Price</span>
        <span style={{ textAlign: 'right' }}>Size</span>
        <span style={{ textAlign: 'right' }}>Total</span>
      </div>

      <div className="ob-body">
        {/* Asks (sell orders) - reversed so lowest ask is at bottom */}
        <div className="ob-asks">
          {asksWithTotal.slice().reverse().map((level, i) => (
            <div key={`ask-${i}`} className="ob-row ask">
              <span className="ob-price">{fmtPrice(level.price)}</span>
              <span className="ob-size">{fmtSize(level.qty)}</span>
              <span className="ob-total">{fmtSize(level.total)}</span>
              <div
                className="ob-depth-bar"
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
            </div>
          ))}
        </div>

        {/* Spread */}
        <div className="ob-spread">
          {asks.length && bids.length ? (
            <>
              <span className={`ob-spread-price ${asks[0].price > bids[0].price ? '' : 'pos'}`}>
                {fmtPrice(bids[0].price)}
              </span>
              {spreadPrice != null && (
                <span style={{ color: 'var(--text3)', fontSize: 10 }}>
                  ▼ {fmtPrice(spreadPrice)}
                </span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text3)' }}>—</span>
          )}
        </div>

        {/* Bids (buy orders) */}
        <div className="ob-bids">
          {bidsWithTotal.map((level, i) => (
            <div key={`bid-${i}`} className="ob-row bid">
              <span className="ob-price">{fmtPrice(level.price)}</span>
              <span className="ob-size">{fmtSize(level.qty)}</span>
              <span className="ob-total">{fmtSize(level.total)}</span>
              <div
                className="ob-depth-bar"
                style={{ width: `${(level.total / maxTotal) * 100}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Imbalance Bar */}
      <div style={{ padding: '4px 8px', background: 'var(--bg0)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
          <span style={{ color: 'var(--green)' }}>B {bidRatio}%</span>
          <span style={{ color: 'var(--text3)' }}>Imbalance</span>
          <span style={{ color: 'var(--red)' }}>{askRatio}% A</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${bidRatio}%`, background: 'var(--green)', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
