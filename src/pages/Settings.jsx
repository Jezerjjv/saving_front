import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash } from '../components/Icons.jsx';
import IconPicker from '../components/IconPicker.jsx';

const SETTINGS_TABS = [
  { id: 'config', label: 'Configuración' },
  { id: 'icons', label: 'Iconos' },
  { id: 'categories', label: 'Categorías' },
];

export default function Settings() {
  useLayoutHeader('Configuración');
  const { showMessage, confirm } = useMessage();
  const { blurBalance, setBlurBalance, appCurrency, setAppCurrency, exchangeRateUsdToEur, setExchangeRateUsdToEur } = useAppSettings();
  const [settingsTab, setSettingsTab] = useState('config');
  const [icons, setIcons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catForm, setCatForm] = useState({ name: '', icon: '📁' });
  const [editingCat, setEditingCat] = useState(null);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryPage, setCategoryPage] = useState(1);
  const [iconForm, setIconForm] = useState({ symbol: '', name: '' });
  const [editingIcon, setEditingIcon] = useState(null);
  const [iconModalOpen, setIconModalOpen] = useState(false);
  const [iconPage, setIconPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState('');
  const [iconSearch, setIconSearch] = useState('');

  const PAGE_SIZE = 10;
  const allCategories = Array.isArray(categories) ? categories : [];
  const filteredCategories = categorySearch.trim()
    ? allCategories.filter((c) => {
        const q = categorySearch.trim().toLowerCase();
        return (c.name || '').toLowerCase().includes(q) || (c.icon || '').toLowerCase().includes(q);
      })
    : allCategories;
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / PAGE_SIZE));
  const paginatedCategories = filteredCategories.slice(
    (categoryPage - 1) * PAGE_SIZE,
    categoryPage * PAGE_SIZE
  );

  const allIcons = Array.isArray(icons) ? icons : [];
  const filteredIcons = iconSearch.trim()
    ? allIcons.filter((i) => {
        const q = iconSearch.trim().toLowerCase();
        return (i.symbol || '').toLowerCase().includes(q) || (i.name || '').toLowerCase().includes(q);
      })
    : allIcons;
  const totalIconPages = Math.max(1, Math.ceil(filteredIcons.length / PAGE_SIZE));
  const paginatedIcons = filteredIcons.slice(
    (iconPage - 1) * PAGE_SIZE,
    iconPage * PAGE_SIZE
  );

  const load = () => {
    setLoading(true);
    Promise.all([
      api.icons.list().then((data) => Array.isArray(data) ? data : []),
      api.categories.list().then((data) => Array.isArray(data) ? data : []),
    ])
      .then(([iconsList, cats]) => {
        setIcons(iconsList);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadIcons = () => api.icons.list().then((data) => setIcons(Array.isArray(data) ? data : [])).catch(console.error);

  useEffect(() => {
    load();
  }, []);

  const defaultIcon = icons.length > 0 ? icons[0].symbol : '📁';

  const openAddCategory = () => {
    setEditingCat(null);
    setCatForm({ name: '', icon: defaultIcon });
    setCategoryModalOpen(true);
  };

  const openEditCategory = (c) => {
    setEditingCat(c);
    setCatForm({ name: c.name, icon: c.icon || defaultIcon });
    setCategoryModalOpen(true);
  };

  const closeCategoryModal = () => {
    setCategoryModalOpen(false);
    setEditingCat(null);
    setCatForm({ name: '', icon: defaultIcon });
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    try {
      if (editingCat) {
        await api.categories.update(editingCat.id, { name: catForm.name.trim(), icon: catForm.icon || defaultIcon });
        showMessage('Categoría actualizada.', 'success');
      } else {
        await api.categories.create({ name: catForm.name.trim(), icon: catForm.icon || defaultIcon });
        showMessage('Categoría creada.', 'success');
      }
      closeCategoryModal();
      load();
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const openAddIcon = () => {
    setEditingIcon(null);
    setIconForm({ symbol: '', name: '' });
    setIconModalOpen(true);
  };

  const closeIconModal = () => {
    setIconModalOpen(false);
    setEditingIcon(null);
    setIconForm({ symbol: '', name: '' });
  };

  const saveIcon = async (e) => {
    e.preventDefault();
    try {
      if (editingIcon) {
        await api.icons.update(editingIcon.id, { symbol: iconForm.symbol.trim(), name: iconForm.name.trim() || null });
        showMessage('Icono actualizado.', 'success');
      } else {
        await api.icons.create({ symbol: iconForm.symbol.trim(), name: iconForm.name.trim() || null });
        showMessage('Icono añadido.', 'success');
      }
      closeIconModal();
      loadIcons();
    } catch (err) {
      showMessage(err.message || 'Error al guardar.', 'error');
    }
  };

  const openEditIcon = (i) => {
    setEditingIcon(i);
    setIconForm({ symbol: i.symbol, name: i.name || '' });
    setIconModalOpen(true);
  };

  const deleteIcon = (id) => {
    confirm({
      title: 'Eliminar icono',
      message: '¿Eliminar este icono? Las categorías que lo usen seguirán mostrándolo hasta que las edites.',
      onConfirm: async () => {
        try {
          await api.icons.delete(id);
          loadIcons();
          showMessage('Icono eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
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
    <div className="page-settings">
      <div className="page-defs-tabs" role="tablist" aria-label="Configuración">
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={settingsTab === tab.id}
            className={`page-defs-tab ${settingsTab === tab.id ? 'is-active' : ''}`}
            onClick={() => setSettingsTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {settingsTab === 'config' && (
        <>
          <section style={styles.section}>
            <h2 style={styles.subtitle}>Moneda de la aplicación</h2>
            <p style={styles.hint}>Moneda en la que verás el total de todas las cuentas. Cada cuenta sigue mostrando su saldo en su propia moneda (EUR o USD).</p>
            <div style={styles.currencyRow}>
              <label style={styles.radioLabel}>
                <input type="radio" name="appCurrency" checked={appCurrency === 'EUR'} onChange={() => setAppCurrency('EUR')} style={styles.radio} />
                <span>Euro (EUR)</span>
              </label>
              <label style={styles.radioLabel}>
                <input type="radio" name="appCurrency" checked={appCurrency === 'USD'} onChange={() => setAppCurrency('USD')} style={styles.radio} />
                <span>Dólar (USD)</span>
              </label>
            </div>
            <div style={styles.rateRow}>
              <label style={styles.label}>Tipo de cambio 1 USD =</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={exchangeRateUsdToEur}
                onChange={(e) => setExchangeRateUsdToEur(e.target.value)}
                style={styles.inputShort}
              />
              <span> EUR</span>
            </div>
            <p style={styles.hint}>Se usa para convertir cuentas en USD a EUR (o al revés) al calcular el total global.</p>
          </section>
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
        </>
      )}

      {settingsTab === 'icons' && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.subtitle}>Iconos</h2>
              <p style={styles.hint}>Iconos disponibles para categorías y productos. Añade más (emojis o símbolos) para usarlos al dar de alta categorías.</p>
            </div>
            <button type="button" onClick={openAddIcon} style={styles.btnPrimary}>
              + Añadir
            </button>
          </div>
          <div style={styles.tableCard}>
            <input
              type="search"
              placeholder="Buscar iconos por símbolo o nombre..."
              value={iconSearch}
              onChange={(e) => { setIconSearch(e.target.value); setIconPage(1); }}
              style={styles.searchInput}
              aria-label="Buscar iconos"
            />
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Símbolo</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedIcons.map((i) => (
                  <tr key={i.id} style={styles.tr}>
                    <td style={styles.tdSymbol}>{i.symbol}</td>
                    <td style={styles.td}>{i.name || '—'}</td>
                    <td style={styles.tdActions}>
                      <button type="button" className="btn-icon-action" onClick={() => openEditIcon(i)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteIcon(i.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredIcons.length === 0 ? (
              <p style={styles.tableEmpty}>No hay iconos{iconSearch.trim() ? ' que coincidan con la búsqueda' : ''}. Haz clic en &quot;+ Añadir&quot; para crear uno.</p>
            ) : (
              totalIconPages > 1 && (
                <div style={styles.pagination}>
                  <button type="button" onClick={() => setIconPage((p) => Math.max(1, p - 1))} disabled={iconPage <= 1} style={styles.pageBtn}>
                    Anterior
                  </button>
                  <span style={styles.pageInfo}>Página {iconPage} de {totalIconPages} · {filteredIcons.length} iconos</span>
                  <button type="button" onClick={() => setIconPage((p) => Math.min(totalIconPages, p + 1))} disabled={iconPage >= totalIconPages} style={styles.pageBtn}>
                    Siguiente
                  </button>
                </div>
              )
            )}
          </div>

          {iconModalOpen && (
            <div style={styles.modalOverlay} onClick={closeIconModal} role="dialog" aria-modal="true" aria-labelledby="icon-modal-title">
              <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
                <h3 id="icon-modal-title" style={styles.modalTitle}>{editingIcon ? 'Editar icono' : 'Nuevo icono'}</h3>
                <form onSubmit={saveIcon}>
                  <div style={styles.modalFormRow}>
                    <div style={styles.modalField}>
                      <label style={styles.modalLabel}>Símbolo (emoji o carácter)</label>
                      <input
                        placeholder="Ej. 📁 o 🍔"
                        value={iconForm.symbol}
                        onChange={(e) => setIconForm((f) => ({ ...f, symbol: e.target.value }))}
                        className="input-modern"
                        style={styles.modalInput}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={styles.modalField}>
                      <label style={styles.modalLabel}>Nombre (opcional)</label>
                      <input
                        placeholder="Ej. Carpeta"
                        value={iconForm.name}
                        onChange={(e) => setIconForm((f) => ({ ...f, name: e.target.value }))}
                        className="input-modern"
                        style={styles.modalInput}
                      />
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.btnPrimary}>{editingIcon ? 'Guardar' : 'Añadir'}</button>
                    <button type="button" onClick={closeIconModal} style={styles.btnSecondary}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}

      {settingsTab === 'categories' && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.subtitle}>Categorías</h2>
              <p style={styles.hint}>Nombre e icono para clasificar gastos e ingresos.</p>
            </div>
            <button type="button" onClick={openAddCategory} style={styles.btnPrimary}>
              + Añadir
            </button>
          </div>
          <div style={styles.tableCard}>
            <input
              type="search"
              placeholder="Buscar categorías por nombre o icono..."
              value={categorySearch}
              onChange={(e) => { setCategorySearch(e.target.value); setCategoryPage(1); }}
              style={styles.searchInput}
              aria-label="Buscar categorías"
            />
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Icono</th>
                  <th style={styles.th}>Nombre</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCategories.map((c) => (
                  <tr key={c.id} style={styles.tr}>
                    <td style={styles.tdSymbol}>{c.icon}</td>
                    <td style={styles.td}>{c.name}</td>
                    <td style={styles.tdActions}>
                      <button type="button" className="btn-icon-action" onClick={() => openEditCategory(c)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteCategory(c.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredCategories.length === 0 ? (
              <p style={styles.tableEmpty}>No hay categorías{categorySearch.trim() ? ' que coincidan con la búsqueda' : ''}. Haz clic en &quot;+ Añadir&quot; para crear una.</p>
            ) : (
              totalCategoryPages > 1 && (
                <div style={styles.pagination}>
                  <button type="button" onClick={() => setCategoryPage((p) => Math.max(1, p - 1))} disabled={categoryPage <= 1} style={styles.pageBtn}>
                    Anterior
                  </button>
                  <span style={styles.pageInfo}>Página {categoryPage} de {totalCategoryPages} · {filteredCategories.length} categorías</span>
                  <button type="button" onClick={() => setCategoryPage((p) => Math.min(totalCategoryPages, p + 1))} disabled={categoryPage >= totalCategoryPages} style={styles.pageBtn}>
                    Siguiente
                  </button>
                </div>
              )
            )}
          </div>

          {categoryModalOpen && (
            <div style={styles.modalOverlay} onClick={closeCategoryModal} role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
              <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
                <h3 id="category-modal-title" style={styles.modalTitle}>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</h3>
                <form onSubmit={saveCategory}>
                  <div style={styles.modalFormRow}>
                    <div style={styles.modalField}>
                      <label style={styles.modalLabel}>Nombre</label>
                      <input
                        placeholder="Nombre de la categoría"
                        value={catForm.name}
                        onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                        className="input-modern"
                        style={styles.modalInput}
                        required
                        autoFocus
                      />
                    </div>
                    <div style={styles.modalField}>
                      <label style={styles.modalLabel}>Icono</label>
                      <IconPicker
                        icons={icons}
                        value={catForm.icon}
                        onChange={(symbol) => setCatForm((f) => ({ ...f, icon: symbol }))}
                        placeholder="Elegir icono"
                      />
                    </div>
                  </div>
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.btnPrimary}>{editingCat ? 'Guardar' : 'Añadir'}</button>
                    <button type="button" onClick={closeCategoryModal} style={styles.btnSecondary}>Cancelar</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles = {
  title: { fontSize: '1.35rem', marginBottom: '0.75rem', fontWeight: 600 },
  section: { marginBottom: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' },
  subtitle: { fontSize: '1.05rem', marginBottom: '0.2rem' },
  hint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' },
  tableCard: {
    maxWidth: 560,
    margin: '0 auto',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  searchInput: {
    width: '100%',
    padding: '0.5rem 0.75rem 0.5rem 2.25rem',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontSize: '1rem',
    outline: 'none',
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' fill='%238b8b96' viewBox='0 0 16 16'%3E%3Cpath d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '0.75rem center',
  },
  tableEmpty: { padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', background: 'var(--bg)' },
  pageBtn: { padding: '0.35rem 0.65rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, minHeight: 0 },
  pageInfo: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', maxWidth: 560, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
  modalTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 },
  modalFormRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  modalField: { marginBottom: 0 },
  modalLabel: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  modalInput: { width: '100%' },
  modalActions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
  currencyRow: { display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' },
  radioLabel: { display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontSize: '1rem' },
  radio: { width: 18, height: 18, accentColor: 'var(--accent)' },
  rateRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' },
  inputShort: { width: 80, padding: '0.4rem 0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  toggleRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  checkbox: { width: 20, height: 20, accentColor: 'var(--accent)' },
  form: { marginBottom: '1rem' },
  formRow: { marginBottom: '0.5rem' },
  formActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' },
  input: { width: '100%', maxWidth: 280, padding: '0.5rem 0.75rem', marginBottom: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  label: { display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--surface)' },
  th: { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem' },
  thActions: { textAlign: 'right', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem', width: 80 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.4rem 0.6rem', fontSize: '0.9rem' },
  tdSymbol: { padding: '0.4rem 0.6rem', fontSize: '1.1rem' },
  tdActions: { padding: '0.25rem 0.6rem', textAlign: 'right', display: 'flex', gap: '0.2rem', justifyContent: 'flex-end' },
  btnPrimary: { padding: '0.4rem 0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem', marginRight: '0.25rem', minHeight: 0 },
  btnSecondary: { padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem', minHeight: 0 },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  loading: { color: 'var(--text-muted)' },
};
