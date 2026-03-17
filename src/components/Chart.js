import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle } from 'lightweight-charts';

const INTERVALS = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
  { label: '1d', value: '1d' },
  { label: '1w', value: '1w' },
];

const CHART_TYPES = [
  { label: 'Candles', value: 'candle' },
  { label: 'Line', value: 'line' },
  { label: 'Area', value: 'area' },
];

export default function Chart({ symbol }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const wsRef = useRef(null);
  const resizeRef = useRef(null);

  const [interval, setIntervalVal] = useState('1h');
  const [chartType, setChartType] = useState('candle');
  const [loading, setLoading] = useState(true);
  const [currentCandle, setCurrentCandle] = useState(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#848e9c',
        fontFamily: "'Courier New', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1e2130', style: LineStyle.Dotted },
        horzLines: { color: '#1e2130', style: LineStyle.Dotted },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#848e9c', labelBackgroundColor: '#1e2130' },
        horzLine: { color: '#848e9c', labelBackgroundColor: '#1e2130' },
      },
      rightPriceScale: {
        borderColor: '#2a2d3e',
        textColor: '#848e9c',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#2a2d3e',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const d = new Date(time * 1000);
          return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        },
      },
      handleScroll: true,
      handleScale: true,
    });

    chartRef.current = chart;

    // Resize observer
    resizeRef.current = new ResizeObserver(entries => {
      if (chartRef.current && entries[0]) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeRef.current.observe(containerRef.current);

    return () => {
      resizeRef.current?.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Create/recreate series when chart type changes
  const createSeries = useCallback(() => {
    if (!chartRef.current) return null;

    // Remove old series
    if (seriesRef.current) {
      try { chartRef.current.removeSeries(seriesRef.current); } catch (_) {}
      seriesRef.current = null;
    }

    let series;
    if (chartType === 'candle') {
      series = chartRef.current.addCandlestickSeries({
        upColor: '#0ecb81',
        downColor: '#f6465d',
        borderVisible: false,
        wickUpColor: '#0ecb81',
        wickDownColor: '#f6465d',
      });
    } else if (chartType === 'line') {
      series = chartRef.current.addLineSeries({
        color: '#1890ff',
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBackgroundColor: '#1890ff',
      });
    } else {
      series = chartRef.current.addAreaSeries({
        topColor: 'rgba(240,185,11,0.4)',
        bottomColor: 'rgba(240,185,11,0.02)',
        lineColor: '#f0b90b',
        lineWidth: 2,
      });
    }

    seriesRef.current = series;
    return series;
  }, [chartType]);

  // Fetch klines + setup WS
  const loadData = useCallback(async () => {
    if (!chartRef.current) return;
    setLoading(true);
    setCurrentCandle(null);

    // Close old WS
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const series = createSeries();
    if (!series) return;

    try {
      // Fetch historical klines from Binance
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=500`
      );
      const raw = await res.json();

      const candles = raw.map(k => ({
        time: Math.floor(k[0] / 1000),
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        value: parseFloat(k[4]), // for line/area
      }));

      if (chartType === 'candle') {
        series.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
      } else {
        series.setData(candles.map(c => ({ time: c.time, value: c.close })));
      }

      if (candles.length > 0) {
        setCurrentCandle(candles[candles.length - 1]);
      }

      chartRef.current.timeScale().fitContent();
      setLoading(false);

      // Volume series (simple color coded)
      // Binance WS for real-time updates
      const stream = `${symbol.toLowerCase()}@kline_${interval}`;
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          const k = data.k;
          const candle = {
            time: Math.floor(k.t / 1000),
            open: parseFloat(k.o),
            high: parseFloat(k.h),
            low: parseFloat(k.l),
            close: parseFloat(k.c),
            value: parseFloat(k.c),
          };

          if (seriesRef.current) {
            if (chartType === 'candle') {
              seriesRef.current.update({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close });
            } else {
              seriesRef.current.update({ time: candle.time, value: candle.close });
            }
          }

          setCurrentCandle(candle);
        } catch (_) {}
      };

      ws.onerror = () => {};

    } catch (err) {
      console.error('Chart load error:', err);
      setLoading(false);
    }
  }, [symbol, interval, chartType, createSeries]);

  useEffect(() => {
    loadData();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [loadData]);

  const fmtNum = (n, d = 2) => n != null ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

  return (
    <div className="chart-container">
      {/* Toolbar */}
      <div className="chart-toolbar">
        <span className="chart-toolbar-label">Interval:</span>
        {INTERVALS.map(iv => (
          <button
            key={iv.value}
            className={`tf-btn ${interval === iv.value ? 'active' : ''}`}
            onClick={() => setIntervalVal(iv.value)}
          >
            {iv.label}
          </button>
        ))}

        <span className="chart-toolbar-label" style={{ marginLeft: 12 }}>Type:</span>
        {CHART_TYPES.map(ct => (
          <button
            key={ct.value}
            className={`chart-type-btn ${chartType === ct.value ? 'active' : ''}`}
            onClick={() => setChartType(ct.value)}
          >
            {ct.label}
          </button>
        ))}

        {/* Live OHLCV display */}
        {currentCandle && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            <span>O <span style={{ color: 'var(--text1)' }}>{fmtNum(currentCandle.open, 2)}</span></span>
            <span>H <span style={{ color: 'var(--green)' }}>{fmtNum(currentCandle.high, 2)}</span></span>
            <span>L <span style={{ color: 'var(--red)' }}>{fmtNum(currentCandle.low, 2)}</span></span>
            <span>C <span style={{ color: currentCandle.close >= currentCandle.open ? 'var(--green)' : 'var(--red)' }}>{fmtNum(currentCandle.close, 2)}</span></span>
          </div>
        )}
      </div>

      {/* Chart */}
      {loading && <div className="chart-loading">Loading chart data...</div>}
      <div ref={containerRef} className="chart-canvas" style={{ display: loading ? 'none' : 'block' }} />
    </div>
  );
}
