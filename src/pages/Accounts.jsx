import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconStar } from '../components/Icons.jsx';

export default function Accounts() {
  const { showMessage, confirm } = useMessage();
  const { blurBalance, primaryAccountId, setPrimaryAccountId } = useAppSettings();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', balance: '0' });

  const load = () => api.accounts.list().then(setAccounts).catch(console.error).finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', balance: '0' });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a.id);
    setForm({ name: a.name, balance: String(a.balance ?? 0) });
    setShowForm(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.accounts.update(editing, { name: form.name, balance: Number(form.balance) || 0 });
      } else {
        await api.accounts.create({ name: form.name, balance: Number(form.balance) || 0 });
      }
      setEditing(null);
      setForm({ name: '', balance: '0' });
      setShowForm(false);
      load();
      showMessage(editing ? 'Cuenta actualizada.' : 'Cuenta creada.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const remove = (id) => {
    confirm({
      title: 'Eliminar cuenta',
      message: '¿Eliminar esta cuenta?',
      onConfirm: async () => {
        try {
          if (primaryAccountId === id) setPrimaryAccountId(null);
          await api.accounts.delete(id);
          load();
          showMessage('Cuenta eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  if (loading) return <Loader />;

  return (
    <div className="page-accounts">
      <div style={styles.header}>
        <h1 style={styles.title}>Cuentas bancarias</h1>
        <button type="button" onClick={openCreate} style={styles.btnPrimary} className="touch-target">
          + Nueva cuenta
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} style={styles.form}>
          <input
            placeholder="Nombre de la cuenta"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={styles.input}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="Saldo inicial"
            value={form.balance}
            onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
            style={styles.input}
          />
          <div style={styles.formActions}>
            <button type="submit" style={styles.btnPrimary}>
              {editing ? 'Guardar' : 'Crear'}
            </button>
            <button type="button" onClick={() => { setEditing(null); setForm({ name: '', balance: '0' }); setShowForm(false); }} style={styles.btnSecondary}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="accounts-grid" style={styles.grid}>
        {accounts.map((a) => (
          <article key={a.id} className="card-account" style={styles.card}>
            <button
              type="button"
              onClick={() => setPrimaryAccountId(primaryAccountId === a.id ? null : a.id)}
              style={{ ...styles.starBtn, ...(primaryAccountId === a.id ? styles.starBtnActive : {}) }}
              title={primaryAccountId === a.id ? 'Quitar como principal' : 'Establecer como cuenta principal'}
              aria-label={primaryAccountId === a.id ? 'Quitar como principal' : 'Establecer como cuenta principal'}
            >
              <IconStar size={20} filled={primaryAccountId === a.id} />
            </button>
            <div style={styles.cardIcon}>💳</div>
            <h2 style={styles.cardName}>{a.name}</h2>
            <p style={styles.cardBalance} className={blurBalance ? 'balance-blur' : ''}>
              {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(a.balance ?? 0)}
            </p>
            <div style={styles.cardActions}>
              <button type="button" className="btn-icon-action" onClick={() => openEdit(a)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={18} /></button>
              <button type="button" className="btn-icon-action" onClick={() => remove(a.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={18} /></button>
            </div>
          </article>
        ))}
      </div>
      {accounts.length === 0 && !showForm && (
        <p style={styles.empty}>No hay cuentas. Haz clic en "Nueva cuenta" para agregar una.</p>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  title: { fontSize: '1.5rem', margin: 0, fontWeight: 600 },
  form: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' },
  input: { width: '100%', padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '1rem' },
  formActions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' },
  grid: { marginTop: '0.5rem' },
  card: { position: 'relative' },
  starBtn: {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    padding: '0.35rem',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    borderRadius: 'var(--radius)',
  },
  starBtnActive: { color: 'var(--accent)' },
  cardIcon: { fontSize: '2rem', marginBottom: '0.5rem' },
  cardName: { fontSize: '1.1rem', margin: '0 0 0.25rem 0', fontWeight: 600 },
  cardBalance: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--income)', margin: '0 0 1rem 0' },
  cardActions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap' },
  btnPrimary: { padding: '0.6rem 1.2rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '1rem' },
  btnSecondary: { padding: '0.6rem 1.2rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  btnIcon: { padding: 0, fontSize: '1rem', background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  btnIconDanger: { padding: 0, fontSize: '1rem', background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  loading: { color: 'var(--text-muted)' },
  empty: { color: 'var(--text-muted)', marginTop: '1rem' },
};
