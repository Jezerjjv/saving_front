import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash } from '../components/Icons.jsx';

const ICONS = ['📁', '🍔', '🚗', '🏠', '💡', '📱', '🛒', '☕', '💰', '🎁', '✈️', '📚', '🏥', '👕', '🍕', '⚽', '🎬', '💼', '🧾', '🏦'];

const SETTINGS_TABS = [
  { id: 'config', label: 'Configuración' },
  { id: 'categories', label: 'Categorías' },
];

export default function Settings() {
  const { showMessage, confirm } = useMessage();
  const { blurBalance, setBlurBalance } = useAppSettings();
  const [settingsTab, setSettingsTab] = useState('config');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catForm, setCatForm] = useState({ name: '', icon: '📁' });
  const [editingCat, setEditingCat] = useState(null);

  const load = () => {
    setLoading(true);
    api.categories
      .list()
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.categories.update(editingCat.id, { name: catForm.name, icon: catForm.icon });
      } else {
        await api.categories.create({ name: catForm.name, icon: catForm.icon });
      }
      setCatForm({ name: '', icon: '📁' });
      setEditingCat(null);
      load();
      showMessage(editingCat ? 'Categoría actualizada.' : 'Categoría creada.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const editCategory = (c) => {
    setEditingCat(c);
    setCatForm({ name: c.name, icon: c.icon });
  };

  const deleteCategory = (id) => {
    confirm({
      title: 'Eliminar categoría',
      message: '¿Eliminar esta categoría?',
      onConfirm: async () => {
        try {
          await api.categories.delete(id);
          load();
          showMessage('Categoría eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  if (loading) return <Loader />;

  return (
    <div>
      <h1 style={styles.title}>Configuración</h1>

      <div style={styles.tabs}>
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSettingsTab(tab.id)}
            style={{ ...styles.tab, ...(settingsTab === tab.id ? styles.tabActive : {}) }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settingsTab === 'config' && (
        <section style={styles.section}>
          <h2 style={styles.subtitle}>Aspecto</h2>
          <label style={styles.toggleRow}>
            <input
              type="checkbox"
              checked={blurBalance}
              onChange={(e) => setBlurBalance(e.target.checked)}
              style={styles.checkbox}
            />
            <span>Difuminar saldo de las cuentas</span>
          </label>
          <p style={styles.hint}>Cuando está activo, los importes de las cuentas se muestran difuminados en Resumen y Cuentas.</p>
        </section>
      )}

      {settingsTab === 'categories' && (
        <section style={styles.section}>
          <h2 style={styles.subtitle}>Categorías</h2>
          <p style={styles.hint}>Nombre e icono para clasificar gastos e ingresos.</p>
          <form onSubmit={saveCategory} style={styles.form}>
            <input
              placeholder="Nombre"
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              style={styles.input}
              required
            />
            <div style={styles.iconRow}>
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setCatForm((f) => ({ ...f, icon }))}
                  style={{ ...styles.iconBtn, ...(catForm.icon === icon ? styles.iconBtnActive : {}) }}
                >
                  {icon}
                </button>
              ))}
            </div>
            <button type="submit" style={styles.btnPrimary}>
              {editingCat ? 'Guardar' : 'Añadir categoría'}
            </button>
            {editingCat && (
              <button type="button" onClick={() => { setEditingCat(null); setCatForm({ name: '', icon: '📁' }); }} style={styles.btnSecondary}>
                Cancelar
              </button>
            )}
          </form>
          <ul style={styles.list}>
            {(Array.isArray(categories) ? categories : []).map((c) => (
              <li key={c.id} style={styles.card}>
                <span style={styles.catIcon}>{c.icon}</span>
                <span>{c.name}</span>
                <div style={styles.cardActions}>
                  <button type="button" className="btn-icon-action" onClick={() => editCategory(c)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={18} /></button>
                  <button type="button" className="btn-icon-action" onClick={() => deleteCategory(c.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={18} /></button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '1.5rem', marginBottom: '1rem', fontWeight: 600 },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem' },
  tab: { padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', fontSize: '0.9rem' },
  tabActive: { background: 'var(--surface-hover)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  section: { marginBottom: '2rem' },
  subtitle: { fontSize: '1.1rem', marginBottom: '0.25rem' },
  hint: { fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  checkbox: { width: 20, height: 20, accentColor: 'var(--accent)' },
  form: { marginBottom: '1rem' },
  input: { width: '100%', maxWidth: 280, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' },
  iconRow: { display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.75rem' },
  iconBtn: { padding: '0.35rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)', fontSize: '1rem' },
  iconBtnActive: { border: '1px solid var(--accent)', background: 'var(--surface-hover)' },
  btnPrimary: { padding: '0.5rem 1rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, marginRight: '0.5rem' },
  btnSecondary: { padding: '0.5rem 1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  card: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  catIcon: { fontSize: '1.25rem' },
  cardActions: { marginLeft: 'auto', display: 'flex', gap: '0.25rem' },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  loading: { color: 'var(--text-muted)' },
};
