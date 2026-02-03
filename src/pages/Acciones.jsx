import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconHistory } from '../components/Icons.jsx';

const TAB_POSICIONES = 'posiciones';
const TAB_HISTORIAL = 'historial';

/** Horario NYSE/NASDAQ: 9:30–16:00 Eastern, lun–vie. Devuelve si el mercado está abierto. */
function getUSMarketStatus() {
  try {
    const now = new Date();
    const etHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(now), 10);
    const etMin = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', minute: '2-digit' }).format(now), 10);
    const etWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(now);
    const isWeekend = etWeekday === 'Sat' || etWeekday === 'Sun';
    const mins = etHour * 60 + etMin;
    const openMins = 9 * 60 + 30;
    const closeMins = 16 * 60;
    return !isWeekend && mins >= openMins && mins < closeMins;
  } catch {
    return false;
  }
}

const ET_DAY = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };

/** Próxima apertura 9:30 ET (lun–vie): devuelve la fecha en ET de ese momento para calcular diff real. */
function getNextOpenCountdown() {
  try {
    const now = new Date();
    const etWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short' }).format(now);
    const etHour = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hour12: false }).format(now), 10);
    const etMin = parseInt(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', minute: '2-digit' }).format(now), 10);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const getPart = (p) => parts.find((x) => x.type === p)?.value;
    const y = parseInt(getPart('year'), 10);
    const mo = parseInt(getPart('month'), 10) - 1;
    const d = parseInt(getPart('day'), 10);
    const dayNum = ET_DAY[etWeekday] ?? 0;
    const openAtMins = 9 * 60 + 30;
    const closeAtMins = 16 * 60;
    const currentMins = etHour * 60 + etMin;
    let daysToAdd = 0;
    if (dayNum <= 4 && currentMins < openAtMins) {
      daysToAdd = 0;
    } else if (dayNum <= 4 && currentMins >= closeAtMins) {
      daysToAdd = dayNum === 4 ? 3 : 1;
    } else if (dayNum === 5) {
      daysToAdd = 2;
    } else {
      daysToAdd = 1;
    }
    const ref = new Date(Date.UTC(y, mo, d, 12, 0, 0));
    ref.setUTCDate(ref.getUTCDate() + daysToAdd);
    const y2 = ref.getUTCFullYear();
    const mo2 = ref.getUTCMonth();
    const d2 = ref.getUTCDate();
    const nextOpen = new Date(Date.UTC(y2, mo2, d2, 14, 30, 0));
    const diffMs = nextOpen.getTime() - now.getTime();
    if (diffMs <= 0) return null;
    const totalMins = Math.floor(diffMs / 60000);
    const dDisplay = Math.floor(totalMins / 1440);
    const remainderMins = totalMins % 1440;
    const hDisplay = Math.floor(remainderMins / 60);
    const mDisplay = remainderMins % 60;
    if (dDisplay > 0) {
      return `Abre en ${dDisplay}d ${hDisplay}h ${mDisplay}m`;
    }
    return `Abre en ${hDisplay}h ${mDisplay}m`;
  } catch {
    return null;
  }
}

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
  portfolioListWrap: { position: 'relative', maxWidth: 720 },
  marketClosedWatermark: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 1,
    overflow: 'hidden',
  },
  marketClosedText: {
    color: 'var(--text-muted)',
    fontSize: 'clamp(2rem, 8vw, 3.5rem)',
    fontWeight: 300,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    opacity: 0.12,
    transform: 'rotate(-18deg)',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  },
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

