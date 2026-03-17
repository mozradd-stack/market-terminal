// ─── Technical Indicator Calculation Library ──────────────────────────────────
// Pure math functions for all technical indicators. No side effects.

// ═══ Core Moving Averages ═══════════════════════════════════════════════════

export function sma(data, period) {
  const r = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let s = 0;
    for (let j = 0; j < period; j++) s += data[i - j];
    r[i] = s / period;
  }
  return r;
}

export function ema(data, period) {
  const r = new Array(data.length).fill(null);
  const k = 2 / (period + 1);
  let prev = null;
  for (let i = 0; i < data.length; i++) {
    if (data[i] == null) continue;
    if (prev === null) {
      if (i >= period - 1) {
        let s = 0;
        for (let j = 0; j < period; j++) s += data[i - j];
        prev = s / period;
        r[i] = prev;
      }
    } else {
      prev = data[i] * k + prev * (1 - k);
      r[i] = prev;
    }
  }
  return r;
}

export function wma(data, period) {
  const r = new Array(data.length).fill(null);
  const denom = (period * (period + 1)) / 2;
  for (let i = period - 1; i < data.length; i++) {
    let s = 0;
    for (let j = 0; j < period; j++) s += data[i - j] * (period - j);
    r[i] = s / denom;
  }
  return r;
}

export function dema(data, period) {
  const e1 = ema(data, period);
  const e2 = ema(e1.map(v => v ?? 0), period);
  return e1.map((v, i) => (v != null && e2[i] != null) ? 2 * v - e2[i] : null);
}

export function tema(data, period) {
  const e1 = ema(data, period);
  const e2 = ema(e1.map(v => v ?? 0), period);
  const e3 = ema(e2.map(v => v ?? 0), period);
  return e1.map((v, i) =>
    (v != null && e2[i] != null && e3[i] != null) ? 3 * v - 3 * e2[i] + e3[i] : null
  );
}

export function hma(data, period) {
  const halfWma = wma(data, Math.floor(period / 2));
  const fullWma = wma(data, period);
  const diff = halfWma.map((v, i) => (v != null && fullWma[i] != null) ? 2 * v - fullWma[i] : null);
  return wma(diff.filter(v => v != null), Math.floor(Math.sqrt(period)));
}

// ═══ RSI ════════════════════════════════════════════════════════════════════

export function rsi(closes, period = 14) {
  const r = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return r;

  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  r[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
    r[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return r;
}

// ═══ Stochastic ═════════════════════════════════════════════════════════════

export function stochastic(highs, lows, closes, kPeriod = 14, dPeriod = 3, smooth = 3) {
  const rawK = new Array(closes.length).fill(null);
  for (let i = kPeriod - 1; i < closes.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      hh = Math.max(hh, highs[i - j]);
      ll = Math.min(ll, lows[i - j]);
    }
    rawK[i] = hh === ll ? 50 : ((closes[i] - ll) / (hh - ll)) * 100;
  }
  const K = sma(rawK.map(v => v ?? 0), smooth);
  const D = sma(K.map(v => v ?? 0), dPeriod);
  return { K, D };
}

export function stochRsi(closes, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  const rsiVals = rsi(closes, rsiPeriod);
  const validRsi = rsiVals.map(v => v ?? 0);
  const K = new Array(closes.length).fill(null);

  for (let i = stochPeriod - 1; i < validRsi.length; i++) {
    if (rsiVals[i] == null) continue;
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < stochPeriod; j++) {
      if (rsiVals[i - j] != null) {
        hh = Math.max(hh, validRsi[i - j]);
        ll = Math.min(ll, validRsi[i - j]);
      }
    }
    K[i] = hh === ll ? 50 : ((validRsi[i] - ll) / (hh - ll)) * 100;
  }
  const D = sma(K.map(v => v ?? 0), dSmooth);
  return { K, D };
}

// ═══ MACD ═══════════════════════════════════════════════════════════════════

export function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(closes, fast);
  const emaSlow = ema(closes, slow);
  const line = emaFast.map((v, i) => (v != null && emaSlow[i] != null) ? v - emaSlow[i] : null);
  const signalLine = ema(line.map(v => v ?? 0), signal);
  const histogram = line.map((v, i) => (v != null && signalLine[i] != null) ? v - signalLine[i] : null);
  return { line, signal: signalLine, histogram };
}

