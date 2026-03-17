import React, { useState } from 'react';

function timeAgo(ts) {
  const diff = Math.floor((Date.now() / 1000) - ts);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NewsWidget({ news }) {
  const [search, setSearch] = useState('');

  const filtered = news.filter(item =>
    !search || item.title?.toLowerCase().includes(search.toLowerCase())
  );

  if (!news.length) {
    return (
      <div className="news-widget" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text3)', fontSize: 12 }}>Loading news...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            color: 'var(--text1)',
            padding: '5px 8px',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            outline: 'none',
          }}
        />
      </div>

      <div className="news-widget">
        {filtered.length === 0 && (
          <div style={{ color: 'var(--text3)', fontSize: 12, textAlign: 'center', padding: 16 }}>
            No results found
          </div>
        )}
        {filtered.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="news-item"
            style={{ textDecoration: 'none' }}
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="news-img"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="news-content">
              <div className="news-title">{item.title}</div>
              <div className="news-meta">
                <span className="news-source">{item.source}</span>
                {item.published && (
                  <span>{timeAgo(item.published)}</span>
                )}
              </div>
              {item.body && (
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, lineHeight: 1.4 }}>
                  {item.body}...
                </div>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