export default function Acciones() {
  useLayoutHeader('Acciones');
  const { showMessage, confirm } = useMessage();
  const { exchangeRateUsdToEur, appCurrency } = useAppSettings();
  const rate = Number(exchangeRateUsdToEur) || 0.92;
  const [holdings, setHoldings] = useState([]);
  const [prices, setPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ symbol: '', amountInvested: '', priceBought: '', currency: 'USD' });
  const [detailHolding, setDetailHolding] = useState(null);
  const [tab, setTab] = useState(TAB_POSICIONES);
  const [usMarketOpen, setUsMarketOpen] = useState(getUSMarketStatus());
  const [countdown, setCountdown] = useState(getNextOpenCountdown());
  const [historyHolding, setHistoryHolding] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historialYear = new Date().getFullYear();
  const historialMonth = new Date().getMonth() + 1;

  useEffect(() => {
    const tick = () => {
      setUsMarketOpen(getUSMarketStatus());
      setCountdown(getNextOpenCountdown());
    };
    tick();
    const t = setInterval(tick, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!historyHolding) {
      setHistoryList([]);
      return;
    }
    setHistoryLoading(true);
    api.stocks.holdings.dailyHistory(historyHolding.id, historialYear, historialMonth)
      .then((list) => setHistoryList(Array.isArray(list) ? list : []))
      .catch(() => setHistoryList([]))
      .finally(() => setHistoryLoading(false));
  }, [historyHolding?.id, historialYear, historialMonth]);

  const closeHistory = () => setHistoryHolding(null);

  const loadHoldings = () => {
    setLoading(true);
    api.stocks.holdings
      .list()
      .then((list) => {
        setHoldings(Array.isArray(list) ? list : []);
        const symbols = [...new Set((list || []).map((h) => h.symbol))];
        if (symbols.length > 0) {
          return api.stocks.prices(symbols).then((p) => {
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

  const openAdd = () => {
    setEditingId(null);
    setForm({ symbol: '', amountInvested: '', priceBought: '', currency: 'USD' });
    setModalOpen(true);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setForm({
      symbol: h.symbol,
      amountInvested: String(h.amountInvested ?? ''),
      priceBought: String(h.priceBought ?? ''),
      currency: h.currency || 'USD',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm({ symbol: '', amountInvested: '', priceBought: '', currency: 'USD' });
  };

  const saveHolding = async (e) => {
    e.preventDefault();
    const amountInvested = Number(form.amountInvested);
    const priceBought = Number(form.priceBought);
    if (!form.symbol?.trim()) {
      showMessage('Símbolo es obligatorio (ej. SPY, AAPL).', 'error');
      return;
    }
    if (!priceBought || priceBought <= 0) {
      showMessage('Precio de compra debe ser mayor que 0.', 'error');
      return;
    }
    try {
      if (editingId) {
        await api.stocks.holdings.update(editingId, {
          symbol: form.symbol.trim(),
          amountInvested,
          priceBought,
          currency: form.currency,
        });
        showMessage('Posición actualizada.', 'success');
      } else {
        await api.stocks.holdings.create({
          symbol: form.symbol.trim(),
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
      message: '¿Eliminar esta posición de acciones?',
      onConfirm: async () => {
        try {
          await api.stocks.holdings.delete(id);
          loadHoldings();
          setDetailHolding(null);
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

  const allUsdt = holdings.length > 0 && holdings.every((h) => h.currency === 'USDT');
  const allUsd = holdings.length > 0 && holdings.every((h) => h.currency === 'USD');
  const allEur = holdings.length > 0 && holdings.every((h) => h.currency === 'EUR');
  const summaryCurrency = allUsdt ? 'USDT' : allUsd ? 'USD' : allEur ? 'EUR' : (appCurrency === 'USD' ? 'USD' : 'EUR');
  const summaryLabel = summaryCurrency === 'USDT' ? 'USDT' : (summaryCurrency === 'USD' ? '$' : '€');
  const summaryFmt = summaryCurrency === 'USDT' ? fmtUsdt : (summaryCurrency === 'USD' ? fmtUsd : fmtEur);
  const summaryTotalInvested = summaryCurrency === 'EUR' ? totalInvestedEur : totalInvestedUsd;

  const { totalGainLossUsd, totalGainLossEur } = holdings.reduce(
    (acc, h) => {
      const p = prices[h.symbol];
      const currentEur = p ? h.amountShares * p.priceEur : null;
      const currentUsd = p ? h.amountShares * p.priceUsd : null;
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
    <div className="page-acciones">
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
              Los precios actuales se obtienen de Yahoo Finance; si hay límite de peticiones se usa el último valor guardado. Pulsa &quot;Refrescar precios&quot; para actualizar.
              {!usMarketOpen && holdings.length > 0 && (
                <span style={{ display: 'block', marginTop: '0.35rem' }}>
                  Mercado US cerrado (9:30–16:00 ET, lun–vie): los precios son de último cierre.
                  {countdown && (
                    <span style={{ display: 'block', marginTop: '0.25rem', fontWeight: 600, color: 'var(--accent)' }}>
                      {countdown}
                    </span>
                  )}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" onClick={openAdd} style={styles.btnPrimary}>
              + Añadir
            </button>
            {holdings.length > 0 && (
              <button type="button" onClick={() => { setLoading(true); loadHoldings(); }} style={styles.btnSecondary} title="Actualizar precios desde Yahoo Finance">
                Refrescar precios
              </button>
            )}
          </div>
        </div>

        {holdings.length === 0 ? (
          <div style={{ ...styles.tableCard, padding: '1.5rem' }}>
            <p style={styles.tableEmpty}>
              No hay posiciones. Haz clic en &quot;+ Añadir&quot; e indica el símbolo (ej. SPY, AAPL), dinero invertido y precio al que compraste.
            </p>
          </div>
        ) : (
          <div style={styles.portfolioListWrap}>
            {!usMarketOpen && (
              <div style={styles.marketClosedWatermark} aria-hidden>
                <span style={styles.marketClosedText}>Mercado cerrado</span>
              </div>
            )}
            <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: 360 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Invertido (aprox. {summaryLabel})</span>
                <span style={{ fontWeight: 600 }}>{summaryFmt(summaryTotalInvested)}</span>
              </div>
            </div>
            <div style={styles.portfolioList}>
              {holdings.map((h, index) => {
                const p = prices[h.symbol];
                const currentEur = p ? h.amountShares * p.priceEur : null;
                const currentUsd = p ? h.amountShares * p.priceUsd : null;
                const isEur = h.currency === 'EUR';
                const gainLoss = isEur
                  ? (currentEur != null ? currentEur - h.amountInvested : null)
                  : (currentUsd != null ? currentUsd - h.amountInvested : null);
                const rowFmt = isEur ? fmtEur : (h.currency === 'USDT' ? fmtUsdt : fmtUsd);
                const pair = h.currency === 'USDT' ? `${h.symbol}/USDT` : (h.currency === 'USD' ? `${h.symbol}/USD` : `${h.symbol}/EUR`);
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
                        {rowFmt(h.amountInvested)} · {h.amountShares?.toFixed(6) ?? '—'} unidades
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
            </div>
          </div>
        )}
      </section>
      )}

      {tab === TAB_HISTORIAL && (
      <section style={styles.section}>
        <h2 style={styles.subtitle}>Historial de cierres diarios</h2>
        <p style={styles.hint}>
          Cada día a las 00:00 se guarda el cierre de cada posición. Abre una posición y pulsa &quot;Histórico&quot; para ver su historial G/P día a día.
        </p>
        <div style={styles.tableCard}>
          <p style={{ ...styles.tableEmpty, padding: '1.5rem' }}>Abre una posición desde la pestaña Posiciones y usa el botón Histórico para ver su historial diario.</p>
        </div>
      </section>
      )}

      {detailHolding && (() => {
        const h = detailHolding;
        const p = prices[h.symbol];
        const isEur = h.currency === 'EUR';
        const rowFmt = isEur ? fmtEur : (h.currency === 'USDT' ? fmtUsdt : fmtUsd);
        const gainLoss = isEur
          ? (p ? h.amountShares * p.priceEur - h.amountInvested : null)
          : (p ? h.amountShares * p.priceUsd - h.amountInvested : null);
        const currentPrice = isEur ? (p?.priceEur ?? 0) : (p?.priceUsd ?? 0);
        const pctReturn = h.amountInvested > 0 && gainLoss != null ? (gainLoss / h.amountInvested) * 100 : null;
        const pair = h.currency === 'USDT' ? `${h.symbol}/USDT` : (h.currency === 'USD' ? `${h.symbol}/USD` : `${h.symbol}/EUR`);
        return (
          <div style={styles.modalOverlay} onClick={() => setDetailHolding(null)} role="dialog" aria-modal="true" aria-labelledby="stocks-detail-title">
            <div style={{ ...styles.modalBox, ...styles.detailModal }} onClick={(e) => e.stopPropagation()} className="modal-panel">
              <div style={styles.detailHeader}>
                <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.35rem' }}>{pair}</div>
                <div style={styles.detailHeaderTitle}>Último precio · Yahoo Finance</div>
                <div id="stocks-detail-title" style={{ ...styles.detailPrice, marginBottom: 0 }}>
                  {currentPrice > 0 ? rowFmt(currentPrice) : '—'}
                </div>
              </div>
              <div style={styles.detailBlock}>
                <div style={styles.detailLabel}>Invertido</div>
                <div style={styles.detailValue}>
                  {rowFmt(h.amountInvested)} ({h.amountShares?.toFixed(6) ?? '—'} unidades)
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
                  onClick={() => { setDetailHolding(null); setHistoryHolding(h); }}
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

      {historyHolding && (
        <div style={styles.modalOverlay} onClick={closeHistory} role="dialog" aria-modal="true" aria-labelledby="stocks-history-title">
          <div style={{ ...styles.modalBox, maxWidth: 520 }} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="stocks-history-title" style={styles.modalTitle}>
              Historial G/P diario — {historyHolding.currency === 'USDT' ? `${historyHolding.symbol}/USDT` : (historyHolding.currency === 'USD' ? `${historyHolding.symbol}/USD` : `${historyHolding.symbol}/EUR`)}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Una fila por día: beneficio (G/P) en USD y EUR al cierre. Diferencia = cambio respecto al día anterior. Hoy varía con el precio actual. Se registra cada día a las 00:00.
            </p>
            {historyLoading ? (
              <Loader />
            ) : (
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
                        ? (p ? h.amountShares * p.priceEur - investedEur : 0)
                        : (p ? h.amountShares * p.priceUsd - investedUsd : 0);
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
                {historyList.length === 0 && !historyLoading && (
                  <p style={styles.tableEmpty}>Aún no hay cierres diarios para esta posición. Se registrarán cada día a las 00:00.</p>
                )}
              </div>
            )}
            <div style={{ ...styles.modalActions, borderTop: 'none', paddingTop: '0.5rem' }}>
              <button type="button" onClick={closeHistory} style={styles.btnSecondary}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="stocks-modal-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="stocks-modal-title" style={styles.modalTitle}>{editingId ? 'Editar posición' : 'Nueva posición'}</h3>
            <form onSubmit={saveHolding}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Símbolo</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                  placeholder="SPY, AAPL, MSFT..."
                  className="input-modern"
                  style={styles.modalInput}
                  required
                />
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
                  step="0.0001"
                  min="0.0001"
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
    </div>
  );
}
