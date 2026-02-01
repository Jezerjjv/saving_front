import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useAppSettings } from '../context/AppSettingsContext';
import Loader from '../components/Loader';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const styles = {
  filters: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
  filterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  section: { marginBottom: '1.5rem' },
  sectionHeader: { marginBottom: '0.5rem' },
  subtitle: { fontSize: '1.05rem', marginBottom: '0.2rem' },
  hint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' },
  tableCard: {
    maxWidth: 720,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflowX: 'auto',
    overflowY: 'visible',
    WebkitOverflowScrolling: 'touch',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  table: { width: '100%', minWidth: 420, borderCollapse: 'collapse', background: 'var(--surface)' },
  th: { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem' },
  thImporte: { textAlign: 'center', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem' },
  thSub: { textAlign: 'center', padding: '0.2rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 500, fontSize: '0.8rem', color: 'var(--text-muted)' },
  thSubEmpty: { padding: '0.2rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontSize: '0.8rem' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.4rem 0.6rem', fontSize: '0.9rem' },
  tdAmount: { padding: '0.4rem 0.6rem', fontSize: '0.9rem', textAlign: 'center' },
  tableEmpty: { padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 },
  notEligible: { padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', color: 'var(--text-muted)', textAlign: 'center' },
  amountPositive: { color: 'var(--income)', fontWeight: 500 },
};

export default function Intereses() {
  useLayoutHeader('Intereses');
  const { exchangeRateUsdToEur } = useAppSettings();
  const rate = Number(exchangeRateUsdToEur) || 0.92;
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const [year, setYearState] = useState(yearParam ? Number(yearParam) : currentYear);
  const [month, setMonthState] = useState(monthParam === 'all' || monthParam === '' ? null : (monthParam ? Number(monthParam) : currentMonth));
  const [eligible, setEligible] = useState(true);
  const [history, setHistory] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const setYear = (y) => {
    setYearState(y);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('year', String(y));
      if (month != null) next.set('month', String(month)); else next.delete('month');
      return next;
    });
  };

  const setMonth = (m) => {
    setMonthState(m);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('year', String(year));
      if (m != null) next.set('month', String(m)); else next.delete('month');
      return next;
    });
  };

  useEffect(() => {
    if (yearParam) setYearState(Number(yearParam));
    if (monthParam === 'all' || monthParam === '') setMonthState(null);
    else if (monthParam) setMonthState(Number(monthParam));
  }, [yearParam, monthParam]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.interestHistory.get(year, month ?? undefined),
      api.accounts.list(),
    ])
      .then(([data, a]) => {
        setEligible(data?.eligible ?? false);
        setHistory(Array.isArray(data?.history) ? data.history : []);
        setAccounts(Array.isArray(a) ? a : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month]);

  const getAccountName = (id) => (accounts || []).find((a) => a.id === id)?.name ?? String(id);
  const getAccountCurrency = (id) => (accounts || []).find((a) => a.id === id)?.currency ?? 'EUR';
  const toEur = (amount, currency) => (currency === 'USD' ? amount * rate : amount);
  const toUsd = (amount, currency) => (currency === 'EUR' ? amount / rate : amount);

  if (loading) return <Loader />;

  if (!eligible) {
    return (
      <div className="page-intereses">
        <div style={styles.notEligible}>
          No tienes cuentas con producto de tipo interés. El historial de intereses se muestra cuando alguna cuenta tiene un producto con interés configurado.
        </div>
      </div>
    );
  }

  return (
    <div className="page-intereses">
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.subtitle}>Historial de intereses</h2>
          <p style={styles.hint}>
            Ingresos por intereses diarios aplicados al saldo de las cuentas con producto de tipo interés. No se muestran como movimientos para no duplicar el saldo.
          </p>
        </div>

        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel} htmlFor="intereses-year">Año</label>
            <select
              id="intereses-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="select-modern"
              style={{ minWidth: '6rem' }}
            >
              {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel} htmlFor="intereses-month">Mes</label>
            <select
              id="intereses-month"
              value={month ?? 'all'}
              onChange={(e) => setMonth(e.target.value === 'all' ? null : Number(e.target.value))}
              className="select-modern"
              style={{ minWidth: '8rem' }}
            >
              <option value="all">Todos</option>
              {MONTHS.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Cuenta</th>
                <th style={styles.thImporte} colSpan={2}>Importe</th>
              </tr>
              <tr>
                <th style={styles.thSubEmpty} aria-hidden />
                <th style={styles.thSubEmpty} aria-hidden />
                <th style={styles.thSub}>$</th>
                <th style={styles.thSub}>€</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row, idx) => {
                const currency = getAccountCurrency(row.accountId);
                const amountEur = toEur(row.amount, currency);
                const amountUsd = toUsd(row.amount, currency);
                return (
                  <tr key={`${row.date}-${row.accountId}-${idx}`} style={styles.tr}>
                    <td style={styles.td}>{row.date}</td>
                    <td style={styles.td}>{getAccountName(row.accountId)}</td>
                    <td style={styles.tdAmount}>
                      <span style={styles.amountPositive}>
                        +{new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(amountUsd)}
                      </span>
                    </td>
                    <td style={styles.tdAmount}>
                      <span style={styles.amountPositive}>
                        +{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(amountEur)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {history.length === 0 && (
            <p style={styles.tableEmpty}>
              No hay registros de intereses para el periodo seleccionado.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
