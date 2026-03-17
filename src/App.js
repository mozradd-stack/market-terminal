import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Watchlist from './components/Watchlist';
import Chart from './components/Chart';
import OrderBook from './components/OrderBook';
import RecentTrades from './components/RecentTrades';
import MarketStats from './components/MarketStats';
import FearGreed from './components/FearGreed';
import TopMovers from './components/TopMovers';
import NewsWidget from './components/NewsWidget';
import SignalDashboard from './components/SignalDashboard';
import BiasMeter from './components/BiasMeter';
import './App.css';

const COINGECKO = 'https://api.coingecko.com/api/v3';

// Map Binance symbol → CoinGecko id
const SYMBOL_TO_CG = {
  BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', BNBUSDT: 'binancecoin',
  SOLUSDT: 'solana', XRPUSDT: 'ripple', ADAUSDT: 'cardano',
  DOGEUSDT: 'dogecoin', AVAXUSDT: 'avalanche-2', DOTUSDT: 'polkadot',
  MATICUSDT: 'matic-network', LINKUSDT: 'chainlink', UNIUSDT: 'uniswap',
  LTCUSDT: 'litecoin', BCHUSDT: 'bitcoin-cash', ATOMUSDT: 'cosmos',
  ETCUSDT: 'ethereum-classic', XLMUSDT: 'stellar', ALGOUSDT: 'algorand',
  VETUSDT: 'vechain', FTMUSDT: 'fantom',
};

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [ticker, setTicker] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [globalData, setGlobalData] = useState(null);
  const [prevGlobalData, setPrevGlobalData] = useState(null);
  const [fearGreed, setFearGreed] = useState(null);
  const [news, setNews] = useState([]);
  const [topMovers, setTopMovers] = useState({ gainers: [], losers: [] });
  const [activeTab, setActiveTab] = useState('chart'); // chart | news | portfolio
  const tickerWsRef = useRef(null);

  // Watchlist + top movers from CoinGecko
  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch(
        `${COINGECKO}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`
      );
      const data = await res.json();
      if (Array.isArray(data)) {
        setWatchlist(data);
        const gainers = [...data]
          .filter(c => c.price_change_percentage_24h > 0)
          .sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h)
          .slice(0, 6);
        const losers = [...data]
          .filter(c => c.price_change_percentage_24h < 0)
          .sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h)
          .slice(0, 6);
        setTopMovers({ gainers, losers });
      }
    } catch (e) { console.error('Watchlist:', e); }
  }, []);

  // Global market stats (track previous snapshot for Macro signals)
  const fetchGlobal = useCallback(async () => {
    try {
      const res = await fetch(`${COINGECKO}/global`);
      const data = await res.json();
      if (data?.data) {
        setGlobalData(prev => { setPrevGlobalData(prev); return data.data; });
      }
    } catch (e) { console.error('Global:', e); }
  }, []);

  // Fear & Greed
  const fetchFearGreed = useCallback(async () => {
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=10');
      const data = await res.json();
      if (data?.data?.[0]) setFearGreed({ ...data.data[0], history: data.data });
    } catch (e) { console.error('FNG:', e); }
  }, []);

  // News — primary: CryptoCompare, fallback: CoinGecko news
  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&extraParams=MarketTerminal');
      if (!res.ok) throw new Error(`CC status ${res.status}`);
      const data = await res.json();
      if (!data.Data?.length) throw new Error('Empty');
      const articles = data.Data.slice(0, 20).map(item => ({
        title: item.title,
        url: item.url,
        source: item.source_info?.name || item.source,
        published: item.published_on,
        imageUrl: item.imageurl,
        body: item.body?.substring(0, 200),
      }));
      setNews(articles);
    } catch {
      // Fallback: CoinGecko news
      try {
        const res2 = await fetch('https://api.coingecko.com/api/v3/news?per_page=20');
        const data2 = await res2.json();
        const articles2 = (data2?.data || []).slice(0, 20).map(item => ({
          title: item.title,
          url: item.url,
          source: item.author?.name || 'CoinGecko',
          published: Math.floor(new Date(item.created_at).getTime() / 1000),
          imageUrl: item.thumb_2x || item.thumb,
          body: item.description?.substring(0, 200),
        }));
        if (articles2.length) setNews(articles2);
      } catch (e2) { console.error('News fallback failed:', e2); }
    }
  }, []);

  useEffect(() => { fetchWatchlist(); const t = setInterval(fetchWatchlist, 30000); return () => clearInterval(t); }, [fetchWatchlist]);
  useEffect(() => { fetchGlobal(); const t = setInterval(fetchGlobal, 60000); return () => clearInterval(t); }, [fetchGlobal]);
  useEffect(() => { fetchFearGreed(); const t = setInterval(fetchFearGreed, 3600000); return () => clearInterval(t); }, [fetchFearGreed]);
  useEffect(() => { fetchNews(); const t = setInterval(fetchNews, 300000); return () => clearInterval(t); }, [fetchNews]);

  // Binance ticker WebSocket
  useEffect(() => {
    if (tickerWsRef.current) {
      tickerWsRef.current.close();
    }
    const stream = selectedSymbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}@ticker`);
    tickerWsRef.current = ws;

    ws.onmessage = (event) => {
      const d = JSON.parse(event.data);
      setTicker({
        symbol: d.s,
        price: parseFloat(d.c),
        change: parseFloat(d.P),
        changeAbs: parseFloat(d.p),
        high: parseFloat(d.h),
        low: parseFloat(d.l),
        volume: parseFloat(d.v),
        quoteVolume: parseFloat(d.q),
        openPrice: parseFloat(d.o),
        trades: parseInt(d.n),
        bidPrice: parseFloat(d.b),
        askPrice: parseFloat(d.a),
      });
    };

    ws.onerror = () => {};
    return () => { if (ws.readyState <= 1) ws.close(); };
  }, [selectedSymbol]);

  const handleSymbolSelect = useCallback((symbol) => {
    setSelectedSymbol(symbol);
    setTicker(null);
    setActiveTab('chart');
  }, []);

  const fmt = (n, decimals = 2) =>
    n != null ? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

  const fmtPrice = (p) => {
    if (p == null) return '—';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className="terminal">
      <Header ticker={ticker} globalData={globalData} selectedSymbol={selectedSymbol} />

      <div className="terminal-body">
        {/* Left: Watchlist */}
        <aside className="panel panel-watchlist">
          <Watchlist
            coins={watchlist}
            selectedSymbol={selectedSymbol}
            onSelect={handleSymbolSelect}
          />
        </aside>

        {/* Center: Chart + Symbol Info */}
        <main className="panel panel-center">
          {/* Symbol Info Bar */}
          <div className="symbol-bar">
            <div className="symbol-bar-left">
              <span className="symbol-name">{selectedSymbol}</span>
              <span className={`symbol-price ${ticker?.change >= 0 ? 'pos' : 'neg'}`}>
                {ticker ? `$${fmtPrice(ticker.price)}` : '—'}
              </span>
              <span className={`symbol-change ${ticker?.change >= 0 ? 'pos' : 'neg'}`}>
                {ticker ? `${ticker.change >= 0 ? '+' : ''}${fmt(ticker.change)}%` : ''}
              </span>
              <span className={`symbol-change-abs ${ticker?.change >= 0 ? 'pos' : 'neg'}`}>
                {ticker ? `${ticker.changeAbs >= 0 ? '+' : ''}${fmtPrice(ticker.changeAbs)}` : ''}
              </span>
            </div>
            <div className="symbol-bar-stats">
              <div className="stat"><span className="stat-label">24h High</span><span className="stat-value pos">{ticker ? fmtPrice(ticker.high) : '—'}</span></div>
              <div className="stat"><span className="stat-label">24h Low</span><span className="stat-value neg">{ticker ? fmtPrice(ticker.low) : '—'}</span></div>
              <div className="stat"><span className="stat-label">24h Vol</span><span className="stat-value">{ticker ? `${fmt(ticker.quoteVolume / 1e6, 2)}M $` : '—'}</span></div>
              <div className="stat"><span className="stat-label">Trades</span><span className="stat-value">{ticker ? ticker.trades.toLocaleString() : '—'}</span></div>
              <div className="stat"><span className="stat-label">Bid</span><span className="stat-value pos">{ticker ? fmtPrice(ticker.bidPrice) : '—'}</span></div>
              <div className="stat"><span className="stat-label">Ask</span><span className="stat-value neg">{ticker ? fmtPrice(ticker.askPrice) : '—'}</span></div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="tab-nav">
            <button className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>Chart</button>
            <button className={`tab-btn ${activeTab === 'signals' ? 'active' : ''}`} onClick={() => setActiveTab('signals')}>
              Signals <span style={{ fontSize: 9, background: 'var(--yellow)', color: '#000', borderRadius: 3, padding: '1px 4px', marginLeft: 4, fontWeight: 700 }}>100</span>
            </button>
            <button className={`tab-btn ${activeTab === 'news' ? 'active' : ''}`} onClick={() => setActiveTab('news')}>News</button>
            <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Market</button>
          </div>

          {/* Main Content */}
          <div className="center-content">
            {activeTab === 'chart' && (
              <>
                <BiasMeter symbol={selectedSymbol} timeframe="1h" />
                <Chart symbol={selectedSymbol} />
              </>
            )}
            {activeTab === 'signals' && (
              <SignalDashboard
                fearGreedValue={fearGreed ? parseInt(fearGreed.value) : null}
                fearGreedPrev={fearGreed?.history?.[1] ? parseInt(fearGreed.history[1].value) : null}
                btcDominance={globalData?.market_cap_percentage?.btc ?? null}
                btcDominancePrev={prevGlobalData?.market_cap_percentage?.btc ?? null}
                globalMarketCap={globalData?.total_market_cap?.usd ?? null}
                globalMarketCapPrev={prevGlobalData?.total_market_cap?.usd ?? null}
                onSymbolSelect={handleSymbolSelect}
              />
            )}
            {activeTab === 'news' && <NewsWidget news={news} />}
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <TopMovers topMovers={topMovers} />
                <MarketStats globalData={globalData} />
              </div>
            )}
          </div>
        </main>

        {/* Right: Order Book + Trades */}
        <aside className="panel panel-right">
          <OrderBook symbol={selectedSymbol} />
          <RecentTrades symbol={selectedSymbol} />
        </aside>
      </div>

      {/* Bottom Bar */}
      <div className="bottom-bar">
        <MarketStats globalData={globalData} compact />
        <FearGreed fearGreed={fearGreed} />
      </div>
    </div>
  );
}

export default App;
