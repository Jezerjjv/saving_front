import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import TransactionAccordion from '../components/TransactionAccordion';
import TransactionForm from '../components/TransactionForm';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconApply, IconChevronDown, IconChevronUp, IconChevronRight, IconFileText } from '../components/Icons.jsx';

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
const DEFS_BUTTON_LABEL = 'Rápidos y Fijos';

export default function Transactions() {
  const { showMessage, confirm } = useMessage();
  const { primaryAccountId, blurBalance } = useAppSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
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
  const [definitionsModalOpen, setDefinitionsModalOpen] = useState(false);
  const [definitionsModalTab, setDefinitionsModalTab] = useState('expense');
  const [applyingFixedIncomes, setApplyingFixedIncomes] = useState(false);
  const [applyingFixedExpenses, setApplyingFixedExpenses] = useState(false);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [applyingQuickId, setApplyingQuickId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [searchCategoryId, setSearchCategoryId] = useState('');
  const [searchDay, setSearchDay] = useState('');

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

  const load = () => {
    setLoading(true);
    Promise.all([
      api.transactions.grouped(month, year),
      api.transactions.expensesByCategory(month, year),
      api.accounts.list(),
      api.categories.list(),
      api.fixedExpenses.list(),
      api.fixedIncomes.list(),
      api.quickTemplates.list({ type: 'expense' }),
      api.quickTemplates.list({ type: 'income' }),
    ])
      .then(([g, byCat, a, c, fe, fi, qe, qi]) => {
        setGrouped(Array.isArray(g) ? g : []);
        setExpensesByCategory(Array.isArray(byCat) ? byCat : []);
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
      <div style={styles.header}>
        <h1 style={styles.title}>Movimientos</h1>
      </div>

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

      <div className="tabs-row">
        <div className="tabs-add-buttons">
          <button type="button" onClick={() => openAdd('expense', 'normal')} style={styles.btnExpense} className="touch-target" aria-label="Añadir gasto">
            <span className="btn-add-symbol">+</span>
            <span className="btn-add-label"> Añadir gasto</span>
          </button>
          <button type="button" onClick={() => openAdd('income', 'normal')} style={styles.btnIncome} className="touch-target" aria-label="Añadir ingreso">
            <span className="btn-add-symbol">+</span>
            <span className="btn-add-label"> Añadir ingreso</span>
          </button>
        </div>
        <div className="tabs-filters">
          {MAIN_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{ ...styles.tab, ...(activeTab === tab.id ? styles.tabActive : {}) }}
              title={tab.label}
            >
              {tab.id === 'all' && (
                <>
                  <IconChevronDown size={18} style={{ color: 'var(--expense)' }} className="tabs-filter-icon" />
                  <IconChevronUp size={18} style={{ color: 'var(--income)' }} className="tabs-filter-icon" />
                </>
              )}
              {tab.id === 'expense' && <IconChevronDown size={18} style={{ color: 'var(--expense)' }} className="tabs-filter-icon" />}
              {tab.id === 'income' && <IconChevronUp size={18} style={{ color: 'var(--income)' }} className="tabs-filter-icon" />}
              <span className="tabs-filter-label">{tab.label}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDefinitionsModalOpen(true)}
            style={{ ...styles.tab, ...(definitionsModalOpen ? styles.tabActive : {}) }}
            title={DEFS_BUTTON_LABEL}
          >
            <IconFileText size={18} className="tabs-filter-icon" />
            <span className="tabs-filter-label tabs-filter-label-full">{DEFS_BUTTON_LABEL}</span>
            <span className="tabs-filter-label tabs-filter-label-short">R. y F.</span>
          </button>
        </div>
      </div>

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

      {definitionsModalOpen && (
        <div className="modal-overlay-dark-scroll" style={styles.modalOverlay} onClick={() => setDefinitionsModalOpen(false)}>
          <div className="modal-definitions" style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{DEFS_BUTTON_LABEL}</h2>
              <button type="button" onClick={() => setDefinitionsModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={styles.modalTabs}>
              <button
                type="button"
                onClick={() => setDefinitionsModalTab('expense')}
                style={{ ...styles.modalTab, ...(definitionsModalTab === 'expense' ? styles.modalTabActive : {}) }}
              >
                Gastos
              </button>
              <button
                type="button"
                onClick={() => setDefinitionsModalTab('income')}
                style={{ ...styles.modalTab, ...(definitionsModalTab === 'income' ? styles.modalTabActive : {}) }}
              >
                Ingresos
              </button>
            </div>
            <div style={styles.modalBody}>
              {definitionsModalTab === 'expense' && (
                <section style={styles.defBlock}>
                  <section style={styles.defSection}>
                    <h4 style={styles.defSectionTitle}>Gastos fijos</h4>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => { openAdd('expense', 'fixed'); setDefinitionsModalOpen(false); }} style={styles.btnExpense} className="touch-target">+ Crear gasto fijo</button>
                      <button type="button" onClick={applyFixedExpenses} disabled={applyingFixedExpenses} style={styles.btnFixed} className="touch-target">{applyingFixedExpenses ? '…' : 'Aplicar ahora (mes actual)'}</button>
                    </div>
                    <ul style={styles.defList}>
                      {fixedExpenses.map((f) => (
                        <li key={f.id} style={styles.defCard}>
                          <div style={styles.defCardContent}>
                            <div style={styles.defCardName}>{f.name}</div>
                            <div style={styles.defCardMeta}>
                              <span style={styles.amountExpense}>{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(f.amount)}</span>
                              <span style={styles.muted}> · día {f.dayOfMonth ?? 1}</span>
                            </div>
                          </div>
                          <div style={styles.cardActions}>
                            <button type="button" className="btn-icon-action" onClick={() => applySingleFixedExpense(f.id)} style={styles.btnApplyIcon} aria-label="Aplicar" title="Aplicar"><IconApply size={20} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => { openEditFixed(f, 'expense'); setDefinitionsModalOpen(false); }} style={styles.btnIcon} aria-label="Editar"><IconEdit size={18} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => deleteFixedExpense(f.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={18} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {fixedExpenses.length === 0 && <p style={styles.empty}>No hay gastos fijos.</p>}
                  </section>
                  <section style={styles.defSection}>
                    <h4 style={styles.defSectionTitle}>Gastos rápidos</h4>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => { openAdd('expense', 'quick'); setDefinitionsModalOpen(false); }} style={styles.btnExpense} className="touch-target">+ Crear gasto rápido</button>
                    </div>
                    <ul style={styles.defList}>
                      {quickTemplatesExpense.map((t) => (
                        <li key={t.id} style={styles.defCard}>
                          <div style={styles.defCardContent}>
                            <div style={styles.defCardName}>{t.name}</div>
                            <div style={styles.defCardMeta}>
                              <span style={styles.amountExpense}>{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(t.amount)}</span>
                            </div>
                          </div>
                          <div style={styles.cardActions}>
                            <button type="button" className="btn-icon-action" onClick={() => applyQuickTemplate(t)} style={styles.btnApplyIcon} aria-label="Aplicar" title="Aplicar"><IconApply size={20} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => { openEditQuick(t, 'expense'); setDefinitionsModalOpen(false); }} style={styles.btnIcon} aria-label="Editar"><IconEdit size={18} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => deleteQuickTemplate(t.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={18} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {quickTemplatesExpense.length === 0 && <p style={styles.empty}>No hay gastos rápidos.</p>}
                  </section>
                </section>
              )}
              {definitionsModalTab === 'income' && (
                <section style={styles.defBlock}>
                  <section style={styles.defSection}>
                    <h4 style={styles.defSectionTitle}>Ingresos fijos</h4>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => { openAdd('income', 'fixed'); setDefinitionsModalOpen(false); }} style={styles.btnIncome} className="touch-target">+ Crear ingreso fijo</button>
                      <button type="button" onClick={applyFixedIncomes} disabled={applyingFixedIncomes} style={styles.btnFixed} className="touch-target">{applyingFixedIncomes ? '…' : 'Aplicar ahora (mes actual)'}</button>
                    </div>
                    <ul style={styles.defList}>
                      {fixedIncomes.map((f) => (
                        <li key={f.id} style={styles.defCard}>
                          <div style={styles.defCardContent}>
                            <div style={styles.defCardName}>{f.name}</div>
                            <div style={styles.defCardMeta}>
                              <span style={styles.amountIncome}>{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(f.amount)}</span>
                              <span style={styles.muted}> · día {f.dayOfMonth ?? 1}</span>
                            </div>
                          </div>
                          <div style={styles.cardActions}>
                            <button type="button" className="btn-icon-action" onClick={() => applySingleFixedIncome(f.id)} style={styles.btnApplyIconIncome} aria-label="Aplicar" title="Aplicar"><IconApply size={20} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => { openEditFixed(f, 'income'); setDefinitionsModalOpen(false); }} style={styles.btnIcon} aria-label="Editar"><IconEdit size={18} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => deleteFixedIncome(f.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={18} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {fixedIncomes.length === 0 && <p style={styles.empty}>No hay ingresos fijos.</p>}
                  </section>
                  <section style={styles.defSection}>
                    <h4 style={styles.defSectionTitle}>Ingresos rápidos</h4>
                    <div style={styles.actions}>
                      <button type="button" onClick={() => { openAdd('income', 'quick'); setDefinitionsModalOpen(false); }} style={styles.btnIncome} className="touch-target">+ Crear ingreso rápido</button>
                    </div>
                    <ul style={styles.defList}>
                      {quickTemplatesIncome.map((t) => (
                        <li key={t.id} style={styles.defCard}>
                          <div style={styles.defCardContent}>
                            <div style={styles.defCardName}>{t.name}</div>
                            <div style={styles.defCardMeta}>
                              <span style={styles.amountIncome}>{new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(t.amount)}</span>
                            </div>
                          </div>
                          <div style={styles.cardActions}>
                            <button type="button" className="btn-icon-action" onClick={() => applyQuickTemplate(t)} style={styles.btnApplyIconIncome} aria-label="Aplicar" title="Aplicar"><IconApply size={20} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => { openEditQuick(t, 'income'); setDefinitionsModalOpen(false); }} style={styles.btnIcon} aria-label="Editar"><IconEdit size={18} /></button>
                            <button type="button" className="btn-icon-action" onClick={() => deleteQuickTemplate(t.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={18} /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {quickTemplatesIncome.length === 0 && <p style={styles.empty}>No hay ingresos rápidos.</p>}
                  </section>
                </section>
              )}
            </div>
          </div>
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

          <div style={styles.summaryBlock}>
            <button
              type="button"
              onClick={() => setSummaryOpen(!summaryOpen)}
              style={styles.summaryHeader}
            >
              <span>Resumen del mes</span>
              <span style={styles.summaryHeaderTotal}>
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
                                  width: `${pct}%`,
                                }}
                              />
                            </div>
                          </div>
                          <span style={styles.summaryCatTotal}>
                            {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(row.total)}
                            <span style={styles.summaryCatPct}> · {totalAll > 0 ? pct.toFixed(0) : 0}%</span>
                          </span>
                        </div>
                      );
                    })}
                    <div style={styles.summaryTotalRow}>
                      <span>Total gastos</span>
                      <span style={styles.summaryTotalAmount}>
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
        </>
      )}
    </div>
  );
}

const styles = {
  header: { marginBottom: '0.75rem' },
  title: { fontSize: '1.5rem', margin: 0, fontWeight: 600 },
  primaryAccountCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: '0.75rem 1rem',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
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
  quickBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', padding: '0.6rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  quickChip: { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.75rem', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer', color: '#fff' },
  quickChipIcon: { fontSize: '1rem', lineHeight: 1 },
  quickChipExpense: { background: 'var(--expense)' },
  quickChipIncome: { background: 'var(--income)' },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem' },
  tab: { padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' },
  tabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  navMonth: { marginBottom: '1rem' },
  monthYear: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
  select: { padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', minHeight: 'var(--touch-min)', fontFamily: 'inherit', cursor: 'pointer' },
  hint: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' },
  searchBar: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' },
  searchInput: { flex: '1 1 12rem', minWidth: 0, padding: '0.5rem 1rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  searchSelect: { padding: '0.5rem 1rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  searchDay: { width: '6rem', minWidth: '6rem', padding: '0.5rem 0.75rem', minHeight: 'var(--touch-min)', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', textAlign: 'center' },
  searchClear: { padding: '0.5rem 1rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  btnExpense: { padding: '0.6rem 1rem', background: 'var(--expense)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnIncome: { padding: '0.6rem 1rem', background: 'var(--income)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnFixed: { padding: '0.6rem 1rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 500 },
  defList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  defCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: 'var(--touch-min)' },
  defCardContent: { flex: 1, minWidth: 0 },
  defCardName: { fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.3 },
  defCardMeta: { fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-muted)' },
  amountExpense: { color: 'var(--expense)', fontWeight: 500 },
  amountIncome: { color: 'var(--income)', fontWeight: 500 },
  muted: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  cardActions: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' },
  btnApplyIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-apply-bg)', color: 'var(--btn-apply-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnApplyIconIncome: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-apply-bg)', color: 'var(--btn-apply-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  accordions: { marginTop: '0.5rem' },
  empty: { color: 'var(--text-muted)', fontSize: '0.9rem' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' },
  modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', maxWidth: 640, width: '100%', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: '1.15rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.25rem', cursor: 'pointer' },
  modalTabs: { display: 'flex', gap: '0.25rem', padding: '0.75rem 1rem 0', borderBottom: '1px solid var(--border)' },
  modalTab: { padding: '0.5rem 1rem', background: 'transparent', border: 'none', borderBottom: '2px solid transparent', marginBottom: '-1px', color: 'var(--text-muted)', fontSize: '0.95rem', borderRadius: 0 },
  modalTabActive: { color: 'var(--accent)', borderBottom: '2px solid var(--accent)', fontWeight: 600 },
  modalBody: { padding: '1rem' },
  defBlock: { marginBottom: '1.5rem' },
  defBlockTitle: { margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text)' },
  defSection: { marginBottom: '1.25rem' },
  defSectionTitle: { margin: '0 0 0.5rem', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' },
  summaryBlock: { marginTop: '1.5rem', marginBottom: '0.5rem' },
  summaryHeader: {
    width: '100%',
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
  chevron: { color: 'var(--text-muted)' },
  summaryContent: {
    marginTop: '0.25rem',
    marginLeft: '0.5rem',
    borderLeft: '2px solid var(--border)',
    paddingLeft: '0.75rem',
    paddingTop: '0.5rem',
    paddingBottom: '0.5rem',
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
    background: 'var(--expense)',
    borderRadius: 2,
    minWidth: 2,
  },
  summaryCatTotal: { color: 'var(--expense)', fontWeight: 600, fontSize: '0.9rem' },
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
};
