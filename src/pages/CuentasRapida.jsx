import { useState, useEffect } from 'react';
import { api } from '../api';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useMessage } from '../context/MessageContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash } from '../components/Icons.jsx';

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar ($)' },
];

function formatMoney(n, currency = 'EUR') {
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n ?? 0);
}

export default function CuentasRapida() {
  useLayoutHeader('Cuentas rápida');
  const { showMessage, confirm } = useMessage();
  const { blurBalance, appCurrency, exchangeRateUsdToEur, setExchangeRateUsdToEur } = useAppSettings();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', balance: '', currency: 'EUR' });

  const rate = Number(exchangeRateUsdToEur) || 0.92;
  const toEur = (amount, accountCurrency) => {
    const amt = Number(amount) || 0;
    if ((accountCurrency || 'EUR') === 'EUR') return amt;
    return amt * rate; // USD → EUR
  };

  const load = () => {
    setLoading(true);
    api.quickAccounts
      .list()
      .then((data) => setAccounts(Array.isArray(data) ? data : []))
      .catch((err) => showMessage(err?.message || 'Error al cargar', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const totalEur = accounts.reduce((sum, a) => {
    const balance = Number(a.balance) || 0;
    const currency = a.currency || 'EUR';
    return sum + toEur(balance, currency);
  }, 0);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', balance: '', currency: 'EUR' });
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({ name: a.name, balance: String(a.balance ?? ''), currency: a.currency || 'EUR' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', balance: '', currency: 'EUR' });
  };

  const save = (e) => {
    e.preventDefault();
    const name = (form.name || '').trim();
    if (!name) {
      showMessage('El nombre es obligatorio', 'error');
      return;
    }
    const balance = form.balance === '' ? 0 : Number(form.balance);
    if (editingId) {
      api.quickAccounts
        .update(editingId, { name, balance, currency: form.currency })
        .then(() => {
          showMessage('Cuenta actualizada');
          closeModal();
          load();
        })
        .catch((err) => showMessage(err?.message || 'Error al guardar', 'error'));
    } else {
      api.quickAccounts
        .create({ name, balance, currency: form.currency })
        .then(() => {
          showMessage('Cuenta creada');
          closeModal();
          load();
        })
        .catch((err) => showMessage(err?.message || 'Error al crear', 'error'));
    }
  };

  const handleDelete = (a) => {
    confirm(`¿Eliminar la cuenta "${a.name}"?`, () => {
      api.quickAccounts
        .delete(a.id)
        .then(() => {
          showMessage('Cuenta eliminada');
          load();
        })
        .catch((err) => showMessage(err?.message || 'Error al eliminar', 'error'));
    });
  };

  const styles = {
    wrap: { padding: '0.5rem 0', maxWidth: 960, margin: '0 auto' },
    topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
    title: { fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text)' },
    btnAdd: { padding: '0.4rem 0.75rem', fontSize: '0.9rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    tableWrap: { overflowX: 'auto', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 },
    td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
    trTotal: { background: 'var(--surface-hover)', fontWeight: 700 },
    tdTotalLabel: { padding: '0.6rem 0.75rem', borderBottom: 'none', color: 'var(--text)' },
    tdAmount: { textAlign: 'right', whiteSpace: 'nowrap' },
    balanceBlur: { filter: 'blur(4px)' },
    empty: { color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, padding: '1.5rem', textAlign: 'center' },
    actions: { display: 'inline-flex', gap: '0.35rem' },
    btnIcon: { padding: '0.25rem', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'transparent', color: 'var(--text-muted)' },
    modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
    modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
    modalTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 },
    field: { marginBottom: '1rem' },
    label: { display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem', color: 'var(--text-muted)' },
    input: { width: '100%', padding: '0.5rem 0.6rem', fontSize: '0.95rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' },
    select: { width: '100%', padding: '0.5rem 0.6rem', fontSize: '0.95rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' },
    modalActions: { display: 'flex', gap: '0.5rem', marginTop: '1.25rem' },
    btnPrimary: { padding: '0.5rem 1rem', fontSize: '0.9rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    btnSecondary: { padding: '0.5rem 1rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)' },
    configBlock: { marginBottom: '1rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
    configLabel: { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.35rem' },
    configRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' },
    configInput: { width: '5rem', padding: '0.4rem 0.5rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)', boxSizing: 'border-box' },
    configHint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' },
    saldoEurLine: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  };

  if (loading && accounts.length === 0) return <Loader />;

  return (
    <div className="page-cuentas-rapida" style={styles.wrap}>
      <div style={styles.topRow}>
        <h1 style={styles.title}>Cuentas rápida</h1>
        <button type="button" onClick={openCreate} style={styles.btnAdd} className="touch-target">
          + Añadir cuenta
        </button>
      </div>

      <div style={styles.configBlock}>
        <label style={styles.configLabel} htmlFor="cr-exchange-rate">Tipo de cambio (para convertir USD ↔ EUR)</label>
        <div style={styles.configRow}>
          <span>1 USD =</span>
          <input
            id="cr-exchange-rate"
            type="number"
            step="0.0001"
            min="0"
            value={exchangeRateUsdToEur ?? ''}
            onChange={(e) => setExchangeRateUsdToEur(e.target.value === '' ? '' : e.target.value)}
            style={styles.configInput}
            aria-label="Valor de 1 dólar en euros"
          />
          <span> EUR</span>
        </div>
        <p style={styles.configHint}>Con este valor se convierten los saldos en dólares a euros y al revés para el total.</p>
      </div>

      {accounts.length === 0 ? (
        <p style={styles.empty}>No hay cuentas. Pulsa "Añadir cuenta" para crear una; solo existen en esta tabla.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Cuenta</th>
                <th style={styles.th}>Moneda</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Saldo</th>
                <th style={{ ...styles.th, width: 90 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const balance = Number(a.balance) || 0;
                const currency = a.currency || 'EUR';
                const inEur = toEur(balance, currency);
                const isUsd = currency === 'USD';
                const blur = blurBalance ? styles.balanceBlur : {};
                return (
                  <tr key={a.id}>
                    <td style={styles.td}>{a.name}</td>
                    <td style={styles.td}>{currency}</td>
                    <td style={{ ...styles.td, ...styles.tdAmount, ...blur }} className={blurBalance ? 'balance-blur' : ''}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                        <span style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                          {formatMoney(balance, currency)}
                        </span>
                        {isUsd && (
                          <span style={styles.saldoEurLine}>
                            ↓ {formatMoney(inEur, 'EUR')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actions}>
                        <button type="button" onClick={() => openEdit(a)} style={styles.btnIcon} className="touch-target" title="Editar" aria-label="Editar">
                          <IconEdit size={18} />
                        </button>
                        <button type="button" onClick={() => handleDelete(a)} style={{ ...styles.btnIcon, color: 'var(--expense)' }} className="touch-target" title="Eliminar" aria-label="Eliminar">
                          <IconTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr style={styles.trTotal}>
                <td colSpan={2} style={styles.tdTotalLabel}>Total (EUR)</td>
                <td style={{ ...styles.td, ...styles.tdAmount, color: totalEur >= 0 ? 'var(--income)' : 'var(--expense)', ...(blurBalance ? styles.balanceBlur : {}) }} className={blurBalance ? 'balance-blur' : ''}>
                  {formatMoney(totalEur, 'EUR')}
                </td>
                <td style={styles.td} />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="cuentas-rapida-modal-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 id="cuentas-rapida-modal-title" style={styles.modalTitle}>
              {editingId ? 'Editar cuenta' : 'Nueva cuenta'}
            </h2>
            <form onSubmit={save}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-name">Nombre</label>
                <input
                  id="cr-name"
                  type="text"
                  placeholder="Ej. Efectivo, Hucha..."
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  style={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-balance">Saldo</label>
                <input
                  id="cr-balance"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={form.balance}
                  onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-currency">Moneda</label>
                <select
                  id="cr-currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  style={styles.select}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>{editingId ? 'Guardar' : 'Crear'}</button>
                <button type="button" onClick={closeModal} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
