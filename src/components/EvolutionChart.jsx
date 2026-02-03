import { useId } from 'react';

/**
 * Gráfico de línea: evolución del valor en el tiempo (por fechas).
 * Sin dependencias; SVG puro.
 * @param {{ data: Array<{ date: string, value: number }>, formatValue: (n: number) => string, height?: number, currencyLabel?: string }} props
 */
export default function EvolutionChart({ data, formatValue, height = 200, currencyLabel = '€' }) {
  const gradientId = `evolution-${useId().replace(/:/g, '')}`;
  if (!data || data.length === 0) return null;

  const padding = { top: 12, right: 12, bottom: 28, left: 56 };
  const width = 100; // porcentaje del contenedor
  const w = 400;
  const h = height;
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const yMin = minV - range * 0.05;
  const yMax = maxV + range * 0.05;
  const yRange = yMax - yMin;

  const scaleY = (v) => padding.top + innerH - ((v - yMin) / yRange) * innerH;
  const scaleX = (i) => padding.left + (i / Math.max(1, data.length - 1)) * innerW;

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(d.value)}`).join(' ');
  const areaPath = `M ${padding.left},${h - padding.bottom} L ${data.map((d, i) => `${scaleX(i)},${scaleY(d.value)}`).join(' L ')} L ${w - padding.right},${h - padding.bottom} Z`;
  const first = data[0];
  const last = data[data.length - 1];

  return (
    <div style={{ width: '100%', maxWidth: 480, marginBottom: '1rem' }} aria-hidden="true">
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>
        Evolución del valor
      </p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: height, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Eje Y: etiquetas min y max */}
        <text x={padding.left - 6} y={padding.top} textAnchor="end" fontSize="10" fill="var(--text-muted)">
          {formatValue(yMax)}
        </text>
        <text x={padding.left - 6} y={h - padding.bottom} textAnchor="end" fontSize="10" fill="var(--text-muted)">
          {formatValue(yMin)}
        </text>
        {/* Línea horizontal inferior */}
        <line x1={padding.left} y1={h - padding.bottom} x2={w - padding.right} y2={h - padding.bottom} stroke="var(--border)" strokeWidth="1" />
        {/* Área bajo la curva */}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        {/* Línea de evolución */}
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Puntos en primer y último */}
        <circle cx={scaleX(0)} cy={scaleY(first.value)} r="4" fill="var(--accent)" />
        <circle cx={scaleX(data.length - 1)} cy={scaleY(last.value)} r="4" fill="var(--accent)" />
        {/* Fechas en eje X */}
        <text x={padding.left} y={h - 6} textAnchor="start" fontSize="9" fill="var(--text-muted)">
          {first.date}
        </text>
        <text x={w - padding.right} y={h - 6} textAnchor="end" fontSize="9" fill="var(--text-muted)">
          {last.date}
        </text>
      </svg>
    </div>
  );
}
