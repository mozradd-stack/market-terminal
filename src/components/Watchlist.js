import React, { useState, useEffect, useMemo, useCallback } from 'react';

// ─── Crypto: CoinGecko id → Binance USDT symbol ──────────────────────────────
const CG_TO_BINANCE = {
  bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT', ripple: 'XRPUSDT', cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT', 'avalanche-2': 'AVAXUSDT', polkadot: 'DOTUSDT',
  'matic-network': 'MATICUSDT', chainlink: 'LINKUSDT', uniswap: 'UNIUSDT',
  litecoin: 'LTCUSDT', 'bitcoin-cash': 'BCHUSDT', cosmos: 'ATOMUSDT',
  'ethereum-classic': 'ETCUSDT', stellar: 'XLMUSDT', tron: 'TRXUSDT',
  aave: 'AAVEUSDT', filecoin: 'FILUSDT', near: 'NEARUSDT',
  aptos: 'APTUSDT', arbitrum: 'ARBUSDT', optimism: 'OPUSDT',
  'shiba-inu': 'SHIBUSDT', sui: 'SUIUSDT', injective: 'INJUSDT',
  celestia: 'TIAUSDT', sei: 'SEIUSDT', 'fetch-ai': 'FETUSDT',
};

// ─── Forex: all 28 pairs from EUR/GBP/USD/JPY/CHF/AUD/NZD/CAD ───────────────
const FOREX_PAIRS = [
  // Majors
  { symbol: 'EURUSD=X', base: 'EUR', quote: 'USD', name: 'Euro / US Dollar' },
  { symbol: 'GBPUSD=X', base: 'GBP', quote: 'USD', name: 'Pound / US Dollar' },
  { symbol: 'AUDUSD=X', base: 'AUD', quote: 'USD', name: 'Aussie / US Dollar' },
  { symbol: 'NZDUSD=X', base: 'NZD', quote: 'USD', name: 'Kiwi / US Dollar' },
  { symbol: 'USDJPY=X', base: 'USD', quote: 'JPY', name: 'US Dollar / Yen' },
  { symbol: 'USDCHF=X', base: 'USD', quote: 'CHF', name: 'US Dollar / Swiss' },
  { symbol: 'USDCAD=X', base: 'USD', quote: 'CAD', name: 'US Dollar / Loonie' },
  // EUR Crosses
  { symbol: 'EURGBP=X', base: 'EUR', quote: 'GBP', name: 'Euro / Pound' },
  { symbol: 'EURJPY=X', base: 'EUR', quote: 'JPY', name: 'Euro / Yen' },
  { symbol: 'EURCHF=X', base: 'EUR', quote: 'CHF', name: 'Euro / Swiss' },
  { symbol: 'EURAUD=X', base: 'EUR', quote: 'AUD', name: 'Euro / Aussie' },
  { symbol: 'EURCAD=X', base: 'EUR', quote: 'CAD', name: 'Euro / Loonie' },
  { symbol: 'EURNZD=X', base: 'EUR', quote: 'NZD', name: 'Euro / Kiwi' },
  // GBP Crosses
  { symbol: 'GBPJPY=X', base: 'GBP', quote: 'JPY', name: 'Pound / Yen' },
  { symbol: 'GBPCHF=X', base: 'GBP', quote: 'CHF', name: 'Pound / Swiss' },
  { symbol: 'GBPAUD=X', base: 'GBP', quote: 'AUD', name: 'Pound / Aussie' },
  { symbol: 'GBPCAD=X', base: 'GBP', quote: 'CAD', name: 'Pound / Loonie' },
  { symbol: 'GBPNZD=X', base: 'GBP', quote: 'NZD', name: 'Pound / Kiwi' },
  // AUD Crosses
  { symbol: 'AUDJPY=X', base: 'AUD', quote: 'JPY', name: 'Aussie / Yen' },
  { symbol: 'AUDCHF=X', base: 'AUD', quote: 'CHF', name: 'Aussie / Swiss' },
  { symbol: 'AUDCAD=X', base: 'AUD', quote: 'CAD', name: 'Aussie / Loonie' },
  { symbol: 'AUDNZD=X', base: 'AUD', quote: 'NZD', name: 'Aussie / Kiwi' },
  // NZD Crosses
  { symbol: 'NZDJPY=X', base: 'NZD', quote: 'JPY', name: 'Kiwi / Yen' },
  { symbol: 'NZDCHF=X', base: 'NZD', quote: 'CHF', name: 'Kiwi / Swiss' },
  { symbol: 'NZDCAD=X', base: 'NZD', quote: 'CAD', name: 'Kiwi / Loonie' },
  // CAD Crosses
  { symbol: 'CADJPY=X', base: 'CAD', quote: 'JPY', name: 'Loonie / Yen' },
  { symbol: 'CADCHF=X', base: 'CAD', quote: 'CHF', name: 'Loonie / Swiss' },
  // CHF
  { symbol: 'CHFJPY=X', base: 'CHF', quote: 'JPY', name: 'Swiss / Yen' },
];

// ─── Currency flag emojis ────────────────────────────────────────────────────
const FLAGS = {
  EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', JPY: '🇯🇵',
  CHF: '🇨🇭', AUD: '🇦🇺', NZD: '🇳🇿', CAD: '🇨🇦',
};

function fmtPrice(p, digits = 5) {
  if (p == null || isNaN(p)) return '—';
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(digits);
}

