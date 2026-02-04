import { useState, useEffect } from 'react';
import { api } from '../api';
import { useAppSettings } from '../context/AppSettingsContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useMessage } from '../context/MessageContext';
import Loader from '../components/Loader';
import { IconChevronDown, IconChevronUp } from '../components/Icons.jsx';

const CRYPTO_SHORT = {
  bitcoin: 'BTC', ethereum: 'ETH', cardano: 'ADA', solana: 'SOL', ripple: 'XRP',
  polkadot: 'DOT', dogecoin: 'DOGE', 'avalanche-2': 'AVAX', chainlink: 'LINK',
  'polygon-ecosystem-token': 'POL',
};

function getCryptoShort(symbol) {
  return CRYPTO_SHORT[symbol] || (symbol && symbol.toUpperCase().slice(0, 4)) || '—';
}

/** Próxima fecha de vencimiento para un día del mes (1-31). */
function getNextDueDate(dayOfMonth) {
  const today = new Date();
  const d = Math.min(31, Math.max(1, Number(dayOfMonth) || 1));
  const currentDay = today.getDate();
  const next = new Date(today.getFullYear(), today.getMonth(), 1);
  if (d >= currentDay) {
    next.setDate(d);
  } else {
    next.setMonth(next.getMonth() + 1);
    const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
    next.setDate(Math.min(d, lastDay));
  }
  return next;
}

function formatMoney(n, currency = 'EUR') {
  if (currency === 'USDT') {
    return new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0) + ' USDT';
  }
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n ?? 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = {
  section: { marginBottom: '1.5rem' },
  sectionTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' },
  cards: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    padding: '1rem 1.25rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  cardLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' },
  cardValue: { fontSize: '1.35rem', fontWeight: 700, color: 'var(--text)' },
  cardValueIncome: { color: 'var(--income)' },
  cardValueExpense: { color: 'var(--expense)' },
  tiles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' },
  nextDueList: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  nextDueRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.65rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem' },
  nextDueRowLast: { borderBottom: 'none' },
  nextDueLabel: { color: 'var(--text)', fontWeight: 500, minWidth: 0 },
  nextDueMeta: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, fontSize: '0.75rem' },
  nextDueDate: { color: 'var(--text-muted)' },
  tile: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '0.5rem 0.6rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
  },
  tileSymbol: { fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: '0.15rem', lineHeight: 1.2 },
  tilePrice: { fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 },
  tileValue: { fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.2 },
  tileGp: { display: 'flex', alignItems: 'center', gap: '0.2rem', marginTop: '0.25rem', fontSize: '0.75rem', fontWeight: 600, lineHeight: 1.2 },
  tileGpPositive: { color: 'var(--income)' },
  tileGpNegative: { color: 'var(--expense)' },
  quickBar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '0.6rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    boxSizing: 'border-box',
  },
  quickChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.75rem',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: '#fff',
  },
  quickChipIcon: { fontSize: '1rem', lineHeight: 1 },
  quickChipExpense: { background: 'var(--expense)' },
  quickChipIncome: { background: 'var(--income)' },
};

