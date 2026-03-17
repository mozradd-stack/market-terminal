import React, { useState } from 'react';

const CG_TO_BINANCE = {
  bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', binancecoin: 'BNBUSDT',
  solana: 'SOLUSDT', ripple: 'XRPUSDT', cardano: 'ADAUSDT',
  dogecoin: 'DOGEUSDT', 'avalanche-2': 'AVAXUSDT', polkadot: 'DOTUSDT',
  'matic-network': 'MATICUSDT', chainlink: 'LINKUSDT', uniswap: 'UNIUSDT',
  litecoin: 'LTCUSDT', 'bitcoin-cash': 'BCHUSDT', cosmos: 'ATOMUSDT',
};

function fmtPrice(p) {
  if (p == null) return '—';
  if (p >= 1000) return `$${p.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

export default function TopMovers({ topMovers }) {
  const [tab, setTab] = useState('gainers');
  const list = tab === 'gainers' ? topMovers.gainers : topMovers.losers;

  return (
    <div className="top-movers">
      <div className="panel-header" style={{ padding: '6px 10px', background: 'var(--bg0)', borderBottom: '1px solid var(--border)' }}>
        <span className="panel-title">Top Movers</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className={`tf-btn ${tab === 'gainers' ? 'active' : ''}`}
            onClick={() => setTab('gainers')}
            style={{ color: tab === 'gainers' ? 'var(--green)' : undefined }}
          >
            Gainers
          </button>
          <button
            className={`tf-btn ${tab === 'losers' ? 'active' : ''}`}
            onClick={() => setTab('losers')}
            style={{ color: tab === 'losers' ? 'var(--red)' : undefined }}
          >
            Losers
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 6 }}>
        {list.length === 0 && (
          <div style={{ color: 'var(--text3)', fontSize: 11, textAlign: 'center', padding: 16 }}>
            Loading...
          </div>
        )}
        {list.map(coin => {
          const chg = coin.price_change_percentage_24h;
          const isPositive = chg >= 0;
          return (
            <div key={coin.id} className="tm-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {coin.image && (
                  <img src={coin.image} alt={coin.symbol} width={20} height={20} style={{ borderRadius: '50%' }} />
                )}
                <div>
                  <div className="tm-sym">{coin.symbol.toUpperCase()}</div>
                  <div className="tm-name">{coin.name}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="tm-price">{fmtPrice(coin.current_price)}</div>
                <div className={`tm-chg ${isPositive ? 'pos' : 'neg'}`}>
                  {isPositive ? '+' : ''}{chg?.toFixed(2)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