// ═══ Bollinger Bands ════════════════════════════════════════════════════════

export function bollingerBands(closes, period = 20, mult = 2) {
  const mid = sma(closes, period);
  const upper = new Array(closes.length).fill(null);
  const lower = new Array(closes.length).fill(null);
  const width = new Array(closes.length).fill(null);

  for (let i = period - 1; i < closes.length; i++) {
    if (mid[i] == null) continue;
    let sqSum = 0;
    for (let j = 0; j < period; j++) sqSum += (closes[i - j] - mid[i]) ** 2;
    const sd = Math.sqrt(sqSum / period);
    upper[i] = mid[i] + mult * sd;
    lower[i] = mid[i] - mult * sd;
    width[i] = mid[i] !== 0 ? (upper[i] - lower[i]) / mid[i] : 0;
  }
  return { upper, mid, lower, width };
}

// ═══ ATR ════════════════════════════════════════════════════════════════════

export function atr(highs, lows, closes, period = 14) {
  const tr = new Array(closes.length).fill(null);
  tr[0] = highs[0] - lows[0];
  for (let i = 1; i < closes.length; i++) {
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }
  return ema(tr, period);
}

// ═══ ADX ════════════════════════════════════════════════════════════════════

export function adx(highs, lows, closes, period = 14) {
  const len = closes.length;
  const plusDM = new Array(len).fill(0);
  const minusDM = new Array(len).fill(0);
  const trArr = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = (upMove > downMove && upMove > 0) ? upMove : 0;
    minusDM[i] = (downMove > upMove && downMove > 0) ? downMove : 0;
    trArr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
  }

  const atrSmooth = ema(trArr, period);
  const plusDI = ema(plusDM, period).map((v, i) => atrSmooth[i] ? (v / atrSmooth[i]) * 100 : null);
  const minusDI = ema(minusDM, period).map((v, i) => atrSmooth[i] ? (v / atrSmooth[i]) * 100 : null);
  const dx = plusDI.map((v, i) =>
    (v != null && minusDI[i] != null && (v + minusDI[i]) !== 0)
      ? Math.abs(v - minusDI[i]) / (v + minusDI[i]) * 100
      : null
  );
  const adxLine = ema(dx.map(v => v ?? 0), period);

  return { adx: adxLine, plusDI, minusDI };
}

// ═══ CCI ════════════════════════════════════════════════════════════════════

export function cci(highs, lows, closes, period = 20) {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const tpSma = sma(tp, period);
  const r = new Array(closes.length).fill(null);

  for (let i = period - 1; i < tp.length; i++) {
    if (tpSma[i] == null) continue;
    let md = 0;
    for (let j = 0; j < period; j++) md += Math.abs(tp[i - j] - tpSma[i]);
    md /= period;
    r[i] = md === 0 ? 0 : (tp[i] - tpSma[i]) / (0.015 * md);
  }
  return r;
}

// ═══ Williams %R ════════════════════════════════════════════════════════════

export function williamsR(highs, lows, closes, period = 14) {
  const r = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < period; j++) {
      hh = Math.max(hh, highs[i - j]);
      ll = Math.min(ll, lows[i - j]);
    }
    r[i] = hh === ll ? -50 : ((hh - closes[i]) / (hh - ll)) * -100;
  }
  return r;
}

// ═══ Volume Indicators ══════════════════════════════════════════════════════

export function obv(closes, volumes) {
  const r = [0];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) r.push(r[i - 1] + volumes[i]);
    else if (closes[i] < closes[i - 1]) r.push(r[i - 1] - volumes[i]);
    else r.push(r[i - 1]);
  }
  return r;
}

export function mfi(highs, lows, closes, volumes, period = 14) {
  const tp = closes.map((c, i) => (highs[i] + lows[i] + c) / 3);
  const r = new Array(closes.length).fill(null);

  for (let i = period; i < closes.length; i++) {
    let posFlow = 0, negFlow = 0;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      const mf = tp[idx] * volumes[idx];
      if (tp[idx] > tp[idx - 1]) posFlow += mf;
      else negFlow += mf;
    }
    r[i] = negFlow === 0 ? 100 : 100 - 100 / (1 + posFlow / negFlow);
  }
  return r;
}

