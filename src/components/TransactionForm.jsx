import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';

const KINDS = [
  { id: 'normal', label: 'Normal' },
  { id: 'fixed', label: 'Fijo' },
  { id: 'quick', label: 'Rápido' },
];

const QUICK_ICONS = ['📁', '🍔', '🚗', '🏠', '💡', '📱', '🛒', '☕', '💰', '🎁', '✈️', '📚', '🏥', '👕', '🍕', '⚽', '🎬', '💼', '🧾', '🏦'];

export default function TransactionForm({
  type,
  accounts,
  categories,
  defaultKind = 'normal',
  editingTx,
  editingFixed,
  editingQuick,
  onClose,
  onSaved,
}) {
  const { showMessage } = useMessage();
  const { primaryAccountId } = useAppSettings();
  const dateInputRef = useRef(null);
  const isExpense = type === 'expense';
  const isEditing = !!(editingTx || editingFixed || editingQuick);

  const [kind, setKind] = useState(defaultKind);
  const accountsSorted = useMemo(() => {
    if (!accounts?.length) return [];
    const primary = primaryAccountId != null ? accounts.find((a) => a.id === primaryAccountId) : null;
    const rest = accounts.filter((a) => a.id !== primaryAccountId);
    return primary ? [primary, ...rest] : accounts;
  }, [accounts, primaryAccountId]);

  const defaultAccountId = () => {
    if (!accounts?.length) return '';
    const primary = primaryAccountId != null ? accounts.find((a) => a.id === primaryAccountId) : null;
    return (primary || accounts[0])?.id ?? '';
  };

  const [form, setForm] = useState({
    name: '',
    categoryId: categories?.[0]?.id ?? '',
    amount: '',
    accountId: defaultAccountId(),
    date: new Date().toISOString().slice(0, 10),
    dayOfMonth: '1',
    showInQuick: true,
    icon: '📁',
  });

  useEffect(() => {
    if (editingTx) {
      setKind('normal');
      setForm({
        name: editingTx.name,
        categoryId: editingTx.categoryId ?? '',
        amount: String(editingTx.amount),
        accountId: editingTx.accountId,
        date: editingTx.date.slice(0, 10),
        dayOfMonth: '1',
      });
    } else if (editingFixed) {
      setKind('fixed');
      setForm({
        name: editingFixed.name,
        categoryId: editingFixed.categoryId ?? '',
        amount: String(editingFixed.amount),
        accountId: editingFixed.accountId,
        date: new Date().toISOString().slice(0, 10),
        dayOfMonth: String(editingFixed.dayOfMonth ?? 1),
      });
    } else if (editingQuick) {
      setKind('quick');
      setForm({
        name: editingQuick.name,
        categoryId: editingQuick.categoryId ?? '',
        amount: String(editingQuick.amount),
        accountId: editingQuick.accountId,
        date: new Date().toISOString().slice(0, 10),
        dayOfMonth: '1',
        showInQuick: editingQuick.showInQuick !== false,
        icon: editingQuick.icon || '📁',
      });
    } else {
      const accountId = (primaryAccountId != null && accounts?.find((a) => a.id === primaryAccountId))
        ? primaryAccountId
        : (accounts?.[0]?.id ?? '');
      setKind(defaultKind);
      setForm({
        name: '',
        categoryId: categories?.[0]?.id ?? '',
        amount: '',
        accountId,
        date: new Date().toISOString().slice(0, 10),
        dayOfMonth: '1',
        showInQuick: true,
        icon: '📁',
      });
    }
  }, [editingTx, editingFixed, editingQuick, defaultKind, categories, accounts, primaryAccountId]);

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      amount: Number(form.amount) || 0,
      accountId: Number(form.accountId),
    };
    const dayOfMonth = Math.min(31, Math.max(1, Number(form.dayOfMonth) || 1));

    try {
      if (editingTx) {
        await api.transactions.update(editingTx.id, {
          ...payload,
          type: isExpense ? 'expense' : 'income',
          incomeType: editingTx.incomeType ?? undefined,
          expenseType: editingTx.expenseType ?? undefined,
          date: form.date,
        });
      } else if (editingFixed) {
        if (isExpense) {
          await api.fixedExpenses.update(editingFixed.id, { ...payload, dayOfMonth });
        } else {
          await api.fixedIncomes.update(editingFixed.id, { ...payload, dayOfMonth });
        }
      } else if (editingQuick) {
        await api.quickTemplates.update(editingQuick.id, { ...payload, showInQuick: form.showInQuick, icon: form.icon });
      } else {
        if (kind === 'normal') {
          await api.transactions.create({
            ...payload,
            type: isExpense ? 'expense' : 'income',
            incomeType: undefined,
            expenseType: undefined,
            date: form.date,
          });
        } else if (kind === 'fixed') {
          if (isExpense) {
            await api.fixedExpenses.create({ ...payload, dayOfMonth });
          } else {
            await api.fixedIncomes.create({ ...payload, dayOfMonth });
          }
        } else {
          await api.quickTemplates.create({
            ...payload,
            type: isExpense ? 'expense' : 'income',
            showInQuick: form.showInQuick,
            icon: form.icon,
          });
        }
      }
      onSaved();
      showMessage(isEditing ? 'Guardado.' : (isExpense ? 'Gasto creado.' : 'Ingreso creado.'), 'success');
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const title = isEditing
    ? 'Editar ' + (isExpense ? 'gasto' : 'ingreso')
    : (isExpense ? 'Crear gasto' : 'Crear ingreso');

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <form onSubmit={submit} style={styles.form}>
          {!isEditing && (
            <>
              <label style={styles.label}>Tipo de movimiento</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                style={styles.input}
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>{k.label}</option>
                ))}
              </select>
            </>
          )}
          <label style={styles.label}>Nombre</label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Ej. Café, Nómina, Gym..."
            style={styles.input}
            required
          />
          <label style={styles.label}>Categoría</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            style={styles.input}
          >
            <option value="">Sin categoría</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
          <label style={styles.label}>Monto (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            style={styles.input}
            required
          />
          <label style={styles.label}>Cuenta</label>
          <select
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            style={styles.input}
            required
          >
            {accountsSorted.map((a) => (
              <option key={a.id} value={a.id}>
                {primaryAccountId === a.id ? '⭐ ' : ''}{a.name}
              </option>
            ))}
          </select>

          {(kind === 'normal' || editingTx) && (
            <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => { dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); } }}
                style={styles.dateRow}
              >
                <label style={styles.label}>Fecha</label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  onClick={(e) => e.stopPropagation()}
                  style={{ ...styles.input, marginBottom: 0 }}
                />
              </div>
            </>
          )}

          {(kind === 'fixed' || editingFixed) && (
            <>
              <label style={styles.label}>Día del mes (1-31)</label>
              <input
                type="number"
                min={1}
                max={31}
                value={form.dayOfMonth}
                onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                style={styles.input}
              />
              <p style={styles.hint}>El job del backend aplicará este movimiento ese día cada mes. También puedes usar "Aplicar ahora" en la pestaña Fijos.</p>
            </>
          )}

          {(kind === 'quick' || editingQuick) && (
            <>
              <label style={styles.label}>Icono</label>
              <div style={styles.iconRow}>
                {QUICK_ICONS.map((ico) => (
                  <button
                    key={ico}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: ico }))}
                    style={{ ...styles.iconBtn, ...(form.icon === ico ? styles.iconBtnActive : {}) }}
                  >
                    {ico}
                  </button>
                ))}
              </div>
              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={form.showInQuick}
                  onChange={(e) => setForm((f) => ({ ...f, showInQuick: e.target.checked }))}
                  style={styles.checkbox}
                />
                <span>Mostrar en movimientos (aparece el nombre y al hacer clic se agrega)</span>
              </label>
              {kind === 'quick' && !editingQuick && (
                <p style={styles.hint}>Se guardará como plantilla. Si marcas "Mostrar en movimientos", aparecerá en la barra de Movimientos y al hacer clic se añadirá.</p>
              )}
            </>
          )}

          <div style={styles.actions}>
            <button type="submit" style={isExpense ? styles.btnExpense : styles.btnIncome}>
              {isEditing ? 'Guardar' : 'Añadir'}
            </button>
            <button type="button" onClick={onClose} style={styles.btnSecondary}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    maxWidth: 400,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: '1.1rem' },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.25rem', cursor: 'pointer' },
  form: { padding: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' },
  dateRow: { marginBottom: '0.75rem', cursor: 'pointer' },
  input: { width: '100%', padding: '0.6rem', marginBottom: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)' },
  hint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' },
  iconRow: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' },
  iconBtn: { padding: '0.35rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', fontSize: '1rem', cursor: 'pointer' },
  iconBtnActive: { border: '1px solid var(--accent)', background: 'var(--surface-hover)' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' },
  checkbox: { width: 18, height: 18, accentColor: 'var(--accent)' },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem' },
  btnExpense: { padding: '0.5rem 1rem', background: 'var(--expense)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnIncome: { padding: '0.5rem 1rem', background: 'var(--income)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnSecondary: { padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
};