export default function Dashboard() {
  useLayoutHeader('Inicio');
  const { showMessage } = useMessage();
  const { appCurrency, exchangeRateUsdToEur, blurBalance } = useAppSettings();
  const rate = Number(exchangeRateUsdToEur) || 0.92;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [productsByAccount, setProductsByAccount] = useState({});
  const [cryptoHoldings, setCryptoHoldings] = useState([]);
  const [cryptoPrices, setCryptoPrices] = useState({});
  const [stockHoldings, setStockHoldings] = useState([]);
  const [stockPrices, setStockPrices] = useState({});
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [fixedIncomes, setFixedIncomes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [groupedMonth, setGroupedMonth] = useState([]);
  const [quickTemplatesExpense, setQuickTemplatesExpense] = useState([]);
  const [quickTemplatesIncome, setQuickTemplatesIncome] = useState([]);
  const [categories, setCategories] = useState([]);
  const [applyingQuickId, setApplyingQuickId] = useState(null);

  const toAppCurrency = (amount, currency) => {
    const amt = Number(amount) || 0;
    if (currency === appCurrency) return amt;
    if (appCurrency === 'EUR' && currency === 'USD') return amt * rate;
    if (appCurrency === 'USD' && currency === 'EUR') return amt / rate;
    return amt;
  };

  useEffect(() => {
    setLoading(true);
    const loadAccounts = api.accounts.list().then((accs) => {
      const list = Array.isArray(accs) ? accs : [];
      setAccounts(list);
      const bankIds = list.filter((a) => (a.accountType || 'bank') === 'bank').map((a) => a.id);
      return Promise.all(bankIds.map((id) => api.accounts.products.list(id).then((products) => ({ id, products: products || [] }))));
    }).then((results) => {
      const byAccount = {};
      results.forEach(({ id, products }) => { byAccount[id] = products; });
      setProductsByAccount(byAccount);
    }).catch(() => {});

    const loadCrypto = api.crypto.holdings.list().then((list) => {
      const holdings = Array.isArray(list) ? list : [];
      setCryptoHoldings(holdings);
      const symbols = [...new Set(holdings.map((h) => h.symbol))];
      if (symbols.length > 0) return api.crypto.prices(symbols);
      return {};
    }).then((p) => setCryptoPrices(typeof p === 'object' && p !== null ? p : {})).catch(() => {});

    const loadStocks = api.stocks.holdings.list().then((list) => {
      const holdings = Array.isArray(list) ? list : [];
      setStockHoldings(holdings);
      const symbols = [...new Set(holdings.map((h) => h.symbol))];
      if (symbols.length > 0) return api.stocks.prices(symbols);
      return {};
    }).then((p) => setStockPrices(typeof p === 'object' && p !== null ? p : {})).catch(() => {});

    const loadFixedAndTx = Promise.all([
      api.fixedExpenses.list().then((arr) => Array.isArray(arr) ? arr : []),
      api.fixedIncomes.list().then((arr) => Array.isArray(arr) ? arr : []),
      api.transactions.list().then((arr) => Array.isArray(arr) ? arr : []),
      api.transactions.grouped(currentMonth, currentYear).then((g) => Array.isArray(g) ? g : []),
    ]).then(([fe, fi, tx, grouped]) => {
      setFixedExpenses(fe);
      setFixedIncomes(fi);
      setTransactions(tx);
      setGroupedMonth(grouped);
    }).catch(() => {});

    const loadQuickAndCategories = Promise.all([
      api.quickTemplates.list({ type: 'expense' }).then((arr) => Array.isArray(arr) ? arr : []),
      api.quickTemplates.list({ type: 'income' }).then((arr) => Array.isArray(arr) ? arr : []),
      api.categories.list().then((arr) => Array.isArray(arr) ? arr : []),
    ]).then(([qe, qi, c]) => {
      setQuickTemplatesExpense(qe);
      setQuickTemplatesIncome(qi);
      setCategories(c);
    }).catch(() => {});

    Promise.all([loadAccounts, loadCrypto, loadStocks, loadFixedAndTx, loadQuickAndCategories]).finally(() => setLoading(false));
  }, [currentMonth, currentYear]);

  const totalAccounts = accounts.reduce((sum, a) => {
    const base = Number(a.balance) || 0;
    const products = productsByAccount[a.id] || [];
    const productsSum = products.reduce((s, p) => s + (Number(p.balance) || 0), 0);
    return sum + toAppCurrency(base + productsSum, a.currency || 'EUR');
  }, 0);

  const cryptoTotalEur = cryptoHoldings.reduce((sum, h) => {
    const p = cryptoPrices[h.symbol];
    const val = p ? (h.amountCoins || 0) * (p.priceEur ?? 0) : 0;
    return sum + val;
  }, 0);
  const cryptoTotalUsd = cryptoHoldings.reduce((sum, h) => {
    const p = cryptoPrices[h.symbol];
    const val = p ? (h.amountCoins || 0) * (p.priceUsd ?? 0) : 0;
    return sum + val;
  }, 0);

  const stocksTotalEur = stockHoldings.reduce((sum, h) => {
    const p = stockPrices[h.symbol];
    const val = p ? (h.amountShares || 0) * (p.priceEur ?? 0) : 0;
    return sum + val;
  }, 0);
  const stocksTotalUsd = stockHoldings.reduce((sum, h) => {
    const p = stockPrices[h.symbol];
    const val = p ? (h.amountShares || 0) * (p.priceUsd ?? 0) : 0;
    return sum + val;
  }, 0);

  const totalInvested = appCurrency === 'EUR'
    ? cryptoTotalEur + stocksTotalEur
    : cryptoTotalUsd + stocksTotalUsd;

  const expensesThisMonthToDate = groupedMonth.reduce((sum, dayGroup) => {
    if (dayGroup.date > todayStr) return sum;
    for (const cat of dayGroup.categories || []) {
      for (const item of cat.items || []) {
        if (item.type === 'expense') sum += Number(item.amount) || 0;
      }
    }
    return sum;
  }, 0);

  const nextDueItems = [];
  fixedExpenses.forEach((fe) => {
    const date = getNextDueDate(fe.dayOfMonth);
    nextDueItems.push({ date, label: fe.name, amount: -Number(fe.amount) || 0, type: 'expense' });
  });
  fixedIncomes.forEach((fi) => {
    const date = getNextDueDate(fi.dayOfMonth);
    nextDueItems.push({ date, label: fi.name, amount: Number(fi.amount) || 0, type: 'income' });
  });
  nextDueItems.sort((a, b) => a.date.getTime() - b.date.getTime());

  const lastMovements = transactions.slice(0, 8);

  const refreshAfterQuick = () => {
    Promise.all([
      api.transactions.list().then((arr) => setTransactions(Array.isArray(arr) ? arr : [])),
      api.transactions.grouped(currentMonth, currentYear).then((g) => setGroupedMonth(Array.isArray(g) ? g : [])),
    ]).catch(() => {});
  };

  const applyQuickTemplate = async (tpl) => {
    setApplyingQuickId(tpl.type === 'expense' ? `e-${tpl.id}` : `i-${tpl.id}`);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await api.transactions.create({
        name: tpl.name,
        categoryId: tpl.categoryId,
        amount: tpl.amount,
        accountId: tpl.accountId,
        type: tpl.type,
        incomeType: tpl.type === 'income' ? 'quick' : undefined,
        expenseType: tpl.type === 'expense' ? 'quick' : undefined,
        date: today,
      });
      refreshAfterQuick();
      showMessage(tpl.type === 'expense' ? 'Gasto aplicado.' : 'Ingreso aplicado.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingQuickId(null);
    }
  };

  const hasQuickTemplates =
    (quickTemplatesExpense.length > 0 && quickTemplatesExpense.some((t) => t.showInQuick !== false)) ||
    (quickTemplatesIncome.length > 0 && quickTemplatesIncome.some((t) => t.showInQuick !== false));

  const cryptoTiles = cryptoHoldings.map((h) => {
    const p = cryptoPrices[h.symbol];
    const currentEur = p ? (h.amountCoins || 0) * (p.priceEur ?? 0) : null;
    const currentUsd = p ? (h.amountCoins || 0) * (p.priceUsd ?? 0) : null;
    const currency = h.currency || 'EUR';
    const isEur = currency === 'EUR';
    const invested = Number(h.amountInvested) || 0;
    const value = isEur ? (currentEur ?? invested) : (currentUsd ?? invested);
    const gainLoss = isEur
      ? (currentEur != null ? currentEur - invested : 0)
      : (currentUsd != null ? currentUsd - invested : 0);
    const pricePerUnit = isEur ? (p?.priceEur ?? null) : (p?.priceUsd ?? (p?.priceEur != null ? p.priceEur / rate : null));
    return {
      symbol: getCryptoShort(h.symbol),
      currency,
      price: pricePerUnit,
      value,
      gainLoss,
    };
  });

  const stockTiles = stockHoldings.map((h) => {
    const p = stockPrices[h.symbol];
    const currentEur = p ? (h.amountShares || 0) * (p.priceEur ?? 0) : null;
    const currentUsd = p ? (h.amountShares || 0) * (p.priceUsd ?? 0) : null;
    const currency = h.currency || 'USD';
    const isEur = currency === 'EUR';
    const invested = Number(h.amountInvested) || 0;
    const value = isEur ? (currentEur ?? invested) : (currentUsd ?? invested);
    const gainLoss = isEur
      ? (currentEur != null ? currentEur - invested : 0)
      : (currentUsd != null ? currentUsd - invested : 0);
    const pricePerShare = isEur ? (p?.priceEur ?? null) : (p?.priceUsd ?? (p?.priceEur != null ? p.priceEur / rate : null));
    return {
      symbol: (h.symbol || '').toUpperCase(),
      currency,
      price: pricePerShare,
      value,
      gainLoss,
    };
  });

  if (loading) return <Loader />;

  return (
    <div className="page-dashboard">
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Resumen</h2>
        <div style={styles.cards}>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Total en cuentas</div>
            <div style={{ ...styles.cardValue, ...(blurBalance ? { filter: 'blur(6px)' } : {}) }}>
              {formatMoney(totalAccounts, appCurrency)}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Gastos del mes (hasta hoy)</div>
            <div style={{ ...styles.cardValue, ...styles.cardValueExpense }}>
              {formatMoney(expensesThisMonthToDate, appCurrency)}
            </div>
          </div>
          <div style={styles.card}>
            <div style={styles.cardLabel}>Total invertido (valor actual)</div>
            <div style={styles.cardValue}>
              {formatMoney(totalInvested, appCurrency)}
            </div>
          </div>
        </div>
      </section>

      {hasQuickTemplates && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Acceso rápido</h2>
          <div className="quick-bar" style={styles.quickBar}>
            {quickTemplatesExpense.filter((t) => t.showInQuick !== false).map((t) => {
              const icon = t.icon || categories.find((c) => c.id === t.categoryId)?.icon || '💸';
              return (
                <button
                  key={`expense-${t.id}`}
                  type="button"
                  onClick={() => applyQuickTemplate(t)}
                  disabled={applyingQuickId !== null}
                  style={{ ...styles.quickChip, ...styles.quickChipExpense }}
                  className="touch-target"
                  title={t.name}
                >
                  <span style={styles.quickChipIcon}>{icon}</span>
                  <span className="quick-chip-label">{applyingQuickId === `e-${t.id}` ? '…' : t.name}</span>
                </button>
              );
            })}
            {quickTemplatesIncome.filter((t) => t.showInQuick !== false).map((t) => {
              const icon = t.icon || categories.find((c) => c.id === t.categoryId)?.icon || '💰';
              return (
                <button
                  key={`income-${t.id}`}
                  type="button"
                  onClick={() => applyQuickTemplate(t)}
                  disabled={applyingQuickId !== null}
                  style={{ ...styles.quickChip, ...styles.quickChipIncome }}
                  className="touch-target"
                  title={t.name}
                >
                  <span style={styles.quickChipIcon}>{icon}</span>
                  <span className="quick-chip-label">{applyingQuickId === `i-${t.id}` ? '…' : t.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {cryptoTiles.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Criptomonedas</h2>
          <div style={styles.tiles}>
            {cryptoTiles.map((t, i) => (
              <div key={i} style={styles.tile}>
                <div style={styles.tileSymbol}>{t.symbol}</div>
                <div style={styles.tilePrice}>{t.price != null ? formatMoney(t.price, t.currency) : '—'}</div>
                <div style={styles.tileValue}>{formatMoney(t.value, t.currency)}</div>
                <div style={{ ...styles.tileGp, ...(t.gainLoss >= 0 ? styles.tileGpPositive : styles.tileGpNegative) }}>
                  {t.gainLoss >= 0 ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                  <span>{t.gainLoss >= 0 ? '+' : ''}{formatMoney(t.gainLoss, t.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stockTiles.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Acciones</h2>
          <div style={styles.tiles}>
            {stockTiles.map((t, i) => (
              <div key={i} style={styles.tile}>
                <div style={styles.tileSymbol}>{t.symbol}</div>
                <div style={styles.tilePrice}>{t.price != null ? formatMoney(t.price, t.currency) : '—'}</div>
                <div style={styles.tileValue}>{formatMoney(t.value, t.currency)}</div>
                <div style={{ ...styles.tileGp, ...(t.gainLoss >= 0 ? styles.tileGpPositive : styles.tileGpNegative) }}>
                  {t.gainLoss >= 0 ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                  <span>{t.gainLoss >= 0 ? '+' : ''}{formatMoney(t.gainLoss, t.currency)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {nextDueItems.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Próximos vencimientos</h2>
          <div style={styles.nextDueList}>
            {nextDueItems.slice(0, 8).map((item, i, arr) => (
              <div key={i} style={{ ...styles.nextDueRow, ...(i === arr.length - 1 ? styles.nextDueRowLast : {}) }}>
                <span style={styles.nextDueLabel} title={item.label}>{item.label}</span>
                <span style={styles.nextDueMeta}>
                  <span style={styles.nextDueDate}>{item.date.toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
                  <span style={item.amount >= 0 ? styles.cardValueIncome : styles.cardValueExpense}>
                    {item.amount >= 0 ? '+' : ''}{formatMoney(item.amount, appCurrency)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {lastMovements.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>Últimos movimientos</h2>
          <div style={styles.nextDueList}>
            {lastMovements.map((tx, i, arr) => {
              const amount = Number(tx.amount) || 0;
              const isIncome = tx.type === 'income';
              return (
                <div key={tx.id} style={{ ...styles.nextDueRow, ...(i === arr.length - 1 ? styles.nextDueRowLast : {}) }}>
                  <span style={styles.nextDueLabel} title={tx.name || 'Sin concepto'}>{tx.name || 'Sin concepto'}</span>
                  <span style={styles.nextDueMeta}>
                    <span style={styles.nextDueDate}>{tx.date ? new Date(tx.date).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : '—'}</span>
                    <span style={isIncome ? styles.cardValueIncome : styles.cardValueExpense}>
                      {isIncome ? '+' : '-'}{formatMoney(amount, appCurrency)}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