export function cmf(highs, lows, closes, volumes, period = 20) {
  const mfm = closes.map((c, i) =>
    (highs[i] === lows[i]) ? 0 : ((c - lows[i]) - (highs[i] - c)) / (highs[i] - lows[i])
  );
  const mfv = mfm.map((v, i) => v * volumes[i]);
  const r = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sumMfv = 0, sumVol = 0;
    for (let j = 0; j < period; j++) {
      sumMfv += mfv[i - j];
      sumVol += volumes[i - j];
    }
    r[i] = sumVol === 0 ? 0 : sumMfv / sumVol;
  }
  return r;
}

export function adLine(highs, lows, closes, volumes) {
  const r = [0];
  for (let i = 1; i < closes.length; i++) {
    const mfm = (highs[i] === lows[i]) ? 0 : ((closes[i] - lows[i]) - (highs[i] - closes[i])) / (highs[i] - lows[i]);
    r.push(r[i - 1] + mfm * volumes[i]);
  }
  return r;
}

export function vwap(highs, lows, closes, volumes) {
  const r = new Array(closes.length).fill(null);
  let cumTPV = 0, cumVol = 0;
  for (let i = 0; i < closes.length; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    cumTPV += tp * volumes[i];
    cumVol += volumes[i];
    r[i] = cumVol === 0 ? closes[i] : cumTPV / cumVol;
  }
  return r;
}

export function forceIndex(closes, volumes, period = 13) {
  const fi = [0];
  for (let i = 1; i < closes.length; i++) {
    fi.push((closes[i] - closes[i - 1]) * volumes[i]);
  }
  return ema(fi, period);
}

export function eom(highs, lows, volumes, period = 14) {
  const r = [0];
  for (let i = 1; i < highs.length; i++) {
    const dm = ((highs[i] + lows[i]) / 2) - ((highs[i - 1] + lows[i - 1]) / 2);
    const br = volumes[i] === 0 ? 0 : (volumes[i] / 1e6) / (highs[i] - lows[i] || 1);
    r.push(dm / (br || 1));
  }
  return sma(r, period);
}

// ═══ Ichimoku ═══════════════════════════════════════════════════════════════

export function ichimoku(highs, lows, closes, tenkan = 9, kijun = 26, senkou = 52) {
  const donchianMid = (h, l, period, idx) => {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < period && idx - j >= 0; j++) {
      hh = Math.max(hh, h[idx - j]);
      ll = Math.min(ll, l[idx - j]);
    }
    return (hh + ll) / 2;
  };

  const len = closes.length;
  const tenkanSen = new Array(len).fill(null);
  const kijunSen = new Array(len).fill(null);
  const senkouA = new Array(len).fill(null);
  const senkouB = new Array(len).fill(null);
  const chikou = new Array(len).fill(null);

  for (let i = 0; i < len; i++) {
    if (i >= tenkan - 1) tenkanSen[i] = donchianMid(highs, lows, tenkan, i);
    if (i >= kijun - 1) kijunSen[i] = donchianMid(highs, lows, kijun, i);
    if (i >= kijun - 1 && tenkanSen[i] != null && kijunSen[i] != null) {
      senkouA[i] = (tenkanSen[i] + kijunSen[i]) / 2;
    }
    if (i >= senkou - 1) senkouB[i] = donchianMid(highs, lows, senkou, i);
    if (i >= kijun) chikou[i - kijun] = closes[i];
  }

  return { tenkanSen, kijunSen, senkouA, senkouB, chikou };
}

// ═══ Parabolic SAR ══════════════════════════════════════════════════════════

