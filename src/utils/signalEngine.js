// ─── 100-Signal Trading Engine ────────────────────────────────────────────────
// Calculates 100 quantitative + fundamental signals and aggregates consensus.

import * as I from './indicators';

const LONG = 'LONG';
const SHORT = 'SHORT';
const NEUTRAL = 'NEUTRAL';

// ═══ Factory Helpers ════════════════════════════════════════════════════════

function maCross(maFnShort, pShort, maFnLong, pLong) {
  return (d) => {
    const s = maFnShort(d.closes, pShort);
    const l = maFnLong(d.closes, pLong);
    const sv = I.last(s), lv = I.last(l);
    if (sv == null || lv == null) return { signal: NEUTRAL, value: 0 };
    return { signal: sv > lv ? LONG : sv < lv ? SHORT : NEUTRAL, value: ((sv - lv) / lv * 100) };
  };
}

function rsiSignal(period, ob = 70, os = 30) {
  return (d) => {
    const r = I.rsi(d.closes, period);
    const v = I.last(r);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < os ? LONG : v > ob ? SHORT : NEUTRAL, value: v };
  };
}

// ═══ All 100 Signal Definitions ═════════════════════════════════════════════

const SIGNAL_DEFS = [
  // ─── Moving Average Crossovers (1–15) ────────────────────────────────────
  { id: 1,  name: 'SMA 5/20 Cross',         cat: 'Moving Averages', fn: maCross(I.sma, 5, I.sma, 20) },
  { id: 2,  name: 'SMA 10/30 Cross',        cat: 'Moving Averages', fn: maCross(I.sma, 10, I.sma, 30) },
  { id: 3,  name: 'SMA 20/50 Cross',        cat: 'Moving Averages', fn: maCross(I.sma, 20, I.sma, 50) },
  { id: 4,  name: 'SMA 50/100 Cross',       cat: 'Moving Averages', fn: maCross(I.sma, 50, I.sma, 100) },
  { id: 5,  name: 'SMA 50/200 Golden Cross', cat: 'Moving Averages', fn: maCross(I.sma, 50, I.sma, 200) },
  { id: 6,  name: 'EMA 5/20 Cross',         cat: 'Moving Averages', fn: maCross(I.ema, 5, I.ema, 20) },
  { id: 7,  name: 'EMA 10/30 Cross',        cat: 'Moving Averages', fn: maCross(I.ema, 10, I.ema, 30) },
  { id: 8,  name: 'EMA 20/50 Cross',        cat: 'Moving Averages', fn: maCross(I.ema, 20, I.ema, 50) },
  { id: 9,  name: 'EMA 50/100 Cross',       cat: 'Moving Averages', fn: maCross(I.ema, 50, I.ema, 100) },
  { id: 10, name: 'EMA 50/200 Cross',       cat: 'Moving Averages', fn: maCross(I.ema, 50, I.ema, 200) },
  { id: 11, name: 'DEMA 20/50 Cross',       cat: 'Moving Averages', fn: maCross(I.dema, 20, I.dema, 50) },
  { id: 12, name: 'TEMA 20/50 Cross',       cat: 'Moving Averages', fn: maCross(I.tema, 20, I.tema, 50) },
  { id: 13, name: 'WMA 10/30 Cross',        cat: 'Moving Averages', fn: maCross(I.wma, 10, I.wma, 30) },
  { id: 14, name: 'Price vs SMA 200',       cat: 'Moving Averages', fn: (d) => {
    const s = I.sma(d.closes, 200); const v = I.last(s); const c = d.closes[d.closes.length - 1];
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: c > v ? LONG : SHORT, value: ((c - v) / v * 100) };
  }},
  { id: 15, name: 'Price vs EMA 50',        cat: 'Moving Averages', fn: (d) => {
    const s = I.ema(d.closes, 50); const v = I.last(s); const c = d.closes[d.closes.length - 1];
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: c > v ? LONG : SHORT, value: ((c - v) / v * 100) };
  }},

  // ─── RSI Signals (16–20) ─────────────────────────────────────────────────
  { id: 16, name: 'RSI(7) OB/OS',           cat: 'Oscillators', fn: rsiSignal(7) },
  { id: 17, name: 'RSI(14) OB/OS',          cat: 'Oscillators', fn: rsiSignal(14) },
  { id: 18, name: 'RSI(21) OB/OS',          cat: 'Oscillators', fn: rsiSignal(21) },
  { id: 19, name: 'RSI(14) Midline Cross',  cat: 'Oscillators', fn: (d) => {
    const r = I.rsi(d.closes, 14); const v = I.last(r);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 50 ? LONG : v < 50 ? SHORT : NEUTRAL, value: v };
  }},
  { id: 20, name: 'RSI(14) Trend',          cat: 'Oscillators', fn: (d) => {
    const r = I.rsi(d.closes, 14); const v = I.last(r); const p = I.prev(r, 3);
    if (v == null || p == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > p ? LONG : v < p ? SHORT : NEUTRAL, value: v };
  }},

  // ─── Stochastic Signals (21–24) ──────────────────────────────────────────
  { id: 21, name: 'Stoch(14,3,3)',          cat: 'Oscillators', fn: (d) => {
    const s = I.stochastic(d.highs, d.lows, d.closes, 14, 3, 3);
    const k = I.last(s.K), dv = I.last(s.D);
    if (k == null) return { signal: NEUTRAL, value: 0 };
    if (k < 20 && k > dv) return { signal: LONG, value: k };
    if (k > 80 && k < dv) return { signal: SHORT, value: k };
    return { signal: k > dv ? LONG : k < dv ? SHORT : NEUTRAL, value: k };
  }},
  { id: 22, name: 'Stoch(5,3,3) Fast',     cat: 'Oscillators', fn: (d) => {
    const s = I.stochastic(d.highs, d.lows, d.closes, 5, 3, 3);
    const k = I.last(s.K);
    if (k == null) return { signal: NEUTRAL, value: 0 };
    return { signal: k < 20 ? LONG : k > 80 ? SHORT : NEUTRAL, value: k };
  }},
  { id: 23, name: 'StochRSI Signal',        cat: 'Oscillators', fn: (d) => {
    const s = I.stochRsi(d.closes);
    const k = I.last(s.K), dv = I.last(s.D);
    if (k == null) return { signal: NEUTRAL, value: 0 };
    return { signal: k < 20 ? LONG : k > 80 ? SHORT : k > dv ? LONG : k < dv ? SHORT : NEUTRAL, value: k };
  }},
  { id: 24, name: 'Stoch(21,5,5) Slow',    cat: 'Oscillators', fn: (d) => {
    const s = I.stochastic(d.highs, d.lows, d.closes, 21, 5, 5);
    const k = I.last(s.K), dv = I.last(s.D);
    if (k == null) return { signal: NEUTRAL, value: 0 };
    return { signal: k < 25 ? LONG : k > 75 ? SHORT : k > dv ? LONG : SHORT, value: k };
  }},

  // ─── MACD Signals (25–28) ────────────────────────────────────────────────
  { id: 25, name: 'MACD(12,26,9) Signal',   cat: 'Oscillators', fn: (d) => {
    const m = I.macd(d.closes, 12, 26, 9);
    const l = I.last(m.line), s = I.last(m.signal);
    if (l == null || s == null) return { signal: NEUTRAL, value: 0 };
    return { signal: l > s ? LONG : SHORT, value: l - s };
  }},
  { id: 26, name: 'MACD(12,26,9) Zero',    cat: 'Oscillators', fn: (d) => {
    const m = I.macd(d.closes, 12, 26, 9); const l = I.last(m.line);
    if (l == null) return { signal: NEUTRAL, value: 0 };
    return { signal: l > 0 ? LONG : SHORT, value: l };
  }},
  { id: 27, name: 'MACD(5,35,5) Signal',   cat: 'Oscillators', fn: (d) => {
    const m = I.macd(d.closes, 5, 35, 5);
    const l = I.last(m.line), s = I.last(m.signal);
    if (l == null || s == null) return { signal: NEUTRAL, value: 0 };
    return { signal: l > s ? LONG : SHORT, value: l - s };
  }},
  { id: 28, name: 'MACD Histogram Trend',   cat: 'Oscillators', fn: (d) => {
    const m = I.macd(d.closes, 12, 26, 9); const h = I.last(m.histogram); const p = I.prev(m.histogram, 1);
    if (h == null || p == null) return { signal: NEUTRAL, value: 0 };
    return { signal: h > p ? LONG : h < p ? SHORT : NEUTRAL, value: h };
  }},

  // ─── Williams %R (29–30) ─────────────────────────────────────────────────
  { id: 29, name: 'Williams %R(14)',        cat: 'Oscillators', fn: (d) => {
    const w = I.williamsR(d.highs, d.lows, d.closes, 14); const v = I.last(w);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < -80 ? LONG : v > -20 ? SHORT : NEUTRAL, value: v };
  }},
  { id: 30, name: 'Williams %R(28)',        cat: 'Oscillators', fn: (d) => {
    const w = I.williamsR(d.highs, d.lows, d.closes, 28); const v = I.last(w);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < -80 ? LONG : v > -20 ? SHORT : NEUTRAL, value: v };
  }},

  // ─── CCI Signals (31–32) ─────────────────────────────────────────────────
  { id: 31, name: 'CCI(14)',               cat: 'Oscillators', fn: (d) => {
    const c = I.cci(d.highs, d.lows, d.closes, 14); const v = I.last(c);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < -100 ? LONG : v > 100 ? SHORT : v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 32, name: 'CCI(20)',               cat: 'Oscillators', fn: (d) => {
    const c = I.cci(d.highs, d.lows, d.closes, 20); const v = I.last(c);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < -100 ? LONG : v > 100 ? SHORT : v > 0 ? LONG : SHORT, value: v };
  }},

  // ─── Ultimate Oscillator (33) ────────────────────────────────────────────
  { id: 33, name: 'Ultimate Oscillator',    cat: 'Oscillators', fn: (d) => {
    const u = I.ultimateOscillator(d.highs, d.lows, d.closes); const v = I.last(u);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < 30 ? LONG : v > 70 ? SHORT : v > 50 ? LONG : SHORT, value: v };
  }},

  // ─── Momentum & ROC (34–37) ──────────────────────────────────────────────
  { id: 34, name: 'Momentum(10)',           cat: 'Oscillators', fn: (d) => {
    const m = I.momentum(d.closes, 10); const v = I.last(m);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 35, name: 'Momentum(20)',           cat: 'Oscillators', fn: (d) => {
    const m = I.momentum(d.closes, 20); const v = I.last(m);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 36, name: 'ROC(12)',               cat: 'Oscillators', fn: (d) => {
    const r = I.roc(d.closes, 12); const v = I.last(r);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 37, name: 'ROC(25)',               cat: 'Oscillators', fn: (d) => {
    const r = I.roc(d.closes, 25); const v = I.last(r);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},

  // ─── DPO (38) ────────────────────────────────────────────────────────────
  { id: 38, name: 'Detrended Price Osc',   cat: 'Oscillators', fn: (d) => {
    const dp = I.dpo(d.closes, 20); const v = I.last(dp);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},

  // ─── ADX / Trend (39–42) ─────────────────────────────────────────────────
  { id: 39, name: 'ADX(14) + DI',          cat: 'Trend', fn: (d) => {
    const a = I.adx(d.highs, d.lows, d.closes, 14);
    const adxV = I.last(a.adx), pi = I.last(a.plusDI), mi = I.last(a.minusDI);
    if (adxV == null || pi == null || mi == null) return { signal: NEUTRAL, value: 0 };
    if (adxV < 20) return { signal: NEUTRAL, value: adxV };
    return { signal: pi > mi ? LONG : SHORT, value: adxV };
  }},
  { id: 40, name: 'ADX(20) + DI',          cat: 'Trend', fn: (d) => {
    const a = I.adx(d.highs, d.lows, d.closes, 20);
    const adxV = I.last(a.adx), pi = I.last(a.plusDI), mi = I.last(a.minusDI);
    if (adxV == null) return { signal: NEUTRAL, value: 0 };
    if (adxV < 20) return { signal: NEUTRAL, value: adxV };
    return { signal: pi > mi ? LONG : SHORT, value: adxV };
  }},
  { id: 41, name: 'DI+ vs DI- (14)',       cat: 'Trend', fn: (d) => {
    const a = I.adx(d.highs, d.lows, d.closes, 14);
    const pi = I.last(a.plusDI), mi = I.last(a.minusDI);
    if (pi == null || mi == null) return { signal: NEUTRAL, value: 0 };
    return { signal: pi > mi ? LONG : SHORT, value: pi - mi };
  }},
  { id: 42, name: 'ADX Trend Strength',    cat: 'Trend', fn: (d) => {
    const a = I.adx(d.highs, d.lows, d.closes, 14);
    const adxV = I.last(a.adx), prev = I.prev(a.adx, 3);
    const pi = I.last(a.plusDI), mi = I.last(a.minusDI);
    if (adxV == null || prev == null) return { signal: NEUTRAL, value: 0 };
    const trend = pi > mi ? LONG : SHORT;
    return { signal: adxV > prev ? trend : NEUTRAL, value: adxV };
  }},

  // ─── Parabolic SAR (43) ──────────────────────────────────────────────────
  { id: 43, name: 'Parabolic SAR',         cat: 'Trend', fn: (d) => {
    const s = I.parabolicSar(d.highs, d.lows); const t = s.trend[s.trend.length - 1];
    return { signal: t === 1 ? LONG : t === -1 ? SHORT : NEUTRAL, value: t || 0 };
  }},

  // ─── SuperTrend (44–45) ──────────────────────────────────────────────────
  { id: 44, name: 'SuperTrend(10,3)',       cat: 'Trend', fn: (d) => {
    const s = I.superTrend(d.highs, d.lows, d.closes, 10, 3);
    const dir = s.direction[s.direction.length - 1];
    return { signal: dir === 1 ? LONG : SHORT, value: dir };
  }},
  { id: 45, name: 'SuperTrend(20,5)',       cat: 'Trend', fn: (d) => {
    const s = I.superTrend(d.highs, d.lows, d.closes, 20, 5);
    const dir = s.direction[s.direction.length - 1];
    return { signal: dir === 1 ? LONG : SHORT, value: dir };
  }},

  // ─── Aroon (46–48) ──────────────────────────────────────────────────────
  { id: 46, name: 'Aroon Oscillator(25)',   cat: 'Trend', fn: (d) => {
    const a = I.aroon(d.highs, d.lows, 25); const v = I.last(a.oscillator);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : v < 0 ? SHORT : NEUTRAL, value: v };
  }},
  { id: 47, name: 'Aroon Up/Down Cross',   cat: 'Trend', fn: (d) => {
    const a = I.aroon(d.highs, d.lows, 25);
    const u = I.last(a.up), dn = I.last(a.down);
    if (u == null || dn == null) return { signal: NEUTRAL, value: 0 };
    return { signal: u > dn ? LONG : SHORT, value: u - dn };
  }},
  { id: 48, name: 'Aroon Up > 70',         cat: 'Trend', fn: (d) => {
    const a = I.aroon(d.highs, d.lows, 25); const u = I.last(a.up);
    if (u == null) return { signal: NEUTRAL, value: 0 };
    return { signal: u > 70 ? LONG : u < 30 ? SHORT : NEUTRAL, value: u };
  }},

  // ─── Vortex (49) ────────────────────────────────────────────────────────
  { id: 49, name: 'Vortex Indicator(14)',   cat: 'Trend', fn: (d) => {
    const v = I.vortex(d.highs, d.lows, d.closes, 14);
    const vp = I.last(v.viPlus), vm = I.last(v.viMinus);
    if (vp == null || vm == null) return { signal: NEUTRAL, value: 0 };
    return { signal: vp > vm ? LONG : SHORT, value: vp - vm };
  }},

  // ─── Ichimoku (50–53) ───────────────────────────────────────────────────
  { id: 50, name: 'Ichimoku TK Cross',     cat: 'Trend', fn: (d) => {
    const ic = I.ichimoku(d.highs, d.lows, d.closes);
    const t = I.last(ic.tenkanSen), k = I.last(ic.kijunSen);
    if (t == null || k == null) return { signal: NEUTRAL, value: 0 };
    return { signal: t > k ? LONG : SHORT, value: t - k };
  }},
  { id: 51, name: 'Ichimoku Cloud',        cat: 'Trend', fn: (d) => {
    const ic = I.ichimoku(d.highs, d.lows, d.closes);
    const c = d.closes[d.closes.length - 1];
    const a = I.last(ic.senkouA), b = I.last(ic.senkouB);
    if (a == null || b == null) return { signal: NEUTRAL, value: 0 };
    const top = Math.max(a, b), bot = Math.min(a, b);
    return { signal: c > top ? LONG : c < bot ? SHORT : NEUTRAL, value: (c - top) };
  }},
  { id: 52, name: 'Ichimoku Kijun Trend',  cat: 'Trend', fn: (d) => {
    const ic = I.ichimoku(d.highs, d.lows, d.closes);
    const c = d.closes[d.closes.length - 1]; const k = I.last(ic.kijunSen);
    if (k == null) return { signal: NEUTRAL, value: 0 };
    return { signal: c > k ? LONG : SHORT, value: c - k };
  }},
  { id: 53, name: 'Ichimoku Cloud Color',  cat: 'Trend', fn: (d) => {
    const ic = I.ichimoku(d.highs, d.lows, d.closes);
    const a = I.last(ic.senkouA), b = I.last(ic.senkouB);
    if (a == null || b == null) return { signal: NEUTRAL, value: 0 };
    return { signal: a > b ? LONG : SHORT, value: a - b };
  }},

  // ─── Linear Regression (54–55) ──────────────────────────────────────────
  { id: 54, name: 'Lin Reg Slope(20)',      cat: 'Trend', fn: (d) => {
    const lr = I.linearRegressionSlope(d.closes, 20); const v = I.last(lr);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 55, name: 'Lin Reg Slope(50)',      cat: 'Trend', fn: (d) => {
    const lr = I.linearRegressionSlope(d.closes, 50); const v = I.last(lr);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},

  // ─── Higher High / Higher Low (56–57) ───────────────────────────────────
  { id: 56, name: 'HH/HL Pattern (3)',     cat: 'Trend', fn: (d) => {
    const c = d.closes, n = c.length;
    if (n < 4) return { signal: NEUTRAL, value: 0 };
    const hh = c[n-1] > c[n-2] && c[n-2] > c[n-3];
    const ll = c[n-1] < c[n-2] && c[n-2] < c[n-3];
    return { signal: hh ? LONG : ll ? SHORT : NEUTRAL, value: hh ? 1 : ll ? -1 : 0 };
  }},
  { id: 57, name: 'HH/HL Pattern (5)',     cat: 'Trend', fn: (d) => {
    const c = d.closes, n = c.length;
    if (n < 6) return { signal: NEUTRAL, value: 0 };
    let up = 0, dn = 0;
    for (let i = 1; i <= 5; i++) { if (c[n-i] > c[n-i-1]) up++; else dn++; }
    return { signal: up >= 4 ? LONG : dn >= 4 ? SHORT : NEUTRAL, value: up - dn };
  }},

  // ─── Bollinger Bands (58–60) ─────────────────────────────────────────────
  { id: 58, name: 'Bollinger(20,2) Pos',   cat: 'Volatility', fn: (d) => {
    const bb = I.bollingerBands(d.closes, 20, 2);
    const c = d.closes[d.closes.length - 1];
    const u = I.last(bb.upper), l = I.last(bb.lower), m = I.last(bb.mid);
    if (u == null || l == null) return { signal: NEUTRAL, value: 0 };
    if (c <= l) return { signal: LONG, value: -1 }; // oversold
    if (c >= u) return { signal: SHORT, value: 1 }; // overbought
    return { signal: c > m ? LONG : SHORT, value: (c - m) / (u - m) };
  }},
  { id: 59, name: 'BB(20,3) Extreme',      cat: 'Volatility', fn: (d) => {
    const bb = I.bollingerBands(d.closes, 20, 3);
    const c = d.closes[d.closes.length - 1];
    const u = I.last(bb.upper), l = I.last(bb.lower);
    if (u == null || l == null) return { signal: NEUTRAL, value: 0 };
    if (c <= l) return { signal: LONG, value: -1 };
    if (c >= u) return { signal: SHORT, value: 1 };
    return { signal: NEUTRAL, value: 0 };
  }},
  { id: 60, name: 'BB Width Squeeze',      cat: 'Volatility', fn: (d) => {
    const bb = I.bollingerBands(d.closes, 20, 2);
    const w = bb.width.filter(v => v != null);
    if (w.length < 20) return { signal: NEUTRAL, value: 0 };
    const avgW = w.slice(-20).reduce((a, b) => a + b) / 20;
    const curr = w[w.length - 1];
    // Squeeze = low width → breakout pending → use price direction
    const c = d.closes;
    if (curr < avgW * 0.75) return { signal: c[c.length-1] > c[c.length-2] ? LONG : SHORT, value: curr / avgW };
    return { signal: NEUTRAL, value: curr / avgW };
  }},

  // ─── Keltner Channel (61) ───────────────────────────────────────────────
  { id: 61, name: 'Keltner Channel(20)',    cat: 'Volatility', fn: (d) => {
    const kc = I.keltnerChannel(d.highs, d.lows, d.closes);
    const c = d.closes[d.closes.length - 1];
    const u = I.last(kc.upper), l = I.last(kc.lower), m = I.last(kc.mid);
    if (u == null) return { signal: NEUTRAL, value: 0 };
    if (c <= l) return { signal: LONG, value: -1 };
    if (c >= u) return { signal: SHORT, value: 1 };
    return { signal: c > m ? LONG : SHORT, value: 0 };
  }},

  // ─── Donchian Channel (62–63) ───────────────────────────────────────────
  { id: 62, name: 'Donchian(20) Breakout',  cat: 'Volatility', fn: (d) => {
    const dc = I.donchianChannel(d.highs, d.lows, 20);
    const c = d.closes[d.closes.length - 1];
    const u = I.last(dc.upper), l = I.last(dc.lower), m = I.last(dc.mid);
    if (u == null) return { signal: NEUTRAL, value: 0 };
    if (c >= u) return { signal: LONG, value: 1 };
    if (c <= l) return { signal: SHORT, value: -1 };
    return { signal: c > m ? LONG : SHORT, value: 0 };
  }},
  { id: 63, name: 'Donchian(55) Breakout',  cat: 'Volatility', fn: (d) => {
    const dc = I.donchianChannel(d.highs, d.lows, 55);
    const c = d.closes[d.closes.length - 1];
    const u = I.last(dc.upper), l = I.last(dc.lower), m = I.last(dc.mid);
    if (u == null) return { signal: NEUTRAL, value: 0 };
    if (c >= u) return { signal: LONG, value: 1 };
    if (c <= l) return { signal: SHORT, value: -1 };
    return { signal: c > m ? LONG : SHORT, value: 0 };
  }},

  // ─── ATR Breakout (64–65) ───────────────────────────────────────────────
  { id: 64, name: 'ATR Breakout 1.5x',     cat: 'Volatility', fn: (d) => {
    const a = I.atr(d.highs, d.lows, d.closes, 14); const v = I.last(a);
    const c = d.closes, n = c.length;
    if (v == null || n < 2) return { signal: NEUTRAL, value: 0 };
    const move = c[n-1] - c[n-2];
    return { signal: move > v * 1.5 ? LONG : move < -v * 1.5 ? SHORT : NEUTRAL, value: v ? move / v : 0 };
  }},
  { id: 65, name: 'ATR Breakout 2x',       cat: 'Volatility', fn: (d) => {
    const a = I.atr(d.highs, d.lows, d.closes, 14); const v = I.last(a);
    const c = d.closes, n = c.length;
    if (v == null || n < 2) return { signal: NEUTRAL, value: 0 };
    const move = c[n-1] - c[n-2];
    return { signal: move > v * 2 ? LONG : move < -v * 2 ? SHORT : NEUTRAL, value: v ? move / v : 0 };
  }},

  // ─── Chandelier Exit (66) ───────────────────────────────────────────────
  { id: 66, name: 'Chandelier Exit(22,3)',  cat: 'Volatility', fn: (d) => {
    const a = I.atr(d.highs, d.lows, d.closes, 22); const atrV = I.last(a);
    const c = d.closes, h = d.highs, l = d.lows, n = c.length;
    if (atrV == null || n < 22) return { signal: NEUTRAL, value: 0 };
    let hh = -Infinity, ll = Infinity;
    for (let i = 0; i < 22; i++) { hh = Math.max(hh, h[n-1-i]); ll = Math.min(ll, l[n-1-i]); }
    const longStop = hh - 3 * atrV;
    const shortStop = ll + 3 * atrV;
    return { signal: c[n-1] > longStop ? LONG : c[n-1] < shortStop ? SHORT : NEUTRAL, value: c[n-1] - longStop };
  }},

  // ─── Volatility Regime (67) ─────────────────────────────────────────────
  { id: 67, name: 'Volatility Regime',     cat: 'Volatility', fn: (d) => {
    const a = I.atr(d.highs, d.lows, d.closes, 14);
    const vals = a.filter(v => v != null);
    if (vals.length < 20) return { signal: NEUTRAL, value: 0 };
    const avg = vals.slice(-50).reduce((s, v) => s + v, 0) / Math.min(vals.length, 50);
    const curr = vals[vals.length - 1];
    // Low vol = trend continuation; high vol = reversal potential
    const c = d.closes;
    if (curr < avg * 0.8) return { signal: c[c.length-1] > c[c.length-5] ? LONG : SHORT, value: curr / avg };
    return { signal: NEUTRAL, value: curr / avg };
  }},

  // ─── Volume Signals (68–77) ─────────────────────────────────────────────
  { id: 68, name: 'OBV Trend',             cat: 'Volume', fn: (d) => {
    const o = I.obv(d.closes, d.volumes);
    const s = I.slope(o, 10);
    return { signal: s > 0 ? LONG : s < 0 ? SHORT : NEUTRAL, value: s };
  }},
  { id: 69, name: 'OBV vs Price Divergence', cat: 'Volume', fn: (d) => {
    const o = I.obv(d.closes, d.volumes);
    const priceSlope = I.slope(d.closes, 10);
    const obvSlope = I.slope(o, 10);
    // Bullish divergence: price down, OBV up
    if (priceSlope < 0 && obvSlope > 0) return { signal: LONG, value: 1 };
    if (priceSlope > 0 && obvSlope < 0) return { signal: SHORT, value: -1 };
    return { signal: obvSlope > 0 ? LONG : SHORT, value: 0 };
  }},
  { id: 70, name: 'Volume vs 20d Average', cat: 'Volume', fn: (d) => {
    const v = d.volumes, n = v.length;
    if (n < 21) return { signal: NEUTRAL, value: 0 };
    let avg = 0; for (let i = 1; i <= 20; i++) avg += v[n - 1 - i]; avg /= 20;
    const ratio = avg ? v[n-1] / avg : 1;
    const c = d.closes;
    // High volume confirms direction
    if (ratio > 1.5) return { signal: c[n-1] > c[n-2] ? LONG : SHORT, value: ratio };
    return { signal: NEUTRAL, value: ratio };
  }},
  { id: 71, name: 'MFI(14)',               cat: 'Volume', fn: (d) => {
    const m = I.mfi(d.highs, d.lows, d.closes, d.volumes, 14); const v = I.last(m);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v < 20 ? LONG : v > 80 ? SHORT : v > 50 ? LONG : SHORT, value: v };
  }},
  { id: 72, name: 'CMF(20)',               cat: 'Volume', fn: (d) => {
    const c = I.cmf(d.highs, d.lows, d.closes, d.volumes, 20); const v = I.last(c);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0.05 ? LONG : v < -0.05 ? SHORT : NEUTRAL, value: v };
  }},
  { id: 73, name: 'A/D Line Trend',        cat: 'Volume', fn: (d) => {
    const ad = I.adLine(d.highs, d.lows, d.closes, d.volumes);
    const s = I.slope(ad, 10);
    return { signal: s > 0 ? LONG : s < 0 ? SHORT : NEUTRAL, value: s };
  }},
  { id: 74, name: 'VWAP Position',         cat: 'Volume', fn: (d) => {
    const vw = I.vwap(d.highs, d.lows, d.closes, d.volumes);
    const v = I.last(vw), c = d.closes[d.closes.length - 1];
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: c > v ? LONG : SHORT, value: (c - v) / v * 100 };
  }},
  { id: 75, name: 'Force Index(13)',       cat: 'Volume', fn: (d) => {
    const fi = I.forceIndex(d.closes, d.volumes, 13); const v = I.last(fi);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 76, name: 'Ease of Movement(14)',  cat: 'Volume', fn: (d) => {
    const e = I.eom(d.highs, d.lows, d.volumes, 14); const v = I.last(e);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 77, name: 'Volume Price Trend',    cat: 'Volume', fn: (d) => {
    const c = d.closes, v = d.volumes;
    let vpt = 0;
    const vptArr = [0];
    for (let i = 1; i < c.length; i++) {
      vpt += ((c[i] - c[i-1]) / c[i-1]) * v[i];
      vptArr.push(vpt);
    }
    const s = I.slope(vptArr, 10);
    return { signal: s > 0 ? LONG : s < 0 ? SHORT : NEUTRAL, value: s };
  }},

  // ─── Advanced Composite (78–87) ─────────────────────────────────────────
  { id: 78, name: 'Coppock Curve',         cat: 'Advanced', fn: (d) => {
    const cc = I.coppock(d.closes); const v = I.last(cc);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 79, name: 'KST Signal',            cat: 'Advanced', fn: (d) => {
    const k = I.kst(d.closes); const l = I.last(k.line), s = I.last(k.signal);
    if (l == null || s == null) return { signal: NEUTRAL, value: 0 };
    return { signal: l > s ? LONG : SHORT, value: l - s };
  }},
  { id: 80, name: 'TSI Signal',            cat: 'Advanced', fn: (d) => {
    const t = I.tsi(d.closes); const l = I.last(t.line), s = I.last(t.signal);
    if (l == null || s == null) return { signal: NEUTRAL, value: 0 };
    return { signal: l > s ? LONG : SHORT, value: l };
  }},
  { id: 81, name: 'Fisher Transform(10)',  cat: 'Advanced', fn: (d) => {
    const f = I.fisherTransform(d.highs, d.lows, 10); const v = I.last(f);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 82, name: 'TRIX Signal',           cat: 'Advanced', fn: (d) => {
    const t = I.trix(d.closes, 15); const v = I.last(t);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    return { signal: v > 0 ? LONG : SHORT, value: v };
  }},
  { id: 83, name: 'Mass Index Reversal',   cat: 'Advanced', fn: (d) => {
    const m = I.massIndex(d.highs, d.lows); const v = I.last(m); const p = I.prev(m, 1);
    if (v == null || p == null) return { signal: NEUTRAL, value: 0 };
    // Reversal bulge: > 27 then drops below 26.5
    if (p > 27 && v < 26.5) {
      const c = d.closes;
      return { signal: c[c.length-1] > c[c.length-2] ? LONG : SHORT, value: v };
    }
    return { signal: NEUTRAL, value: v };
  }},
  { id: 84, name: 'Elder Ray Bull/Bear',   cat: 'Advanced', fn: (d) => {
    const e = I.elderRay(d.highs, d.lows, d.closes, 13);
    const bull = I.last(e.bullPower), bear = I.last(e.bearPower);
    if (bull == null || bear == null) return { signal: NEUTRAL, value: 0 };
    return { signal: bull > 0 && bear > -bull ? LONG : bear < 0 && bull < -bear ? SHORT : NEUTRAL, value: bull + bear };
  }},
  { id: 85, name: 'Heikin Ashi Trend',     cat: 'Advanced', fn: (d) => {
    const ha = I.heikinAshi(d.opens, d.highs, d.lows, d.closes);
    const n = ha.close.length;
    if (n < 3) return { signal: NEUTRAL, value: 0 };
    const bullish = ha.close[n-1] > ha.open[n-1] && ha.close[n-2] > ha.open[n-2];
    const bearish = ha.close[n-1] < ha.open[n-1] && ha.close[n-2] < ha.open[n-2];
    return { signal: bullish ? LONG : bearish ? SHORT : NEUTRAL, value: bullish ? 1 : bearish ? -1 : 0 };
  }},
  { id: 86, name: 'HA Body Strength',      cat: 'Advanced', fn: (d) => {
    const ha = I.heikinAshi(d.opens, d.highs, d.lows, d.closes);
    const n = ha.close.length;
    if (n < 5) return { signal: NEUTRAL, value: 0 };
    let bull = 0;
    for (let i = 0; i < 5; i++) { if (ha.close[n-1-i] > ha.open[n-1-i]) bull++; }
    return { signal: bull >= 4 ? LONG : bull <= 1 ? SHORT : NEUTRAL, value: bull };
  }},
  { id: 87, name: 'McGinley Dynamic',      cat: 'Advanced', fn: (d) => {
    const c = d.closes; let md = c[0];
    for (let i = 1; i < c.length; i++) {
      md = md + (c[i] - md) / (12 * Math.pow(c[i] / md, 4) || 1);
    }
    const price = c[c.length - 1];
    return { signal: price > md ? LONG : SHORT, value: (price - md) / md * 100 };
  }},

  // ─── Pattern Recognition (88–92) ────────────────────────────────────────
  { id: 88, name: 'Bullish/Bear Engulfing', cat: 'Patterns', fn: (d) => {
    const n = d.closes.length;
    if (n < 2) return { signal: NEUTRAL, value: 0 };
    const [o1, c1] = [d.opens[n-2], d.closes[n-2]];
    const [o2, c2] = [d.opens[n-1], d.closes[n-1]];
    if (c1 < o1 && c2 > o2 && o2 <= c1 && c2 >= o1) return { signal: LONG, value: 1 };
    if (c1 > o1 && c2 < o2 && o2 >= c1 && c2 <= o1) return { signal: SHORT, value: -1 };
    return { signal: NEUTRAL, value: 0 };
  }},
  { id: 89, name: 'Hammer/Shooting Star',  cat: 'Patterns', fn: (d) => {
    const n = d.closes.length;
    if (n < 2) return { signal: NEUTRAL, value: 0 };
    const o = d.opens[n-1], h = d.highs[n-1], l = d.lows[n-1], c = d.closes[n-1];
    const body = Math.abs(c - o); const range = h - l;
    if (range === 0) return { signal: NEUTRAL, value: 0 };
    const upperWick = h - Math.max(o, c); const lowerWick = Math.min(o, c) - l;
    // Hammer: small body at top, long lower wick
    if (lowerWick > body * 2 && upperWick < body * 0.5 && d.closes[n-2] < d.closes[n-3]) {
      return { signal: LONG, value: 1 };
    }
    // Shooting star: small body at bottom, long upper wick
    if (upperWick > body * 2 && lowerWick < body * 0.5 && d.closes[n-2] > d.closes[n-3]) {
      return { signal: SHORT, value: -1 };
    }
    return { signal: NEUTRAL, value: 0 };
  }},
  { id: 90, name: 'Doji Reversal',         cat: 'Patterns', fn: (d) => {
    const n = d.closes.length;
    if (n < 3) return { signal: NEUTRAL, value: 0 };
    const body = Math.abs(d.closes[n-2] - d.opens[n-2]);
    const range = d.highs[n-2] - d.lows[n-2];
    if (range === 0 || body / range > 0.1) return { signal: NEUTRAL, value: 0 };
    // Doji detected at n-2, check direction
    if (d.closes[n-1] > d.closes[n-2] && d.closes[n-3] > d.closes[n-2]) return { signal: LONG, value: 1 };
    if (d.closes[n-1] < d.closes[n-2] && d.closes[n-3] < d.closes[n-2]) return { signal: SHORT, value: -1 };
    return { signal: NEUTRAL, value: 0 };
  }},
  { id: 91, name: '3 White/Black Soldiers', cat: 'Patterns', fn: (d) => {
    const n = d.closes.length;
    if (n < 3) return { signal: NEUTRAL, value: 0 };
    const w = d.closes[n-1] > d.opens[n-1] && d.closes[n-2] > d.opens[n-2] && d.closes[n-3] > d.opens[n-3];
    const b = d.closes[n-1] < d.opens[n-1] && d.closes[n-2] < d.opens[n-2] && d.closes[n-3] < d.opens[n-3];
    if (w && d.closes[n-1] > d.closes[n-2] && d.closes[n-2] > d.closes[n-3]) return { signal: LONG, value: 1 };
    if (b && d.closes[n-1] < d.closes[n-2] && d.closes[n-2] < d.closes[n-3]) return { signal: SHORT, value: -1 };
    return { signal: NEUTRAL, value: 0 };
  }},
  { id: 92, name: 'Morning/Evening Star',  cat: 'Patterns', fn: (d) => {
    const n = d.closes.length;
    if (n < 3) return { signal: NEUTRAL, value: 0 };
    const [o1,c1] = [d.opens[n-3], d.closes[n-3]];
    const body2 = Math.abs(d.closes[n-2] - d.opens[n-2]);
    const range2 = d.highs[n-2] - d.lows[n-2];
    const [o3,c3] = [d.opens[n-1], d.closes[n-1]];
    const smallBody = range2 > 0 && body2 / range2 < 0.3;
    if (c1 < o1 && smallBody && c3 > o3 && c3 > (o1 + c1) / 2) return { signal: LONG, value: 1 }; // morning star
    if (c1 > o1 && smallBody && c3 < o3 && c3 < (o1 + c1) / 2) return { signal: SHORT, value: -1 }; // evening star
    return { signal: NEUTRAL, value: 0 };
  }},

  // ─── Fundamental / Sentiment / Composite (93–100) ──────────────────────
  { id: 93, name: 'Fear & Greed Signal',   cat: 'Fundamental', fn: (d) => {
    const fng = d.fearGreedValue;
    if (fng == null) return { signal: NEUTRAL, value: 0 };
    // Extreme fear = buy, extreme greed = sell (contrarian)
    return { signal: fng < 25 ? LONG : fng > 75 ? SHORT : NEUTRAL, value: fng };
  }},
  { id: 94, name: 'Volume Slope (5d)',     cat: 'Fundamental', fn: (d) => {
    const s = I.slope(d.volumes, 5);
    const c = d.closes;
    return { signal: s > 0 && c[c.length-1] > c[c.length-2] ? LONG : s > 0 && c[c.length-1] < c[c.length-2] ? SHORT : NEUTRAL, value: s };
  }},
  { id: 95, name: 'Relative Volume',       cat: 'Fundamental', fn: (d) => {
    const v = d.volumes, n = v.length;
    if (n < 21) return { signal: NEUTRAL, value: 0 };
    let avg = 0; for (let i = 1; i <= 20; i++) avg += v[n-1-i]; avg /= 20;
    const ratio = avg ? v[n-1] / avg : 1;
    const c = d.closes;
    if (ratio > 2) return { signal: c[n-1] > c[n-2] ? LONG : SHORT, value: ratio };
    return { signal: NEUTRAL, value: ratio };
  }},
  { id: 96, name: '52-Period Position',    cat: 'Fundamental', fn: (d) => {
    const c = d.closes, n = c.length;
    if (n < 52) return { signal: NEUTRAL, value: 0 };
    let hh = -Infinity, ll = Infinity;
    for (let i = 0; i < 52; i++) { hh = Math.max(hh, c[n-1-i]); ll = Math.min(ll, c[n-1-i]); }
    const pos = hh === ll ? 50 : (c[n-1] - ll) / (hh - ll) * 100;
    return { signal: pos > 80 ? LONG : pos < 20 ? SHORT : pos > 50 ? LONG : SHORT, value: pos };
  }},
  { id: 97, name: 'Multi-Period Momentum', cat: 'Fundamental', fn: (d) => {
    const c = d.closes, n = c.length;
    if (n < 30) return { signal: NEUTRAL, value: 0 };
    const m5 = (c[n-1] - c[n-6]) / c[n-6];
    const m10 = (c[n-1] - c[n-11]) / c[n-11];
    const m20 = (c[n-1] - c[n-21]) / c[n-21];
    const score = (m5 * 3 + m10 * 2 + m20) / 6;
    return { signal: score > 0.005 ? LONG : score < -0.005 ? SHORT : NEUTRAL, value: score * 100 };
  }},
  { id: 98, name: 'Z-Score Mean Reversion', cat: 'Fundamental', fn: (d) => {
    const z = I.zScore(d.closes, 20); const v = I.last(z);
    if (v == null) return { signal: NEUTRAL, value: 0 };
    // Mean reversion: extreme Z = reversal
    return { signal: v < -2 ? LONG : v > 2 ? SHORT : NEUTRAL, value: v };
  }},
  { id: 99, name: 'Trend Consistency',     cat: 'Fundamental', fn: (d) => {
    const c = d.closes, n = c.length;
    if (n < 21) return { signal: NEUTRAL, value: 0 };
    let ups = 0;
    for (let i = 1; i <= 20; i++) { if (c[n-i] > c[n-i-1]) ups++; }
    return { signal: ups >= 14 ? LONG : ups <= 6 ? SHORT : NEUTRAL, value: ups };
  }},
  { id: 100, name: 'Composite Strength',   cat: 'Fundamental', fn: (d) => {
    // Combined multi-indicator reading
    const r = I.rsi(d.closes, 14); const rv = I.last(r);
    const m = I.macd(d.closes, 12, 26, 9); const ml = I.last(m.line);
    const s200 = I.sma(d.closes, 200); const s200v = I.last(s200);
    const c = d.closes[d.closes.length - 1];
    let score = 0;
    if (rv != null) score += rv > 50 ? 1 : -1;
    if (ml != null) score += ml > 0 ? 1 : -1;
    if (s200v != null) score += c > s200v ? 1 : -1;
    return { signal: score >= 2 ? LONG : score <= -2 ? SHORT : NEUTRAL, value: score };
  }},
];

// ═══ Main Engine ════════════════════════════════════════════════════════════

// ─── Additional Signal Definitions (Sentiment + Seasonality + On-Chain) ────

const EXTRA_SIGNAL_DEFS = [
  // ─── Sentiment (101–105) ─────────────────────────────────────────────────
  { id: 101, name: 'Funding Rate',          cat: 'Sentiment', fn: (d) => {
    const fr = d.fundingRate;
    if (fr == null) return { signal: NEUTRAL, value: 0 };
    // > 0.05% = überhitzt = SHORT; < -0.01% = undersold = LONG
    return { signal: fr > 0.0005 ? SHORT : fr < -0.0001 ? LONG : NEUTRAL, value: fr * 100 };
  }},
  { id: 102, name: 'Long/Short Ratio',      cat: 'Sentiment', fn: (d) => {
    const r = d.longShortRatio;
    if (r == null) return { signal: NEUTRAL, value: 0 };
    // > 1.5 = zu viele Longs = contrarian SHORT; < 0.7 = zu viele Shorts = LONG
    return { signal: r > 1.5 ? SHORT : r < 0.7 ? LONG : r > 1.0 ? LONG : SHORT, value: r };
  }},
  { id: 103, name: 'Fear & Greed Momentum', cat: 'Sentiment', fn: (d) => {
    const fng = d.fearGreedValue;
    const prev = d.fearGreedPrev;
    if (fng == null || prev == null) return { signal: NEUTRAL, value: 0 };
    const diff = fng - prev;
    return { signal: diff > 3 ? LONG : diff < -3 ? SHORT : NEUTRAL, value: diff };
  }},
  { id: 104, name: 'BTC Dominance Signal',  cat: 'Sentiment', fn: (d) => {
    const dom = d.btcDominance;
    const domPrev = d.btcDominancePrev;
    if (dom == null) return { signal: NEUTRAL, value: 0 };
    // Steigende Dominanz = Risikoscheu = bullish BTC, bearish Alts
    if (d.assetType !== 'crypto') return { signal: NEUTRAL, value: 0 };
    const trend = domPrev != null ? (dom > domPrev ? 1 : -1) : 0;
    return { signal: dom > 52 && trend > 0 ? LONG : dom < 45 ? LONG : NEUTRAL, value: dom };
  }},
  { id: 105, name: 'Market Sentiment Score', cat: 'Sentiment', fn: (d) => {
    const fng = d.fearGreedValue;
    const fr = d.fundingRate;
    const ls = d.longShortRatio;
    let score = 0, count = 0;
    if (fng != null) { score += fng > 50 ? 1 : -1; count++; }
    if (fr != null) { score += fr < 0.0003 ? 1 : -1; count++; }
    if (ls != null) { score += ls < 1.3 ? 1 : -1; count++; }
    if (count === 0) return { signal: NEUTRAL, value: 0 };
    return { signal: score > 0 ? LONG : score < 0 ? SHORT : NEUTRAL, value: score };
  }},

  // ─── Saisonalität (106–110) ───────────────────────────────────────────────
  { id: 106, name: 'Day-of-Week Pattern',   cat: 'Saisonalität', fn: (d) => {
    // Berechne Ø-Return pro Wochentag aus historischen Candles
    const dayReturns = [0, 0, 0, 0, 0, 0, 0]; // Sun=0..Sat=6
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    const closes = d.closes;
    const times = d.times;
    if (!times || times.length < 20) return { signal: NEUTRAL, value: 0 };
    for (let i = 1; i < Math.min(closes.length, 200); i++) {
      const day = new Date(times[i]).getDay();
      const ret = (closes[i] - closes[i-1]) / closes[i-1];
      dayReturns[day] += ret;
      dayCounts[day]++;
    }
    const todayDay = new Date(times[times.length - 1]).getDay();
    const avgRet = dayCounts[todayDay] > 0 ? dayReturns[todayDay] / dayCounts[todayDay] : 0;
    return { signal: avgRet > 0.001 ? LONG : avgRet < -0.001 ? SHORT : NEUTRAL, value: avgRet * 100 };
  }},
  { id: 107, name: 'Month-of-Year Pattern', cat: 'Saisonalität', fn: (d) => {
    // Historische Monatsperformance aus Candles
    const monthReturns = new Array(12).fill(0);
    const monthCounts = new Array(12).fill(0);
    const closes = d.closes;
    const times = d.times;
    if (!times || times.length < 60) return { signal: NEUTRAL, value: 0 };
    for (let i = 1; i < closes.length; i++) {
      const month = new Date(times[i]).getMonth();
      const ret = (closes[i] - closes[i-1]) / closes[i-1];
      monthReturns[month] += ret;
      monthCounts[month]++;
    }
    const currentMonth = new Date(times[times.length - 1]).getMonth();
    const avgRet = monthCounts[currentMonth] > 0 ? monthReturns[currentMonth] / monthCounts[currentMonth] : 0;
    return { signal: avgRet > 0.001 ? LONG : avgRet < -0.001 ? SHORT : NEUTRAL, value: avgRet * 100 };
  }},
  { id: 108, name: 'Q4 / Quarter Effect',   cat: 'Saisonalität', fn: (d) => {
    const times = d.times;
    if (!times || times.length === 0) return { signal: NEUTRAL, value: 0 };
    const now = new Date(times[times.length - 1]);
    const month = now.getMonth(); // 0-11
    const quarter = Math.floor(month / 3); // 0=Q1, 3=Q4
    // Q4 (Okt-Dez) historisch bullish für BTC, Q1 auch gut
    if (quarter === 3) return { signal: LONG, value: 4 };
    if (quarter === 0) return { signal: LONG, value: 1 };
    if (quarter === 1) return { signal: NEUTRAL, value: 2 };
    return { signal: SHORT, value: 3 }; // Q3 historisch schwächer
  }},
  { id: 109, name: 'End-of-Month Effect',   cat: 'Saisonalität', fn: (d) => {
    const times = d.times;
    if (!times || times.length === 0) return { signal: NEUTRAL, value: 0 };
    const now = new Date(times[times.length - 1]);
    const day = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = daysInMonth - day;
    // Last 3 days or first 3 days of month often see rebalancing flows
    if (daysLeft <= 2) return { signal: SHORT, value: daysLeft }; // month-end selling
    if (day <= 3) return { signal: LONG, value: day }; // month-start buying
    return { signal: NEUTRAL, value: day };
  }},
  { id: 110, name: 'BTC Halving Cycle',     cat: 'Saisonalität', fn: (d) => {
    if (d.assetType !== 'crypto') return { signal: NEUTRAL, value: 0 };
    // Letztes BTC Halving: 20. April 2024
    const halvingDate = new Date('2024-04-20').getTime();
    const times = d.times;
    const now = times ? new Date(times[times.length - 1]).getTime() : Date.now();
    const daysSince = (now - halvingDate) / (1000 * 86400);
    if (daysSince < 0) return { signal: NEUTRAL, value: 0 };
    // Historisch: Monate 6-18 nach Halving = starke Bullphase
    if (daysSince > 180 && daysSince < 540) return { signal: LONG, value: daysSince };
    // Monate 18-30 = Abkühlung / Bärenmarkt-Vorbereitung
    if (daysSince >= 540 && daysSince < 900) return { signal: SHORT, value: daysSince };
    return { signal: NEUTRAL, value: daysSince };
  }},

  // ─── On-Chain / Macro (111–115) ──────────────────────────────────────────
  { id: 111, name: 'Global MarketCap Trend', cat: 'Macro', fn: (d) => {
    const mc = d.globalMarketCap;
    const mcPrev = d.globalMarketCapPrev;
    if (mc == null || mcPrev == null) return { signal: NEUTRAL, value: 0 };
    const chg = (mc - mcPrev) / mcPrev * 100;
    return { signal: chg > 1 ? LONG : chg < -1 ? SHORT : NEUTRAL, value: chg };
  }},
  { id: 112, name: 'BTC Dominance vs EMA',  cat: 'Macro', fn: (d) => {
    const dom = d.btcDominance;
    const domPrev = d.btcDominancePrev;
    if (dom == null) return { signal: NEUTRAL, value: 0 };
    // Steigende Dominanz = Bitcoin outperformt → für BTC bullish
    if (d.assetType !== 'crypto') return { signal: NEUTRAL, value: 0 };
    const rising = domPrev != null && dom > domPrev;
    return { signal: rising ? LONG : SHORT, value: dom };
  }},
  { id: 113, name: 'Volume/MarketCap Ratio', cat: 'Macro', fn: (d) => {
    const mc = d.marketCap;
    const v = d.volumes;
    if (!mc || !v || v.length === 0) return { signal: NEUTRAL, value: 0 };
    const avgVol = v.slice(-20).reduce((a, b) => a + b, 0) / Math.min(v.length, 20);
    const ratio = mc > 0 ? avgVol / mc : 0;
    // Hohes Volumen relativ zu MarketCap = hohe Aktivität
    return { signal: ratio > 0.05 ? LONG : ratio < 0.01 ? SHORT : NEUTRAL, value: ratio * 100 };
  }},
  { id: 114, name: 'NVT Signal (approx)',    cat: 'Macro', fn: (d) => {
    // Vereinfachtes NVT: Price / (90-day avg Volume)
    const c = d.closes;
    const v = d.volumes;
    if (!c || c.length < 90 || !v) return { signal: NEUTRAL, value: 0 };
    const avgVol = v.slice(-90).reduce((a, b) => a + b, 0) / 90;
    const nvt = avgVol > 0 ? c[c.length - 1] / avgVol : 0;
    const nvtSma = c.slice(-90).reduce((a, b) => a + b, 0) / 90 / avgVol;
    // Hohes NVT = überbewertet = SHORT; Niedriges = unterbewertet = LONG
    return { signal: nvt > nvtSma * 1.5 ? SHORT : nvt < nvtSma * 0.7 ? LONG : NEUTRAL, value: nvt };
  }},
  { id: 115, name: 'Exchange Inflow Proxy',  cat: 'Macro', fn: (d) => {
    // Proxy: Hohe Volumen-Spikes bei fallenden Preisen = Sell-Druck
    const c = d.closes;
    const v = d.volumes;
    if (!c || c.length < 10 || !v) return { signal: NEUTRAL, value: 0 };
    const n = c.length;
    let avgVol = 0; for (let i = 1; i <= 10; i++) avgVol += v[n-1-i]; avgVol /= 10;
    const volSpike = v[n-1] > avgVol * 2;
    const priceDown = c[n-1] < c[n-2];
    const priceUp = c[n-1] > c[n-2];
    if (volSpike && priceDown) return { signal: SHORT, value: v[n-1] / avgVol }; // exchange inflow selling
    if (volSpike && priceUp) return { signal: LONG, value: v[n-1] / avgVol }; // strong buying
    return { signal: NEUTRAL, value: v[n-1] / avgVol };
  }},
];

const ALL_SIGNAL_DEFS = [...SIGNAL_DEFS, ...EXTRA_SIGNAL_DEFS];

export function runSignalEngine(ohlcvData, extraData = {}) {
  const fearGreedValue = typeof extraData === 'number' ? extraData : (extraData.fearGreedValue ?? null);
  const {
    fundingRate = null,
    longShortRatio = null,
    btcDominance = null,
    btcDominancePrev = null,
    globalMarketCap = null,
    globalMarketCapPrev = null,
    marketCap = null,
    fearGreedPrev = null,
    assetType = 'crypto',
  } = typeof extraData === 'object' ? extraData : {};

  const d = {
    opens: ohlcvData.map(c => c.open),
    highs: ohlcvData.map(c => c.high),
    lows: ohlcvData.map(c => c.low),
    closes: ohlcvData.map(c => c.close),
    volumes: ohlcvData.map(c => c.volume),
    times: ohlcvData.map(c => c.time),
    fearGreedValue,
    fearGreedPrev,
    fundingRate,
    longShortRatio,
    btcDominance,
    btcDominancePrev,
    globalMarketCap,
    globalMarketCapPrev,
    marketCap,
    assetType,
  };

  const results = ALL_SIGNAL_DEFS.map(def => {
    try {
      const result = def.fn(d);
      return {
        id: def.id,
        name: def.name,
        category: def.cat,
        signal: result.signal,
        value: result.value,
      };
    } catch (e) {
      return { id: def.id, name: def.name, category: def.cat, signal: NEUTRAL, value: 0 };
    }
  });

  // Aggregate
  const longs = results.filter(r => r.signal === LONG).length;
  const shorts = results.filter(r => r.signal === SHORT).length;
  const neutrals = results.filter(r => r.signal === NEUTRAL).length;
  const total = results.length;

  let consensus;
  const longPct = longs / total * 100;
  const shortPct = shorts / total * 100;

  if (longPct >= 70) consensus = 'STRONG LONG';
  else if (longPct >= 55) consensus = 'LONG';
  else if (shortPct >= 70) consensus = 'STRONG SHORT';
  else if (shortPct >= 55) consensus = 'SHORT';
  else consensus = 'NEUTRAL';

  // Category breakdown
  const categories = {};
  results.forEach(r => {
    if (!categories[r.category]) categories[r.category] = { long: 0, short: 0, neutral: 0, total: 0 };
    categories[r.category][r.signal.toLowerCase()]++;
    categories[r.category].total++;
  });

  return {
    signals: results,
    summary: { long: longs, short: shorts, neutral: neutrals, total, consensus, longPct, shortPct },
    categories,
  };
}

// ═══ Asset Lists ════════════════════════════════════════════════════════════

export const CRYPTO_PAIRS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', base: 'BTC' },
  { symbol: 'ETHUSDT', name: 'Ethereum', base: 'ETH' },
  { symbol: 'BNBUSDT', name: 'BNB', base: 'BNB' },
  { symbol: 'SOLUSDT', name: 'Solana', base: 'SOL' },
  { symbol: 'XRPUSDT', name: 'XRP', base: 'XRP' },
  { symbol: 'ADAUSDT', name: 'Cardano', base: 'ADA' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', base: 'DOGE' },
  { symbol: 'AVAXUSDT', name: 'Avalanche', base: 'AVAX' },
  { symbol: 'DOTUSDT', name: 'Polkadot', base: 'DOT' },
  { symbol: 'LINKUSDT', name: 'Chainlink', base: 'LINK' },
  { symbol: 'UNIUSDT', name: 'Uniswap', base: 'UNI' },
  { symbol: 'LTCUSDT', name: 'Litecoin', base: 'LTC' },
  { symbol: 'BCHUSDT', name: 'Bitcoin Cash', base: 'BCH' },
  { symbol: 'ATOMUSDT', name: 'Cosmos', base: 'ATOM' },
  { symbol: 'ETCUSDT', name: 'Ethereum Classic', base: 'ETC' },
  { symbol: 'XLMUSDT', name: 'Stellar', base: 'XLM' },
  { symbol: 'TRXUSDT', name: 'TRON', base: 'TRX' },
  { symbol: 'NEARUSDT', name: 'Near Protocol', base: 'NEAR' },
  { symbol: 'APTUSDT', name: 'Aptos', base: 'APT' },
  { symbol: 'AAVEUSDT', name: 'Aave', base: 'AAVE' },
  { symbol: 'FILUSDT', name: 'Filecoin', base: 'FIL' },
  { symbol: 'ARBUSDT', name: 'Arbitrum', base: 'ARB' },
  { symbol: 'OPUSDT', name: 'Optimism', base: 'OP' },
  { symbol: 'MATICUSDT', name: 'Polygon', base: 'MATIC' },
  { symbol: 'SHIBUSDT', name: 'Shiba Inu', base: 'SHIB' },
  { symbol: 'SUIUSDT', name: 'Sui', base: 'SUI' },
  { symbol: 'INJUSDT', name: 'Injective', base: 'INJ' },
  { symbol: 'TIAUSDT', name: 'Celestia', base: 'TIA' },
  { symbol: 'SEIUSDT', name: 'Sei', base: 'SEI' },
  { symbol: 'FETUSDT', name: 'Fetch.ai', base: 'FET' },
];

export const FOREX_PAIRS = [
  { symbol: 'EURUSD', name: 'Euro/US Dollar', base: 'EUR', quote: 'USD' },
  { symbol: 'GBPUSD', name: 'Pound/US Dollar', base: 'GBP', quote: 'USD' },
  { symbol: 'USDJPY', name: 'Dollar/Yen', base: 'USD', quote: 'JPY' },
  { symbol: 'USDCHF', name: 'Dollar/Swiss', base: 'USD', quote: 'CHF' },
  { symbol: 'AUDUSD', name: 'Aussie/US Dollar', base: 'AUD', quote: 'USD' },
  { symbol: 'NZDUSD', name: 'Kiwi/US Dollar', base: 'NZD', quote: 'USD' },
  { symbol: 'USDCAD', name: 'Dollar/Loonie', base: 'USD', quote: 'CAD' },
  { symbol: 'EURGBP', name: 'Euro/Pound', base: 'EUR', quote: 'GBP' },
  { symbol: 'EURJPY', name: 'Euro/Yen', base: 'EUR', quote: 'JPY' },
  { symbol: 'GBPJPY', name: 'Pound/Yen', base: 'GBP', quote: 'JPY' },
  { symbol: 'EURCHF', name: 'Euro/Swiss', base: 'EUR', quote: 'CHF' },
  { symbol: 'AUDJPY', name: 'Aussie/Yen', base: 'AUD', quote: 'JPY' },
  { symbol: 'EURAUD', name: 'Euro/Aussie', base: 'EUR', quote: 'AUD' },
  { symbol: 'GBPAUD', name: 'Pound/Aussie', base: 'GBP', quote: 'AUD' },
  { symbol: 'GBPCHF', name: 'Pound/Swiss', base: 'GBP', quote: 'CHF' },
];

export const CATEGORIES = [
  'Moving Averages',
  'Oscillators',
  'Trend',
  'Volatility',
  'Volume',
  'Advanced',
  'Patterns',
  'Fundamental',
  'Sentiment',
  'Saisonalität',
  'Macro',
];
