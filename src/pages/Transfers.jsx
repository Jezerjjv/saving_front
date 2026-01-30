import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import Loader from '../components/Loader';
import { IconTrash } from '../components/Icons.jsx';

export default function Transfers() {
  const { showMessage, confirm } = useMessage();
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });

  const load = () => {
    setLoading(true);
    Promise.all([api.accounts.list(), api.transfers.list()])
      .then(([a, t]) => {
        setAccounts(a);
        setTransfers(t);
        if (a.length && !form.fromAccountId) setForm((f) => ({ ...f, fromAccountId: a[0].id, toAccountId: a[1]?.id ?? a[0].id }));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const fromId = Number(form.fromAccountId);
    const toId = Number(form.toAccountId);
    if (fromId === toId) {
      showMessage('Elige cuentas distintas.', 'error');
      return;
    }
    const amount = Number(form.amount);
    if (amount <= 0) {
      showMessage('El monto debe ser positivo.', 'error');
      return;
    }
    try {
      await api.transfers.create({
        fromAccountId: fromId,
        toAccountId: toId,
        amount,
        description: form.description.trim() || undefined,
      });
      setForm((f) => ({ ...f, amount: '', description: '' }));
      load();
      showMessage('Transferencia realizada.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al crear transferencia.', 'error');
    }
  };

  const remove = (id) => {
    confirm({
      title: 'Eliminar transferencia',
      message: '¿Eliminar esta transferencia? Se revertirán los saldos.',
      onConfirm: async () => {
        try {
          await api.transfers.delete(id);
          load();
          showMessage('Transferencia eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name ?? id;

  if (loading) return <Loader />;

  return (
    <div>
      <h1 style={styles.title}>Transferencias</h1>

      <form onSubmit={submit} style={styles.form}>
        <label style={styles.label}>Desde cuenta</label>
        <select
          value={form.fromAccountId}
          onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
          style={styles.input}
          required
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <label style={styles.label}>A cuenta</label>
        <select
          value={form.toAccountId}
          onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
          style={styles.input}
          required
        >
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <label style={styles.label}>Monto (€)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          style={styles.input}
          required
        />
        <label style={styles.label}>Descripción (opcional)</label>
        <input
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Ej. Traspaso mensual"
          style={styles.input}
        />
        <button type="submit" style={styles.btnPrimary}>Realizar transferencia</button>
      </form>

      <h2 style={styles.subtitle}>Historial</h2>
      <ul style={styles.list}>
        {transfers.slice(0, 50).map((t) => (
          <li key={t.id} style={styles.card}>
            <div>
              <strong>{getAccountName(t.fromAccountId)}</strong> → <strong>{getAccountName(t.toAccountId)}</strong>
              <div style={styles.meta}>
                {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(t.amount)}
                {t.description && ` · ${t.description}`}
              </div>
              <div style={styles.date}>
                {new Date(t.date).toLocaleString('es')}
              </div>
            </div>
            <button type="button" className="btn-icon-action" onClick={() => remove(t.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={18} /></button>
          </li>
        ))}
      </ul>
      {transfers.length === 0 && (
        <p style={styles.empty}>No hay transferencias registradas.</p>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 },
  subtitle: { fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)' },
  form: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' },
  input: { width: '100%', padding: '0.6rem', marginBottom: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)' },
  btnPrimary: { padding: '0.6rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
    marginTop: '0.5rem',
  },
  meta: { fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' },
  date: { fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' },
  btnIconDanger: { padding: 0, fontSize: '1rem', background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  loading: { color: 'var(--text-muted)' },
  empty: { color: 'var(--text-muted)', marginTop: '0.5rem' },
};