export function parabolicSar(highs, lows, step = 0.02, max = 0.2) {
  const len = highs.length;
  const r = new Array(len).fill(null);
  const trend = new Array(len).fill(null); // 1 = up, -1 = down

  if (len < 2) return { sar: r, trend };

  let isUpTrend = highs[1] >= highs[0];
  let af = step;
  let ep = isUpTrend ? highs[0] : lows[0];
  let sar = isUpTrend ? lows[0] : highs[0];

  r[0] = sar;
  trend[0] = isUpTrend ? 1 : -1;

  for (let i = 1; i < len; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (isUpTrend) {
      sar = Math.min(sar, lows[i - 1], i > 1 ? lows[i - 2] : lows[i - 1]);
      if (lows[i] < sar) {
        isUpTrend = false;
        sar = ep;
        ep = lows[i];
        af = step;
      } else {
        if (highs[i] > ep) { ep = highs[i]; af = Math.min(af + step, max); }
      }
    } else {
      sar = Math.max(sar, highs[i - 1], i > 1 ? highs[i - 2] : highs[i - 1]);
      if (highs[i] > sar) {
        isUpTrend = true;
        sar = ep;
        ep = highs[i];
        af = step;
      } else {
        if (lows[i] < ep) { ep = lows[i]; af = Math.min(af + step, max); }
      }
    }

    r[i] = sar;
    trend[i] = isUpTrend ? 1 : -1;
  }
  return { sar: r, trend };
}

// ═══ SuperTrend ═════════════════════════════════════════════════════════════

export function superTrend(highs, lows, closes, period = 10, mult = 3) {
  const atrVals = atr(highs, lows, closes, period);
  const len = closes.length;
  const st = new Array(len).fill(null);
  const dir = new Array(len).fill(1); // 1 = up, -1 = down

  for (let i = period; i < len; i++) {
    if (atrVals[i] == null) continue;
    const hl2 = (highs[i] + lows[i]) / 2;
    let upperBand = hl2 + mult * atrVals[i];
    let lowerBand = hl2 - mult * atrVals[i];

    if (st[i - 1] != null) {
      if (dir[i - 1] === 1) {
        lowerBand = Math.max(lowerBand, st[i - 1]);
        if (closes[i] < lowerBand) { dir[i] = -1; st[i] = upperBand; }
        else { dir[i] = 1; st[i] = lowerBand; }
      } else {
        upperBand = Math.min(upperBand, st[i - 1]);
        if (closes[i] > upperBand) { dir[i] = 1; st[i] = lowerBand; }
        else { dir[i] = -1; st[i] = upperBand; }
      }
    } else {
      dir[i] = closes[i] > hl2 ? 1 : -1;
      st[i] = dir[i] === 1 ? lowerBand : upperBand;
    }
  }
  return { superTrend: st, direction: dir };
}

// ═══ Aroon ══════════════════════════════════════════════════════════════════

export function aroon(highs, lows, period = 25) {
  const len = highs.length;
  const up = new Array(len).fill(null);
  const down = new Array(len).fill(null);
  const osc = new Array(len).fill(null);

  for (let i = period; i < len; i++) {
    let hIdx = 0, lIdx = 0;
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j <= period; j++) {
      if (highs[i - j] > hh) { hh = highs[i - j]; hIdx = j; }
      if (lows[i - j] < ll) { ll = lows[i - j]; lIdx = j; }
    }
    up[i] = ((period - hIdx) / period) * 100;
    down[i] = ((period - lIdx) / period) * 100;
    osc[i] = up[i] - down[i];
  }
  return { up, down, oscillator: osc };
}

// ═══ Vortex Indicator ═══════════════════════════════════════════════════════

export function vortex(highs, lows, closes, period = 14) {
  const len = closes.length;
  const viPlus = new Array(len).fill(null);
  const viMinus = new Array(len).fill(null);

  for (let i = period; i < len; i++) {
    let sumVmPlus = 0, sumVmMinus = 0, sumTr = 0;
    for (let j = 0; j < period; j++) {
      const idx = i - j;
      sumVmPlus += Math.abs(highs[idx] - lows[idx - 1]);
      sumVmMinus += Math.abs(lows[idx] - highs[idx - 1]);
      sumTr += Math.max(highs[idx] - lows[idx], Math.abs(highs[idx] - closes[idx - 1]), Math.abs(lows[idx] - closes[idx - 1]));
    }
    viPlus[i] = sumTr === 0 ? 1 : sumVmPlus / sumTr;
    viMinus[i] = sumTr === 0 ? 1 : sumVmMinus / sumTr;
  }
  return { viPlus, viMinus };
}

// ═══ Misc Indicators ════════════════════════════════════════════════════════

export function roc(data, period = 12) {
  const r = new Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    r[i] = data[i - period] !== 0 ? ((data[i] - data[i - period]) / data[i - period]) * 100 : 0;
  }
  return r;
}

