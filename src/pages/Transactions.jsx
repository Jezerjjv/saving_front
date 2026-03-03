// (marcador cambios - borrar si quieres)
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useSelectedAccount } from '../context/SelectedAccountContext';
import { useMovimientosSidebar } from '../context/MovimientosSidebarContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import TransactionAccordion from '../components/TransactionAccordion';
import TransactionForm from '../components/TransactionForm';
import CaptureExpenseModal from '../components/CaptureExpenseModal';
import Loader from '../components/Loader';
import MonthlyBarChart from '../components/MonthlyBarChart';
import { IconEdit, IconTrash, IconApply, IconChevronDown, IconChevronUp, IconChevronRight, IconCamera } from '../components/Icons.jsx'; 

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ACCOUNT_ID_ALL = 'all';

const MAIN_TABS = [
  { id: 'all', label: 'Todo' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
];
export default function Transactions() {
  const { showMessage, confirm } = useMessage();
  const { primaryAccountId, blurBalance, appCurrency } = useAppSettings();
  const sidebarContext = useMovimientosSidebar();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const dayParam = searchParams.get('day');
  const [month, setMonthState] = useState(monthParam ? Number(monthParam) : currentMonth);
  const [year, setYearState] = useState(yearParam ? Number(yearParam) : currentYear);
  const [grouped, setGrouped] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [fixedIncomes, setFixedIncomes] = useState([]);
  const [quickTemplatesExpense, setQuickTemplatesExpense] = useState([]);
  const [quickTemplatesIncome, setQuickTemplatesIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('expense');
  const [formDefaultKind, setFormDefaultKind] = useState('normal');
  const [editingTx, setEditingTx] = useState(null);
  const [editingFixed, setEditingFixed] = useState(null);
  const [editingQuick, setEditingQuick] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [applyingFixedIncomes, setApplyingFixedIncomes] = useState(false);
  const [applyingFixedExpenses, setApplyingFixedExpenses] = useState(false);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [incomesByCategory, setIncomesByCategory] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [expandedSummaryCategoryIds, setExpandedSummaryCategoryIds] = useState({});
  const [summaryTab, setSummaryTab] = useState('list'); // 'list' | 'chart'
  const [highlightedTxId, setHighlightedTxId] = useState(null);
  const [applyingQuickId, setApplyingQuickId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState('');
  const dayNumFromUrl = dayParam != null && dayParam !== '' ? Number(dayParam) : NaN;
  const [searchDay, setSearchDay] = useState((dayNumFromUrl >= 1 && dayNumFromUrl <= 31) ? String(dayNumFromUrl) : '');
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [initialDataFromCapture, setInitialDataFromCapture] = useState(null);
  const [chartYear, setChartYear] = useState(yearParam ? Number(yearParam) : currentYear);
  const [monthlyChartData, setMonthlyChartData] = useState([]);
  const { selectedAccountId, setSelectedAccountId } = useSelectedAccount();

  const setMonth = (m) => {
    const val = Math.min(12, Math.max(1, m));
    setMonthState(val);
    setSearchParams({ month: String(val), year: String(year) });
  };
  const setYear = (y) => {
    setYearState(y);
    setSearchParams({ month: String(month), year: String(y) });
  };

  useEffect(() => {
    if (monthParam && yearParam) {
      const m = Number(monthParam);
      const y = Number(yearParam);
      setMonthState(m);
      setYearState(y);
      setChartYear(y);
    }
  }, [monthParam, yearParam]);

  useEffect(() => {
    const d = dayParam != null && dayParam !== '' ? Number(dayParam) : NaN;
    if (d >= 1 && d <= 31) setSearchDay(String(d));
  }, [dayParam]);

  const effectiveAccountId = selectedAccountId === ACCOUNT_ID_ALL ? null : (selectedAccountId ?? primaryAccountId ?? accounts[0]?.id ?? null);
  const isComputedTotal = selectedAccountId === ACCOUNT_ID_ALL;

  const accountsSorted = useMemo(() => {
    if (!accounts?.length) return [];
    const primary = primaryAccountId != null ? accounts.find((a) => a.id === primaryAccountId) : null;
    const rest = accounts.filter((a) => a.id !== primaryAccountId);
    return primary ? [primary, ...rest] : accounts;
  }, [accounts, primaryAccountId]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.transactions.grouped(month, year),
      api.transactions.expensesByCategory(month, year, effectiveAccountId),
      api.transactions.incomesByCategory(month, year, effectiveAccountId),
      api.accounts.list(),
      api.categories.list(),
      api.fixedExpenses.list(),
      api.fixedIncomes.list(),
      api.quickTemplates.list({ type: 'expense' }),
      api.quickTemplates.list({ type: 'income' }),
    ])
      .then(([g, byExpCat, byIncCat, a, c, fe, fi, qe, qi]) => {
        setGrouped(Array.isArray(g) ? g : []);
        setExpensesByCategory(Array.isArray(byExpCat) ? byExpCat : []);
        setIncomesByCategory(Array.isArray(byIncCat) ? byIncCat : []);
        setAccounts(Array.isArray(a) ? a : []);
        setCategories(Array.isArray(c) ? c : []);
        setFixedExpenses(Array.isArray(fe) ? fe : []);
        setFixedIncomes(Array.isArray(fi) ? fi : []);
        setQuickTemplatesExpense(Array.isArray(qe) ? qe : []);
        setQuickTemplatesIncome(Array.isArray(qi) ? qi : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [month, year, effectiveAccountId]);

  useEffect(() => {
    if (!accounts.length) return;
    if (selectedAccountId === ACCOUNT_ID_ALL) return;
    const primary = primaryAccountId != null ? accounts.find((a) => a.id === primaryAccountId) : null;
    const defaultId = (primary || accounts[0])?.id ?? null;
    if (selectedAccountId == null || !accounts.some((a) => a.id === selectedAccountId)) {
      setSelectedAccountId(defaultId);
    }
  }, [accounts, primaryAccountId, selectedAccountId, setSelectedAccountId]);

  useEffect(() => {
    api.transactions.monthlySummary(chartYear, effectiveAccountId)
      .then((arr) => {
        const list = Array.isArray(arr) ? arr : [];
        setMonthlyChartData(list.map((r) => ({
          month: r.month,
          year: r.year,
          value: Number(r.expense) || 0,
          income: Number(r.income) || 0,
          expense: Number(r.expense) || 0,
        })));
      })
      .catch(() => setMonthlyChartData([]));
  }, [chartYear, effectiveAccountId]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };
  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const openAdd = (type, kind = 'normal', initialData = null) => {
    setFormType(type);
    setFormDefaultKind(kind);
    setEditingTx(null);
    setEditingFixed(null);
    setEditingQuick(null);
    setInitialDataFromCapture(initialData);
    setShowForm(true);
  };

  const openCapture = () => {
    setShowCaptureModal(true);
  };

  const handleCaptureExtracted = (data) => {
    setShowCaptureModal(false);
    openAdd('expense', 'normal', data);
  };

  const openAddRef = useRef(openAdd);
  const setActiveTabRef = useRef(setActiveTab);
  const openCaptureRef = useRef(openCapture);
  openAddRef.current = openAdd;
  setActiveTabRef.current = setActiveTab;
  openCaptureRef.current = openCapture;

  const sidebarCtxRef = useRef(sidebarContext);
  sidebarCtxRef.current = sidebarContext;

  useEffect(() => {
    const ctx = sidebarCtxRef.current;
    if (!ctx) return;
    ctx.register({
      openAdd: (...args) => openAddRef.current(...args),
      setActiveTab: (id) => setActiveTabRef.current(id),
      openCapture: () => openCaptureRef.current(),
    });
    return () => {
      if (sidebarCtxRef.current) sidebarCtxRef.current.unregister();
    };
  }, []);

  useEffect(() => {
    const ctx = sidebarCtxRef.current;
    if (!ctx) return;
    ctx.updateState({ activeTab });
  }, [activeTab]);

  useEffect(() => {
    const add = searchParams.get('add');
    if (add === 'expense' || add === 'income') {
      openAddRef.current(add, 'normal');
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.delete('add');
        return p;
      });
    }
  }, []);

  const openEditTx = (tx) => {
    setFormType(tx.type === 'expense' ? 'expense' : 'income');
    setEditingTx(tx);
    setEditingFixed(null);
    setEditingQuick(null);
    setShowForm(true);
  };

  const openEditFixed = (item, type) => {
    setFormType(type);
    setEditingFixed(item);
    setEditingTx(null);
    setEditingQuick(null);
    setShowForm(true);
  };

  const openEditQuick = (item, type) => {
    setFormType(type);
    setEditingQuick(item);
    setEditingTx(null);
    setEditingFixed(null);
    setShowForm(true);
  };

  const onFormClose = () => {
    setShowForm(false);
    setEditingTx(null);
    setEditingFixed(null);
    setEditingQuick(null);
    setInitialDataFromCapture(null);
    load();
  };

  const deleteTx = (id) => {
    confirm({
      title: 'Eliminar movimiento',
      message: '¿Eliminar este movimiento?',
      onConfirm: async () => {
        try {
          await api.transactions.delete(id);
          load();
          showMessage('Movimiento eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const deleteFixedExpense = (id) => {
    confirm({
      title: 'Eliminar gasto fijo',
      message: '¿Eliminar este gasto fijo?',
      onConfirm: async () => {
        try {
          await api.fixedExpenses.delete(id);
          load();
          showMessage('Gasto fijo eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const deleteFixedIncome = (id) => {
    confirm({
      title: 'Eliminar ingreso fijo',
      message: '¿Eliminar este ingreso fijo?',
      onConfirm: async () => {
        try {
          await api.fixedIncomes.delete(id);
          load();
          showMessage('Ingreso fijo eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const deleteQuickTemplate = (id) => {
    confirm({
      title: 'Eliminar plantilla rápida',
      message: '¿Eliminar esta plantilla rápida?',
      onConfirm: async () => {
        try {
          await api.quickTemplates.delete(id);
          load();
          showMessage('Plantilla eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const applyQuickTemplate = async (tpl) => {
    setApplyingQuickId(tpl.type === 'expense' ? `e-${tpl.id}` : `i-${tpl.id}`);
    const today = new Date().toISOString().slice(0, 10);
    const accountId = (selectedAccountId != null && selectedAccountId !== ACCOUNT_ID_ALL)
      ? selectedAccountId
      : (primaryAccountId != null ? primaryAccountId : tpl.accountId);
    try {
      await api.transactions.create({
        name: tpl.name,
        categoryId: tpl.categoryId,
        amount: tpl.amount,
        accountId: Number(accountId) || tpl.accountId,
        type: tpl.type,
        incomeType: tpl.type === 'income' ? 'quick' : undefined,
        expenseType: tpl.type === 'expense' ? 'quick' : undefined,
        date: today,
      });
      load();
      showMessage(tpl.type === 'expense' ? 'Gasto aplicado.' : 'Ingreso aplicado.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingQuickId(null);
    }
  };

  const applyFixedIncomes = async () => {
    setApplyingFixedIncomes(true);
    try {
      const r = await api.fixedIncomes.applyMonth(month, year);
      showMessage(`Se aplicaron ${r.applied} ingreso(s) fijo(s) a ${MONTHS[month - 1]} ${year}.`, 'success');
      load();
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingFixedIncomes(false);
    }
  };

  const applyFixedExpenses = async () => {
    setApplyingFixedExpenses(true);
    try {
      const r = await api.fixedExpenses.applyMonth(month, year);
      showMessage(`Se aplicaron ${r.applied} gasto(s) fijo(s) a ${MONTHS[month - 1]} ${year}.`, 'success');
      load();
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingFixedExpenses(false);
    }
  };

  const applySingleFixedExpense = async (id) => {
    try {
      const r = await api.fixedExpenses.applyOne(id, month, year);
      if (r.applied === 1) {
        load();
        showMessage('Gasto fijo aplicado.', 'success');
      } else {
        showMessage('Este gasto fijo ya está aplicado en este mes.', 'info');
      }
    } catch (err) {
      showMessage(err.message || 'Este gasto fijo ya está aplicado en este mes.', 'error');
    }
  };

  const applySingleFixedIncome = async (id) => {
    try {
      const r = await api.fixedIncomes.applyOne(id, month, year);
      if (r.applied === 1) {
        load();
        showMessage('Ingreso fijo aplicado.', 'success');
      } else {
        showMessage('Este ingreso fijo ya está aplicado en este mes.', 'info');
      }
    } catch (err) {
      showMessage(err.message || 'Este ingreso fijo ya está aplicado en este mes.', 'error');
    }
  };

  const filteredGrouped = () => {
    if (!Array.isArray(grouped) || grouped.length === 0) return [];
    const safeGrouped = grouped.map((dayGroup) => ({
      ...dayGroup,
      categories: Array.isArray(dayGroup.categories) ? dayGroup.categories.map((cat) => ({
        ...cat,
        items: Array.isArray(cat.items) ? cat.items : [],
      })) : [],
    }));
    let result = safeGrouped;
    if (effectiveAccountId != null) {
      result = result
        .map((dayGroup) => {
          const filtered = dayGroup.categories
            .map((cat) => ({
              ...cat,
              items: (cat.items || []).filter((t) => t.accountId === effectiveAccountId),
            }))
            .filter((cat) => (cat.items || []).length > 0);
          return filtered.length ? { ...dayGroup, categories: filtered } : null;
        })
        .filter(Boolean);
    }
    result = activeTab === 'all' ? result : result
      .map((dayGroup) => {
        const filtered = dayGroup.categories
          .map((cat) => ({
            ...cat,
            items: cat.items.filter((t) => t.type === activeTab),
          }))
          .filter((cat) => cat.items.length > 0);
        return filtered.length ? { ...dayGroup, categories: filtered } : null;
      })
      .filter(Boolean);

    if (searchDay !== '') {
      const dayNum = Number(searchDay);
      if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        result = result.filter((dg) => new Date(dg.date).getDate() === dayNum);
      }
    }

    if (searchText.trim() !== '' || searchCategoryId !== '') {
      const text = searchText.trim().toLowerCase();
      const catIdRaw = searchCategoryId === '' ? null : searchCategoryId;
      const catId = catIdRaw === null ? null : Number(catIdRaw);
      result = result.map((dayGroup) => {
        const filteredCats = dayGroup.categories
          .filter((cat) => {
            if (catId == null) return true;
            if (catId === 0) return cat.categoryId == null;
            return cat.categoryId === catId;
          })
          .map((cat) => {
            const items = Array.isArray(cat.items) ? cat.items : [];
            const matchesText = text === '' || cat.categoryName?.toLowerCase().includes(text) || items.some((t) => t.name?.toLowerCase().includes(text));
            if (!matchesText) return { ...cat, items: [] };
            const filteredItems = text === '' ? items : items.filter((t) => t.name?.toLowerCase().includes(text));
            return { ...cat, items: filteredItems };
          })
          .filter((cat) => cat.items.length > 0);
        return filteredCats.length ? { ...dayGroup, categories: filteredCats } : null;
      }).filter(Boolean);
    }

    return result;
  };

  /** Movimientos por categoría para el resumen (acordeón): mismo filtro de cuenta que el listado */
  const transactionsByCategory = useMemo(() => {
    if (!Array.isArray(grouped) || grouped.length === 0) return {};
    const byCat = {};
    grouped.forEach((dayGroup) => {
      const categories = Array.isArray(dayGroup.categories) ? dayGroup.categories : [];
      categories.forEach((cat) => {
        const items = Array.isArray(cat.items) ? cat.items : [];
        items.forEach((tx) => {
          if (effectiveAccountId != null && tx.accountId !== effectiveAccountId) return;
          const key = cat.categoryId ?? 0;
          if (!byCat[key]) byCat[key] = [];
          byCat[key].push({
            id: tx.id,
            date: dayGroup.date,
            name: tx.name,
            amount: tx.amount,
            type: tx.type,
          });
        });
      });
    });
    Object.keys(byCat).forEach((k) => {
      byCat[k].sort((a, b) => a.date.localeCompare(b.date) || 0);
    });
    return byCat;
  }, [grouped, effectiveAccountId]);

  useLayoutHeader('Movimientos');

  const displayAccount = isComputedTotal && Array.isArray(accounts)
    ? {
        id: ACCOUNT_ID_ALL,
        name: 'Cómputo total',
        balance: accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0),
      }
    : (effectiveAccountId != null && Array.isArray(accounts) ? accounts.find((a) => a.id === effectiveAccountId) : null);

  const displayTotals = Array.isArray(grouped) && grouped.length > 0
    ? grouped.reduce(
        (acc, dayGroup) => {
          (Array.isArray(dayGroup.categories) ? dayGroup.categories : []).forEach((cat) => {
            (Array.isArray(cat.items) ? cat.items : []).forEach((t) => {
              if (effectiveAccountId != null && t.accountId !== effectiveAccountId) return;
              if (t.type === 'income') acc.income += t.amount ?? 0;
              else acc.expense += t.amount ?? 0;
            });
          });
          return acc;
        },
        { income: 0, expense: 0 }
      )
    : { income: 0, expense: 0 };

  const groupedByAccount = useMemo(() => {
    if (!isComputedTotal || !Array.isArray(accounts) || accounts.length === 0) return [];
    const flat = filteredGrouped();
    const byAccount = new Map();
    flat.forEach((dayGroup) => {
      (Array.isArray(dayGroup.categories) ? dayGroup.categories : []).forEach((cat) => {
        (Array.isArray(cat.items) ? cat.items : []).forEach((t) => {
          const aid = t.accountId;
          if (aid == null) return;
          if (!byAccount.has(aid)) {
            const acc = accounts.find((a) => a.id === aid);
            byAccount.set(aid, { accountId: aid, accountName: acc?.name ?? `Cuenta ${aid}`, account: acc, byDate: new Map() });
          }
          const rec = byAccount.get(aid);
          const dateKey = dayGroup.date;
          if (!rec.byDate.has(dateKey)) {
            rec.byDate.set(dateKey, {
              date: dateKey,
              dayTotalIncome: 0,
              dayTotalExpense: 0,
              categories: [],
            });
          }
          const dg = rec.byDate.get(dateKey);
          let catRow = dg.categories.find((c) => (c.categoryId === (cat.categoryId ?? null)) && (c.categoryName === (cat.categoryName ?? null)));
          if (!catRow) {
            catRow = { categoryId: cat.categoryId, categoryName: cat.categoryName, categoryIcon: cat.categoryIcon, items: [] };
            dg.categories.push(catRow);
          }
          catRow.items.push(t);
          if (t.type === 'income') dg.dayTotalIncome += t.amount ?? 0;
          else dg.dayTotalExpense += t.amount ?? 0;
        });
      });
    });
    return accountsSorted
      .filter((a) => byAccount.has(a.id))
      .map((a) => {
        const rec = byAccount.get(a.id);
        const dayGroups = Array.from(rec.byDate.entries())
          .sort(([d1], [d2]) => d2.localeCompare(d1))
          .map(([, dg]) => dg);
        return { accountId: a.id, accountName: rec.accountName, account: rec.account, dayGroups };
      });
  }, [isComputedTotal, accounts, accountsSorted, grouped, activeTab, searchDay, searchText, searchCategoryId]);

  const goToTransaction = (tx) => {
    if (!tx?.date || !tx?.id) return;
    const day = new Date(tx.date + 'T12:00:00').getDate();
    setSearchParams({ month: String(month), year: String(year), day: String(day) });
    setSearchDay(String(day));
    setHighlightedTxId(tx.id);
  };

  useEffect(() => {
    if (highlightedTxId == null) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`tx-${highlightedTxId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        el.classList.add('tx-highlight-flash');
        setTimeout(() => el.classList.remove('tx-highlight-flash'), 1500);
      }
      setHighlightedTxId(null);
    }, 400);
    return () => clearTimeout(timer);
  }, [highlightedTxId]);

  const fmt = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="page-transactions">
      {accountsSorted.length > 0 && (
        <div className="account-tabs-wrap" style={styles.accountTabsWrap} role="tablist" aria-label="Cuentas">
          <button
            type="button"
            role="tab"
            aria-selected={selectedAccountId === ACCOUNT_ID_ALL}
            style={{ ...styles.accountTab, ...(selectedAccountId === ACCOUNT_ID_ALL ? styles.accountTabActive : {}) }}
            className="touch-target"
            onClick={() => setSelectedAccountId(ACCOUNT_ID_ALL)}
          >
            Cómputo total
          </button>
          {accountsSorted.map((a) => {
            const isSelected = selectedAccountId === a.id;
            return (
              <button
                key={a.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                style={{ ...styles.accountTab, ...(isSelected ? styles.accountTabActive : {}) }}
                className="touch-target"
                onClick={() => setSelectedAccountId(a.id)}
              >
                {primaryAccountId === a.id ? '⭐ ' : ''}{a.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="movimientos-actions" style={styles.movimientosActions}>
        <button
          type="button"
          onClick={() => openAdd('expense', 'normal')}
          style={{ ...styles.actionBtn, ...styles.actionBtnExpense }}
          className="touch-target"
          title="Añadir gasto"
        >
          <span style={styles.actionBtnSymbol}>+</span>
          Gasto
        </button>
        <button
          type="button"
          onClick={() => openAdd('income', 'normal')}
          style={{ ...styles.actionBtn, ...styles.actionBtnIncome }}
          className="touch-target"
          title="Añadir ingreso"
        >
          <span style={styles.actionBtnSymbol}>+</span>
          Ingreso
        </button>
        <button
          type="button"
          onClick={openCapture}
          style={{ ...styles.actionBtn, ...styles.actionBtnCapture }}
          className="touch-target"
          title="Capturar factura o ticket"
        >
          <IconCamera size={18} />
          Capturar factura
        </button>
      </div>

      {displayAccount && (
        <div style={styles.primaryAccountCard}>
          <div style={styles.primaryAccountRow}>
            <span style={styles.primaryAccountLabel}>
              {displayAccount.id === ACCOUNT_ID_ALL ? 'Todas las cuentas' : (primaryAccountId === displayAccount.id ? 'Cuenta principal' : 'Cuenta seleccionada')}
            </span>
            <span style={styles.primaryAccountName}>
              {displayAccount.id !== ACCOUNT_ID_ALL && primaryAccountId === displayAccount.id ? '⭐ ' : ''}{displayAccount.name}
            </span>
            <span style={styles.primaryAccountBalanceWrap}>
              <span style={styles.primaryAccountTotalLabel}>Saldo</span>
              <span style={{ ...styles.primaryAccountBalance, color: (displayAccount.balance ?? 0) >= 0 ? 'var(--income)' : 'var(--expense)' }} className={blurBalance ? 'balance-blur' : ''}>
                {fmt(displayAccount.balance ?? 0)}
              </span>
            </span>
          </div>
          <div style={styles.primaryAccountTotals}>
            <span style={styles.primaryAccountTotalItem}>
              <span style={styles.primaryAccountTotalLabel}>Ingresos del mes</span>
              <span style={{ ...styles.primaryAccountTotalAmount, color: 'var(--income)' }} className={blurBalance ? 'balance-blur' : ''}>{fmt(displayTotals.income)}</span>
            </span>
            <span style={styles.primaryAccountTotalItem}>
              <span style={styles.primaryAccountTotalLabel}>Gastos del mes</span>
              <span style={{ ...styles.primaryAccountTotalAmount, color: 'var(--expense)' }} className={blurBalance ? 'balance-blur' : ''}>{fmt(displayTotals.expense)}</span>
            </span>
          </div>
        </div>
      )}

      {(Array.isArray(quickTemplatesExpense) && quickTemplatesExpense.some((t) => t.showInQuick !== false)) || (Array.isArray(quickTemplatesIncome) && quickTemplatesIncome.some((t) => t.showInQuick !== false)) ? (
        <div className="quick-bar" style={styles.quickBar}>
          {(Array.isArray(quickTemplatesExpense) ? quickTemplatesExpense : []).filter((t) => t.showInQuick !== false).map((t) => {
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
          {(Array.isArray(quickTemplatesIncome) ? quickTemplatesIncome : []).filter((t) => t.showInQuick !== false).map((t) => {
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
      ) : null}

      <div style={styles.chartBlock}>
        <div style={styles.chartHeader}>
          <span style={styles.chartTitle}>Gastos por mes</span>
          <select
            value={chartYear}
            onChange={(e) => setChartYear(Number(e.target.value))}
            className="select-modern"
            style={styles.chartYearSelect}
            aria-label="Año del gráfico"
          >
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {monthlyChartData.length > 0 ? (
          <MonthlyBarChart
            data={monthlyChartData}
            highlightedMonth={month}
            highlightedYear={year}
            height={180}
            onBarClick={(m, y) => {
              setMonthState(m);
              setYearState(y);
              setChartYear(y);
              setSearchParams({ month: String(m), year: String(y) });
            }}
            formatValue={(n) => new Intl.NumberFormat('es', { style: 'currency', currency: appCurrency || 'EUR' }).format(n ?? 0)}
          />
        ) : (
          <p style={styles.chartEmpty}>No hay datos para {chartYear}.</p>
        )}
      </div>

      {(activeTab === 'all' || activeTab === 'expense' || activeTab === 'income') && (
        <div style={styles.searchBar}>
          <input
            type="text"
            placeholder="Buscar por nombre o categoría..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={styles.searchInput}
            aria-label="Buscar por texto"
          />
          <select
            value={searchCategoryId}
            onChange={(e) => setSearchCategoryId(e.target.value)}
            style={styles.searchSelect}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
            <option value="0">Sin categoría</option>
          </select>
          <input
            type="number"
            min={1}
            max={31}
            placeholder="Día"
            value={searchDay}
            onChange={(e) => setSearchDay(e.target.value === '' ? '' : e.target.value)}
            style={styles.searchDay}
            aria-label="Filtrar por día del mes"
          />
          {(searchText !== '' || searchCategoryId !== '' || searchDay !== '') && (
            <button
              type="button"
              onClick={() => { setSearchText(''); setSearchCategoryId(''); setSearchDay(''); }}
              style={styles.searchClear}
            >
              Limpiar
            </button>
          )}
        </div>
      )}

      {showCaptureModal && (
        <CaptureExpenseModal
          categories={categories}
          onExtracted={handleCaptureExtracted}
          onClose={() => setShowCaptureModal(false)}
        />
      )}

      {showForm && (
        <TransactionForm
          type={formType}
          accounts={accounts}
          categories={categories}
          defaultKind={formDefaultKind}
          editingTx={editingTx}
          editingFixed={editingFixed}
          editingQuick={editingQuick}
          initialData={initialDataFromCapture}
          onClose={onFormClose}
          onSaved={onFormClose}
        />
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          {(activeTab === 'all' || activeTab === 'expense' || activeTab === 'income') && (
            <div style={styles.accordions}>
              {isComputedTotal ? (
                groupedByAccount.length === 0 ? (
                  <p style={styles.empty}>
                    No hay {activeTab === 'all' ? 'movimientos' : activeTab === 'expense' ? 'gastos' : 'ingresos'}
                    {' en '}{MONTHS[month - 1]} {year}.
                  </p>
                ) : (
                  groupedByAccount.map(({ accountId, accountName, dayGroups }) => (
                    <div key={accountId} style={styles.accountSection}>
                      <h3 style={styles.accountSectionTitle}>
                        {primaryAccountId === accountId ? '⭐ ' : ''}{accountName}
                      </h3>
                      {dayGroups.length === 0 ? (
                        <p style={styles.empty}>Sin movimientos este mes.</p>
                      ) : (
                        dayGroups.map((dayGroup) => (
                          <TransactionAccordion
                            key={`${accountId}-${dayGroup.date}`}
                            dayGroup={dayGroup}
                            filterType={activeTab === 'all' ? null : activeTab}
                            onEdit={openEditTx}
                            onDelete={deleteTx}
                            highlightedTxId={highlightedTxId}
                          />
                        ))
                      )}
                    </div>
                  ))
                )
              ) : filteredGrouped().length === 0 ? (
                <p style={styles.empty}>
                  No hay {activeTab === 'all' ? 'movimientos' : activeTab === 'expense' ? 'gastos' : 'ingresos'}
                  {' en '}{MONTHS[month - 1]} {year}.
                </p>
              ) : (
                filteredGrouped().map((dayGroup) => (
                  <TransactionAccordion
                    key={dayGroup.date}
                    dayGroup={dayGroup}
                    filterType={activeTab === 'all' ? null : activeTab}
                    onEdit={openEditTx}
                    onDelete={deleteTx}
                    highlightedTxId={highlightedTxId}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'all' && (() => {
            const byCat = {};
            expensesByCategory.forEach((r) => {
              const id = r.categoryId ?? 'sin-categoria';
              byCat[id] = { categoryId: r.categoryId, categoryName: r.categoryName, categoryIcon: r.categoryIcon, totalExpense: r.total, totalIncome: 0 };
            });
            incomesByCategory.forEach((r) => {
              const id = r.categoryId ?? 'sin-categoria';
              if (!byCat[id]) byCat[id] = { categoryId: r.categoryId, categoryName: r.categoryName, categoryIcon: r.categoryIcon, totalExpense: 0, totalIncome: 0 };
              byCat[id].totalIncome = r.total;
              if (!byCat[id].categoryName) byCat[id].categoryName = r.categoryName;
              if (!byCat[id].categoryIcon) byCat[id].categoryIcon = r.categoryIcon;
            });
            const mergedCategories = Object.values(byCat).sort((a, b) => (b.totalExpense + b.totalIncome) - (a.totalExpense + a.totalIncome));
            const totalExp = expensesByCategory.reduce((s, r) => s + r.total, 0);
            const totalInc = incomesByCategory.reduce((s, r) => s + r.total, 0);
            const fmt = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n);
            return (
          <div style={styles.summaryBlock}>
            <div style={styles.summaryHeader}>
              <button
                type="button"
                onClick={() => setSummaryOpen(!summaryOpen)}
                style={styles.summaryHeaderToggle}
              >
                <span>Resumen del mes (gastos e ingresos)</span>
                <span style={styles.chevron}>
                  {summaryOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </span>
              </button>
              {summaryOpen && summaryTab === 'list' && mergedCategories.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const allExpanded = mergedCategories.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]);
                    setExpandedSummaryCategoryIds(allExpanded ? {} : mergedCategories.reduce((acc, row) => ({ ...acc, [row.categoryId ?? 0]: true }), {}));
                  }}
                  style={styles.summaryCollapseAllBtn}
                  title={mergedCategories.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir todas las categorías' : 'Expandir todas las categorías'}
                  aria-label={mergedCategories.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir categorías' : 'Expandir categorías'}
                >
                  {mergedCategories.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </button>
              )}
            </div>
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {mergedCategories.length === 0 ? (
                  <p style={styles.empty}>No hay movimientos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    <div style={styles.summaryTabs}>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'list' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('list')}>Listado</button>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'chart' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('chart')}>Gráfico</button>
                    </div>
                    {summaryTab === 'list' && (
                      <>
                    {mergedCategories.map((row) => {
                      const catKey = row.categoryId ?? 0;
                      const isExpanded = expandedSummaryCategoryIds[catKey];
                      const txs = transactionsByCategory[catKey] || [];
                      return (
                        <div key={String(catKey)} style={styles.summaryCategoryWrap}>
                          <button
                            type="button"
                            style={styles.summaryRowButton}
                            onClick={() => setExpandedSummaryCategoryIds((p) => ({ ...p, [catKey]: !p[catKey] }))}
                          >
                            <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                            <div style={styles.summaryCatInfo}>
                              <span style={styles.summaryCatName}>{row.categoryName}</span>
                            </div>
                            <div style={styles.summaryCatAmounts}>
                              {row.totalExpense > 0 && (
                                <span style={styles.summaryCatTotalExpense}>{fmt(row.totalExpense)}</span>
                              )}
                              {row.totalExpense > 0 && row.totalIncome > 0 && <span style={{ margin: '0 0.25rem', color: 'var(--text-muted)' }}>·</span>}
                              {row.totalIncome > 0 && (
                                <span style={styles.summaryCatTotalIncome}>{fmt(row.totalIncome)}</span>
                              )}
                            </div>
                            <span style={styles.summaryChevronSmall}>
                              {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                            </span>
                          </button>
                          {isExpanded && txs.length > 0 && (
                            <div style={styles.summaryCategoryDetail}>
                              {txs.map((tx) => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  className="summary-tx-row-btn"
                                  style={styles.summaryTxRowButton}
                                  onClick={() => goToTransaction(tx)}
                                  title="Ir al movimiento en el mes"
                                >
                                  <span style={styles.summaryTxDay}>
                                    {new Date(tx.date + 'T12:00:00').getDate()}
                                  </span>
                                  <span style={styles.summaryTxName}>{tx.name}</span>
                                  <span style={tx.type === 'income' ? styles.summaryCatTotalIncome : styles.summaryCatTotalExpense}>
                                    {tx.type === 'income' ? '+' : ''}{fmt(tx.amount)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={styles.summaryTotalRow}>
                      <span>Total gastos</span>
                      <span style={styles.summaryTotalAmountExpense}>{fmt(totalExp)}</span>
                    </div>
                    <div style={styles.summaryTotalRow}>
                      <span>Total ingresos</span>
                      <span style={styles.summaryTotalAmountIncome}>{fmt(totalInc)}</span>
                    </div>
                      </>
                    )}
                    {summaryTab === 'chart' && (
                      <div style={styles.summaryChartWrap}>
                        {totalExp > 0 && (
                          <div style={styles.summaryChartSection}>
                            <div style={styles.summaryChartSectionTitle}>Gastos por categoría</div>
                            {mergedCategories.filter((r) => r.totalExpense > 0).map((row) => {
                              const pct = totalExp > 0 ? (row.totalExpense / totalExp) * 100 : 0;
                              return (
                                <div key={`exp-${row.categoryId ?? 0}`} style={styles.summaryChartRow}>
                                  <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                                  <span style={styles.summaryChartLabel}>{row.categoryName}</span>
                                  <div style={styles.summaryChartBarWrap}>
                                    <div style={{ ...styles.summaryChartBar, ...styles.summaryBarExpense, width: `${pct}%` }} />
                                  </div>
                                  <span style={styles.summaryCatTotalExpense}>{fmt(row.totalExpense)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {totalInc > 0 && (
                          <div style={styles.summaryChartSection}>
                            <div style={styles.summaryChartSectionTitle}>Ingresos por categoría</div>
                            {mergedCategories.filter((r) => r.totalIncome > 0).map((row) => {
                              const pct = totalInc > 0 ? (row.totalIncome / totalInc) * 100 : 0;
                              return (
                                <div key={`inc-${row.categoryId ?? 0}`} style={styles.summaryChartRow}>
                                  <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                                  <span style={styles.summaryChartLabel}>{row.categoryName}</span>
                                  <div style={styles.summaryChartBarWrap}>
                                    <div style={{ ...styles.summaryChartBar, ...styles.summaryBarIncome, width: `${pct}%` }} />
                                  </div>
                                  <span style={styles.summaryCatTotalIncome}>{fmt(row.totalIncome)}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
            );
          })()}

          {activeTab === 'expense' && (
          <div style={styles.summaryBlock}>
            <div style={styles.summaryHeader}>
              <button
                type="button"
                onClick={() => setSummaryOpen(!summaryOpen)}
                style={styles.summaryHeaderToggle}
              >
                <span>Resumen de gastos</span>
                <span style={styles.summaryHeaderTotalExpense}>
                  {expensesByCategory.length > 0
                    ? new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(
                        expensesByCategory.reduce((s, r) => s + r.total, 0)
                      )
                    : '—'}
                </span>
                <span style={styles.chevron}>
                  {summaryOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </span>
              </button>
              {summaryOpen && summaryTab === 'list' && expensesByCategory.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const allExpanded = expensesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]);
                    setExpandedSummaryCategoryIds(allExpanded ? {} : expensesByCategory.reduce((acc, row) => ({ ...acc, [row.categoryId ?? 0]: true }), {}));
                  }}
                  style={styles.summaryCollapseAllBtn}
                  title={expensesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir todas las categorías' : 'Expandir todas las categorías'}
                  aria-label={expensesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir categorías' : 'Expandir categorías'}
                >
                  {expensesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </button>
              )}
            </div>
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {expensesByCategory.length === 0 ? (
                  <p style={styles.empty}>No hay gastos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    <div style={styles.summaryTabs}>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'list' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('list')}>Listado</button>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'chart' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('chart')}>Gráfico</button>
                    </div>
                    {summaryTab === 'list' && (
                      <>
                    {expensesByCategory.map((row) => {
                      const catKey = row.categoryId ?? 0;
                      const isExpanded = expandedSummaryCategoryIds[catKey];
                      const txs = (transactionsByCategory[catKey] || []).filter((t) => t.type === 'expense');
                      const totalAll = expensesByCategory.reduce((s, r) => s + r.total, 0);
                      const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                      return (
                        <div key={String(catKey)} style={styles.summaryCategoryWrap}>
                          <button
                            type="button"
                            style={styles.summaryRowButton}
                            onClick={() => setExpandedSummaryCategoryIds((p) => ({ ...p, [catKey]: !p[catKey] }))}
                          >
                            <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                            <div style={styles.summaryCatInfo}>
                              <span style={styles.summaryCatName}>{row.categoryName}</span>
                              <div style={styles.summaryBarWrap}>
                                <div
                                  style={{
                                    ...styles.summaryBar,
                                    ...styles.summaryBarExpense,
                                    width: `${pct}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div style={styles.summaryCatAmounts}>
                              <span style={styles.summaryCatTotalExpense}>
                                {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                                <span style={styles.summaryCatPct}> · {totalAll > 0 ? pct.toFixed(0) : 0}%</span>
                              </span>
                            </div>
                            <span style={styles.summaryChevronSmall}>
                              {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                            </span>
                          </button>
                          {isExpanded && txs.length > 0 && (
                            <div style={styles.summaryCategoryDetail}>
                              {txs.map((tx) => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  className="summary-tx-row-btn"
                                  style={styles.summaryTxRowButton}
                                  onClick={() => goToTransaction(tx)}
                                  title="Ir al gasto en el mes"
                                >
                                  <span style={styles.summaryTxDay}>
                                    {new Date(tx.date + 'T12:00:00').getDate()}
                                  </span>
                                  <span style={styles.summaryTxName}>{tx.name}</span>
                                  <span style={styles.summaryCatTotalExpense}>
                                    {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={styles.summaryTotalRow}>
                      <span>Total gastos</span>
                      <span style={styles.summaryTotalAmountExpense}>
                        {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(
                          expensesByCategory.reduce((s, r) => s + r.total, 0)
                        )}
                      </span>
                    </div>
                      </>
                    )}
                    {summaryTab === 'chart' && (() => {
                      const totalAll = expensesByCategory.reduce((s, r) => s + r.total, 0);
                      return (
                        <div style={styles.summaryChartWrap}>
                          <div style={styles.summaryChartSection}>
                            {expensesByCategory.map((row) => {
                              const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                              return (
                                <div key={String(row.categoryId ?? 0)} style={styles.summaryChartRow}>
                                  <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                                  <span style={styles.summaryChartLabel}>{row.categoryName}</span>
                                  <div style={styles.summaryChartBarWrap}>
                                    <div style={{ ...styles.summaryChartBar, ...styles.summaryBarExpense, width: `${pct}%` }} />
                                  </div>
                                  <span style={styles.summaryCatTotalExpense}>
                                    {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div style={styles.summaryTotalRow}>
                            <span>Total gastos</span>
                            <span style={styles.summaryTotalAmountExpense}>
                              {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(totalAll)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          )}

          {activeTab === 'income' && (
          <div style={styles.summaryBlock}>
            <div style={styles.summaryHeader}>
              <button
                type="button"
                onClick={() => setSummaryOpen(!summaryOpen)}
                style={styles.summaryHeaderToggle}
              >
                <span>Resumen de ingresos</span>
                <span style={styles.summaryHeaderTotalIncome}>
                  {incomesByCategory.length > 0
                    ? new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(
                        incomesByCategory.reduce((s, r) => s + r.total, 0)
                      )
                    : '—'}
                </span>
                <span style={styles.chevron}>
                  {summaryOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </span>
              </button>
              {summaryOpen && summaryTab === 'list' && incomesByCategory.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const allExpanded = incomesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]);
                    setExpandedSummaryCategoryIds(allExpanded ? {} : incomesByCategory.reduce((acc, row) => ({ ...acc, [row.categoryId ?? 0]: true }), {}));
                  }}
                  style={styles.summaryCollapseAllBtn}
                  title={incomesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir todas las categorías' : 'Expandir todas las categorías'}
                  aria-label={incomesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? 'Comprimir categorías' : 'Expandir categorías'}
                >
                  {incomesByCategory.every((row) => expandedSummaryCategoryIds[row.categoryId ?? 0]) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </button>
              )}
            </div>
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {incomesByCategory.length === 0 ? (
                  <p style={styles.empty}>No hay ingresos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    <div style={styles.summaryTabs}>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'list' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('list')}>Listado</button>
                      <button type="button" style={{ ...styles.summaryTabBtn, ...(summaryTab === 'chart' ? styles.summaryTabBtnActive : {}) }} onClick={() => setSummaryTab('chart')}>Gráfico</button>
                    </div>
                    {summaryTab === 'list' && (
                      <>
                    {incomesByCategory.map((row) => {
                      const catKey = row.categoryId ?? 0;
                      const isExpanded = expandedSummaryCategoryIds[catKey];
                      const txs = (transactionsByCategory[catKey] || []).filter((t) => t.type === 'income');
                      const totalAll = incomesByCategory.reduce((s, r) => s + r.total, 0);
                      const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                      return (
                        <div key={String(catKey)} style={styles.summaryCategoryWrap}>
                          <button
                            type="button"
                            style={styles.summaryRowButton}
                            onClick={() => setExpandedSummaryCategoryIds((p) => ({ ...p, [catKey]: !p[catKey] }))}
                          >
                            <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                            <div style={styles.summaryCatInfo}>
                              <span style={styles.summaryCatName}>{row.categoryName}</span>
                              <div style={styles.summaryBarWrap}>
                                <div
                                  style={{
                                    ...styles.summaryBar,
                                    ...styles.summaryBarIncome,
                                    width: `${pct}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <div style={styles.summaryCatAmounts}>
                              <span style={styles.summaryCatTotalIncome}>
                                {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                                <span style={styles.summaryCatPct}> · {totalAll > 0 ? pct.toFixed(0) : 0}%</span>
                              </span>
                            </div>
                            <span style={styles.summaryChevronSmall}>
                              {isExpanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
                            </span>
                          </button>
                          {isExpanded && txs.length > 0 && (
                            <div style={styles.summaryCategoryDetail}>
                              {txs.map((tx) => (
                                <button
                                  key={tx.id}
                                  type="button"
                                  className="summary-tx-row-btn"
                                  style={styles.summaryTxRowButton}
                                  onClick={() => goToTransaction(tx)}
                                  title="Ir al ingreso en el mes"
                                >
                                  <span style={styles.summaryTxDay}>
                                    {new Date(tx.date + 'T12:00:00').getDate()}
                                  </span>
                                  <span style={styles.summaryTxName}>{tx.name}</span>
                                  <span style={styles.summaryCatTotalIncome}>
                                    +{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(tx.amount)}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div style={styles.summaryTotalRow}>
                      <span>Total ingresos</span>
                      <span style={styles.summaryTotalAmountIncome}>
                        {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(
                          incomesByCategory.reduce((s, r) => s + r.total, 0)
                        )}
                      </span>
                    </div>
                      </>
                    )}
                    {summaryTab === 'chart' && (() => {
                      const totalAll = incomesByCategory.reduce((s, r) => s + r.total, 0);
                      return (
                        <div style={styles.summaryChartWrap}>
                          <div style={styles.summaryChartSection}>
                            {incomesByCategory.map((row) => {
                              const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                              return (
                                <div key={String(row.categoryId ?? 0)} style={styles.summaryChartRow}>
                                  <span style={styles.summaryCatIcon}>{row.categoryIcon}</span>
                                  <span style={styles.summaryChartLabel}>{row.categoryName}</span>
                                  <div style={styles.summaryChartBarWrap}>
                                    <div style={{ ...styles.summaryChartBar, ...styles.summaryBarIncome, width: `${pct}%` }} />
                                  </div>
                                  <span style={styles.summaryCatTotalIncome}>
                                    +{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <div style={styles.summaryTotalRow}>
                            <span>Total ingresos</span>
                            <span style={styles.summaryTotalAmountIncome}>
                              {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(totalAll)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  primaryAccountCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    width: '100%',
    boxSizing: 'border-box',
  },
  primaryAccountRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
  primaryAccountLabel: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  primaryAccountName: { fontWeight: 600, color: 'var(--text)' },
  primaryAccountBalanceWrap: { marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' },
  primaryAccountBalance: { fontWeight: 700, fontSize: '1.1rem' },
  primaryAccountTotals: {
    display: 'flex',
    gap: '1.5rem',
    marginTop: '0.25rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--border)',
  },
  primaryAccountTotalItem: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  primaryAccountTotalLabel: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  primaryAccountTotalAmount: { fontWeight: 600, fontSize: '0.95rem' },
  accountTabsWrap: { display: 'flex', gap: '0.35rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.15rem', flexWrap: 'wrap', WebkitOverflowScrolling: 'touch' },
  accountTab: { padding: '0.5rem 0.85rem', fontSize: '0.9rem', fontWeight: 500, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s, color 0.15s, border-color 0.15s' },
  accountTabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  movimientosActions: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    width: '100%',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 1rem',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    color: '#fff',
    transition: 'opacity 0.15s, transform 0.1s',
  },
  actionBtnSymbol: { fontSize: '1.1rem', lineHeight: 1 },
  actionBtnExpense: { background: 'var(--expense)' },
  actionBtnIncome: { background: 'var(--income)' },
  actionBtnCapture: { background: 'var(--text-muted)', color: 'var(--bg)' },
  quickBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', boxSizing: 'border-box' },
  quickChip: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', color: '#fff' },
  quickChipIcon: { fontSize: '1rem', lineHeight: 1 },
  quickChipExpense: { background: 'var(--expense)' },
  quickChipIncome: { background: 'var(--income)' },
  chartBlock: { marginBottom: '1.25rem', width: '100%' },
  chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' },
  chartTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },
  chartYearSelect: { width: 'auto', minWidth: '5.5rem' },
  chartEmpty: { fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0, padding: '1rem 0' },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem' },
  tab: { padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' },
  tabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  navMonth: { marginBottom: '1rem', width: '100%' },
  monthYear: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
  select: { padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', minHeight: 'var(--touch-min)', fontFamily: 'inherit', cursor: 'pointer' },
  hint: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' },
  searchBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', width: '100%' },
  searchInput: { flex: '1 1 12rem', minWidth: 0, padding: '0.5rem 1rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  searchSelect: { flex: '1 1 10rem', minWidth: 0, padding: '0.5rem 1rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  searchDay: { width: '5rem', minWidth: '5rem', flexShrink: 0, padding: '0.5rem 0.75rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', textAlign: 'center' },
  searchClear: { padding: '0.5rem 1rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' },
  accordions: { marginTop: '0.5rem', width: '100%' },
  accountSection: { marginBottom: '1.5rem', width: '100%' },
  accountSectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', marginTop: 0 },
  empty: { color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 },
  summaryBlock: { marginTop: '1.5rem', marginBottom: '0.5rem', width: '100%' },
  summaryHeader: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.5rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
  },
  summaryHeaderToggle: {
    flex: 1,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    padding: 0,
    background: 'none',
    border: 'none',
    color: 'var(--text)',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  summaryHeaderTotal: { color: 'var(--expense)', fontWeight: 700 },
  summaryHeaderTotalExpense: { color: 'var(--expense)', fontWeight: 700 },
  summaryHeaderTotalIncome: { color: 'var(--income)', fontWeight: 700 },
  summaryCollapseAllBtn: {
    flexShrink: 0,
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    padding: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  chevron: { color: 'var(--text-muted)' },
  summaryContent: {
    marginTop: '0.25rem',
    marginLeft: '0.5rem',
    borderLeft: '2px solid var(--border)',
    paddingLeft: '0.75rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
  },
  summaryTabs: {
    display: 'flex',
    gap: '0.25rem',
    marginBottom: '0.75rem',
  },
  summaryTabBtn: {
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    fontWeight: 500,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  summaryTabBtnActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#fff',
  },
  summaryChartWrap: { marginTop: '0.25rem' },
  summaryChartSection: { marginBottom: '1rem' },
  summaryChartSectionTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.5rem',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  summaryChartRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.4rem',
    fontSize: '0.9rem',
  },
  summaryChartLabel: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  summaryChartBarWrap: {
    flex: '1 1 80px',
    minWidth: 60,
    height: 8,
    background: 'var(--surface-hover)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryChartBar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 2,
  },
  summarySection: {
    marginBottom: '1.25rem',
  },
  summarySectionTitle: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '0.5rem',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  summaryCategoryWrap: { marginBottom: '0.35rem' },
  summaryRowButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.35rem 0.5rem',
    background: 'var(--surface-hover)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.85rem',
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  summaryChevronSmall: { color: 'var(--text-muted)', flexShrink: 0 },
  summaryCategoryDetail: {
    marginTop: '0.2rem',
    marginLeft: '0.4rem',
    marginBottom: '0.5rem',
    paddingLeft: '0.5rem',
    borderLeft: '1px solid var(--border)',
  },
  summaryTxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.25rem 0',
    fontSize: '0.85rem',
  },
  summaryTxRowButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    width: '100%',
    padding: '0.35rem 0',
    fontSize: '0.85rem',
    background: 'none',
    border: 'none',
    color: 'inherit',
    font: 'inherit',
    textAlign: 'left',
    cursor: 'pointer',
    borderRadius: 'var(--radius)',
  },
  summaryTxDay: {
    minWidth: '1.5rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  summaryTxName: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  summaryCatIcon: { fontSize: '1.1rem', flexShrink: 0 },
  summaryCatInfo: { flex: 1, minWidth: 0 },
  summaryCatName: { fontSize: '0.9rem' },
  summaryBarWrap: {
    height: 4,
    marginTop: '0.2rem',
    background: 'var(--surface-hover)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  summaryBar: {
    height: '100%',
    borderRadius: 2,
    minWidth: 2,
  },
  summaryBarExpense: { background: 'var(--expense)' },
  summaryBarIncome: { background: 'var(--income)' },
  summaryCatTotal: { color: 'var(--expense)', fontWeight: 600, fontSize: '0.9rem' },
  summaryCatAmounts: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', flexShrink: 0, marginLeft: 'auto' },
  summaryCatTotalExpense: { color: 'var(--expense)', fontWeight: 600, fontSize: '0.9rem' },
  summaryCatTotalIncome: { color: 'var(--income)', fontWeight: 600, fontSize: '0.9rem' },
  summaryCatPct: { color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.25rem' },
  summaryTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '0.75rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--border)',
    fontWeight: 600,
    fontSize: '1rem',
  },
  summaryTotalAmount: { color: 'var(--expense)' },
  summaryTotalAmountExpense: { color: 'var(--expense)' },
  summaryTotalAmountIncome: { color: 'var(--income)' },
};
