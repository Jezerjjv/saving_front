import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconStar } from '../components/Icons.jsx';

const ACCOUNT_TYPES = [
  { value: 'bank', label: 'Bancaria' },
  { value: 'cash', label: 'Efectivo' },
];

function formatEur(n) {
  return new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n ?? 0);
}

export default function Accounts() {
  const { showMessage, confirm } = useMessage();
  const { blurBalance, primaryAccountId, setPrimaryAccountId } = useAppSettings();
  const [accounts, setAccounts] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', balance: '0', accountType: 'bank' });
  const [productsByAccount, setProductsByAccount] = useState({});
  const [expandedProducts, setExpandedProducts] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', productTypeId: '', balance: '0', interestRateAnnual: '' });
  const [editingProduct, setEditingProduct] = useState(null);

  const isInterestType = (typeId) => productTypes.find((t) => t.id === Number(typeId))?.slug === 'interest';

  const load = () => {
    setLoading(true);
    Promise.all([
      api.accounts.list().then((data) => Array.isArray(data) ? data : []),
      api.productTypes.list().then((data) => Array.isArray(data) ? data : []),
    ])
      .then(([accs, types]) => {
        setAccounts(accs);
        setProductTypes(types);
        const bankIds = accs.filter((a) => (a.accountType || 'bank') === 'bank').map((a) => a.id);
        return Promise.all(bankIds.map((id) => api.accounts.products.list(id).then((list) => ({ id, list: list || [] }))));
      })
      .then((results) => {
        const byAccount = {};
        results.forEach(({ id, list }) => { byAccount[id] = list; });
        setProductsByAccount(byAccount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const loadProducts = (accountId) =>
    api.accounts.products.list(accountId).then((list) => setProductsByAccount((prev) => ({ ...prev, [accountId]: list || [] }))).catch(console.error);

  const totalGlobal = accounts.reduce((sum, a) => {
    const base = Number(a.balance) || 0;
    const products = productsByAccount[a.id] || [];
    const productsSum = products.reduce((s, p) => s + (Number(p.balance) || 0), 0);
    return sum + base + productsSum;
  }, 0);

  const accountTotal = (a) => {
    const base = Number(a.balance) || 0;
    const products = productsByAccount[a.id] || [];
    const productsSum = products.reduce((s, p) => s + (Number(p.balance) || 0), 0);
    return { base, productsSum, total: base + productsSum };
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', balance: '0', accountType: 'bank' });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a.id);
    setForm({ name: a.name, balance: String(a.balance ?? 0), accountType: a.accountType || 'bank' });
    setShowForm(true);
  };

  const toggleProducts = (accountId) => {
    if (expandedProducts === accountId) {
      setExpandedProducts(null);
      setEditingProduct(null);
      setProductForm({ name: '', productTypeId: productTypes[0]?.id ?? '', balance: '0', interestRateAnnual: '' });
    } else {
      setExpandedProducts(accountId);
      loadProducts(accountId);
      setEditingProduct(null);
      setProductForm({ name: '', productTypeId: productTypes[0]?.id ?? '', balance: '0', interestRateAnnual: '' });
    }
  };

  const saveProduct = async (accountId, e) => {
    e.preventDefault();
    const typeId = Number(productForm.productTypeId) || productTypes[0]?.id;
    if (!typeId) {
      showMessage('Selecciona un tipo de producto.', 'error');
      return;
    }
    const isInterest = isInterestType(typeId);
    const interestRateAnnual = isInterest ? (productForm.interestRateAnnual === '' ? null : Number(productForm.interestRateAnnual)) : undefined;
    const balance = isInterest ? 0 : (Number(productForm.balance) || 0);
    try {
      if (editingProduct) {
        await api.accounts.products.update(accountId, editingProduct.id, {
          name: productForm.name,
          productTypeId: typeId,
          ...(isInterest ? {} : { balance }),
          ...(interestRateAnnual !== undefined && { interestRateAnnual }),
        });
        showMessage('Producto actualizado.', 'success');
      } else {
        await api.accounts.products.create(accountId, {
          name: productForm.name,
          productTypeId: typeId,
          balance,
          ...(interestRateAnnual !== undefined && { interestRateAnnual }),
        });
        showMessage('Producto creado.', 'success');
      }
      setEditingProduct(null);
      setProductForm({ name: '', productTypeId: productTypes[0]?.id ?? '', balance: '0', interestRateAnnual: '' });
      loadProducts(accountId);
    } catch (err) {
      showMessage(err.message || 'Error al guardar producto.', 'error');
    }
  };

  const openEditProduct = (accountId, p) => {
    setEditingProduct(p);
    setProductForm({
      name: p.name,
      productTypeId: p.productTypeId ?? p.productType?.id ?? '',
      balance: String(p.balance ?? 0),
      interestRateAnnual: p.interestRateAnnual != null ? String(p.interestRateAnnual) : '',
    });
  };

  const removeProduct = (accountId, productId) => {
    confirm({
      title: 'Eliminar producto',
      message: '¿Eliminar este producto de la cuenta?',
      onConfirm: async () => {
        try {
          await api.accounts.products.delete(accountId, productId);
          loadProducts(accountId);
          showMessage('Producto eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.accounts.update(editing, { name: form.name, balance: Number(form.balance) || 0, accountType: form.accountType });
      } else {
        await api.accounts.create({ name: form.name, balance: Number(form.balance) || 0, accountType: form.accountType });
      }
      setEditing(null);
      setForm({ name: '', balance: '0', accountType: 'bank' });
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
        <h1 style={styles.title}>Cuentas</h1>
        <button type="button" onClick={openCreate} style={styles.btnPrimary} className="touch-target">
          + Nueva cuenta
        </button>
      </div>

      {accounts.length > 0 && (
        <div style={styles.totalGlobal}>
          <span style={styles.totalGlobalLabel}>Total todas las cuentas</span>
          <span style={{ ...styles.totalGlobalValue, ...(blurBalance ? styles.balanceBlur : {}) }} className={blurBalance ? 'balance-blur' : ''}>
            {formatEur(totalGlobal)}
          </span>
        </div>
      )}

      {showForm && (
        <form onSubmit={save} style={styles.form}>
          <input
            placeholder="Nombre de la cuenta"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={styles.input}
            required
          />
          <label style={styles.label}>Tipo de cuenta</label>
          <select
            value={form.accountType}
            onChange={(e) => setForm((f) => ({ ...f, accountType: e.target.value }))}
            style={styles.input}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
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
            <button type="button" onClick={() => { setEditing(null); setForm({ name: '', balance: '0', accountType: 'bank' }); setShowForm(false); }} style={styles.btnSecondary}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="accounts-grid" style={styles.grid}>
        {(Array.isArray(accounts) ? accounts : []).map((a) => (
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
            <span style={styles.typeBadge}>{a.accountType === 'cash' ? 'Efectivo' : 'Bancaria'}</span>
            <div style={styles.cardIcon}>{a.accountType === 'cash' ? '💵' : '💳'}</div>
            <h2 style={styles.cardName}>{a.name}</h2>
            {(() => {
              const { base, productsSum, total } = accountTotal(a);
              const isBank = (a.accountType || 'bank') === 'bank';
              return (
                <>
                  <div style={styles.balanceRow}>
                    <span style={styles.balanceLabel}>Saldo base</span>
                    <span style={styles.balanceValue} className={blurBalance ? 'balance-blur' : ''} title="Es el saldo que se descuenta con gastos e ingresos">
                      {formatEur(base)}
                    </span>
                  </div>
                  {isBank && productsSum !== 0 && (
                    <div style={styles.balanceRow}>
                      <span style={styles.balanceLabel}>+ Productos</span>
                      <span style={styles.balanceValue} className={blurBalance ? 'balance-blur' : ''}>{formatEur(productsSum)}</span>
                    </div>
                  )}
                  <div style={styles.totalRow}>
                    <span style={styles.totalLabel}>Total cuenta</span>
                    <span style={styles.totalValue} className={blurBalance ? 'balance-blur' : ''}>{formatEur(total)}</span>
                  </div>
                </>
              );
            })()}
            {(a.accountType || 'bank') === 'bank' && (
              <div style={styles.productsSection}>
                <button type="button" onClick={() => toggleProducts(a.id)} style={styles.productsToggle} aria-expanded={expandedProducts === a.id}>
                  <span style={styles.productsToggleIcon}>{expandedProducts === a.id ? '▼' : '▶'}</span>
                  <span>Productos</span>
                  {(productsByAccount[a.id] || []).length > 0 && (
                    <span style={styles.productsToggleCount}>{(productsByAccount[a.id] || []).length}</span>
                  )}
                </button>
                {expandedProducts === a.id && (
                  <div style={styles.productsBlock}>
                    <form onSubmit={(e) => saveProduct(a.id, e)} style={styles.productFormCard}>
                      <div style={styles.productFormRow}>
                        <input
                          placeholder="Nombre del producto"
                          value={productForm.name}
                          onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                          style={styles.productInput}
                          required
                        />
                        <select
                          value={productForm.productTypeId || productTypes[0]?.id || ''}
                          onChange={(e) => setProductForm((f) => ({ ...f, productTypeId: e.target.value }))}
                          style={styles.productSelect}
                        >
                          {productTypes.map((t) => (
                            <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                          ))}
                        </select>
                      </div>
                      <div style={styles.productFormRow}>
                        {!isInterestType(productForm.productTypeId || productTypes[0]?.id) && (
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Saldo"
                            value={productForm.balance}
                            onChange={(e) => setProductForm((f) => ({ ...f, balance: e.target.value }))}
                            style={styles.productInputNumber}
                          />
                        )}
                        {isInterestType(productForm.productTypeId || productTypes[0]?.id) && (
                          <label style={styles.productFormLabel}>
                            <span style={styles.productFormLabelText}>Interés anual %</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="Ej. 3.5"
                              value={productForm.interestRateAnnual}
                              onChange={(e) => setProductForm((f) => ({ ...f, interestRateAnnual: e.target.value }))}
                              style={styles.productInputNumber}
                            />
                          </label>
                        )}
                      </div>
                      <div style={styles.productFormFooter}>
                        <button type="submit" style={styles.btnSmall} title={editingProduct ? 'Guardar' : 'Añadir producto'}>{editingProduct ? 'Guardar' : 'Añadir'}</button>
                        {editingProduct && (
                          <button type="button" onClick={() => { setEditingProduct(null); setProductForm({ name: '', productTypeId: productTypes[0]?.id ?? '', balance: '0', interestRateAnnual: '' }); }} style={styles.btnSecondary}>Cancelar</button>
                        )}
                      </div>
                    </form>
                    <div style={styles.productCards}>
                      {(productsByAccount[a.id] || []).map((p) => (
                        <div key={p.id} style={styles.productCard}>
                          <span style={styles.productCardIcon}>{p.productType?.icon || '📦'}</span>
                          <div style={styles.productCardBody}>
                            <span style={styles.productCardName}>{p.name}</span>
                            <span style={styles.productCardMeta}>
                              {p.productType?.name || 'Otro'}
                              {p.productType?.slug === 'interest' ? (
                                p.interestRateAnnual != null ? (
                                  <> · {Number(p.interestRateAnnual).toFixed(2)}% anual · se aplica al saldo de la cuenta</>
                                ) : (
                                  <> · se aplica al saldo de la cuenta</>
                                )
                              ) : (
                                <> · {formatEur(p.balance)}</>
                              )}
                            </span>
                          </div>
                          <div style={styles.productCardActions}>
                            <button type="button" onClick={() => openEditProduct(a.id, p)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={16} /></button>
                            <button type="button" onClick={() => removeProduct(a.id, p.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(productsByAccount[a.id] || []).length === 0 && (
                      <p style={styles.emptyProducts}>Añade plan de pensiones, inversiones u otros productos. Su saldo se sumará al total de la cuenta.</p>
                    )}
                  </div>
                )}
              </div>
            )}
            <div style={styles.cardActions}>
              <button type="button" className="btn-icon-action" onClick={() => openEdit(a)} style={styles.btnIcon} title="Editar" aria-label="Editar"><IconEdit size={18} /></button>
              <button type="button" className="btn-icon-action" onClick={() => remove(a.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar"><IconTrash size={18} /></button>
            </div>
          </article>
        ))}
      </div>
      {(Array.isArray(accounts) ? accounts : []).length === 0 && !showForm && (
        <p style={styles.empty}>No hay cuentas. Haz clic en "Nueva cuenta" para agregar una.</p>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' },
  title: { fontSize: '1.5rem', margin: 0, fontWeight: 600 },
  totalGlobal: {
    display: 'flex', flexDirection: 'column', gap: '0.25rem',
    padding: '1rem 1.25rem', marginBottom: '1rem',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
    maxWidth: 320,
  },
  totalGlobalLabel: { fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 },
  totalGlobalValue: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--income)' },
  balanceBlur: { filter: 'blur(4px)' },
  label: { display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--text-muted)' },
  form: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' },
  input: { width: '100%', padding: '0.75rem', marginBottom: '0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '1rem' },
  formActions: { display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' },
  grid: { marginTop: '0.5rem' },
  card: { position: 'relative' },
  typeBadge: { position: 'absolute', top: '0.75rem', left: '0.75rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' },
  balanceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '0.25rem' },
  balanceLabel: { color: 'var(--text-muted)' },
  balanceValue: { fontWeight: 500 },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' },
  totalLabel: { fontWeight: 600, color: 'var(--text)' },
  totalValue: { fontSize: '1.15rem', fontWeight: 700, color: 'var(--income)' },
  productsSection: { marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' },
  productsToggle: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.9rem', padding: '0.35rem 0', fontWeight: 500 },
  productsToggleIcon: { fontSize: '0.75rem' },
  productsToggleCount: { background: 'var(--accent)', color: 'white', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '999px' },
  productsBlock: { marginTop: '0.75rem' },
  productFormCard: { background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', marginBottom: '0.75rem' },
  productFormRow: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' },
  productInput: { flex: '1 1 140px', minWidth: 120, padding: '0.5rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  productSelect: { flex: '0 1 auto', minWidth: 160, padding: '0.5rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem' },
  productInputNumber: { width: 100, padding: '0.5rem 0.6rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: '0.9rem', boxSizing: 'border-box' },
  productFormLabel: { display: 'inline-flex', flexDirection: 'column', gap: '0.2rem' },
  productFormLabelText: { fontSize: '0.75rem', color: 'var(--text-muted)' },
  productFormFooter: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' },
  btnSmall: { width: 100, padding: '0.5rem 0.6rem', boxSizing: 'border-box', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' },
  productCards: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  productCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
  productCardIcon: { fontSize: '1.25rem' },
  productCardBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  productCardName: { fontWeight: 500, fontSize: '0.95rem' },
  productCardMeta: { color: 'var(--text-muted)', fontSize: '0.8rem' },
  productCardActions: { display: 'flex', gap: '0.25rem' },
  emptyProducts: { color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, padding: '0.5rem 0' },
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
  cardActions: { display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '1rem' },
  btnPrimary: { padding: '0.6rem 1.2rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '1rem' },
  btnSecondary: { padding: '0.6rem 1.2rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  btnIcon: { padding: 0, fontSize: '1rem', background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  btnIconDanger: { padding: 0, fontSize: '1rem', background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', minWidth: 40, minHeight: 40, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  loading: { color: 'var(--text-muted)' },
  empty: { color: 'var(--text-muted)', marginTop: '1rem' },
};
