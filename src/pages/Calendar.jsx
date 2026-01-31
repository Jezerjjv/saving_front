import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Loader from '../components/Loader';
import { useLayoutHeader } from '../context/LayoutHeaderContext';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

function formatBalance(balance) {
  const n = Number(balance);
  const prefix = n >= 0 ? '+' : '';
  return prefix + new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR', signDisplay: 'never' }).format(n);
}

/** Devuelve una matriz de semanas: cada semana es un array de 7 valores (día 1-31 o null) */
function getMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const daysInMonth = last.getDate();
  const firstWeekday = (first.getDay() + 6) % 7;
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) lastWeek.push(null);
  return weeks;
}

export default function Calendar() {
  useLayoutHeader('Calendario');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [viewMode, setViewMode] = useState('year');
  const [summary, setSummary] = useState([]);
  const [dailyIndicators, setDailyIndicators] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.transactions.monthlySummary(year),
      api.transactions.dailyIndicators(year),
    ])
      .then(([summaryData, indicatorsData]) => {
        setSummary(Array.isArray(summaryData) ? summaryData : []);
        setDailyIndicators(Array.isArray(indicatorsData) ? indicatorsData : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  /** Mapa (month -> day -> { hasIncome, hasExpense }) para búsqueda rápida */
  const indicatorsByMonthDay = useMemo(() => {
    const map = {};
    for (const d of dailyIndicators) {
      if (!map[d.month]) map[d.month] = {};
      map[d.month][d.day] = { hasIncome: d.hasIncome, hasExpense: d.hasExpense };
    }
    return map;
  }, [dailyIndicators]);

  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month]);
  const monthSummary = summary.find((r) => r.month === month && r.year === year);
  const allMonthGrids = useMemo(() => MONTHS.map((_, i) => getMonthGrid(year, i + 1)), [year]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const prevYear = () => setYear((y) => y - 1);
  const nextYear = () => setYear((y) => y + 1);

  const today = currentDate.getDate();
  const currentMonthNum = currentDate.getMonth() + 1;
  const isToday = (d, m, y) => d === today && m === currentMonthNum && y === currentYear;

  const getDayIndicators = (m, day) => indicatorsByMonthDay[m]?.[day] ?? { hasIncome: false, hasExpense: false };

  const renderMonthGrid = (monthNum, compact = false) => {
    const grid = compact ? allMonthGrids[monthNum - 1] : monthGrid;
    const y = compact ? year : year;
    const m = monthNum;
    return (
      <table
        className={`calendar-month-grid ${compact ? 'calendar-month-grid--mini' : ''}`}
        role="grid"
        aria-label={`Calendario ${MONTHS[m - 1]} ${y}`}
      >
        <thead>
          <tr>
            {WEEKDAYS.map((wd) => (
              <th key={wd} scope="col" className="calendar-weekday">{wd}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.map((week, wi) => (
            <tr key={wi}>
              {week.map((day, di) => {
                const ind = day != null ? getDayIndicators(m, day) : null;
                return (
                  <td key={di} className="calendar-day-cell">
                    <div className="calendar-day-inner">
                      {day == null ? (
                        <span className="calendar-day calendar-day-empty" />
                      ) : (
                        <>
                          <Link
                            to={`/movimientos?month=${m}&year=${y}&day=${day}`}
                            className={`calendar-day ${isToday(day, m, y) ? 'calendar-day-today' : ''}`}
                            aria-label={`${day} ${MONTHS[m - 1]} ${y}`}
                          >
                            {day}
                          </Link>
                          {(ind.hasIncome || ind.hasExpense) && (
                            <div className="calendar-day-dots-wrap" aria-hidden title={ind.hasIncome && ind.hasExpense ? 'Ingresos y gastos' : ind.hasIncome ? 'Ingresos' : 'Gastos'}>
                              {ind.hasIncome && ind.hasExpense ? (
                                <>
                                  <span className="calendar-day-dot calendar-day-dot--income" />
                                  <span className="calendar-day-dot calendar-day-dot--expense" />
                                </>
                              ) : ind.hasIncome ? (
                                <span className="calendar-day-dots calendar-day-dots--income">
                                  <span className="calendar-day-dot" /><span className="calendar-day-dot" />
                                </span>
                              ) : (
                                <span className="calendar-day-dots calendar-day-dots--expense">
                                  <span className="calendar-day-dot" /><span className="calendar-day-dot" />
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="page-calendar">
      <p style={styles.subtitle}>
        {viewMode === 'year' ? 'Todo el año de un vistazo. Haz clic en un día para ver sus movimientos.' : 'Todos los días del mes. Haz clic en un día para ver sus movimientos.'}
      </p>

      <div className="page-defs-tabs calendar-view-tabs" role="tablist" aria-label="Vista mes o año">
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'month'}
          className={`page-defs-tab ${viewMode === 'month' ? 'is-active' : ''}`}
          onClick={() => setViewMode('month')}
        >
          Mes actual
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewMode === 'year'}
          className={`page-defs-tab ${viewMode === 'year' ? 'is-active' : ''}`}
          onClick={() => setViewMode('year')}
        >
          Todo el año
        </button>
      </div>

      {viewMode === 'month' && (
        <div className="nav-month" style={styles.navMonth}>
          <button type="button" onClick={prevMonth} className="nav-month-btn" aria-label="Mes anterior">‹</button>
          <div style={styles.monthYear}>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={styles.select} aria-label="Mes">
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={styles.select} aria-label="Año">
              {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={nextMonth} className="nav-month-btn" aria-label="Mes siguiente">›</button>
        </div>
      )}

      {viewMode === 'year' && (
        <div className="nav-month" style={styles.navMonth}>
          <button type="button" onClick={prevYear} className="nav-month-btn" aria-label="Año anterior">‹</button>
          <span style={styles.yearLabel}>{year}</span>
          <button type="button" onClick={nextYear} className="nav-month-btn" aria-label="Año siguiente">›</button>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : viewMode === 'month' ? (
        <>
          <div className="calendar-month-grid-wrap">
            {renderMonthGrid(month, false)}
          </div>
          {monthSummary != null && (
            <p style={styles.monthBalance}>
              Saldo de {MONTHS[month - 1]} {year}:{' '}
              <span style={{ color: monthSummary.balance >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                {formatBalance(monthSummary.balance)}
              </span>
            </p>
          )}
        </>
      ) : (
        <div className="calendar-year-grid">
          {MONTHS.map((monthName, i) => {
            const monthNum = i + 1;
            const rowSummary = summary.find((r) => r.month === monthNum && r.year === year);
            return (
              <section key={monthNum} className="calendar-year-month">
                {rowSummary != null && (rowSummary.income !== 0 || rowSummary.expense !== 0) && (
                  <div className="calendar-year-month-totals">
                    <span className="calendar-year-income" style={{ color: 'var(--income)' }}>
                      {formatBalance(rowSummary.income)}
                    </span>
                    <span className="calendar-year-expense" style={{ color: 'var(--expense)' }}>
                      {formatBalance(-rowSummary.expense)}
                    </span>
                  </div>
                )}
                <Link to={`/movimientos?month=${monthNum}&year=${year}`} className="calendar-year-month-title">
                  {monthName} {year}
                </Link>
                <div className="calendar-month-grid-wrap calendar-month-grid-wrap--mini">
                  {renderMonthGrid(monthNum, true)}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  subtitle: { color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem', textAlign: 'center' },
  navMonth: { marginBottom: '1rem', width: '100%' },
  monthYear: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
  yearLabel: {
    padding: '0.5rem 1rem',
    minWidth: '4rem',
    minHeight: 'var(--touch-min)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text)',
  },
  select: {
    padding: '0.5rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    minHeight: 'var(--touch-min)',
    fontFamily: 'inherit',
    cursor: 'pointer',
  },
  monthBalance: { marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' },
  link: { color: 'var(--accent)' },
};