export function momentum(data, period = 10) {
  const r = new Array(data.length).fill(null);
  for (let i = period; i < data.length; i++) {
    r[i] = data[i] - data[i - period];
  }
  return r;
}

export function trix(data, period = 15) {
  const e1 = ema(data, period);
  const e2 = ema(e1.map(v => v ?? 0), period);
  const e3 = ema(e2.map(v => v ?? 0), period);
  return roc(e3.map(v => v ?? 0), 1);
}

export function ultimateOscillator(highs, lows, closes, p1 = 7, p2 = 14, p3 = 28) {
  const len = closes.length;
  const bp = new Array(len).fill(0);
  const tr = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    bp[i] = closes[i] - Math.min(lows[i], closes[i - 1]);
    tr[i] = Math.max(highs[i], closes[i - 1]) - Math.min(lows[i], closes[i - 1]);
  }

  const r = new Array(len).fill(null);
  for (let i = p3; i < len; i++) {
    let bpSum1 = 0, trSum1 = 0, bpSum2 = 0, trSum2 = 0, bpSum3 = 0, trSum3 = 0;
    for (let j = 0; j < p1; j++) { bpSum1 += bp[i - j]; trSum1 += tr[i - j]; }
    for (let j = 0; j < p2; j++) { bpSum2 += bp[i - j]; trSum2 += tr[i - j]; }
    for (let j = 0; j < p3; j++) { bpSum3 += bp[i - j]; trSum3 += tr[i - j]; }
    const avg1 = trSum1 ? bpSum1 / trSum1 : 0;
    const avg2 = trSum2 ? bpSum2 / trSum2 : 0;
    const avg3 = trSum3 ? bpSum3 / trSum3 : 0;
    r[i] = ((4 * avg1 + 2 * avg2 + avg3) / 7) * 100;
  }
  return r;
}

export function coppock(closes, longRoc = 14, shortRoc = 11, wmaP = 10) {
  const r1 = roc(closes, longRoc);
  const r2 = roc(closes, shortRoc);
  const sum = r1.map((v, i) => (v != null && r2[i] != null) ? v + r2[i] : 0);
  return wma(sum, wmaP);
}

export function kst(closes) {
  const r1 = roc(closes, 10);
  const r2 = roc(closes, 15);
  const r3 = roc(closes, 20);
  const r4 = roc(closes, 30);
  const s1 = sma(r1.map(v => v ?? 0), 10);
  const s2 = sma(r2.map(v => v ?? 0), 10);
  const s3 = sma(r3.map(v => v ?? 0), 10);
  const s4 = sma(r4.map(v => v ?? 0), 15);
  const line = s1.map((v, i) =>
    (v != null && s2[i] != null && s3[i] != null && s4[i] != null)
      ? s1[i] * 1 + s2[i] * 2 + s3[i] * 3 + s4[i] * 4
      : null
  );
  const sig = sma(line.map(v => v ?? 0), 9);
  return { line, signal: sig };
}

export function tsi(closes, longP = 25, shortP = 13, signalP = 7) {
  const pc = [0];
  for (let i = 1; i < closes.length; i++) pc.push(closes[i] - closes[i - 1]);
  const pcDs = ema(ema(pc, longP).map(v => v ?? 0), shortP);
  const apcDs = ema(ema(pc.map(Math.abs), longP).map(v => v ?? 0), shortP);
  const line = pcDs.map((v, i) => apcDs[i] ? (v / apcDs[i]) * 100 : null);
  const sig = ema(line.map(v => v ?? 0), signalP);
  return { line, signal: sig };
}

export function fisherTransform(highs, lows, period = 10) {
  const len = highs.length;
  const r = new Array(len).fill(null);
  let val = 0;

  for (let i = period - 1; i < len; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < period; j++) {
      hh = Math.max(hh, highs[i - j]);
      ll = Math.min(ll, lows[i - j]);
    }
    const mid = (highs[i] + lows[i]) / 2;
    const raw = hh === ll ? 0 : ((mid - ll) / (hh - ll) - 0.5) * 2;
    const clamped = Math.max(-0.999, Math.min(0.999, 0.33 * raw + 0.67 * val));
    val = clamped;
    r[i] = 0.5 * Math.log((1 + clamped) / (1 - clamped));
  }
  return r;
}

