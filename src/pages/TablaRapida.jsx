import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { getTodayLocalDateString } from '../utils/dateUtils';
import { IconEdit, IconTrash, IconEye } from '../components/Icons.jsx';
import Loader from '../components/Loader.jsx';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const TYPES = [
  { id: 'expense', label: 'Gasto' },
  { id: 'income', label: 'Ingreso' },
];

const emptyForm = () => ({
  name: '',
  type: 'expense',
  amount: '',
  categoryId: '',
  date: getTodayLocalDateString(),
});

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

export default function TablaRapida() {
  const { showMessage, confirm } = useMessage();
  const { appCurrency } = useAppSettings();
  const [searchParams, setSearchParams] = useSearchParams();
  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const dayParam = searchParams.get('day');
  const [month, setMonthState] = useState(monthParam ? Number(monthParam) : currentMonth);
  const [year, setYearState] = useState(yearParam ? Number(yearParam) : currentYear);
  const [selectedDay, setSelectedDay] = useState(dayParam !== null && dayParam !== '' ? dayParam : '');
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [quickTemplatesExpense, setQuickTemplatesExpense] = useState([]);
  const [quickTemplatesIncome, setQuickTemplatesIncome] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [applyingQuickId, setApplyingQuickId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showFijosModal, setShowFijosModal] = useState(false);
  const [showQuickBar, setShowQuickBar] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'expense' | 'income'
  const [filterCategoryId, setFilterCategoryId] = useState(''); // '' = todas
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  const dateInputRef = useRef(null);
  const hasSetDefaultDayForMonth = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsNarrowScreen(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isNarrowScreen) setExpandedRowId(null);
  }, [isNarrowScreen]);

  useLayoutHeader('Tabla rápida');

  useEffect(() => {
    if (monthParam && yearParam) {
      const m = Number(monthParam);
      const y = Number(yearParam);
      setMonthState(m);
      setYearState(y);
    }
  }, [monthParam, yearParam]);

  useEffect(() => {
    if (dayParam !== null && dayParam !== '') setSelectedDay(dayParam);
    else setSelectedDay('');
  }, [dayParam]);

  const setMonth = (m) => {
    const val = Math.min(12, Math.max(1, m));
    setMonthState(val);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(val));
      next.set('year', String(year));
      next.delete('day');
      return next;
    });
    setSelectedDay('');
  };

  const setYear = (y) => {
    setYearState(y);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(month));
      next.set('year', String(y));
      next.delete('day');
      return next;
    });
    setSelectedDay('');
  };

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const selectDay = (day) => {
    setSelectedDay(day);
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(month));
      next.set('year', String(year));
      if (day === '') next.delete('day');
      else next.set('day', day);
      return next;
    });
  };

  const load = () => {
    setLoading(true);
    api.quickLog
      .list()
      .then((list) => setEntries(Array.isArray(list) ? list : []))
      .catch((err) => {
        showMessage(err.message || 'Error al cargar', 'error');
        setEntries([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    Promise.all([
      api.categories.list(),
      api.quickTemplates.list({ type: 'expense' }),
      api.quickTemplates.list({ type: 'income' }),
      api.fixedExpenses.list(),
    ])
      .then(([cats, qe, qi, fe]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        setQuickTemplatesExpense(Array.isArray(qe) ? qe.filter((t) => t.showInQuick !== false) : []);
        setQuickTemplatesIncome(Array.isArray(qi) ? qi.filter((t) => t.showInQuick !== false) : []);
        setFixedExpenses(Array.isArray(fe) ? fe : []);
      })
      .catch(() => {});
  }, []);

  const entriesInMonth = useMemo(() => {
    const m = String(month).padStart(2, '0');
    const y = String(year);
    return entries.filter((e) => {
      if (!e.date) return false;
      const [ey, em] = e.date.split('-');
      return em === m && ey === y;
    });
  }, [entries, month, year]);

  const daysWithEntries = useMemo(() => {
    const days = new Set();
    entriesInMonth.forEach((e) => {
      if (e.date) {
        const d = e.date.split('-')[2];
        if (d) days.add(Number(d));
      }
    });
    return Array.from(days).sort((a, b) => b - a);
  }, [entriesInMonth]);

  useEffect(() => {
    if (month !== currentMonth || year !== currentYear) hasSetDefaultDayForMonth.current = false;
  }, [month, year]);

  useEffect(() => {
    const todayNum = now.getDate();
    const noDayInUrl = dayParam === null || dayParam === '';
    if (
      noDayInUrl &&
      month === currentMonth &&
      year === currentYear &&
      !hasSetDefaultDayForMonth.current &&
      daysWithEntries.length > 0 &&
      daysWithEntries.includes(todayNum)
    ) {
      setSelectedDay(String(todayNum));
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', String(month));
        next.set('year', String(year));
        next.set('day', String(todayNum));
        return next;
      });
      hasSetDefaultDayForMonth.current = true;
    }
  }, [month, year, dayParam, daysWithEntries]);

  const displayedEntries = useMemo(() => {
    let list = entriesInMonth;
    if (selectedDay !== '') {
      const dayStr = String(selectedDay).padStart(2, '0');
      list = list.filter((e) => e.date && e.date.split('-')[2] === dayStr);
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '');
      else if (sortBy === 'type') cmp = (a.type || '').localeCompare(b.type || '');
      else if (sortBy === 'amount') cmp = (a.amount ?? 0) - (b.amount ?? 0);
      else if (sortBy === 'category') {
        const nameA = categories.find((c) => c.id === a.categoryId)?.name ?? '';
        const nameB = categories.find((c) => c.id === b.categoryId)?.name ?? '';
        cmp = nameA.localeCompare(nameB);
      }
      return cmp * dir;
    });
  }, [entriesInMonth, selectedDay, sortBy, sortDir, categories]);

  const filteredDisplayedEntries = useMemo(() => {
    let list = displayedEntries;
    if (filterType !== 'all') list = list.filter((e) => e.type === filterType);
    if (filterCategoryId !== '') {
      const catId = filterCategoryId === 'none' ? null : Number(filterCategoryId);
      list = list.filter((e) => (e.categoryId == null ? null : e.categoryId) === catId);
    }
    return list;
  }, [displayedEntries, filterType, filterCategoryId]);

  const totals = useMemo(() => {
    let expense = 0;
    let income = 0;
    filteredDisplayedEntries.forEach((e) => {
      if (e.type === 'income') income += e.amount ?? 0;
      else expense += e.amount ?? 0;
    });
    return { expense, income, balance: income - expense };
  }, [filteredDisplayedEntries]);

  const totalsMonth = useMemo(() => {
    let expense = 0;
    let income = 0;
    entriesInMonth.forEach((e) => {
      if (e.type === 'income') income += e.amount ?? 0;
      else expense += e.amount ?? 0;
    });
    return { expense, income, balance: income - expense };
  }, [entriesInMonth]);

  const fmt = (n) =>
    new Intl.NumberFormat('es', { style: 'currency', currency: appCurrency || 'EUR' }).format(n ?? 0);

  const getCategoryName = (categoryId) => {
    if (categoryId == null || categoryId === '') return '—';
    const c = categories.find((cat) => cat.id === categoryId);
    return c ? `${c.icon || ''} ${c.name}`.trim() || '—' : '—';
  };

  const handleSort = (col) => {
    setSortBy(col);
    setSortDir((prev) => (sortBy === col ? (prev === 'asc' ? 'desc' : 'asc') : 'desc'));
  };

  const applyQuickTemplate = (t) => {
    setApplyingQuickId(`${t.type}-${t.id}`);
    const today = getTodayLocalDateString();
    api.quickLog
      .create({
        name: t.name,
        amount: t.amount,
        type: t.type,
        categoryId: t.categoryId ?? null,
        date: today,
      })
      .then(() => {
        load();
        showMessage('Añadido', 'success');
      })
      .catch((err) => showMessage(err.message || 'Error al añadir', 'error'))
      .finally(() => setApplyingQuickId(null));
  };

  /** Aplicar gasto fijo manualmente: añade una anotación a la tabla rápida (no descuenta de cuenta) */
  const applyFixedExpense = (fe) => {
    setApplyingQuickId(`fixed-${fe.id}`);
    const today = getTodayLocalDateString();
    api.quickLog
      .create({
        name: fe.name,
        amount: fe.amount,
        type: 'expense',
        categoryId: fe.categoryId ?? null,
        date: today,
      })
      .then(() => {
        load();
        showMessage('Gasto fijo anotado', 'success');
      })
      .catch((err) => showMessage(err.message || 'Error al añadir', 'error'))
      .finally(() => setApplyingQuickId(null));
  };

  const openAddModal = (type = 'expense') => {
    setEditingId(null);
    setForm({ ...emptyForm(), type });
    setShowFormModal(true);
  };

  const submitAdd = (e) => {
    e.preventDefault();
    const name = form.name?.trim();
    const amount = Number(form.amount) || 0;
    if (!name) {
      showMessage('Escribe un concepto', 'error');
      return;
    }
    if (amount <= 0) {
      showMessage('El importe debe ser mayor que 0', 'error');
      return;
    }
    api.quickLog
      .create({
        name,
        amount,
        type: form.type,
        categoryId: form.categoryId || null,
        date: form.date,
      })
      .then(() => {
        setForm(emptyForm());
        setShowFormModal(false);
        load();
        showMessage('Añadido', 'success');
      })
      .catch((err) => showMessage(err.message || 'Error al guardar', 'error'));
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      type: row.type,
      amount: String(row.amount),
      categoryId: row.categoryId ?? '',
      date: row.date ? String(row.date).slice(0, 10) : getTodayLocalDateString(),
    });
    setShowFormModal(true);
  };

  const submitEdit = (e) => {
    e.preventDefault();
    const name = form.name?.trim();
    const amount = Number(form.amount) || 0;
    if (!name || amount <= 0) {
      showMessage('Concepto e importe válidos son obligatorios', 'error');
      return;
    }
    api.quickLog
      .update(editingId, {
        name,
        amount,
        type: form.type,
        categoryId: form.categoryId || null,
        date: form.date,
      })
      .then(() => {
        setEditingId(null);
        setForm(emptyForm());
        setShowFormModal(false);
        load();
        showMessage('Actualizado', 'success');
      })
      .catch((err) => showMessage(err.message || 'Error al actualizar', 'error'));
  };

  const closeModal = () => {
    setShowFormModal(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const deleteEntry = (id) => {
    confirm({
      title: 'Eliminar',
      message: '¿Eliminar esta anotación?',
      onConfirm: () =>
        api.quickLog
          .delete(id)
          .then(() => {
            load();
            if (editingId === id) closeModal();
            showMessage('Eliminado', 'success');
          })
          .catch((err) => showMessage(err.message || 'Error al eliminar', 'error')),
    });
  };

  const styles = {
    wrap: { width: '100%', boxSizing: 'border-box' },
    topButtons: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
    topBtn: { padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s' },
    topBtnActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
    addCombo: { display: 'inline-flex', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)' },
    addComboBtn: { padding: '0.35rem 0.65rem', fontSize: '1.05rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s', lineHeight: 1 },
    addComboMinus: { background: 'var(--expense)', color: '#fff' },
    addComboPlus: { background: 'var(--income)', color: '#fff' },
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
    quickBarLabel: { fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.25rem', alignSelf: 'center' },
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
    quickChipExpense: { background: 'var(--expense)' },
    quickChipIncome: { background: 'var(--income)' },
    quickChipIconOnly: { minWidth: '2.5rem', minHeight: '2.5rem', padding: '0.4rem', justifyContent: 'center' },
    quickChipFixed: { background: 'transparent', color: 'var(--expense)', border: '2px solid var(--expense)' },
    quickChipIcon: { fontSize: '1.2rem', lineHeight: 1 },
    addBtn: { padding: '0.5rem 1.25rem', fontSize: '0.95rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff', marginBottom: '1rem' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', boxSizing: 'border-box' },
    modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', maxWidth: 420, width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
    modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600 },
    modalCloseBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1, padding: '0.25rem', cursor: 'pointer', borderRadius: 8 },
    modalBody: { padding: '1.25rem' },
    form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    formField: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
    formLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 },
    formInput: {
      padding: '0.5rem 0.75rem',
      fontSize: '1rem',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      background: 'var(--surface)',
      color: 'var(--text)',
      width: '100%',
      minWidth: 0,
      boxSizing: 'border-box',
    },
    formSelect: { padding: '0.5rem 0.75rem', fontSize: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box' },
    formRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
    formRowField: { flex: '1 1 120px', minWidth: 0 },
    formActions: { display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' },
    formBtn: { padding: '0.5rem 1.25rem', fontSize: '0.95rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    formBtnCancel: { background: 'var(--surface-hover)', color: 'var(--text)', border: '1px solid var(--border)' },
    tableWrap: { width: '100%', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' },
    th: { padding: '0.35rem 0.5rem', textAlign: 'left', fontWeight: 600, background: 'var(--surface-hover)', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', fontSize: '0.8rem' },
    thActions: { cursor: 'default', borderRight: 'none' },
    tr: { borderBottom: '1px solid var(--border)' },
    trAlt: { background: 'var(--surface)' },
    td: { padding: '0.28rem 0.5rem', borderRight: '1px solid var(--border)', verticalAlign: 'middle', lineHeight: 1.3 },
    tdAmount: { fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap' },
    tdActions: { padding: '0.2rem 0.35rem', borderRight: 'none', whiteSpace: 'nowrap' },
    typeBadge: { fontWeight: 600, fontSize: '0.75rem' },
    excelActionBtn: { padding: '2px', margin: '0 2px', border: 'none', borderRadius: '6px', minWidth: 0, minHeight: 0, width: 26, height: 26, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.15s' },
    excelActionBtnView: { background: '#5dade2', color: '#fff' },
    excelActionBtnEdit: { background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)' },
    excelActionBtnDelete: { background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)' },
    totals: { marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' },
    totalsLeft: { display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' },
    totalsMonthDivider: { width: 1, alignSelf: 'stretch', minHeight: 28, background: 'var(--border)' },
    totalsRight: { display: 'flex', flexDirection: 'column', gap: '0.2rem', marginLeft: 'auto' },
    totalMonthLabel: { fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 },
    totalMonthRow: { display: 'flex', gap: '1rem' },
    totalItem: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
    totalLabel: { fontSize: '0.75rem', color: 'var(--text-muted)' },
    totalValue: { fontWeight: 700, fontSize: '1rem' },
    empty: { color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, padding: '1.5rem' },
    navMonthRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' },
    navMonth: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
    navMonthBtn: { width: '2.25rem', height: '2.25rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '1.25rem', cursor: 'pointer', padding: 0 },
    navMonthLabel: { fontSize: '1rem', fontWeight: 600, color: 'var(--text)', minWidth: '10rem', textAlign: 'center' },
    categoryFilterWrap: { display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' },
    categoryFilterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 },
    categoryFilterSelect: { padding: '0.35rem 0.6rem', fontSize: '0.9rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', minWidth: '8rem' },
    filterCombo: { display: 'inline-flex', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '0.75rem' },
    filterComboBtn: { padding: '0.4rem 0.9rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, opacity 0.15s' },
    filterComboGastos: { background: 'var(--expense)', color: '#fff' },
    filterComboIngresos: { background: 'var(--income)', color: '#fff' },
    filterComboTodo: { background: 'var(--surface)', color: 'var(--text-muted)' },
    filterComboActive: { opacity: 1, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.5)' },
    dayTabsWrap: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' },
    dayTab: { padding: '0.4rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' },
    dayTabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
    fijosApplyBtn: { padding: '0.35rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    trDetail: { background: 'var(--surface-hover)' },
    tdDetail: { padding: '0.5rem 0.75rem', borderRight: 'none', verticalAlign: 'middle' },
    detailRow: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' },
    detailActions: { display: 'inline-flex', gap: '0.35rem', marginLeft: 'auto' },
  };

  const hasQuickTemplates = quickTemplatesExpense.length > 0 || quickTemplatesIncome.length > 0;
  const hasFixedExpenses = fixedExpenses.length > 0;

  return (
    <div className="page-tabla-rapida" style={styles.wrap}>
      <div style={styles.topButtons} role="group" aria-label="Acciones rápidas">
        <button
          type="button"
          onClick={() => setShowQuickBar((v) => !v)}
          style={{ ...styles.topBtn, ...(showQuickBar ? styles.topBtnActive : {}) }}
          className="touch-target"
          aria-pressed={showQuickBar}
        >
          Rápidos
        </button>
        <button
          type="button"
          onClick={() => setShowFijosModal(true)}
          style={styles.topBtn}
          className="touch-target"
        >
          Fijos
        </button>
        <div style={styles.addCombo} className="tabla-rapida-add-combo" role="group" aria-label="Añadir gasto o ingreso">
          <button
            type="button"
            onClick={() => openAddModal('expense')}
            style={{ ...styles.addComboBtn, ...styles.addComboMinus }}
            className="touch-target"
            title="Añadir gasto"
            aria-label="Añadir gasto"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => openAddModal('income')}
            style={{ ...styles.addComboBtn, ...styles.addComboPlus }}
            className="touch-target"
            title="Añadir ingreso"
            aria-label="Añadir ingreso"
          >
            +
          </button>
        </div>
      </div>

      {showQuickBar && hasQuickTemplates && (
        <div className="tabla-rapida-quick-bar" style={styles.quickBar}>
          {quickTemplatesExpense.map((t) => {
            const icon = t.icon || categories.find((c) => c.id === t.categoryId)?.icon || '💸';
            return (
              <button
                key={`expense-${t.id}`}
                type="button"
                onClick={() => applyQuickTemplate(t)}
                disabled={applyingQuickId !== null}
                style={{ ...styles.quickChip, ...styles.quickChipExpense, ...styles.quickChipIconOnly }}
                className="touch-target"
                title={t.name}
                aria-label={t.name}
              >
                <span style={styles.quickChipIcon}>{applyingQuickId === `expense-${t.id}` ? '…' : icon}</span>
              </button>
            );
          })}
          {quickTemplatesIncome.map((t) => {
            const icon = t.icon || categories.find((c) => c.id === t.categoryId)?.icon || '💰';
            return (
              <button
                key={`income-${t.id}`}
                type="button"
                onClick={() => applyQuickTemplate(t)}
                disabled={applyingQuickId !== null}
                style={{ ...styles.quickChip, ...styles.quickChipIncome, ...styles.quickChipIconOnly }}
                className="touch-target"
                title={t.name}
                aria-label={t.name}
              >
                <span style={styles.quickChipIcon}>{applyingQuickId === `income-${t.id}` ? '…' : icon}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="tabla-rapida-totals" style={styles.totals}>
        <div style={styles.totalsLeft}>
          <div style={styles.totalItem}>
            <span style={styles.totalLabel}>Total gastos</span>
            <span style={{ ...styles.totalValue, color: 'var(--expense)' }}>{fmt(totals.expense)}</span>
          </div>
          <div style={styles.totalItem}>
            <span style={styles.totalLabel}>Total ingresos</span>
            <span style={{ ...styles.totalValue, color: 'var(--income)' }}>{fmt(totals.income)}</span>
          </div>
          <div style={styles.totalItem}>
            <span style={styles.totalLabel}>Diferencia</span>
            <span
              style={{
                ...styles.totalValue,
                color: totals.balance >= 0 ? 'var(--income)' : 'var(--expense)',
              }}
            >
              {fmt(totals.balance)}
            </span>
          </div>
        </div>
        <div style={styles.totalsMonthDivider} aria-hidden="true" />
        <div style={styles.totalsRight}>
          <span style={styles.totalMonthLabel}>Total del mes</span>
          <div style={styles.totalMonthRow}>
            <span style={{ ...styles.totalValue, color: 'var(--expense)', fontSize: '0.95rem' }}>{fmt(totalsMonth.expense)}</span>
            <span style={{ ...styles.totalValue, color: 'var(--income)', fontSize: '0.95rem' }}>{fmt(totalsMonth.income)}</span>
            <span style={{ ...styles.totalValue, color: totalsMonth.balance >= 0 ? 'var(--income)' : 'var(--expense)', fontSize: '0.95rem' }}>{fmt(totalsMonth.balance)}</span>
          </div>
        </div>
      </div>

      <div style={styles.navMonthRow}>
        <div style={styles.navMonth} role="navigation" aria-label="Mes y año">
          <button type="button" onClick={prevMonth} style={styles.navMonthBtn} className="touch-target" aria-label="Mes anterior">
            ‹
          </button>
          <span style={styles.navMonthLabel}>
            {MONTHS[month - 1]} {year}
          </span>
          <button type="button" onClick={nextMonth} style={styles.navMonthBtn} className="touch-target" aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <div style={styles.categoryFilterWrap}>
          <label htmlFor="tabla-rapida-filter-cat" style={styles.categoryFilterLabel}>Categoría</label>
          <select
            id="tabla-rapida-filter-cat"
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            style={styles.categoryFilterSelect}
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas</option>
            <option value="none">Sin categoría</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.filterCombo} role="group" aria-label="Filtrar por tipo">
        <button
          type="button"
          onClick={() => setFilterType('expense')}
          style={{
            ...styles.filterComboBtn,
            ...styles.filterComboGastos,
            ...(filterType === 'expense' ? styles.filterComboActive : {}),
          }}
          className="touch-target"
          title="Solo gastos"
          aria-pressed={filterType === 'expense'}
        >
          Gastos
        </button>
        <button
          type="button"
          onClick={() => setFilterType('income')}
          style={{
            ...styles.filterComboBtn,
            ...styles.filterComboIngresos,
            ...(filterType === 'income' ? styles.filterComboActive : {}),
          }}
          className="touch-target"
          title="Solo ingresos"
          aria-pressed={filterType === 'income'}
        >
          Ingresos
        </button>
        <button
          type="button"
          onClick={() => setFilterType('all')}
          style={{
            ...styles.filterComboBtn,
            ...styles.filterComboTodo,
            ...(filterType === 'all' ? styles.filterComboActive : {}),
          }}
          className="touch-target"
          title="Ver todo"
          aria-pressed={filterType === 'all'}
        >
          Todo
        </button>
      </div>

      {showFormModal && (
        <div style={styles.modalOverlay} onClick={closeModal} role="presentation">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="tabla-rapida-modal-title">
            <div style={styles.modalHeader}>
              <h2 id="tabla-rapida-modal-title" style={styles.modalTitle}>
                {editingId ? 'Editar anotación' : 'Nueva anotación'}
              </h2>
              <button type="button" onClick={closeModal} style={styles.modalCloseBtn} aria-label="Cerrar">×</button>
            </div>
            <div style={styles.modalBody}>
              <form onSubmit={editingId ? submitEdit : submitAdd} style={styles.form}>
                <div style={styles.formField}>
                  <label style={styles.formLabel} htmlFor="tabla-rapida-concepto">Concepto</label>
                  <input
                    id="tabla-rapida-concepto"
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ej. Café, taxi, supermercado..."
                    style={styles.formInput}
                    aria-label="Concepto"
                    autoFocus
                  />
                </div>
                <div style={styles.formField}>
                  <label style={styles.formLabel} htmlFor="tabla-rapida-categoria">Categoría</label>
                  <select
                    id="tabla-rapida-categoria"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    style={styles.formSelect}
                    aria-label="Categoría"
                  >
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={styles.formRow}>
                  <div style={{ ...styles.formField, ...styles.formRowField }}>
                    <label style={styles.formLabel} htmlFor="tabla-rapida-tipo">Tipo</label>
                    <select
                      id="tabla-rapida-tipo"
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      style={styles.formSelect}
                      aria-label="Tipo"
                    >
                      {TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ ...styles.formField, ...styles.formRowField }}>
                    <label style={styles.formLabel} htmlFor="tabla-rapida-importe">Importe</label>
                    <input
                      id="tabla-rapida-importe"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0,00"
                      style={styles.formInput}
                      aria-label="Importe"
                    />
                  </div>
                  <div style={{ ...styles.formField, ...styles.formRowField }}>
                    <label style={styles.formLabel} htmlFor="tabla-rapida-fecha">Fecha</label>
                    <input
                      ref={dateInputRef}
                      id="tabla-rapida-fecha"
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      onClick={() => dateInputRef.current?.showPicker?.()}
                      style={styles.formInput}
                      aria-label="Fecha"
                    />
                  </div>
                </div>
                <div style={styles.formActions}>
                  <button type="submit" style={styles.formBtn}>
                    {editingId ? 'Guardar' : 'Añadir'}
                  </button>
                  <button type="button" onClick={closeModal} style={{ ...styles.formBtn, ...styles.formBtnCancel }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showFijosModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFijosModal(false)} role="presentation">
          <div style={{ ...styles.modalBox, maxWidth: 520 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="fijos-modal-title">
            <div style={styles.modalHeader}>
              <h2 id="fijos-modal-title" style={styles.modalTitle}>Gastos fijos</h2>
              <button type="button" onClick={() => setShowFijosModal(false)} style={styles.modalCloseBtn} aria-label="Cerrar">×</button>
            </div>
            <div style={styles.modalBody}>
              {fixedExpenses.length === 0 ? (
                <p style={styles.empty}>No hay gastos fijos. Añádelos en la sección de gastos fijos.</p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Nombre</th>
                        <th style={styles.th}>Categoría</th>
                        <th style={styles.th}>Importe</th>
                        <th style={{ ...styles.th, ...styles.thActions }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fixedExpenses.map((fe, idx) => {
                        const cat = categories.find((c) => c.id === fe.categoryId);
                        const catLabel = cat ? `${cat.icon || ''} ${cat.name}`.trim() : '—';
                        const isApplying = applyingQuickId === `fixed-${fe.id}`;
                        return (
                          <tr key={fe.id} style={{ ...styles.tr, ...(idx % 2 === 1 ? styles.trAlt : {}) }}>
                            <td style={styles.td}>{fe.name}</td>
                            <td style={styles.td}>{catLabel}</td>
                            <td style={{ ...styles.td, ...styles.tdAmount, color: 'var(--expense)' }}>{fmt(fe.amount)}</td>
                            <td style={styles.tdActions}>
                              <button
                                type="button"
                                onClick={() => applyFixedExpense(fe)}
                                disabled={applyingQuickId !== null}
                                style={styles.fijosApplyBtn}
                                className="touch-target"
                                title="Añadir a la tabla rápida"
                              >
                                {isApplying ? '…' : 'Añadir'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : (
        <>
          <div style={styles.dayTabsWrap} role="tablist" aria-label="Día del mes">
            <button
              type="button"
              role="tab"
              aria-selected={selectedDay === ''}
              style={{ ...styles.dayTab, ...(selectedDay === '' ? styles.dayTabActive : {}) }}
              className="touch-target"
              onClick={() => selectDay('')}
            >
              All
            </button>
            {daysWithEntries.map((dayNum) => {
              const dayStr = String(dayNum);
              const isSelected = selectedDay === dayStr;
              return (
                <button
                  key={dayNum}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  style={{ ...styles.dayTab, ...(isSelected ? styles.dayTabActive : {}) }}
                  className="touch-target"
                  onClick={() => selectDay(dayStr)}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>
          <div className={`tabla-rapida-table-wrap ${isNarrowScreen ? 'tabla-rapida-narrow' : ''}`} style={styles.tableWrap}>
            {filteredDisplayedEntries.length === 0 ? (
              <p style={styles.empty}>
                {entriesInMonth.length === 0
                  ? `No hay anotaciones en ${MONTHS[month - 1]} ${year}. Usa los rápidos o el formulario.`
                  : selectedDay === ''
                    ? `No hay anotaciones en ${MONTHS[month - 1]} ${year}.`
                    : `No hay anotaciones el día ${selectedDay}.`}
              </p>
            ) : (
              <table className="tabla-rapida-excel" style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th} onClick={() => handleSort('date')} title="Ordenar por fecha">
                      Fecha {sortBy === 'date' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('name')} title="Ordenar por concepto">
                      Concepto {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="tabla-rapida-col-detail" style={styles.th} onClick={() => handleSort('category')} title="Ordenar por categoría">
                      Categoría {sortBy === 'category' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="tabla-rapida-col-detail" style={styles.th} onClick={() => handleSort('type')} title="Ordenar por tipo">
                      Tipo {sortBy === 'type' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={styles.th} onClick={() => handleSort('amount')} title="Ordenar por importe">
                      Importe {sortBy === 'amount' && (sortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th style={{ ...styles.th, ...styles.thActions }}>{isNarrowScreen ? '' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDisplayedEntries.map((row, idx) => {
                    const isExpanded = expandedRowId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          style={{ ...styles.tr, ...(idx % 2 === 1 ? styles.trAlt : {}) }}
                        >
                          <td style={styles.td}>
                            {row.date
                              ? new Date(row.date + 'T12:00:00').toLocaleDateString('es', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })
                              : ''}
                          </td>
                          <td style={styles.td}>{row.name}</td>
                          <td className="tabla-rapida-col-detail" style={styles.td}>{getCategoryName(row.categoryId)}</td>
                          <td className="tabla-rapida-col-detail" style={styles.td}>
                            <span
                              style={{
                                ...styles.typeBadge,
                                color: row.type === 'income' ? 'var(--income)' : 'var(--expense)',
                              }}
                            >
                              {row.type === 'income' ? 'Ingreso' : 'Gasto'}
                            </span>
                          </td>
                          <td
                            style={{
                              ...styles.td,
                              ...styles.tdAmount,
                              color: row.type === 'income' ? 'var(--income)' : 'var(--expense)',
                            }}
                          >
                            {row.type === 'income' ? '+' : '-'}
                            {fmt(row.amount)}
                          </td>
                          <td style={styles.tdActions}>
                            {isNarrowScreen ? (
                              <button
                                type="button"
                                onClick={() => setExpandedRowId((prev) => (prev === row.id ? null : row.id))}
                                style={{ ...styles.excelActionBtn, ...styles.excelActionBtnView }}
                                className="excel-action-btn touch-target"
                                aria-expanded={isExpanded}
                                title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                                aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                              >
                                <IconEye size={14} />
                              </button>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="excel-action-btn"
                                  onClick={() => startEdit(row)}
                                  style={{ ...styles.excelActionBtn, ...styles.excelActionBtnEdit }}
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <IconEdit size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="excel-action-btn"
                                  onClick={() => deleteEntry(row.id)}
                                  style={{ ...styles.excelActionBtn, ...styles.excelActionBtnDelete }}
                                  title="Eliminar"
                                  aria-label="Eliminar"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        {isNarrowScreen && isExpanded && (
                          <tr key={`${row.id}-detail`} style={{ ...styles.tr, ...styles.trDetail }}>
                            <td colSpan={6} style={styles.tdDetail}>
                              <div style={styles.detailRow}>
                                <span><strong>Categoría:</strong> {getCategoryName(row.categoryId)}</span>
                                <span><strong>Tipo:</strong> {row.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                                <span style={styles.detailActions}>
                                  <button
                                    type="button"
                                    className="excel-action-btn"
                                    onClick={() => startEdit(row)}
                                    style={{ ...styles.excelActionBtn, ...styles.excelActionBtnEdit }}
                                    title="Editar"
                                    aria-label="Editar"
                                  >
                                    <IconEdit size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    className="excel-action-btn"
                                    onClick={() => deleteEntry(row.id)}
                                    style={{ ...styles.excelActionBtn, ...styles.excelActionBtnDelete }}
                                    title="Eliminar"
                                    aria-label="Eliminar"
                                  >
                                    <IconTrash size={14} />
                                  </button>
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
