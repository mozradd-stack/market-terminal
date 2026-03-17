import React, { useState, useMemo } from 'react';

// Map CoinGecko id → Binance symbol (USDT pair)
const CG_TO_BINANCE = {
  bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT', ripple: 'XRPUSDT', cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT', 'avalanche-2': 'AVAXUSDT', polkadot: 'DOTUSDT',
  'matic-network': 'MATICUSDT', chainlink: 'LINKUSDT', uniswap: 'UNIUSDT',
  litecoin: 'LTCUSDT', 'bitcoin-cash': 'BCHUSDT', cosmos: 'ATOMUSDT',
  'ethereum-classic': 'ETCUSDT', stellar: 'XLMUSDT', algorand: 'ALGOUSDT',
  vechain: 'VETUSDT', fantom: 'FTMUSDT', tron: 'TRXUSDT', shiba: 'SHIBUSDT',
  monero: 'XMRUSDT', 'the-sandbox': 'SANDUSDT', decentraland: 'MANAUSDT',
  aave: 'AAVEUSDT', 'pancakeswap-token': 'CAKEUSDT', filecoin: 'FILUSDT',
  tezos: 'XTZUSDT', eos: 'EOSUSDT',
};

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
}

export default function Watchlist({ coins, selectedSymbol, onSelect }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('market_cap_rank');
  const [sortDir, setSortDir] = useState(1); // 1 = asc, -1 = desc

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const list = coins.filter(c =>
      c.symbol.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
    return [...list].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (av == null) av = sortDir === 1 ? Infinity : -Infinity;
      if (bv == null) bv = sortDir === 1 ? Infinity : -Infinity;
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
      <div className="panel-header">
        <span className="panel-title">Watchlist</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{coins.length} coins</span>
      </div>

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
              <div>
                <div className="wi-name">{coin.symbol.toUpperCase()}</div>
                <div className="wi-subname">#{coin.market_cap_rank}</div>
              </div>
              <div className="wi-price" style={{ color: chg >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmtPrice(coin.current_price)}
              </div>
              <div className={`wi-chg ${chg >= 0 ? 'pos' : 'neg'}`}
                style={{ background: chg >= 0 ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)' }}>
                {chg != null ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
