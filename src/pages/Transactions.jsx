import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useMovimientosSidebar } from '../context/MovimientosSidebarContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import TransactionAccordion from '../components/TransactionAccordion';
import TransactionForm from '../components/TransactionForm';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconApply, IconChevronDown, IconChevronUp, IconChevronRight } from '../components/Icons.jsx';

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MAIN_TABS = [
  { id: 'all', label: 'Todo' },
  { id: 'expense', label: 'Gastos' },
  { id: 'income', label: 'Ingresos' },
];
export default function Transactions() {
  const { showMessage, confirm } = useMessage();
  const { primaryAccountId, blurBalance } = useAppSettings();
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
  const [applyingQuickId, setApplyingQuickId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState('');
  const dayNumFromUrl = dayParam != null && dayParam !== '' ? Number(dayParam) : NaN;
  const [searchDay, setSearchDay] = useState((dayNumFromUrl >= 1 && dayNumFromUrl <= 31) ? String(dayNumFromUrl) : '');

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
      setMonthState(Number(monthParam));
      setYearState(Number(yearParam));
    }
  }, [monthParam, yearParam]);

  useEffect(() => {
    const d = dayParam != null && dayParam !== '' ? Number(dayParam) : NaN;
    if (d >= 1 && d <= 31) setSearchDay(String(d));
  }, [dayParam]);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.transactions.grouped(month, year),
      api.transactions.expensesByCategory(month, year),
      api.transactions.incomesByCategory(month, year),
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
  }, [month, year]);

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

  const openAdd = (type, kind = 'normal') => {
    setFormType(type);
    setFormDefaultKind(kind);
    setEditingTx(null);
    setEditingFixed(null);
    setEditingQuick(null);
    setShowForm(true);
  };

  const openAddRef = useRef(openAdd);
  const setActiveTabRef = useRef(setActiveTab);
  openAddRef.current = openAdd;
  setActiveTabRef.current = setActiveTab;

  const sidebarCtxRef = useRef(sidebarContext);
  sidebarCtxRef.current = sidebarContext;

  useEffect(() => {
    const ctx = sidebarCtxRef.current;
    if (!ctx) return;
    ctx.register({
      openAdd: (...args) => openAddRef.current(...args),
      setActiveTab: (id) => setActiveTabRef.current(id),
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
    let result = activeTab === 'all' ? safeGrouped : safeGrouped
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

  useLayoutHeader('Movimientos');

  const primaryAccount = primaryAccountId != null && Array.isArray(accounts) ? accounts.find((a) => a.id === primaryAccountId) : null;
  const primaryTotals = primaryAccountId != null && Array.isArray(grouped) && grouped.length > 0
    ? grouped.reduce(
        (acc, dayGroup) => {
          (Array.isArray(dayGroup.categories) ? dayGroup.categories : []).forEach((cat) => {
            (Array.isArray(cat.items) ? cat.items : []).forEach((t) => {
              if (t.accountId !== primaryAccountId) return;
              if (t.type === 'income') acc.income += t.amount ?? 0;
              else acc.expense += t.amount ?? 0;
            });
          });
          return acc;
        },
        { income: 0, expense: 0 }
      )
    : { income: 0, expense: 0 };

  const fmt = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n);

  return (
    <div className="page-transactions">
      {primaryAccount && (
        <div style={styles.primaryAccountCard}>
          <div style={styles.primaryAccountRow}>
            <span style={styles.primaryAccountLabel}>Cuenta principal</span>
            <span style={styles.primaryAccountName}>{primaryAccount.name}</span>
            <span style={styles.primaryAccountBalanceWrap}>
              <span style={styles.primaryAccountTotalLabel}>Saldo</span>
              <span style={{ ...styles.primaryAccountBalance, color: (primaryAccount.balance ?? 0) >= 0 ? 'var(--income)' : 'var(--expense)' }} className={blurBalance ? 'balance-blur' : ''}>
                {fmt(primaryAccount.balance ?? 0)}
              </span>
            </span>
          </div>
          <div style={styles.primaryAccountTotals}>
            <span style={styles.primaryAccountTotalItem}>
              <span style={styles.primaryAccountTotalLabel}>Ingresos</span>
              <span style={{ ...styles.primaryAccountTotalAmount, color: 'var(--income)' }} className={blurBalance ? 'balance-blur' : ''}>{fmt(primaryTotals.income)}</span>
            </span>
            <span style={styles.primaryAccountTotalItem}>
              <span style={styles.primaryAccountTotalLabel}>Gastos</span>
              <span style={{ ...styles.primaryAccountTotalAmount, color: 'var(--expense)' }} className={blurBalance ? 'balance-blur' : ''}>{fmt(primaryTotals.expense)}</span>
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

      {activeTab === 'all' && (
        <p className="movimientos-hint" style={styles.hint}>Vista de todos los movimientos del mes.</p>
      )}
      {activeTab === 'expense' && (
        <p className="movimientos-hint" style={styles.hint}>Solo gastos del mes.</p>
      )}
      {activeTab === 'income' && (
        <p className="movimientos-hint" style={styles.hint}>Solo ingresos del mes.</p>
      )}

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

      {showForm && (
        <TransactionForm
          type={formType}
          accounts={accounts}
          categories={categories}
          defaultKind={formDefaultKind}
          editingTx={editingTx}
          editingFixed={editingFixed}
          editingQuick={editingQuick}
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
              {filteredGrouped().length === 0 ? (
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
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              style={styles.summaryHeader}
            >
              <span>Resumen del mes (gastos e ingresos)</span>
              <span style={styles.chevron}>
                {summaryOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </span>
            </button>
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {mergedCategories.length === 0 ? (
                  <p style={styles.empty}>No hay movimientos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    {mergedCategories.map((row) => (
                      <div key={row.categoryId ?? 'sin-categoria'} style={styles.summaryRow}>
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
                      </div>
                    ))}
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
              </div>
            )}
          </div>
            );
          })()}

          {activeTab === 'expense' && (
          <div style={styles.summaryBlock}>
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              style={styles.summaryHeader}
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
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {expensesByCategory.length === 0 ? (
                  <p style={styles.empty}>No hay gastos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    {expensesByCategory.map((row) => {
                      const totalAll = expensesByCategory.reduce((s, r) => s + r.total, 0);
                      const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                      return (
                        <div key={row.categoryId ?? 'sin-categoria'} style={styles.summaryRow}>
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
                          <span style={styles.summaryCatTotalExpense}>
                            {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                            <span style={styles.summaryCatPct}> · {totalAll > 0 ? pct.toFixed(0) : 0}%</span>
                          </span>
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
              </div>
            )}
          </div>
          )}

          {activeTab === 'income' && (
          <div style={styles.summaryBlock}>
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              style={styles.summaryHeader}
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
            {summaryOpen && (
              <div style={styles.summaryContent}>
                {incomesByCategory.length === 0 ? (
                  <p style={styles.empty}>No hay ingresos en {MONTHS[month - 1]} {year}.</p>
                ) : (
                  <>
                    {incomesByCategory.map((row) => {
                      const totalAll = incomesByCategory.reduce((s, r) => s + r.total, 0);
                      const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
                      return (
                        <div key={row.categoryId ?? 'sin-categoria'} style={styles.summaryRow}>
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
                          <span style={styles.summaryCatTotalIncome}>
                            {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                            <span style={styles.summaryCatPct}> · {totalAll > 0 ? pct.toFixed(0) : 0}%</span>
                          </span>
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
  quickBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', width: '100%', boxSizing: 'border-box' },
  quickChip: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', color: '#fff' },
  quickChipIcon: { fontSize: '1rem', lineHeight: 1 },
  quickChipExpense: { background: 'var(--expense)' },
  quickChipIncome: { background: 'var(--income)' },
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
  empty: { color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 },
  summaryBlock: { marginTop: '1.5rem', marginBottom: '0.5rem', width: '100%' },
  summaryHeader: {
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'left',
    cursor: 'pointer',
  },
  summaryHeaderTotal: { color: 'var(--expense)', fontWeight: 700 },
  summaryHeaderTotalExpense: { color: 'var(--expense)', fontWeight: 700 },
  summaryHeaderTotalIncome: { color: 'var(--income)', fontWeight: 700 },
  chevron: { color: 'var(--text-muted)' },
  summaryContent: {
    marginTop: '0.25rem',
    marginLeft: '0.5rem',
    borderLeft: '2px solid var(--border)',
    paddingLeft: '0.75rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
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
  summaryCatAmounts: { display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', flexShrink: 0 },
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
