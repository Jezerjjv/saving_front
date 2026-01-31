import { useState, useEffect } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import TransactionForm from '../components/TransactionForm';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconApply } from '../components/Icons.jsx';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

export default function RapidosYFijos() {
  useLayoutHeader('Rápidos y Fijos');
  const { showMessage, confirm } = useMessage();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [fixedIncomes, setFixedIncomes] = useState([]);
  const [quickTemplatesExpense, setQuickTemplatesExpense] = useState([]);
  const [quickTemplatesIncome, setQuickTemplatesIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expense');
  const [activeSubTab, setActiveSubTab] = useState('fixed');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('expense');
  const [formDefaultKind, setFormDefaultKind] = useState('normal');
  const [editingTx, setEditingTx] = useState(null);
  const [editingFixed, setEditingFixed] = useState(null);
  const [editingQuick, setEditingQuick] = useState(null);
  const [applyingFixedIncomes, setApplyingFixedIncomes] = useState(false);
  const [applyingFixedExpenses, setApplyingFixedExpenses] = useState(false);
  const [applyingQuickId, setApplyingQuickId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.accounts.list(),
      api.categories.list(),
      api.fixedExpenses.list(),
      api.fixedIncomes.list(),
      api.quickTemplates.list({ type: 'expense' }),
      api.quickTemplates.list({ type: 'income' }),
    ])
      .then(([a, c, fe, fi, qe, qi]) => {
        setAccounts(Array.isArray(a) ? a : []);
        setCategories(Array.isArray(c) ? c : []);
        setFixedExpenses(Array.isArray(fe) ? fe : []);
        setFixedIncomes(Array.isArray(fi) ? fi : []);
        setQuickTemplatesExpense(Array.isArray(qe) ? qe : []);
        setQuickTemplatesIncome(Array.isArray(qi) ? qi : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = (type, kind = 'normal') => {
    setFormType(type);
    setFormDefaultKind(kind);
    setEditingTx(null);
    setEditingFixed(null);
    setEditingQuick(null);
    setShowForm(true);
  };

  const openEditFixed = (item, type) => {
    setFormType(type);
    setEditingFixed(item);
    setEditingTx(null);
    setEditingQuick(null);
    setShowForm(true);
  };

  const openEditQuick = (item, type) => {
    setFormType(type);
    setEditingQuick(item);
    setEditingTx(null);
    setEditingFixed(null);
    setShowForm(true);
  };

  const onFormClose = () => {
    setShowForm(false);
    setEditingTx(null);
    setEditingFixed(null);
    setEditingQuick(null);
    load();
  };

  const deleteFixedExpense = (id) => {
    confirm({
      title: 'Eliminar gasto fijo',
      message: '¿Eliminar este gasto fijo?',
      onConfirm: async () => {
        try {
          await api.fixedExpenses.delete(id);
          load();
          showMessage('Gasto fijo eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const deleteFixedIncome = (id) => {
    confirm({
      title: 'Eliminar ingreso fijo',
      message: '¿Eliminar este ingreso fijo?',
      onConfirm: async () => {
        try {
          await api.fixedIncomes.delete(id);
          load();
          showMessage('Ingreso fijo eliminado.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const deleteQuickTemplate = (id) => {
    confirm({
      title: 'Eliminar plantilla rápida',
      message: '¿Eliminar esta plantilla rápida?',
      onConfirm: async () => {
        try {
          await api.quickTemplates.delete(id);
          load();
          showMessage('Plantilla rápida eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

  const applyQuickTemplate = async (tpl) => {
    setApplyingQuickId(tpl.type === 'expense' ? `e-${tpl.id}` : `i-${tpl.id}`);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await api.transactions.create({
        name: tpl.name,
        categoryId: tpl.categoryId,
        amount: tpl.amount,
        accountId: tpl.accountId,
        type: tpl.type,
        incomeType: tpl.type === 'income' ? 'quick' : undefined,
        expenseType: tpl.type === 'expense' ? 'quick' : undefined,
        date: today,
      });
      load();
      showMessage(tpl.type === 'expense' ? 'Gasto aplicado.' : 'Ingreso aplicado.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingQuickId(null);
    }
  };

  const applyFixedIncomes = async () => {
    setApplyingFixedIncomes(true);
    try {
      const r = await api.fixedIncomes.applyMonth(currentMonth, currentYear);
      showMessage(`Se aplicaron ${r.applied} ingreso(s) fijo(s) a ${MONTHS[currentMonth - 1]} ${currentYear}.`, 'success');
      load();
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingFixedIncomes(false);
    }
  };

  const applyFixedExpenses = async () => {
    setApplyingFixedExpenses(true);
    try {
      const r = await api.fixedExpenses.applyMonth(currentMonth, currentYear);
      showMessage(`Se aplicaron ${r.applied} gasto(s) fijo(s) a ${MONTHS[currentMonth - 1]} ${currentYear}.`, 'success');
      load();
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingFixedExpenses(false);
    }
  };

  const applySingleFixedExpense = async (id) => {
    try {
      const r = await api.fixedExpenses.applyOne(id, currentMonth, currentYear);
      if (r.applied === 1) {
        load();
        showMessage('Gasto fijo aplicado.', 'success');
      } else {
        showMessage('Este gasto fijo ya está aplicado en este mes.', 'info');
      }
    } catch (err) {
      showMessage(err.message || 'Este gasto fijo ya está aplicado en este mes.', 'error');
    }
  };

  const applySingleFixedIncome = async (id) => {
    try {
      const r = await api.fixedIncomes.applyOne(id, currentMonth, currentYear);
      if (r.applied === 1) {
        load();
        showMessage('Ingreso fijo aplicado.', 'success');
      } else {
        showMessage('Este ingreso fijo ya está aplicado en este mes.', 'info');
      }
    } catch (err) {
      showMessage(err.message || 'Este ingreso fijo ya está aplicado en este mes.', 'error');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(n);

  if (loading) return <Loader />;

  return (
    <div className="page-rapidos-y-fijos">
      <div className="page-defs-tabs" role="tablist" aria-label="Gastos e ingresos">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'expense'}
          aria-controls="panel-gastos"
          id="tab-gastos"
          className={`page-defs-tab ${activeTab === 'expense' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('expense')}
        >
          Gastos
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'income'}
          aria-controls="panel-ingresos"
          id="tab-ingresos"
          className={`page-defs-tab ${activeTab === 'income' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('income')}
        >
          Ingresos
        </button>
      </div>

      {activeTab === 'expense' && (
        <div id="panel-gastos" role="tabpanel" aria-labelledby="tab-gastos" className="page-defs-panel">
          <div className="page-defs-subtabs" role="tablist" aria-label="Fijo y rápido">
            <button type="button" role="tab" aria-selected={activeSubTab === 'fixed'} className={`page-defs-subtab ${activeSubTab === 'fixed' ? 'is-active' : ''}`} onClick={() => setActiveSubTab('fixed')}>Fijo</button>
            <button type="button" role="tab" aria-selected={activeSubTab === 'quick'} className={`page-defs-subtab ${activeSubTab === 'quick' ? 'is-active' : ''}`} onClick={() => setActiveSubTab('quick')}>Rápido</button>
          </div>
          {activeSubTab === 'fixed' && (
            <section style={styles.defSection}>
              <h2 style={styles.defSectionTitle}>Gastos fijos</h2>
              <div style={styles.actions}>
                <button type="button" onClick={() => openAdd('expense', 'fixed')} style={styles.btnExpense} className="touch-target">+ Crear gasto fijo</button>
                <button type="button" onClick={applyFixedExpenses} disabled={applyingFixedExpenses} style={styles.btnFixed} className="touch-target">{applyingFixedExpenses ? '…' : 'Aplicar ahora (mes actual)'}</button>
              </div>
              <ul style={styles.defList}>
                {fixedExpenses.map((f) => (
                  <li key={f.id} style={styles.defCard}>
                    <div style={styles.defCardContent}>
                      <div style={styles.defCardName}>{f.name}</div>
                      <div style={styles.defCardMeta}>
                        <span style={styles.amountExpense}>{fmt(f.amount)}</span>
                        <span style={styles.muted}> · día {f.dayOfMonth ?? 1}</span>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button type="button" className="btn-icon-action" onClick={() => applySingleFixedExpense(f.id)} style={styles.btnApplyIcon} aria-label="Aplicar" title="Aplicar"><IconApply size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => openEditFixed(f, 'expense')} style={styles.btnIcon} aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteFixedExpense(f.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              {fixedExpenses.length === 0 && <p style={styles.empty}>No hay gastos fijos.</p>}
            </section>
          )}
          {activeSubTab === 'quick' && (
            <section style={styles.defSection}>
              <h2 style={styles.defSectionTitle}>Gastos rápidos</h2>
              <div style={styles.actions}>
                <button type="button" onClick={() => openAdd('expense', 'quick')} style={styles.btnExpense} className="touch-target">+ Crear gasto rápido</button>
              </div>
              <ul style={styles.defList}>
                {quickTemplatesExpense.map((t) => (
                  <li key={t.id} style={styles.defCard}>
                    <div style={styles.defCardContent}>
                      <div style={styles.defCardName}>{t.name}</div>
                      <div style={styles.defCardMeta}>
                        <span style={styles.amountExpense}>{fmt(t.amount)}</span>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button type="button" className="btn-icon-action" onClick={() => applyQuickTemplate(t)} disabled={applyingQuickId !== null} style={styles.btnApplyIcon} aria-label="Aplicar" title="Aplicar"><IconApply size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => openEditQuick(t, 'expense')} style={styles.btnIcon} aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteQuickTemplate(t.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              {quickTemplatesExpense.length === 0 && <p style={styles.empty}>No hay gastos rápidos.</p>}
            </section>
          )}
        </div>
      )}

      {activeTab === 'income' && (
        <div id="panel-ingresos" role="tabpanel" aria-labelledby="tab-ingresos" className="page-defs-panel">
          <div className="page-defs-subtabs" role="tablist" aria-label="Fijo y rápido">
            <button type="button" role="tab" aria-selected={activeSubTab === 'fixed'} className={`page-defs-subtab ${activeSubTab === 'fixed' ? 'is-active' : ''}`} onClick={() => setActiveSubTab('fixed')}>Fijo</button>
            <button type="button" role="tab" aria-selected={activeSubTab === 'quick'} className={`page-defs-subtab ${activeSubTab === 'quick' ? 'is-active' : ''}`} onClick={() => setActiveSubTab('quick')}>Rápido</button>
          </div>
          {activeSubTab === 'fixed' && (
            <section style={styles.defSection}>
              <h2 style={styles.defSectionTitle}>Ingresos fijos</h2>
              <div style={styles.actions}>
                <button type="button" onClick={() => openAdd('income', 'fixed')} style={styles.btnIncome} className="touch-target">+ Crear ingreso fijo</button>
                <button type="button" onClick={applyFixedIncomes} disabled={applyingFixedIncomes} style={styles.btnFixed} className="touch-target">{applyingFixedIncomes ? '…' : 'Aplicar ahora (mes actual)'}</button>
              </div>
              <ul style={styles.defList}>
                {fixedIncomes.map((f) => (
                  <li key={f.id} style={styles.defCard}>
                    <div style={styles.defCardContent}>
                      <div style={styles.defCardName}>{f.name}</div>
                      <div style={styles.defCardMeta}>
                        <span style={styles.amountIncome}>{fmt(f.amount)}</span>
                        <span style={styles.muted}> · día {f.dayOfMonth ?? 1}</span>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button type="button" className="btn-icon-action" onClick={() => applySingleFixedIncome(f.id)} style={styles.btnApplyIconIncome} aria-label="Aplicar" title="Aplicar"><IconApply size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => openEditFixed(f, 'income')} style={styles.btnIcon} aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteFixedIncome(f.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              {fixedIncomes.length === 0 && <p style={styles.empty}>No hay ingresos fijos.</p>}
            </section>
          )}
          {activeSubTab === 'quick' && (
            <section style={styles.defSection}>
              <h2 style={styles.defSectionTitle}>Ingresos rápidos</h2>
              <div style={styles.actions}>
                <button type="button" onClick={() => openAdd('income', 'quick')} style={styles.btnIncome} className="touch-target">+ Crear ingreso rápido</button>
              </div>
              <ul style={styles.defList}>
                {quickTemplatesIncome.map((t) => (
                  <li key={t.id} style={styles.defCard}>
                    <div style={styles.defCardContent}>
                      <div style={styles.defCardName}>{t.name}</div>
                      <div style={styles.defCardMeta}>
                        <span style={styles.amountIncome}>{fmt(t.amount)}</span>
                      </div>
                    </div>
                    <div style={styles.cardActions}>
                      <button type="button" className="btn-icon-action" onClick={() => applyQuickTemplate(t)} disabled={applyingQuickId !== null} style={styles.btnApplyIconIncome} aria-label="Aplicar" title="Aplicar"><IconApply size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => openEditQuick(t, 'income')} style={styles.btnIcon} aria-label="Editar"><IconEdit size={16} /></button>
                      <button type="button" className="btn-icon-action" onClick={() => deleteQuickTemplate(t.id)} style={styles.btnIconDanger} aria-label="Eliminar"><IconTrash size={16} /></button>
                    </div>
                  </li>
                ))}
              </ul>
              {quickTemplatesIncome.length === 0 && <p style={styles.empty}>No hay ingresos rápidos.</p>}
            </section>
          )}
        </div>
      )}

      {showForm && (
        <TransactionForm
          type={formType}
          accounts={accounts}
          categories={categories}
          defaultKind={formDefaultKind}
          editingTx={editingTx}
          editingFixed={editingFixed}
          editingQuick={editingQuick}
          onClose={onFormClose}
          onSaved={onFormClose}
        />
      )}
    </div>
  );
}

const styles = {
  defSection: { marginBottom: '1.5rem' },
  defSectionTitle: { margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 600, color: 'var(--text-muted)' },
  actions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' },
  btnExpense: { padding: '0.6rem 1rem', background: 'var(--expense)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnIncome: { padding: '0.6rem 1rem', background: 'var(--income)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500 },
  btnFixed: { padding: '0.6rem 1rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 500 },
  defList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  defCard: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: 'var(--touch-min)' },
  defCardContent: { flex: 1, minWidth: 0 },
  defCardName: { fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.3 },
  defCardMeta: { fontSize: '0.85rem', marginTop: '0.2rem', color: 'var(--text-muted)' },
  amountExpense: { color: 'var(--expense)', fontWeight: 500 },
  amountIncome: { color: 'var(--income)', fontWeight: 500 },
  muted: { fontSize: '0.85rem', color: 'var(--text-muted)' },
  cardActions: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.25rem' },
  btnApplyIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-apply-bg)', color: 'var(--btn-apply-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnApplyIconIncome: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-apply-bg)', color: 'var(--btn-apply-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  empty: { color: 'var(--text-muted)', fontSize: '0.9rem' },
};
