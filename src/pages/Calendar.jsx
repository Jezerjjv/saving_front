import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import Loader from '../components/Loader';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const currentYear = new Date().getFullYear();

function formatBalance(balance) {
  const n = Number(balance);
  const prefix = n >= 0 ? '+' : '';
  return prefix + new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR', signDisplay: 'never' }).format(n);
}

export default function Calendar() {
  const [year, setYear] = useState(currentYear);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.transactions
      .monthlySummary(year)
      .then((data) => setSummary(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <div className="page-calendar">
      <h1 style={styles.title}>Calendario</h1>
      <p style={styles.subtitle}>Elige un mes para ver los movimientos. El saldo muestra ingresos − gastos.</p>

      <div style={styles.yearNav}>
        <button
          type="button"
          onClick={() => setYear((y) => y - 1)}
          className="nav-month-btn"
          aria-label="Año anterior"
        >
          ‹
        </button>
        <span style={styles.yearLabel}>{year}</span>
        <button
          type="button"
          onClick={() => setYear((y) => y + 1)}
          className="nav-month-btn"
          aria-label="Año siguiente"
        >
          ›
        </button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="calendar-year" style={styles.grid}>
          {(summary.length ? summary : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, year, income: 0, expense: 0, balance: 0 }))).map((row) => (
            <Link
              key={row.month}
              to={`/movimientos?month=${row.month}&year=${year}`}
              className="calendar-month-btn"
              style={styles.monthCard}
            >
              <span style={styles.monthName}>{MONTHS[row.month - 1]}</span>
              <span style={{ ...styles.monthBalance, color: row.balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {formatBalance(row.balance)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 600 },
  subtitle: { color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' },
  yearNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.25rem',
    marginBottom: '1.5rem',
  },
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
  loading: { color: 'var(--text-muted)' },
  grid: { marginTop: '0.5rem' },
  monthCard: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center', textAlign: 'center' },
  monthName: { fontSize: '0.95rem', fontWeight: 500 },
  monthBalance: { fontSize: '1rem', fontWeight: 700 },
};