function fmtCryptoPrice(p) {
  if (p == null) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

// ─── Forex tab ────────────────────────────────────────────────────────────────
function ForexWatchlist({ onForexSelect }) {
  const [rates, setRates] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const symbols = FOREX_PAIRS.map(p => p.symbol).join(',');
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChangePercent`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      const data = await res.json();
      const quotes = data?.quoteResponse?.result || [];
      const map = {};
      quotes.forEach(q => {
        map[q.symbol] = {
          price: q.regularMarketPrice,
          change: q.regularMarketChangePercent,
        };
      });
      setRates(map);
    } catch (e) {
      console.error('Forex rates error:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRates();
    const t = setInterval(fetchRates, 15000);
    return () => clearInterval(t);
  }, [fetchRates]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return FOREX_PAIRS.filter(p =>
      p.base.toLowerCase().includes(q) ||
      p.quote.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <>
      <div className="watchlist-search">
        <input
          type="text"
          placeholder="Filter pair..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="watchlist-header">
        <span>Pair</span>
        <span style={{ textAlign: 'right' }}>Rate</span>
        <span style={{ textAlign: 'right' }}>24h</span>
      </div>
      <div className="watchlist-list">
        {loading && (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 11 }}>
            Loading rates...
          </div>
        )}
        {filtered.map(pair => {
          const rate = rates[pair.symbol];
          const chg = rate?.change;
          return (
            <div
              key={pair.symbol}
              className="watchlist-item"
              onClick={() => onForexSelect && onForexSelect(pair)}
            >
              <div className="wi-forex-flags">
                <span className="wi-flag">{FLAGS[pair.base]}</span>
                <span className="wi-flag wi-flag-small">{FLAGS[pair.quote]}</span>
                <div>
                  <div className="wi-name">{pair.base}/{pair.quote}</div>
                  <div className="wi-subname">{pair.name.split(' / ')[0]}</div>
                </div>
              </div>
              <div className="wi-price" style={{ color: chg != null ? (chg >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text1)' }}>
                {rate ? fmtPrice(rate.price) : '—'}
              </div>
              <div className={`wi-chg ${chg == null ? '' : chg >= 0 ? 'pos' : 'neg'}`}
                style={{ background: chg == null ? 'transparent' : chg >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)' }}>
                {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(3)}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Main Watchlist ───────────────────────────────────────────────────────────
export default function Watchlist({ coins, selectedSymbol, onSelect }) {
  const [tab, setTab] = useState('crypto'); // 'crypto' | 'forex'
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('market_cap_rank');
  const [sortDir, setSortDir] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = coins.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      let av = a[sortKey] ?? (sortDir === 1 ? Infinity : -Infinity);
      let bv = b[sortKey] ?? (sortDir === 1 ? Infinity : -Infinity);
      return (av - bv) * sortDir;
    });
  }, [coins, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => -d);
    else { setSortKey(key); setSortDir(key === 'market_cap_rank' ? 1 : -1); }
  };

  const sortArrow = (key) => sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '';

  return (
    <div className="watchlist">
      {/* Tab bar */}
      <div className="wl-tab-bar">
        <button className={`wl-tab ${tab === 'crypto' ? 'active' : ''}`} onClick={() => setTab('crypto')}>
          <span>₿</span> Crypto
        </button>
        <button className={`wl-tab ${tab === 'forex' ? 'active' : ''}`} onClick={() => setTab('forex')}>
          <span>🌐</span> Forex
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', paddingRight: 8 }}>
          {tab === 'crypto' ? `${coins.length}` : `${FOREX_PAIRS.length}`}
        </span>
      </div>

      {tab === 'crypto' ? (
        <>
          <div className="watchlist-search">
            <input
              type="text"
              placeholder="Search coin..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="watchlist-header">
            <span style={{ cursor: 'pointer' }} onClick={() => handleSort('market_cap_rank')}>
              Coin{sortArrow('market_cap_rank')}
            </span>
            <span style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('current_price')}>
              Price{sortArrow('current_price')}
            </span>
            <span style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('price_change_percentage_24h')}>
              24h{sortArrow('price_change_percentage_24h')}
            </span>
          </div>

          <div className="watchlist-list">
            {filtered.map(coin => {
              const binanceSym = CG_TO_BINANCE[coin.id] || (coin.symbol.toUpperCase() + 'USDT');
              const isActive = binanceSym === selectedSymbol;
              const chg = coin.price_change_percentage_24h;
              return (
                <div
                  key={coin.id}
                  className={`watchlist-item ${isActive ? 'active' : ''}`}
                  onClick={() => onSelect(binanceSym)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {coin.image && (
                      <img src={coin.image} alt={coin.symbol} width={18} height={18}
                        style={{ borderRadius: '50%', flexShrink: 0 }} />
                    )}
                    <div>
                      <div className="wi-name">{coin.symbol.toUpperCase()}</div>
                      <div className="wi-subname">#{coin.market_cap_rank}</div>
                    </div>
                  </div>
                  <div className="wi-price" style={{ color: chg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmtCryptoPrice(coin.current_price)}
                  </div>
                  <div className={`wi-chg ${chg >= 0 ? 'pos' : 'neg'}`}
                    style={{ background: chg >= 0 ? 'rgba(14,203,129,0.12)' : 'rgba(246,70,93,0.12)' }}>
                    {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <ForexWatchlist onForexSelect={(pair) => {
          // open signal dashboard for this pair (pass info upward if needed)
        }} />
      )}
    </div>
  );
}
