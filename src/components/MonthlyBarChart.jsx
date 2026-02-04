import { useState, useId, useEffect } from 'react';

const MONTH_LABELS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const MOBILE_BREAKPOINT = 768;

/**
 * Gráfico de barras verticales por mes.
 * data: Array<{ month: number, year: number, value: number, income?: number, expense?: number }>
 * value = altura de la barra (ej. gastos). income/expense = tooltip y barra seleccionada (rojo/verde).
 * highlightedMonth/Year = barra resaltada (mes seleccionado) → se rellena con % gastos (rojo) e ingresos (verde).
 * onBarClick(month, year) = al hacer clic en una barra.
 */
export default function MonthlyBarChart({
  data,
  currentMonth,
  currentYear,
  highlightedMonth,
  highlightedYear,
  height = 160,
  barColor = 'var(--accent)',
  barColorCurrent = 'var(--text)',
  onBarClick,
  formatValue = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n ?? 0),
}) {
  const gradientId = `bar-chart-${useId().replace(/:/g, '')}`;
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [isWide, setIsWide] = useState(typeof window !== 'undefined' && window.innerWidth >= MOBILE_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsWide(window.innerWidth >= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const highlightMonth = highlightedMonth ?? currentMonth;
  const highlightYear = highlightedYear ?? currentYear;

  if (!data || data.length === 0) return null;

  const padding = { top: 16, right: 8, bottom: 44, left: 8 };
  const w = isWide
    ? Math.max(1200, data.length * 90)
    : Math.max(320, data.length * 28);
  const h = height;
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;

  const MIN_BAR_HEIGHT = 10;
  const values = data.map((d) => d.value);
  const maxV = Math.max(...values, 1);
  const getBarHeight = (value) => {
    if (maxV > 0 && value > 0) return Math.max(MIN_BAR_HEIGHT, (value / maxV) * innerH);
    return MIN_BAR_HEIGHT;
  };

  const barWidth = Math.max(4, (innerW / data.length) * (isWide ? 0.65 : 0.55));
  const gap = innerW / data.length;
  const barX = (i) => padding.left + gap * i + (gap - barWidth) / 2;

  const yearsToShow = [];
  let lastYear = null;
  data.forEach((d, i) => {
    if (d.year !== lastYear) {
      lastYear = d.year;
      yearsToShow.push({ year: d.year, index: i });
    }
  });

  const hovered = hoveredIndex != null ? data[hoveredIndex] : null;

  return (
    <div style={{ width: '100%', overflowX: 'auto', position: 'relative' }} aria-hidden="true">
      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            top: 8,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{MONTH_LABELS[hovered.month - 1]} {hovered.year}</div>
          <div style={{ color: 'var(--expense)' }}>Gastos: {formatValue(hovered.expense)}</div>
          <div style={{ color: 'var(--income)' }}>Ingresos: {formatValue(hovered.income)}</div>
        </div>
      )}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ minWidth: isWide ? 800 : 300, maxWidth: '100%', width: isWide ? '100%' : '100%', height, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={barColor} stopOpacity="0.5" />
            <stop offset="100%" stopColor={barColor} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const isHighlighted = d.month === highlightMonth && d.year === highlightYear;
          const barHeight = getBarHeight(d.value);
          const y = padding.top + innerH - barHeight;
          const expense = Number(d.expense) || 0;
          const income = Number(d.income) || 0;
          const total = expense + income;
          const expenseRatio = total > 0 ? expense / total : 0.5;
          const incomeRatio = total > 0 ? income / total : 0.5;

          return (
            <g
              key={`${d.year}-${d.month}`}
              style={{ cursor: onBarClick ? 'pointer' : undefined }}
              onClick={() => onBarClick?.(d.month, d.year)}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isHighlighted && total > 0 ? (
                <>
                  <rect
                    x={barX(i)}
                    y={y + barHeight * incomeRatio}
                    width={barWidth}
                    height={barHeight * expenseRatio}
                    rx={2}
                    ry={2}
                    fill="var(--expense)"
                  />
                  <rect
                    x={barX(i)}
                    y={y}
                    width={barWidth}
                    height={barHeight * incomeRatio}
                    rx={2}
                    ry={2}
                    fill="var(--income)"
                  />
                </>
              ) : (
                <rect
                  x={barX(i)}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={2}
                  ry={2}
                  fill={isHighlighted ? barColorCurrent : `url(#${gradientId})`}
                />
              )}
            </g>
          );
        })}
        {data.map((d, i) => (
          <text
            key={`label-${d.year}-${d.month}`}
            x={padding.left + gap * i + gap / 2}
            y={h - 28}
            textAnchor="middle"
            fontSize="10"
            fill="var(--text-muted)"
          >
            {MONTH_LABELS[d.month - 1].slice(0, 3)}
          </text>
        ))}
        {yearsToShow.map(({ year, index }) => (
          <text
            key={year}
            x={padding.left + gap * index + gap / 2}
            y={h - 8}
            textAnchor="middle"
            fontSize="9"
            fill="var(--text-muted)"
          >
            {year}
          </text>
        ))}
      </svg>
    </div>
  );
}
