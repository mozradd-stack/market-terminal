import React from 'react';

function getColor(value) {
  if (value <= 25) return '#f6465d';       // Extreme Fear
  if (value <= 45) return '#ff9800';       // Fear
  if (value <= 55) return '#f0b90b';       // Neutral
  if (value <= 75) return '#0ecb81';       // Greed
  return '#00e676';                         // Extreme Greed
}

function getArc(value) {
  // Returns SVG arc path for gauge
  const radius = 20;
  const cx = 28;
  const cy = 24;
  const startAngle = -180;
  const endAngle = startAngle + (value / 100) * 180;

  const toRad = deg => (deg * Math.PI) / 180;
  const startX = cx + radius * Math.cos(toRad(startAngle));
  const startY = cy + radius * Math.sin(toRad(startAngle));
  const endX = cx + radius * Math.cos(toRad(endAngle));
  const endY = cy + radius * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
}

export default function FearGreed({ fearGreed }) {
  if (!fearGreed) {
    return (
      <div className="fear-greed">
        <span className="fg-label" style={{ color: 'var(--text3)' }}>Fear & Greed</span>
        <span className="fg-value" style={{ color: 'var(--text3)' }}>—</span>
      </div>
    );
  }

  const value = parseInt(fearGreed.value);
  const color = getColor(value);
  const arcPath = getArc(value);

  return (
    <div className="fear-greed">
      {/* Gauge SVG */}
      <svg width="56" height="28" viewBox="0 0 56 28">
        {/* Background arc */}
        <path
          d={`M 8 24 A 20 20 0 0 1 48 24`}
          fill="none"
          stroke="var(--bg3)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Center text */}
        <text x="28" y="22" textAnchor="middle" fill={color} fontSize="9" fontWeight="700" fontFamily="monospace">
          {value}
        </text>
      </svg>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span className="fg-label" style={{ color: 'var(--text3)' }}>Fear & Greed</span>
        <span className="fg-classification" style={{ color, fontWeight: 700 }}>
          {fearGreed.value_classification}
        </span>
      </div>
    </div>
  );
}