export function massIndex(highs, lows, period = 25) {
  const diff = highs.map((h, i) => h - lows[i]);
  const e1 = ema(diff, 9);
  const e2 = ema(e1.map(v => v ?? 0), 9);
  const ratio = e1.map((v, i) => (v != null && e2[i]) ? v / e2[i] : null);
  const r = new Array(highs.length).fill(null);
  for (let i = period - 1; i < ratio.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += ratio[i - j] ?? 1;
    r[i] = sum;
  }
  return r;
}

export function elderRay(highs, lows, closes, period = 13) {
  const e = ema(closes, period);
  const bull = highs.map((h, i) => e[i] != null ? h - e[i] : null);
  const bear = lows.map((l, i) => e[i] != null ? l - e[i] : null);
  return { bullPower: bull, bearPower: bear };
}

export function dpo(closes, period = 20) {
  const s = sma(closes, period);
  const shift = Math.floor(period / 2) + 1;
  const r = new Array(closes.length).fill(null);
  for (let i = shift; i < closes.length; i++) {
    if (s[i - shift] != null) r[i] = closes[i] - s[i - shift];
  }
  return r;
}

export function donchianChannel(highs, lows, period = 20) {
  const upper = new Array(highs.length).fill(null);
  const lower = new Array(highs.length).fill(null);
  const mid = new Array(highs.length).fill(null);
  for (let i = period - 1; i < highs.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = 0; j < period; j++) {
      hh = Math.max(hh, highs[i - j]);
      ll = Math.min(ll, lows[i - j]);
    }
    upper[i] = hh;
    lower[i] = ll;
    mid[i] = (hh + ll) / 2;
  }
  return { upper, lower, mid };
}

export function keltnerChannel(highs, lows, closes, emaPeriod = 20, atrPeriod = 10, mult = 1.5) {
  const mid = ema(closes, emaPeriod);
  const atrVals = atr(highs, lows, closes, atrPeriod);
  const upper = mid.map((v, i) => (v != null && atrVals[i] != null) ? v + mult * atrVals[i] : null);
  const lower = mid.map((v, i) => (v != null && atrVals[i] != null) ? v - mult * atrVals[i] : null);
  return { upper, mid, lower };
}

// ═══ Linear Regression ══════════════════════════════════════════════════════

export function linearRegressionSlope(data, period = 20) {
  const r = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let j = 0; j < period; j++) {
      sumX += j;
      sumY += data[i - period + 1 + j];
      sumXY += j * data[i - period + 1 + j];
      sumX2 += j * j;
    }
    r[i] = (period * sumXY - sumX * sumY) / (period * sumX2 - sumX * sumX);
  }
  return r;
}

// ═══ Heikin Ashi ════════════════════════════════════════════════════════════

export function heikinAshi(opens, highs, lows, closes) {
  const len = closes.length;
  const haClose = closes.map((c, i) => (opens[i] + highs[i] + lows[i] + c) / 4);
  const haOpen = [opens[0]];
  for (let i = 1; i < len; i++) haOpen.push((haOpen[i - 1] + haClose[i - 1]) / 2);
  const haHigh = highs.map((h, i) => Math.max(h, haOpen[i], haClose[i]));
  const haLow = lows.map((l, i) => Math.min(l, haOpen[i], haClose[i]));
  return { open: haOpen, high: haHigh, low: haLow, close: haClose };
}

// ═══ Helpers ════════════════════════════════════════════════════════════════

export function last(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i];
  }
  return null;
}

export function prev(arr, n = 1) {
  let count = 0;
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) {
      if (count === n) return arr[i];
      count++;
    }
  }
  return null;
}

export function slope(arr, lookback = 5) {
  const vals = arr.filter(v => v != null);
  if (vals.length < lookback) return 0;
  const recent = vals.slice(-lookback);
  return (recent[recent.length - 1] - recent[0]) / lookback;
}

export function zScore(data, period = 20) {
  const s = sma(data, period);
  const r = new Array(data.length).fill(null);
  for (let i = period - 1; i < data.length; i++) {
    if (s[i] == null) continue;
    let sqSum = 0;
    for (let j = 0; j < period; j++) sqSum += (data[i - j] - s[i]) ** 2;
    const sd = Math.sqrt(sqSum / period);
    r[i] = sd === 0 ? 0 : (data[i] - s[i]) / sd;
  }
  return r;
}
