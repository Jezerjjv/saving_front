import { useState, useEffect, useRef, useMemo } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import IconPicker from './IconPicker.jsx';

const KINDS = [
  { id: 'normal', label: 'Normal' },
  { id: 'fixed', label: 'Fijo' },
  { id: 'quick', label: 'Rápido' },
];

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
  const [icons, setIcons] = useState([]);

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

  useEffect(() => {
    if (kind === 'quick' || editingQuick) {
      api.icons.list().then((data) => setIcons(Array.isArray(data) ? data : [])).catch(() => setIcons([]));
    }
  }, [kind, editingQuick]);

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
      <div style={styles.modal} className="modal-panel">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>{title}</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">✕</button>
        </div>
        <form onSubmit={submit} style={styles.form}>
          {!isEditing && (
            <div style={styles.formRowTwo}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Tipo</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="select-modern"
                  style={styles.input}
                >
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>{k.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Categoría</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  className="select-modern"
                  style={styles.input}
                >
                  <option value="">Sin categoría</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          {isEditing && (
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Categoría</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="select-modern"
                style={styles.input}
              >
                <option value="">Sin categoría</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Nombre</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej. Café, Nómina, Gym..."
              className="input-modern"
              style={styles.input}
              required
            />
          </div>
          {(kind === 'normal' || editingTx) ? (
            <div style={styles.formRowTwo}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Monto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input-modern"
                  style={styles.input}
                  required
                />
              </div>
              <div
                style={styles.dateFieldWrap}
                onClick={() => { dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dateInputRef.current?.showPicker?.(); dateInputRef.current?.focus(); } }}
                role="button"
                tabIndex={0}
                aria-label="Abrir selector de fecha"
              >
                <label style={styles.label}>Fecha</label>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="input-modern input-date-picker"
                  style={styles.input}
                  onClick={(e) => { e.stopPropagation(); dateInputRef.current?.showPicker?.(); }}
                />
              </div>
            </div>
          ) : (
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Monto (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="input-modern"
                style={styles.input}
                required
              />
            </div>
          )}
          <div style={styles.fieldWrap}>
            <label style={styles.label}>Cuenta</label>
            <select
              value={form.accountId}
              onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
              className="select-modern"
              style={styles.input}
              required
            >
              {accountsSorted.map((a) => (
                <option key={a.id} value={a.id}>
                  {primaryAccountId === a.id ? '⭐ ' : ''}{a.name}
                </option>
              ))}
            </select>
          </div>

          {(kind === 'fixed' || editingFixed) && (
            <>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Día del mes (1-31)</label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dayOfMonth}
                  onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                  className="input-modern"
                  style={styles.input}
                />
              </div>
              <p style={styles.hint}>El job del backend aplicará este movimiento ese día cada mes. También puedes usar &quot;Aplicar ahora&quot; en la pestaña Fijos.</p>
            </>
          )}

          {(kind === 'quick' || editingQuick) && (
            <>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Icono</label>
                <IconPicker
                  icons={icons}
                  value={form.icon}
                  onChange={(symbol) => setForm((f) => ({ ...f, icon: symbol }))}
                  placeholder="Elegir icono"
                  style={{ marginBottom: 0 }}
                />
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
                <p style={styles.hint}>Se guardará como plantilla. Si marcas &quot;Mostrar en movimientos&quot;, aparecerá en la barra de Movimientos y al hacer clic se añadirá.</p>
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
    borderRadius: 'var(--radius-card)',
    maxWidth: 560,
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' },
  modalTitle: { margin: 0, fontSize: '1.1rem', fontWeight: 600 },
  closeBtn: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.2rem', cursor: 'pointer', borderRadius: 8, minHeight: 0, minWidth: 0 },
  form: { padding: '1.25rem' },
  formRowTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  fieldWrap: { marginBottom: '0.75rem' },
  dateFieldWrap: { marginBottom: '0.75rem', cursor: 'pointer' },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  input: { width: '100%', marginBottom: 0 },
  hint: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', marginTop: '-0.2rem' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' },
  checkbox: { width: 16, height: 16, accentColor: 'var(--accent)' },
  actions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' },
  btnExpense: { padding: '0.5rem 1rem', background: 'var(--expense)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', minHeight: 0 },
  btnIncome: { padding: '0.5rem 1rem', background: 'var(--income)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', minHeight: 0 },
  btnSecondary: { padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 10, fontWeight: 500, fontSize: '0.9rem', minHeight: 0 },
};
