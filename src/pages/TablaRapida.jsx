import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { getTodayLocalDateString } from '../utils/dateUtils';
import { IconEdit, IconTrash, IconChevronDown, IconChevronUp, IconChevronRight } from '../components/Icons.jsx';
import Loader from '../components/Loader.jsx';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']; // Lunes a Domingo

function getWeeksForMonth(year, month) {
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = Lunes
  const daysInMonth = new Date(year, month, 0).getDate();
  const slots = [];
  for (let i = 0; i < firstWeekday; i++) slots.push(null);
  for (let d = 1; d <= daysInMonth; d++) slots.push(d);
  while (slots.length % 7 !== 0) slots.push(null);
  const weeks = [];
  for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
  return weeks;
}

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
  const month = monthParam ? Math.min(12, Math.max(1, Number(monthParam))) : currentMonth;
  const year = yearParam ? Number(yearParam) : currentYear;
  const selectedDay = (dayParam !== null && dayParam !== '') ? dayParam : '';
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [summaryAccordionOpen, setSummaryAccordionOpen] = useState(false);
  const [expandedSummaryCategory, setExpandedSummaryCategory] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState(null);
  const highlightedRowRef = useRef(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState(typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches);
  const dateInputRef = useRef(null);
  const categoryDropdownRef = useRef(null);
  const hasSetDefaultDayForMonth = useRef(false);

  useEffect(() => {
    if (!categoryDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [categoryDropdownOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsNarrowScreen(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!isNarrowScreen) setExpandedRowId(null);
  }, [isNarrowScreen]);

  useEffect(() => {
    if (!highlightedEntryId) return;
    const id = setTimeout(() => {
      highlightedRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    const clearId = setTimeout(() => setHighlightedEntryId(null), 4000);
    return () => { clearTimeout(id); clearTimeout(clearId); };
  }, [highlightedEntryId]);

  useLayoutHeader('Tabla rápida');

  const setMonth = (m) => {
    const val = Math.min(12, Math.max(1, m));
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(val));
      next.set('year', String(year));
      next.delete('day');
      return next;
    });
  };

  const prevMonth = () => {
    if (month === 1) {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', '12');
        next.set('year', String(year - 1));
        next.delete('day');
        return next;
      });
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set('month', '1');
        next.set('year', String(year + 1));
        next.delete('day');
        return next;
      });
    } else {
      setMonth(month + 1);
    }
  };

  const selectDay = (day) => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(month));
      next.set('year', String(year));
      if (day === '') next.delete('day');
      else next.set('day', day);
      return next;
    });
  };

  const goToToday = () => {
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(currentMonth));
      next.set('year', String(currentYear));
      next.set('day', String(now.getDate()));
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

  const baseEntriesInMonth = useMemo(() => {
    const m = String(month).padStart(2, '0');
    const y = String(year);
    return entries.filter((e) => {
      if (!e.date) return false;
      const [ey, em] = e.date.split('-');
      return em === m && ey === y;
    });
  }, [entries, month, year]);

  const entriesInMonth = baseEntriesInMonth;

  const monthWeeks = useMemo(() => getWeeksForMonth(year, month), [year, month]);

  const getWeekIndexForDay = (dayStr) => {
    if (dayStr === '') {
      if (month === currentMonth && year === currentYear) {
        const todayNum = now.getDate();
        const idx = monthWeeks.findIndex((w) => w.includes(todayNum));
        return idx >= 0 ? idx : 0;
      }
      return 0;
    }
    const d = Number(dayStr);
    const idx = monthWeeks.findIndex((w) => w.includes(d));
    return idx >= 0 ? idx : 0;
  };

  const displayWeekIndex = getWeekIndexForDay(selectedDay);
  const displayWeek = monthWeeks[displayWeekIndex] || monthWeeks[0] || [];

  const goPrevWeek = () => {
    const idx = getWeekIndexForDay(selectedDay);
    if (idx <= 0) return;
    const week = monthWeeks[idx - 1];
    const firstDay = week.find((d) => d !== null);
    if (firstDay !== undefined) selectDay(String(firstDay));
  };

  const goNextWeek = () => {
    const idx = getWeekIndexForDay(selectedDay);
    if (idx >= monthWeeks.length - 1) return;
    const week = monthWeeks[idx + 1];
    const firstDay = week.find((d) => d !== null);
    if (firstDay !== undefined) selectDay(String(firstDay));
  };

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
    if (monthParam != null && monthParam !== '' && yearParam != null && yearParam !== '') return;
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(currentMonth));
      next.set('year', String(currentYear));
      if (dayParam == null || dayParam === '') next.set('day', String(now.getDate()));
      return next;
    });
  }, [monthParam, yearParam]);

  useEffect(() => {
    const noDayInUrl = dayParam === null || dayParam === '';
    if (!noDayInUrl) return;
    if (month !== currentMonth || year !== currentYear) return;
    if (hasSetDefaultDayForMonth.current) return;
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('month', String(month));
      next.set('year', String(year));
      next.set('day', String(now.getDate()));
      return next;
    });
    hasSetDefaultDayForMonth.current = true;
  }, [dayParam, month, year]);

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

  const categoryFilterOptions = useMemo(() => {
    const base = [
      { value: '', label: 'Todas' },
      { value: 'none', label: 'Sin categoría' },
      ...categories.map((c) => ({ value: String(c.id), label: `${c.icon || ''} ${c.name}`.trim() })),
    ];
    const q = (categorySearchQuery || '').trim().toLowerCase();
    if (!q) return base;
    return base.filter((o) => o.label.toLowerCase().includes(q));
  }, [categories, categorySearchQuery]);

  const filterCategoryLabel = filterCategoryId === ''
    ? 'Selecciona una categoría'
    : filterCategoryId === 'none'
      ? 'Sin categoría'
      : (categories.find((c) => String(c.id) === filterCategoryId)?.name) || 'Selecciona una categoría';

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

  const summaryByCategory = useMemo(() => {
    const byCat = new Map();
    const key = (categoryId) => (categoryId == null || categoryId === '' ? '__sin_categoria__' : String(categoryId));
    entriesInMonth.forEach((e) => {
      const k = key(e.categoryId);
      if (!byCat.has(k)) {
        byCat.set(k, { categoryId: e.categoryId, expense: 0, income: 0, entries: [] });
      }
      const row = byCat.get(k);
      if (e.type === 'income') row.income += e.amount ?? 0;
      else row.expense += e.amount ?? 0;
      const dayStr = e.date ? e.date.split('-')[2] : '';
      row.entries.push({
        id: e.id,
        name: e.name || '—',
        date: e.date,
        day: dayStr,
        amount: e.amount ?? 0,
        type: e.type,
      });
    });
    return Array.from(byCat.entries()).map(([k, row]) => {
      const cat = k === '__sin_categoria__' ? null : categories.find((c) => String(c.id) === k);
      const entries = row.entries.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return {
        key: k,
        categoryName: cat ? `${cat.icon || ''} ${cat.name}`.trim() || '—' : 'Sin categoría',
        expense: row.expense,
        income: row.income,
        total: row.expense + row.income,
        entries,
      };
    }).filter((r) => r.expense > 0 || r.income > 0).sort((a, b) => b.total - a.total);
  }, [entriesInMonth, categories]);

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
    tabsTableWrap: { width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' },
    filterComboStrip: { display: 'flex', gap: '0.5rem', padding: '0.35rem 0.5rem 0 0.5rem', background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)', alignItems: 'stretch' },
    tableWrap: { width: '100%', overflowX: 'auto', background: 'var(--surface)', marginTop: 0 },
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
    excelActionBtnView: { background: 'var(--income)', color: '#fff' },
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
    navMonthRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: 0 },
    navMonth: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
    navMonthBtn: { width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem', boxSizing: 'border-box', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer', padding: 0 },
    navMonthLabel: { fontSize: '1rem', fontWeight: 600, color: 'var(--text)', minWidth: '8rem', textAlign: 'left' },
    categoryFilterWrap: { display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start' },
    categoryFilterLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 },
    categoryFilterSelect: { padding: '0.3rem 0.55rem', fontSize: '0.88rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', minWidth: '7rem', minHeight: '2rem', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center' },
    categoryDropdown: { position: 'relative', overflow: 'visible' },
    categoryDropdownPanel: { position: 'absolute', top: '100%', left: 0, marginTop: '0.2rem', minWidth: '12rem', maxWidth: '20rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 50, padding: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' },
    categoryDropdownSearch: { padding: '0.4rem 0.5rem', fontSize: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box', flexShrink: 0 },
    categoryDropdownList: { overflowY: 'auto', minHeight: '8rem', maxHeight: '14rem' },
    categoryDropdownOption: { display: 'block', width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.85rem', textAlign: 'left', border: 'none', borderRadius: 'var(--radius)', background: 'transparent', color: 'var(--text)', cursor: 'pointer' },
    categoryDropdownOptionHover: { background: 'var(--surface-hover)' },
    filterCombo: { display: 'inline-flex', flexWrap: 'wrap', gap: 0, marginBottom: 0 },
    filterComboBtn: { padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: 500, borderTop: '1px solid var(--border)', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: 'none', borderRadius: 'var(--radius) var(--radius) 0 0', marginBottom: '-1px', background: 'var(--surface-hover)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' },
    filterComboGastos: {},
    filterComboIngresos: {},
    filterComboTodo: {},
    filterComboActive: { opacity: 1 },
    filterComboActiveGastos: { background: 'var(--accent)', color: '#fff', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', borderBottom: '1px solid var(--surface)', zIndex: 1, boxShadow: '0 1px 0 0 var(--surface)' },
    filterComboActiveIngresos: { background: 'var(--accent)', color: '#fff', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', borderBottom: '1px solid var(--surface)', zIndex: 1, boxShadow: '0 1px 0 0 var(--surface)' },
    filterComboActiveTodo: { background: 'var(--accent)', color: '#fff', borderTop: '1px solid var(--accent)', borderLeft: '1px solid var(--accent)', borderRight: '1px solid var(--accent)', borderBottom: '1px solid var(--surface)', zIndex: 1, boxShadow: '0 1px 0 0 var(--surface)' },
    filterClearBtn: { padding: '0.3rem 0.55rem', fontSize: '0.88rem', fontWeight: 600, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', boxSizing: 'border-box', height: '100%', minHeight: '2rem' },
    filterClearIconBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer', boxSizing: 'border-box', width: '2rem', height: '2rem', flexShrink: 0 },
    dayTabsWrap: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.5rem' },
    dayTab: { padding: '0.4rem 0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' },
    dayTabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
    navAndWeekRow: { display: 'flex', flexDirection: 'column', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
    navMonthBlock: { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' },
    navAndWeekRowLabelMonth: { minWidth: '6rem', textAlign: 'center', fontWeight: 600 },
    navAndWeekRowControlsWeek: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '2rem', minWidth: 0 },
    navCategoryBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' },
    navAndWeekRowLabelCat: {},
    navAndWeekRowControlsCat: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', height: '2rem', flexWrap: 'wrap' },
    weekStripWrap: { display: 'flex', justifyContent: 'center', width: '100%', marginBottom: 0 },
    weekStripOuter: { display: 'inline-flex', alignItems: 'center', gap: '0.25rem', height: '2rem' },
    weekStripNavBtn: { width: '2rem', height: '2rem', minWidth: '2rem', minHeight: '2rem', boxSizing: 'border-box', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', cursor: 'pointer', padding: 0 },
    weekStripSingle: { display: 'grid', gridTemplateColumns: 'auto repeat(7, 2rem)', gridTemplateRows: 'auto auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', width: 'fit-content', padding: '0.12rem 0 0 0', height: '2rem', boxSizing: 'border-box' },
    weekBlockRow: { display: 'contents' },
    weekCell: { width: '2rem', minWidth: '2rem', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0.04rem 0.06rem', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.62rem', borderRight: '1px solid var(--border)', gap: 0, overflow: 'hidden', lineHeight: 1 },
    weekCellColHighlight: { background: 'var(--surface-hover)' },
    weekCellAll: { gridColumn: 1, gridRow: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2rem', minWidth: '2rem', cursor: 'pointer', background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '0.08rem' },
    weekCellAllLabel: { color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1, fontSize: '0.62rem' },
    weekCellLast: { borderRight: 'none' },
    weekCellLetter: { color: 'var(--text-muted)', fontWeight: 600, lineHeight: 1, fontSize: '0.62rem' },
    weekCellDate: { marginTop: 0, width: '0.85rem', height: '0.85rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '0.62rem', cursor: 'pointer', padding: 0, boxSizing: 'border-box', lineHeight: 1 },
    weekCellDateHighlight: { color: 'var(--accent)', fontWeight: 700 },
    weekCellDateToday: { color: 'var(--income)', fontWeight: 700 },
    weekCellDateEmpty: { visibility: 'hidden', pointerEvents: 'none' },
    fijosApplyBtn: { padding: '0.35rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    trDetail: { background: 'var(--surface-hover)' },
    trHighlighted: { background: 'color-mix(in srgb, var(--accent) 22%, transparent) !important', boxShadow: 'inset 0 0 0 2px var(--accent)' },
    tdDetail: { padding: '0.5rem 0.75rem', borderRight: 'none', verticalAlign: 'middle' },
    detailRow: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' },
    detailActions: { display: 'inline-flex', gap: '0.35rem', marginLeft: 'auto' },
    summaryByCategoryWrap: { marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
    summaryByCategoryTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.5rem 0' },
    summaryByCategoryTable: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
    summaryByCategoryTh: { padding: '0.35rem 0.5rem', textAlign: 'left', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 },
    summaryByCategoryTd: { padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--border)' },
    summaryByCategoryTdRight: { textAlign: 'right', whiteSpace: 'nowrap' },
    summaryByCategoryRow: { cursor: 'pointer' },
    summaryByCategoryRowHover: { background: 'var(--surface-hover)' },
    summaryAccordionBody: { padding: '0 0.5rem 0.5rem', background: 'var(--bg)' },
    summaryAccordionList: { listStyle: 'none', margin: 0, padding: '0.25rem 0', fontSize: '0.8rem' },
    summaryAccordionItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.35rem 0.5rem', borderRadius: 'var(--radius)', cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', background: 'transparent', color: 'var(--text)', font: 'inherit' },
    summaryAccordionItemHover: { background: 'var(--surface-hover)' },
    summaryAccordionWrap: { marginTop: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', overflow: 'hidden' },
    summaryAccordionHeader: { width: '100%', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: 'transparent', border: 'none', borderRadius: 0, cursor: 'pointer', color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, textAlign: 'left', boxSizing: 'border-box' },
    summaryAccordionPanel: { marginTop: 0, padding: '0.75rem 1rem', border: 'none', borderRadius: 0, boxSizing: 'border-box' },
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
        <div className="tabla-rapida-totals-left" style={styles.totalsLeft}>
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
        <div className="tabla-rapida-totals-divider" style={styles.totalsMonthDivider} aria-hidden="true" />
        <div className="tabla-rapida-totals-right" style={styles.totalsRight}>
          <span style={styles.totalMonthLabel}>Total del mes</span>
          <div className="tabla-rapida-total-month-row" style={styles.totalMonthRow}>
            <span style={{ ...styles.totalValue, color: 'var(--expense)', fontSize: '0.95rem' }}>{fmt(totalsMonth.expense)}</span>
            <span style={{ ...styles.totalValue, color: 'var(--income)', fontSize: '0.95rem' }}>{fmt(totalsMonth.income)}</span>
            <span style={{ ...styles.totalValue, color: totalsMonth.balance >= 0 ? 'var(--income)' : 'var(--expense)', fontSize: '0.95rem' }}>{fmt(totalsMonth.balance)}</span>
          </div>
        </div>
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
          {!loading && (
            <div className="tabla-rapida-nav-and-week-row" style={styles.navAndWeekRow}>
              {/* Escritorio: mes | franja días | categoría en una fila. Móvil: apilados */}
              <div className="tabla-rapida-nav-month-block" style={styles.navMonthBlock} role="navigation" aria-label="Mes y año">
                <button type="button" onClick={prevMonth} style={styles.navMonthBtn} className="touch-target tabla-rapida-nav-arrow-btn" aria-label="Mes anterior">‹</button>
                <span className="tabla-rapida-nav-month-label" style={{ ...styles.navMonthLabel, ...styles.navAndWeekRowLabelMonth }}>{MONTHS[month - 1]} {year}</span>
                <button type="button" onClick={nextMonth} style={styles.navMonthBtn} className="touch-target tabla-rapida-nav-arrow-btn" aria-label="Mes siguiente">›</button>
              </div>
              <div className="tabla-rapida-week-strip-wrap" style={styles.navAndWeekRowControlsWeek}>
                <div style={styles.weekStripOuter} role="tablist" aria-label="Día del mes">
                  <button type="button" onClick={goPrevWeek} style={styles.weekStripNavBtn} className="touch-target tabla-rapida-nav-arrow-btn" aria-label="Semana anterior" title="Semana anterior">‹</button>
                  <div style={styles.weekStripSingle} className="tabla-rapida-week-strip">
                    <div
                      style={{ ...styles.weekCellAll, ...(selectedDay === '' ? styles.weekCellColHighlight : {}) }}
                      onClick={() => selectDay('')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectDay(''); } }}
                      aria-selected={selectedDay === ''}
                      aria-label="Ver todos los días"
                    >
                      <span style={{ ...styles.weekCellAllLabel, ...(selectedDay === '' ? { color: 'var(--accent)', fontWeight: 700 } : {}) }}>All</span>
                    </div>
                    {WEEKDAY_LETTERS.map((letter, col) => {
                      const dayNum = displayWeek[col];
                      const isColSelected = dayNum !== null && selectedDay === String(dayNum);
                      const isColToday = dayNum !== null && month === currentMonth && year === currentYear && dayNum === now.getDate();
                      const colHighlight = isColSelected || isColToday;
                      return (
                        <div key={`l-${col}`} style={{ ...styles.weekCell, ...(col === 6 ? styles.weekCellLast : {}), ...(colHighlight ? styles.weekCellColHighlight : {}) }}>
                          <span style={styles.weekCellLetter}>{letter}</span>
                        </div>
                      );
                    })}
                    {displayWeek.map((dayNum, col) => {
                      const isToday = dayNum !== null && month === currentMonth && year === currentYear && dayNum === now.getDate();
                      const isSelected = dayNum !== null && selectedDay === String(dayNum);
                      const colHighlight = isSelected || isToday;
                      return (
                        <div key={`d-${col}`} style={{ ...styles.weekCell, ...(col === 6 ? styles.weekCellLast : {}), ...(colHighlight ? styles.weekCellColHighlight : {}) }}>
                          {dayNum !== null ? (
                            <button
                              type="button"
                              role="tab"
                              aria-selected={isSelected}
                              aria-current={isToday ? 'date' : undefined}
                              style={{ ...styles.weekCellDate, ...(isSelected ? styles.weekCellDateHighlight : isToday ? styles.weekCellDateToday : {}) }}
                              className="touch-target"
                              onClick={() => selectDay(String(dayNum))}
                            >
                              {dayNum}
                            </button>
                          ) : (
                            <span style={styles.weekCellDateEmpty} aria-hidden="true">.</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" onClick={goNextWeek} style={styles.weekStripNavBtn} className="touch-target tabla-rapida-nav-arrow-btn" aria-label="Semana siguiente" title="Semana siguiente">›</button>
                </div>
              </div>
              <div className="tabla-rapida-nav-category-block" style={styles.navCategoryBlock}>
                <div className="tabla-rapida-category-filter" style={styles.navAndWeekRowControlsCat}>
                  <div ref={categoryDropdownRef} style={styles.categoryDropdown}>
                    <button
                      type="button"
                      id="tabla-rapida-filter-cat"
                      onClick={() => setCategoryDropdownOpen((o) => !o)}
                      className="tabla-rapida-category-select touch-target"
                      style={styles.categoryFilterSelect}
                      aria-label="Filtrar por categoría"
                      aria-expanded={categoryDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      {filterCategoryLabel}
                    </button>
                    {categoryDropdownOpen && (
                      <div style={styles.categoryDropdownPanel} role="listbox">
                        <input
                          type="text"
                          placeholder="Buscar categoría..."
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          style={styles.categoryDropdownSearch}
                          autoFocus
                          aria-label="Buscar categoría"
                        />
                        <div style={styles.categoryDropdownList}>
                          {categoryFilterOptions.map((opt) => (
                            <button
                              key={opt.value === '' ? 'all' : opt.value}
                              type="button"
                              role="option"
                              aria-selected={filterCategoryId === opt.value}
                              style={styles.categoryDropdownOption}
                              className="touch-target tabla-rapida-cat-option"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { setFilterCategoryId(opt.value); setCategoryDropdownOpen(false); setCategorySearchQuery(''); }}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => { setFilterType('all'); setFilterCategoryId(''); goToToday(); }} style={styles.filterClearIconBtn} className="touch-target tabla-rapida-clear-btn" title="Quitar filtros y volver al día actual" aria-label="Limpiar filtros y volver al día actual">
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="tabla-rapida-tabs-and-table" style={styles.tabsTableWrap}>
            <div className="tabla-rapida-filter-combo-strip" style={styles.filterComboStrip} role="group" aria-label="Filtrar por tipo">
              <button
                type="button"
                onClick={() => setFilterType('expense')}
                style={{
                  ...styles.filterComboBtn,
                  ...styles.filterComboGastos,
                  ...(filterType === 'expense' ? { ...styles.filterComboActive, ...styles.filterComboActiveGastos } : {}),
                }}
                className="touch-target"
                title="Solo gastos"
                aria-pressed={filterType === 'expense'}
              >
                <IconChevronDown size={14} style={{ color: filterType === 'expense' ? '#fff' : 'var(--expense)' }} />
                <span>gastos</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('income')}
                style={{
                  ...styles.filterComboBtn,
                  ...styles.filterComboIngresos,
                  ...(filterType === 'income' ? { ...styles.filterComboActive, ...styles.filterComboActiveIngresos } : {}),
                }}
                className="touch-target"
                title="Solo ingresos"
                aria-pressed={filterType === 'income'}
              >
                <IconChevronUp size={14} style={{ color: filterType === 'income' ? '#fff' : 'var(--income)' }} />
                <span>ingresos</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('all')}
                style={{
                  ...styles.filterComboBtn,
                  ...styles.filterComboTodo,
                  ...(filterType === 'all' ? { ...styles.filterComboActive, ...styles.filterComboActiveTodo } : {}),
                }}
                className="touch-target"
                title="Ver todo"
                aria-pressed={filterType === 'all'}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}>
                  <IconChevronUp size={12} style={{ color: filterType === 'all' ? '#fff' : 'var(--income)' }} />
                  <IconChevronDown size={12} style={{ color: filterType === 'all' ? '#fff' : 'var(--expense)' }} />
                </span>
                <span>todos</span>
              </button>
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
                    {!isNarrowScreen && (
                      <th style={{ ...styles.th, ...styles.thActions }}>Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredDisplayedEntries.map((row, idx) => {
                    const isExpanded = expandedRowId === row.id;
                    const isHighlighted = highlightedEntryId === row.id;
                    return (
                      <Fragment key={row.id}>
                        <tr
                          ref={isHighlighted ? highlightedRowRef : null}
                          role={isNarrowScreen && !String(row.id).startsWith('demo-') ? 'button' : undefined}
                          tabIndex={isNarrowScreen && !String(row.id).startsWith('demo-') ? 0 : undefined}
                          onClick={isNarrowScreen && !String(row.id).startsWith('demo-') ? (e) => { e.preventDefault(); setExpandedRowId((prev) => (prev === row.id ? null : row.id)); } : undefined}
                          onKeyDown={isNarrowScreen && !String(row.id).startsWith('demo-') ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedRowId((prev) => (prev === row.id ? null : row.id)); } } : undefined}
                          style={{
                            ...styles.tr,
                            ...(idx % 2 === 1 ? styles.trAlt : {}),
                            ...(isHighlighted ? styles.trHighlighted : {}),
                          }}
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
                          {!isNarrowScreen && (
                            <td style={styles.tdActions}>
                              {String(row.id).startsWith('demo-') ? (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Demo</span>
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
                          )}
                        </tr>
                        {isNarrowScreen && isExpanded && !String(row.id).startsWith('demo-') && (
                          <tr key={`${row.id}-detail`} className="tabla-rapida-tr-detail" style={{ ...styles.tr, ...styles.trDetail }}>
                            <td colSpan={5} style={styles.tdDetail}>
                              <div className="tabla-rapida-detail-row" style={styles.detailRow}>
                                <span><strong>Categoría:</strong> {getCategoryName(row.categoryId)}</span>
                                <span><strong>Tipo:</strong> {row.type === 'income' ? 'Ingreso' : 'Gasto'}</span>
                                <span className="tabla-rapida-detail-actions" style={styles.detailActions}>
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
          </div>
          {!loading && summaryByCategory.length > 0 && (
            <div className="tabla-rapida-summary-accordion" style={styles.summaryAccordionWrap}>
              <button
                type="button"
                style={styles.summaryAccordionHeader}
                className="touch-target"
                onClick={() => setSummaryAccordionOpen((v) => !v)}
                aria-expanded={summaryAccordionOpen}
                aria-controls="tabla-rapida-summary-panel"
                id="tabla-rapida-summary-accordion-btn"
              >
                <span>Resumen por categoría</span>
                <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>
                  {summaryAccordionOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </span>
              </button>
              {summaryAccordionOpen && (
                <div id="tabla-rapida-summary-panel" className="tabla-rapida-summary-by-category" style={{ ...styles.summaryByCategoryWrap, ...styles.summaryAccordionPanel }} role="region" aria-labelledby="tabla-rapida-summary-accordion-btn" aria-label="Resumen del mes por categoría">
                  <h3 style={styles.summaryByCategoryTitle}>Resumen por categoría ({MONTHS[month - 1]} {year})</h3>
                  <table style={styles.summaryByCategoryTable}>
                    <thead>
                      <tr>
                        <th style={styles.summaryByCategoryTh}>Categoría</th>
                        <th style={{ ...styles.summaryByCategoryTh, ...styles.summaryByCategoryTdRight }}>Gastos</th>
                        <th style={{ ...styles.summaryByCategoryTh, ...styles.summaryByCategoryTdRight }}>Ingresos</th>
                        <th style={{ ...styles.summaryByCategoryTh, ...styles.summaryByCategoryTdRight }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryByCategory.map((row) => {
                        const isExpanded = expandedSummaryCategory === row.key;
                        return (
                          <Fragment key={row.key}>
                            <tr
                              role="button"
                              tabIndex={0}
                              onClick={() => setExpandedSummaryCategory((prev) => (prev === row.key ? null : row.key))}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedSummaryCategory((prev) => (prev === row.key ? null : row.key)); } }}
                              style={{ ...styles.summaryByCategoryRow, ...(isExpanded ? styles.summaryByCategoryRowHover : {}) }}
                              aria-expanded={isExpanded}
                              title={isExpanded ? 'Cerrar detalle' : 'Ver gastos e ingresos de esta categoría'}
                            >
                              <td style={styles.summaryByCategoryTd}>
                                <span style={{ marginRight: '0.35rem', display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                                  {isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                                </span>
                                {row.categoryName}
                              </td>
                              <td style={{ ...styles.summaryByCategoryTd, ...styles.summaryByCategoryTdRight, color: 'var(--expense)' }}>{row.expense > 0 ? `-${fmt(row.expense)}` : '—'}</td>
                              <td style={{ ...styles.summaryByCategoryTd, ...styles.summaryByCategoryTdRight, color: 'var(--income)' }}>{row.income > 0 ? `+${fmt(row.income)}` : '—'}</td>
                              <td style={{ ...styles.summaryByCategoryTd, ...styles.summaryByCategoryTdRight, fontWeight: 600, color: row.income - row.expense >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                                {row.income - row.expense >= 0 ? '+' : ''}{fmt(row.income - row.expense)}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={4} style={{ padding: 0, borderBottom: '1px solid var(--border)', verticalAlign: 'top' }}>
                                  <div style={styles.summaryAccordionBody}>
                                    <ul style={styles.summaryAccordionList}>
                                      {row.entries.map((entry) => (
                                        <li key={entry.id}>
                                          <button
                                            type="button"
                                            style={styles.summaryAccordionItem}
                                            className="touch-target summary-accordion-item"
                                            onClick={() => {
                                              if (entry.day) {
                                                setHighlightedEntryId(entry.id);
                                                selectDay(entry.day);
                                              }
                                            }}
                                            title={`Ir al día ${entry.day}`}
                                          >
                                            <span>{entry.name}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>Día {entry.day}</span>
                                              <span style={{ fontWeight: 600, color: entry.type === 'income' ? 'var(--income)' : 'var(--expense)' }}>
                                                {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                                              </span>
                                            </span>
                                          </button>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
