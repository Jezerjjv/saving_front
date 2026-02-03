import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import Loader from '../components/Loader';
import EvolutionChart from '../components/EvolutionChart';
import { IconEdit, IconTrash, IconHistory } from '../components/Icons.jsx';

const CRYPTO_SYMBOLS = [
  { id: 'bitcoin', label: 'Bitcoin (BTC)' },
  { id: 'ethereum', label: 'Ethereum (ETH)' },
  { id: 'cardano', label: 'Cardano (ADA)' },
  { id: 'solana', label: 'Solana (SOL)' },
  { id: 'ripple', label: 'Ripple (XRP)' },
  { id: 'polkadot', label: 'Polkadot (DOT)' },
  { id: 'dogecoin', label: 'Dogecoin (DOGE)' },
  { id: 'avalanche-2', label: 'Avalanche (AVAX)' },
  { id: 'chainlink', label: 'Chainlink (LINK)' },
  { id: 'polygon-ecosystem-token', label: 'Polygon (POL)' },
];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TAB_POSICIONES = 'posiciones';
const TAB_HISTORIAL = 'historial';

const styles = {
  tabs: { display: 'flex', gap: 0, marginBottom: '1rem', borderBottom: '1px solid var(--border)' },
  tab: { padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: '3px solid transparent', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.95rem', cursor: 'pointer' },
  tabActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)' },

  section: { marginBottom: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1.05rem', marginBottom: '0.2rem' },
  hint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' },
  addRow: { marginBottom: '1rem' },
  tableCard: {
    maxWidth: 720,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflowX: 'auto',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  table: { width: '100%', minWidth: 460, borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem' },
  thActions: { textAlign: 'right', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem', width: 120 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.4rem 0.6rem', fontSize: '0.9rem' },
  tdActions: { padding: '0.25rem 0.6rem', textAlign: 'right', display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' },
  tableEmpty: { padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 },
  btnPrimary: { padding: '0.4rem 0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem' },
  btnSecondary: { padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem' },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', maxWidth: 420, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
  modalTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 },
  modalField: { marginBottom: '0.75rem' },
  modalLabel: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  modalInput: { width: '100%' },
  modalActions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
  filters: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' },
  filterGroup: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
  filterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  amountPositive: { color: 'var(--income)', fontWeight: 500 },
  amountNegative: { color: 'var(--expense)', fontWeight: 500 },
  portfolioList: { display: 'flex', flexDirection: 'column', gap: 0, maxWidth: 720 },
  portfolioRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.9rem 1rem',
    background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
    cursor: 'pointer', minHeight: 56,
  },
  portfolioRowFirst: { borderTopLeftRadius: 'var(--radius-card)', borderTopRightRadius: 'var(--radius-card)' },
  portfolioRowLast: { borderBottom: '1px solid var(--border)', borderBottomLeftRadius: 'var(--radius-card)', borderBottomRightRadius: 'var(--radius-card)' },
  portfolioRowLeft: { flex: 1, minWidth: 0 },
  portfolioRowTitle: { fontWeight: 600, fontSize: '1rem', marginBottom: '0.2rem' },
  portfolioRowSub: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  portfolioRowGp: { fontWeight: 600, fontSize: '1rem', flexShrink: 0 },
  portfolioTotalRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem',
    background: 'var(--bg)', border: '1px solid var(--border)', borderTop: 'none',
    borderRadius: '0 0 var(--radius-card) var(--radius-card)', marginTop: -1, maxWidth: 720,
  },
  detailModal: { maxWidth: 440, width: '100%' },
  detailHeader: { padding: '1rem 1.25rem', background: 'var(--bg)', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-card) var(--radius-card) 0 0' },
  detailHeaderTitle: { fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.25rem' },
  detailPrice: { fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 },
  detailBlock: { padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
  detailLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' },
  detailValue: { fontSize: '1.05rem', fontWeight: 500 },
  detailActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '1rem 1.25rem' },
  detailBtn: { flex: 1, minWidth: 120, padding: '0.6rem 1rem', borderRadius: 'var(--radius)', border: 'none', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' },
};

function getSymbolLabel(id) {
  return CRYPTO_SYMBOLS.find((s) => s.id === id)?.label ?? id;
}

function getSymbolShort(id) {
  const label = CRYPTO_SYMBOLS.find((s) => s.id === id)?.label;
  const match = label?.match(/\(([A-Z0-9]+)\)/);
  return match ? match[1] : (id?.toUpperCase?.()?.slice(0, 4) ?? id);
}

export default function Cryptos() {
  useLayoutHeader('Criptomonedas');
  const { showMessage, confirm } = useMessage();
  const { exchangeRateUsdToEur, appCurrency } = useAppSettings();
  const rate = Number(exchangeRateUsdToEur) || 0.92;
  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ symbol: 'bitcoin', amountInvested: '', priceBought: '', currency: 'EUR' });
  const [historyHolding, setHistoryHolding] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [tab, setTab] = useState(TAB_POSICIONES);
  const [dailyClose, setDailyClose] = useState([]);
  const [historialYear, setHistorialYear] = useState(currentYear);
  const [historialMonth, setHistorialMonth] = useState(currentMonth);
  const [detailHolding, setDetailHolding] = useState(null);

  const allUsdt = holdings.length > 0 && holdings.every((h) => h.currency === 'USDT');
  const allUsd = holdings.length > 0 && holdings.every((h) => h.currency === 'USD');
  const allEur = holdings.length > 0 && holdings.every((h) => h.currency === 'EUR');
  const summaryCurrency = allUsdt ? 'USDT' : allUsd ? 'USD' : allEur ? 'EUR' : (appCurrency === 'USD' ? 'USD' : 'EUR');
  const summaryLabel = summaryCurrency === 'USDT' ? 'USDT' : (summaryCurrency === 'USD' ? '$' : '€');

  const loadHoldings = () => {
    setLoading(true);
    api.crypto.holdings
      .list()
      .then((list) => {
        setHoldings(Array.isArray(list) ? list : []);
        const symbols = [...new Set((list || []).map((h) => h.symbol))];
        if (symbols.length > 0) {
          return api.crypto.prices(symbols).then((p) => {
            setPrices(typeof p === 'object' && p !== null ? p : {});
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setHoldings([]);
        setPrices({});
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHoldings();
  }, []);

  const loadDailyClose = () => {
    api.crypto
      .dailyClose(historialYear, historialMonth === null ? undefined : historialMonth)
      .then((data) => setDailyClose(Array.isArray(data) ? data : []))
      .catch(() => setDailyClose([]));
  };

  useEffect(() => {
    if (tab === TAB_HISTORIAL) loadDailyClose();
  }, [tab, historialYear, historialMonth]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ symbol: 'bitcoin', amountInvested: '', priceBought: '', currency: 'EUR' });
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setForm({
      symbol: h.symbol,
      amountInvested: String(h.amountInvested ?? ''),
      priceBought: String(h.priceBought ?? ''),
      currency: h.currency || 'EUR',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ symbol: 'bitcoin', amountInvested: '', priceBought: '', currency: 'EUR' });
  };

  const openHistory = (h) => {
    setHistoryHolding(h);
    setHistoryList([]);
    setHistoryLoading(true);
    api.crypto.holdings
      .dailyHistory(h.id, currentYear, null)
      .then((list) => setHistoryList(Array.isArray(list) ? list : []))
      .catch(() => setHistoryList([]))
      .finally(() => setHistoryLoading(false));
  };

  const closeHistory = () => {
    setHistoryHolding(null);
    setHistoryList([]);
  };

  const saveHolding = async (e) => {
    e.preventDefault();
    const amountInvested = Number(form.amountInvested);
    const priceBought = Number(form.priceBought);
    if (!priceBought || priceBought <= 0) {
      showMessage('Precio de compra debe ser mayor que 0.', 'error');
      return;
    }
    try {
      if (editingId) {
        await api.crypto.holdings.update(editingId, {
          symbol: form.symbol,
          amountInvested,
          priceBought,
          currency: form.currency,
        });
        showMessage('Posición actualizada.', 'success');
      } else {
        await api.crypto.holdings.create({
          symbol: form.symbol,
          amountInvested,
          priceBought,
          currency: form.currency,
        });
        showMessage('Posición creada.', 'success');
      }
      closeModal();
      loadHoldings();
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const removeHolding = (id) => {
    confirm({
      title: 'Eliminar posición',
      message: '¿Eliminar esta posición de cripto?',
      onConfirm: async () => {
        try {
          await api.crypto.holdings.delete(id);
          loadHoldings();
          showMessage('Posición eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const totalInvestedEur = holdings.reduce((sum, h) => {
    const inv = Number(h.amountInvested) || 0;
    return sum + (h.currency === 'EUR' ? inv : inv * rate);
  }, 0);
  const totalInvestedUsd = holdings.reduce((sum, h) => {
    const inv = Number(h.amountInvested) || 0;
    return sum + (h.currency === 'EUR' ? inv / rate : inv);
  }, 0);

  const fmtEur = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
  const fmtUsd = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(n ?? 0);
  const fmtUsdt = (n) => new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0) + ' USDT';

  const isUsdLike = (c) => c === 'USD' || c === 'USDT';
  const summaryFmt = summaryCurrency === 'USDT' ? fmtUsdt : (summaryCurrency === 'USD' ? fmtUsd : fmtEur);
  const summaryTotalInvested = summaryCurrency === 'EUR' ? totalInvestedEur : totalInvestedUsd;

  // Total G/P = suma de positivos menos negativos (cada fila en su moneda, luego convertida)
  const { totalGainLossUsd, totalGainLossEur } = holdings.reduce(
    (acc, h) => {
      const p = prices[h.symbol];
      const currentEur = p ? h.amountCoins * p.priceEur : null;
      const currentUsd = p ? h.amountCoins * p.priceUsd : null;
      const isEur = h.currency === 'EUR';
      const rowGainLoss = isEur
        ? (currentEur != null ? currentEur - h.amountInvested : 0)
        : (currentUsd != null ? currentUsd - h.amountInvested : 0);
      return {
        totalGainLossUsd: acc.totalGainLossUsd + (isEur ? rowGainLoss / rate : rowGainLoss),
        totalGainLossEur: acc.totalGainLossEur + (isEur ? rowGainLoss : rowGainLoss * rate),
      };
    },
    { totalGainLossUsd: 0, totalGainLossEur: 0 }
  );

  if (loading) return <Loader />;

  return (
    <div className="page-cryptos">
      <div style={styles.tabs}>
        <button
          type="button"
          style={{ ...styles.tab, ...(tab === TAB_POSICIONES ? styles.tabActive : {}) }}
          onClick={() => setTab(TAB_POSICIONES)}
          aria-pressed={tab === TAB_POSICIONES}
        >
          Posiciones
        </button>
        <button
          type="button"
          style={{ ...styles.tab, ...(tab === TAB_HISTORIAL ? styles.tabActive : {}) }}
          onClick={() => setTab(TAB_HISTORIAL)}
          aria-pressed={tab === TAB_HISTORIAL}
        >
          Historial cierres
        </button>
      </div>

      {tab === TAB_POSICIONES && (
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.subtitle}>Posiciones</h2>
            <p style={styles.hint}>
              Los precios actuales se obtienen de CoinGecko; si hay límite de peticiones se usa el último valor guardado. Pulsa &quot;Refrescar precios&quot; para actualizar.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={openAdd} style={styles.btnPrimary}>
              + Añadir
            </button>
            {holdings.length > 0 && (
              <button type="button" onClick={() => { setLoading(true); loadHoldings(); }} style={styles.btnSecondary} title="Actualizar precios desde CoinGecko">
                Refrescar precios
              </button>
            )}
          </div>
        </div>

        {holdings.length > 0 && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: 360 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Invertido (aprox. {summaryLabel})</span>
              <span style={{ fontWeight: 600 }}>{summaryFmt(summaryTotalInvested)}</span>
            </div>
          </div>
        )}

        <div style={styles.portfolioList}>
          {holdings.length === 0 ? (
            <div style={{ ...styles.tableCard, padding: '1.5rem' }}>
              <p style={styles.tableEmpty}>
                No hay posiciones. Haz clic en &quot;+ Añadir&quot; e indica la moneda, dinero invertido y precio al que compraste.
              </p>
            </div>
          ) : (
            <>
              {holdings.map((h, index) => {
                const p = prices[h.symbol];
                const currentEur = p ? h.amountCoins * p.priceEur : null;
                const currentUsd = p ? h.amountCoins * p.priceUsd : null;
                const isEur = h.currency === 'EUR';
                const gainLoss = isEur
                  ? (currentEur != null ? currentEur - h.amountInvested : null)
                  : (currentUsd != null ? currentUsd - h.amountInvested : null);
                const rowFmt = isEur ? fmtEur : (h.currency === 'USDT' ? fmtUsdt : fmtUsd);
                const short = getSymbolShort(h.symbol);
                const pair = h.currency === 'USDT' ? `${short}/USDT` : (h.currency === 'USD' ? `${short}/USD` : `${short}/EUR`);
                const isFirst = index === 0;
                const isLast = index === holdings.length - 1;
                return (
                  <div
                    key={h.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailHolding(h)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailHolding(h); } }}
                    style={{
                      ...styles.portfolioRow,
                      ...(isFirst ? styles.portfolioRowFirst : {}),
                      ...(isLast ? styles.portfolioRowLast : {}),
                    }}
                  >
                    <div style={styles.portfolioRowLeft}>
                      <div style={styles.portfolioRowTitle}>{pair}</div>
                      <div style={styles.portfolioRowSub}>
                        {rowFmt(h.amountInvested)} · {h.amountCoins?.toFixed(6) ?? '—'} unidades
                      </div>
                    </div>
                    <div style={styles.portfolioRowGp}>
                      {gainLoss != null ? (
                        <span style={gainLoss >= 0 ? styles.amountPositive : styles.amountNegative}>
                          {gainLoss >= 0 ? '+' : ''}{rowFmt(gainLoss)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </div>
                  </div>
                );
              })}
              <div style={styles.portfolioTotalRow}>
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Total G/P</span>
                <span style={totalGainLossUsd >= 0 ? styles.amountPositive : styles.amountNegative}>
                  {totalGainLossUsd >= 0 ? '+' : ''}{fmtUsd(totalGainLossUsd)}
                  <span style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontWeight: 400 }}>·</span>
                  <span style={{ marginLeft: '0.35rem' }}>{totalGainLossEur >= 0 ? '+' : ''}{fmtEur(totalGainLossEur)}</span>
                </span>
              </div>
            </>
          )}
        </div>
      </section>
      )}

      {tab === TAB_HISTORIAL && (
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Historial de cierres diarios</h2>
        <p style={styles.hint}>
          Cada día a las 00:00 se registra el cierre del portfolio: valor total y ganancia o pérdida del día.
        </p>
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel} htmlFor="crypto-year">Año</label>
            <select
              id="crypto-year"
              value={historialYear}
              onChange={(e) => setHistorialYear(Number(e.target.value))}
              className="select-modern"
              style={{ minWidth: '6rem' }}
            >
              {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel} htmlFor="crypto-month">Mes</label>
            <select
              id="crypto-month"
              value={historialMonth ?? 'all'}
              onChange={(e) => setHistorialMonth(e.target.value === 'all' ? null : Number(e.target.value))}
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
                <th style={styles.th}>Valor (€)</th>
                <th style={styles.th}>Valor ($)</th>
                <th style={styles.th}>G/P día (€)</th>
                <th style={styles.th}>G/P día ($)</th>
              </tr>
            </thead>
            <tbody>
              {dailyClose.map((row) => (
                <tr key={row.date} style={styles.tr}>
                  <td style={styles.td}>{row.date}</td>
                  <td style={styles.td}>{fmtEur(row.totalValueEur)}</td>
                  <td style={styles.td}>{fmtUsd(row.totalValueUsd)}</td>
                  <td style={styles.td}>
                    <span style={row.gainLossEur >= 0 ? styles.amountPositive : styles.amountNegative}>
                      {row.gainLossEur >= 0 ? '+' : ''}{fmtEur(row.gainLossEur)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={row.gainLossUsd >= 0 ? styles.amountPositive : styles.amountNegative}>
                      {row.gainLossUsd >= 0 ? '+' : ''}{fmtUsd(row.gainLossUsd)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {dailyClose.length === 0 && (
            <p style={styles.tableEmpty}>No hay cierres para el periodo seleccionado.</p>
          )}
        </div>
      </section>
      )}

      {detailHolding && (() => {
        const h = detailHolding;
        const p = prices[h.symbol];
        const currentEur = p ? h.amountCoins * p.priceEur : null;
        const currentUsd = p ? h.amountCoins * p.priceUsd : null;
        const isEur = h.currency === 'EUR';
        const rowFmt = isEur ? fmtEur : (h.currency === 'USDT' ? fmtUsdt : fmtUsd);
        const gainLoss = isEur
          ? (currentEur != null ? currentEur - h.amountInvested : null)
          : (currentUsd != null ? currentUsd - h.amountInvested : null);
        const currentPrice = isEur ? (p?.priceEur ?? 0) : (p?.priceUsd ?? 0);
        const pctReturn = h.amountInvested > 0 && gainLoss != null
          ? (gainLoss / h.amountInvested) * 100
          : null;
        const pair = h.currency === 'USDT' ? `${getSymbolShort(h.symbol)}/USDT` : (h.currency === 'USD' ? `${getSymbolShort(h.symbol)}/USD` : `${getSymbolShort(h.symbol)}/EUR`);
        return (
          <div style={styles.modalOverlay} onClick={() => setDetailHolding(null)} role="dialog" aria-modal="true" aria-labelledby="crypto-detail-title">
            <div style={{ ...styles.modalBox, ...styles.detailModal }} onClick={(e) => e.stopPropagation()} className="modal-panel">
              <div style={styles.detailHeader}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.35rem' }}>{pair}</div>
                <div style={styles.detailHeaderTitle}>Último precio · CoinGecko</div>
                <div id="crypto-detail-title" style={{ ...styles.detailPrice, marginBottom: 0 }}>
                  {currentPrice > 0 ? rowFmt(currentPrice) : '—'}
                </div>
              </div>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Invertido</div>
                <div style={styles.detailValue}>
                  {rowFmt(h.amountInvested)} ({h.amountCoins?.toFixed(6) ?? '—'} unidades)
                </div>
              </div>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Precio promedio de compra</div>
                <div style={styles.detailValue}>{rowFmt(h.priceBought)}</div>
              </div>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Rendimiento de la inversión</div>
                <div style={{ ...styles.detailValue, ...(pctReturn != null && pctReturn >= 0 ? styles.amountPositive : styles.amountNegative) }}>
                  {pctReturn != null ? `${pctReturn >= 0 ? '+' : ''}${pctReturn.toFixed(2)}%` : '—'}
                </div>
              </div>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Ganancias no realizadas</div>
                <div style={{ ...styles.detailValue, display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'baseline', ...(gainLoss != null && gainLoss >= 0 ? styles.amountPositive : styles.amountNegative) }}>
                  {gainLoss != null ? (
                    <>
                      <span>{gainLoss >= 0 ? '+' : ''}{fmtUsd(isEur ? gainLoss / rate : gainLoss)}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>·</span>
                      <span>{gainLoss >= 0 ? '+' : ''}{fmtEur(isEur ? gainLoss : gainLoss * rate)}</span>
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
              <div style={styles.detailActions}>
                <button
                  type="button"
                  style={{ ...styles.detailBtn, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  onClick={() => { setDetailHolding(null); openHistory(h); }}
                >
                  <IconHistory size={18} /> Histórico
                </button>
                <button type="button" style={{ ...styles.detailBtn, background: 'var(--accent)', color: 'white' }} onClick={() => { setDetailHolding(null); openEdit(h); }}>
                  <IconEdit size={18} /> Editar
                </button>
                <button type="button" style={{ ...styles.detailBtn, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)' }} onClick={() => { setDetailHolding(null); removeHolding(h.id); }}>
                  <IconTrash size={18} /> Eliminar
                </button>
              </div>
              <div style={{ padding: '0 1.25rem 1rem' }}>
                <button type="button" onClick={() => setDetailHolding(null)} style={styles.btnSecondary}>Cerrar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="crypto-modal-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="crypto-modal-title" style={styles.modalTitle}>{editingId ? 'Editar posición' : 'Nueva posición'}</h3>
            <form onSubmit={saveHolding}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Moneda</label>
                <select
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                  required
                >
                  {CRYPTO_SYMBOLS.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Dinero invertido</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amountInvested}
                  onChange={(e) => setForm((f) => ({ ...f, amountInvested: e.target.value }))}
                  className="input-modern"
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Precio de compra (por unidad)</label>
                <input
                  type="number"
                  step="0.00000001"
                  min="0.00000001"
                  value={form.priceBought}
                  onChange={(e) => setForm((f) => ({ ...f, priceBought: e.target.value }))}
                  className="input-modern"
                  style={styles.modalInput}
                  required
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Moneda del importe</label>
                <select
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dólar (USD)</option>
                  <option value="USDT">USDT</option>
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>{editingId ? 'Guardar' : 'Añadir'}</button>
                <button type="button" onClick={closeModal} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyHolding && (
        <div style={styles.modalOverlay} onClick={closeHistory} role="dialog" aria-modal="true" aria-labelledby="crypto-history-title">
          <div style={{ ...styles.modalBox, maxWidth: 520 }} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="crypto-history-title" style={styles.modalTitle}>
              Historial G/P diario — {getSymbolLabel(historyHolding.symbol)}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Una fila por día: beneficio (G/P) en USD y EUR al cierre. Diferencia = cambio respecto al día anterior (solo si hay datos de ese día). Hoy varía con el precio actual.
            </p>
            {historyLoading ? (
              <Loader />
            ) : (
              <>
                {(() => {
                  const h = historyHolding;
                  const isEur = h.currency === 'EUR';
                  const p = prices[h.symbol];
                  const investedEur = isEur ? h.amountInvested : h.amountInvested * rate;
                  const investedUsd = isEur ? h.amountInvested / rate : h.amountInvested;
                  const currentEur = p ? h.amountCoins * p.priceEur : investedEur;
                  const currentUsd = p ? h.amountCoins * p.priceUsd : investedUsd;
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const chartData = [
                    ...historyList.map((row) => ({
                      date: row.date,
                      value: isEur ? investedEur + row.gainLossEur : investedUsd + row.gainLossUsd,
                    })),
                    ...(historyList.length === 0 || historyList[historyList.length - 1]?.date !== todayStr
                      ? [{ date: todayStr, value: isEur ? currentEur : currentUsd }]
                      : []),
                  ].sort((a, b) => a.date.localeCompare(b.date));
                  return chartData.length > 0 ? (
                    <EvolutionChart
                      data={chartData}
                      formatValue={isEur ? fmtEur : fmtUsd}
                      currencyLabel={isEur ? '€' : 'USD'}
                    />
                  ) : null;
                })()}
                <div style={styles.tableCard}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Día</th>
                      <th style={styles.th}>Precio USD</th>
                      <th style={styles.th}>Precio EUR</th>
                      <th style={styles.th}>Diferencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const h = historyHolding;
                      const isEur = h.currency === 'EUR';
                      const p = prices[h.symbol];
                      const investedEur = isEur ? h.amountInvested : h.amountInvested * rate;
                      const investedUsd = isEur ? h.amountInvested / rate : h.amountInvested;
                      const todayStr = new Date().toISOString().slice(0, 10);
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      const yesterdayStr = yesterday.toISOString().slice(0, 10);
                      const prevRow = historyList.find((r) => r.date === yesterdayStr)
                        || (historyList.length > 0 && historyList[0].date < todayStr ? historyList[0] : null);
                      const glHoy = isEur
                        ? (p ? h.amountCoins * p.priceEur - investedEur : 0)
                        : (p ? h.amountCoins * p.priceUsd - investedUsd : 0);
                      const precioUsdHoy = isEur ? glHoy / rate : glHoy;
                      const precioEurHoy = isEur ? glHoy : glHoy * rate;
                      const prevGl = prevRow ? (isEur ? prevRow.gainLossEur : prevRow.gainLossUsd) : 0;
                      const dailyToday = glHoy - prevGl;
                      const dailyUsdToday = isEur ? dailyToday / rate : dailyToday;
                      const dailyEurToday = isEur ? dailyToday : dailyToday * rate;
                      const signToday = dailyToday >= 0;
                      return (
                        <>
                          <tr style={styles.tr}>
                            <td style={styles.td}>Hoy</td>
                            <td style={styles.td}>{precioUsdHoy >= 0 ? '+' : ''}{fmtUsd(precioUsdHoy)}</td>
                            <td style={styles.td}>{precioEurHoy >= 0 ? '+' : ''}{fmtEur(precioEurHoy)}</td>
                            <td style={styles.td}>
                              {prevRow ? (
                                <span style={signToday ? styles.amountPositive : styles.amountNegative}>
                                  {signToday ? '+' : ''}{fmtUsd(dailyUsdToday)} / {signToday ? '+' : ''}{fmtEur(dailyEurToday)}
                                </span>
                              ) : '—'}
                            </td>
                          </tr>
                          {historyList.map((row, index) => {
                            const hasPrevDay = index < historyList.length - 1;
                            const gl = isEur ? row.gainLossEur : row.gainLossUsd;
                            const precioUsd = isEur ? gl / rate : gl;
                            const precioEur = isEur ? gl : gl * rate;
                            const daily = isEur ? row.dailyEur : row.dailyUsd;
                            const dailyUsd = isEur ? daily / rate : daily;
                            const dailyEur = isEur ? daily : daily * rate;
                            const sign = daily >= 0;
                            return (
                              <tr key={row.date} style={styles.tr}>
                                <td style={styles.td}>{row.date}</td>
                                <td style={styles.td}>{precioUsd >= 0 ? '+' : ''}{fmtUsd(precioUsd)}</td>
                                <td style={styles.td}>{precioEur >= 0 ? '+' : ''}{fmtEur(precioEur)}</td>
                                <td style={styles.td}>
                                  {hasPrevDay ? (
                                    <span style={sign ? styles.amountPositive : styles.amountNegative}>
                                      {sign ? '+' : ''}{fmtUsd(dailyUsd)} / {sign ? '+' : ''}{fmtEur(dailyEur)}
                                    </span>
                                  ) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
                {historyList.length === 0 && (
                  <p style={styles.tableEmpty}>Aún no hay cierres diarios para esta posición. Se registrarán al pasar las 00:00.</p>
                )}
              </div>
              </>
            )}
            <div style={{ ...styles.modalActions, borderTop: 'none', paddingTop: '0.5rem' }}>
              <button type="button" onClick={closeHistory} style={styles.btnSecondary}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
