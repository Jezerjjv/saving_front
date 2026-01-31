import { useState, useEffect, useMemo } from 'react';
import { api } from '../api';
import { useMessage } from '../context/MessageContext';
import { useAppSettings } from '../context/AppSettingsContext';
import Loader from '../components/Loader';
import { IconTrash, IconApply, IconEdit } from '../components/Icons.jsx';
import { useLayoutHeader } from '../context/LayoutHeaderContext';

export default function Transfers() {
  useLayoutHeader('Transferencias');
  const { showMessage, confirm } = useMessage();
  const { primaryAccountId } = useAppSettings();
  const [accounts, setAccounts] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [periodicTransfers, setPeriodicTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [periodicModalOpen, setPeriodicModalOpen] = useState(false);
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '' });
  const [periodicForm, setPeriodicForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', description: '', dayOfMonth: '1' });
  const [applyingId, setApplyingId] = useState(null);
  const [transferTab, setTransferTab] = useState('periodicas');
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [editingPeriodicId, setEditingPeriodicId] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.accounts.list(), api.transfers.list(), api.periodicTransfers.list()])
      .then(([a, t, pt]) => {
        setAccounts(Array.isArray(a) ? a : []);
        setTransfers(Array.isArray(t) ? t : []);
        setPeriodicTransfers(Array.isArray(pt) ? pt : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openAdd = () => {
    const list = Array.isArray(accounts) ? accounts : [];
    const primary = primaryAccountId != null ? list.find((a) => a.id === primaryAccountId) : null;
    const fromId = primary?.id ?? list[0]?.id;
    const toId = list.find((a) => a.id !== fromId)?.id ?? list[0]?.id;
    setForm({
      fromAccountId: fromId != null ? String(fromId) : '',
      toAccountId: toId != null ? String(toId) : '',
      amount: '',
      description: '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const openAddPeriodic = () => {
    setEditingPeriodicId(null);
    const list = Array.isArray(accounts) ? accounts : [];
    const primary = primaryAccountId != null ? list.find((a) => a.id === primaryAccountId) : null;
    const fromId = primary?.id ?? list[0]?.id;
    const toId = list.find((a) => a.id !== fromId)?.id ?? list[0]?.id;
    setPeriodicForm({
      fromAccountId: fromId != null ? String(fromId) : '',
      toAccountId: toId != null ? String(toId) : '',
      amount: '',
      description: '',
      dayOfMonth: '1',
    });
    setPeriodicModalOpen(true);
  };

  const openEditPeriodic = (pt) => {
    setEditingPeriodicId(pt.id);
    setPeriodicForm({
      fromAccountId: String(pt.fromAccountId),
      toAccountId: String(pt.toAccountId),
      amount: String(pt.amount),
      description: pt.description || '',
      dayOfMonth: String(pt.dayOfMonth ?? 1),
    });
    setPeriodicModalOpen(true);
  };

  const closePeriodicModal = () => {
    setPeriodicModalOpen(false);
    setEditingPeriodicId(null);
  };

  const submitPeriodic = async (e) => {
    e.preventDefault();
    const fromId = Number(periodicForm.fromAccountId);
    const toId = Number(periodicForm.toAccountId);
    if (fromId === toId) {
      showMessage('Elige cuentas distintas.', 'error');
      return;
    }
    const amount = Number(periodicForm.amount);
    if (amount <= 0) {
      showMessage('El monto debe ser positivo.', 'error');
      return;
    }
    try {
      if (editingPeriodicId) {
        await api.periodicTransfers.update(editingPeriodicId, {
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          description: periodicForm.description.trim() || undefined,
          dayOfMonth: Number(periodicForm.dayOfMonth) || 1,
        });
        showMessage('Plantilla periódica actualizada.', 'success');
      } else {
        await api.periodicTransfers.create({
          fromAccountId: fromId,
          toAccountId: toId,
          amount,
          description: periodicForm.description.trim() || undefined,
          dayOfMonth: Number(periodicForm.dayOfMonth) || 1,
        });
        showMessage('Transferencia periódica creada.', 'success');
      }
      closePeriodicModal();
      load();
    } catch (err) {
      showMessage(err.message || (editingPeriodicId ? 'Error al actualizar.' : 'Error al crear.'), 'error');
    }
  };

  const applyPeriodicOne = async (id) => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    setApplyingId(id);
    try {
      await api.periodicTransfers.applyOne(id, month, year);
      load();
      showMessage('Transferencia aplicada al mes actual.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    } finally {
      setApplyingId(null);
    }
  };

  const applyPeriodicAll = async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    try {
      const res = await api.periodicTransfers.applyMonth(month, year);
      load();
      showMessage(res.applied > 0 ? `${res.applied} transferencia(s) aplicada(s) al mes actual.` : 'Nada que aplicar este mes.', 'success');
    } catch (err) {
      showMessage(err.message || 'Error al aplicar.', 'error');
    }
  };

  const removePeriodic = (id) => {
    confirm({
      title: 'Eliminar transferencia periódica',
      message: '¿Eliminar esta plantilla? No se eliminarán las transferencias ya realizadas.',
      onConfirm: async () => {
        try {
          await api.periodicTransfers.delete(id);
          load();
          showMessage('Transferencia periódica eliminada.', 'success');
        } catch (err) {
          showMessage(err.message || 'Error al eliminar.', 'error');
        }
      },
    });
  };

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
      closeModal();
      load();
      setTransferTab('historial');
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

  const getAccountName = (id) => (Array.isArray(accounts) ? accounts : []).find((a) => a.id === id)?.name ?? id;

  /** Mapa id plantilla → plantilla para mostrar origen en el log */
  const periodicById = useMemo(
    () => Object.fromEntries((Array.isArray(periodicTransfers) ? periodicTransfers : []).map((p) => [p.id, p])),
    [periodicTransfers]
  );

  const getTransferOriginLabel = (t) => {
    if (!t.periodicTransferId) return 'Puntual';
    const template = periodicById[t.periodicTransferId];
    if (!template) return 'Periódica';
    return template.description ? `Periódica: ${template.description}` : 'Periódica';
  };

  const openAddPuntual = () => {
    setAddDropdownOpen(false);
    openAdd();
  };

  const openAddPeriodicFromDropdown = () => {
    setAddDropdownOpen(false);
    openAddPeriodic();
  };

  if (loading) return <Loader />;

  const transfersList = Array.isArray(transfers) ? transfers : [];

  return (
    <div className="page-transfers">
      <div style={styles.addRow}>
        <div style={styles.addDropdownWrap}>
          <button
            type="button"
            onClick={() => setAddDropdownOpen((v) => !v)}
            style={styles.btnPrimary}
            aria-expanded={addDropdownOpen}
            aria-haspopup="true"
            aria-label="Añadir transferencia"
          >
            + Añadir
          </button>
          {addDropdownOpen && (
            <>
              <div style={styles.dropdownBackdrop} onClick={() => setAddDropdownOpen(false)} aria-hidden />
              <div style={styles.addDropdown} role="menu">
                <button type="button" role="menuitem" style={styles.dropdownItem} onClick={openAddPuntual}>
                  Transferencia puntual
                </button>
                <button type="button" role="menuitem" style={styles.dropdownItem} onClick={openAddPeriodicFromDropdown}>
                  Plantilla periódica
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="page-defs-tabs" role="tablist" aria-label="Periódicas o historial">
        <button
          type="button"
          role="tab"
          aria-selected={transferTab === 'periodicas'}
          className={`page-defs-tab ${transferTab === 'periodicas' ? 'is-active' : ''}`}
          onClick={() => setTransferTab('periodicas')}
        >
          Periódicas
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={transferTab === 'historial'}
          className={`page-defs-tab ${transferTab === 'historial' ? 'is-active' : ''}`}
          onClick={() => setTransferTab('historial')}
        >
          Historial
        </button>
      </div>

      {transferTab === 'periodicas' && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.subtitle}>Transferencias periódicas</h2>
              <p style={styles.hint}>Plantillas que puedes ejecutar cada mes (ej. traspaso a ahorro). Añade una y luego &quot;Aplicar al mes&quot; cuando quieras ejecutarla.</p>
            </div>
            {periodicTransfers.length > 0 && (
              <button type="button" onClick={applyPeriodicAll} style={styles.btnSecondary}>
                Aplicar todas al mes actual
              </button>
            )}
          </div>
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Desde</th>
                  <th style={styles.th}>A</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Día</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(periodicTransfers) ? periodicTransfers : []).map((pt) => (
                  <tr key={pt.id} style={styles.tr}>
                    <td style={styles.td}>{getAccountName(pt.fromAccountId)}</td>
                    <td style={styles.td}>{getAccountName(pt.toAccountId)}</td>
                    <td style={styles.td}>
                      {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(pt.amount)}
                    </td>
                    <td style={styles.td}>{pt.dayOfMonth}</td>
                    <td style={styles.td}>{pt.description || '—'}</td>
                    <td style={styles.tdActions}>
                      <button type="button" className="btn-icon-action" onClick={() => openEditPeriodic(pt)} style={styles.btnIcon} title="Editar" aria-label="Editar">
                        <IconEdit size={16} />
                      </button>
                      <button type="button" className="btn-icon-action" onClick={() => applyPeriodicOne(pt.id)} disabled={applyingId === pt.id} style={styles.btnApplyIcon} aria-label="Aplicar al mes" title="Aplicar al mes">
                        {applyingId === pt.id ? '…' : <IconApply size={16} />}
                      </button>
                      <button type="button" className="btn-icon-action" onClick={() => removePeriodic(pt.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!periodicTransfers || periodicTransfers.length === 0) && (
              <p style={styles.tableEmpty}>No hay plantillas periódicas. Usa &quot;+ Añadir&quot; → Plantilla periódica.</p>
            )}
          </div>
        </section>
      )}

      {transferTab === 'historial' && (
        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.subtitle}>Historial de transferencias</h2>
              <p style={styles.hint}>Todas las transferencias aplicadas: puntuales (de un solo uso) y periódicas (ejecutadas por plantilla).</p>
            </div>
          </div>
          <div style={styles.tableCard}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Fecha</th>
                  <th style={styles.th}>Origen</th>
                  <th style={styles.th}>Desde</th>
                  <th style={styles.th}>A</th>
                  <th style={styles.th}>Monto</th>
                  <th style={styles.th}>Descripción</th>
                  <th style={styles.thActions}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transfersList.slice(0, 200).map((t) => (
                  <tr key={t.id} style={styles.tr}>
                    <td style={styles.td} title={new Date(t.date).toISOString()}>
                      {new Date(t.date).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={styles.td}>
                      <span style={t.periodicTransferId ? styles.logOriginPeriodic : styles.logOriginPuntual}>
                        {getTransferOriginLabel(t)}
                      </span>
                    </td>
                    <td style={styles.td}>{getAccountName(t.fromAccountId)}</td>
                    <td style={styles.td}>{getAccountName(t.toAccountId)}</td>
                    <td style={styles.td}>
                      {new Intl.NumberFormat('es', { style: 'currency', currency: 'EUR' }).format(t.amount)}
                    </td>
                    <td style={styles.td}>{t.description || '—'}</td>
                    <td style={styles.tdActions}>
                      <button type="button" className="btn-icon-action" onClick={() => remove(t.id)} style={styles.btnIconDanger} title="Eliminar" aria-label="Eliminar">
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transfersList.length === 0 && (
              <p style={styles.tableEmpty}>No hay transferencias registradas.</p>
            )}
          </div>
        </section>
      )}

      {modalOpen && (
        <div style={styles.modalOverlay} onClick={closeModal} role="dialog" aria-modal="true" aria-labelledby="transfer-modal-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="transfer-modal-title" style={styles.modalTitle}>Nueva transferencia</h3>
            <form onSubmit={submit}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Desde cuenta</label>
                <select
                  value={form.fromAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, fromAccountId: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                  required
                >
                  {(Array.isArray(accounts) ? accounts : []).map((a) => (
                    <option key={a.id} value={a.id}>{primaryAccountId === a.id ? '⭐ ' : ''}{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>A cuenta</label>
                <select
                  value={form.toAccountId}
                  onChange={(e) => setForm((f) => ({ ...f, toAccountId: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                  required
                >
                  {(Array.isArray(accounts) ? accounts : []).map((a) => (
                    <option key={a.id} value={a.id}>{primaryAccountId === a.id ? '⭐ ' : ''}{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Monto (€)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="input-modern"
                  style={styles.modalInput}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Descripción (opcional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej. Traspaso mensual"
                  className="input-modern"
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>Realizar transferencia</button>
                <button type="button" onClick={closeModal} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {periodicModalOpen && (
        <div style={styles.modalOverlay} onClick={closePeriodicModal} role="dialog" aria-modal="true" aria-labelledby="periodic-modal-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()} className="modal-panel">
            <h3 id="periodic-modal-title" style={styles.modalTitle}>{editingPeriodicId ? 'Editar plantilla periódica' : 'Nueva transferencia periódica'}</h3>
            <form onSubmit={submitPeriodic}>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Desde cuenta</label>
                <select
                  value={periodicForm.fromAccountId}
                  onChange={(e) => setPeriodicForm((f) => ({ ...f, fromAccountId: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                  required
                >
                  {(Array.isArray(accounts) ? accounts : []).map((a) => (
                    <option key={a.id} value={a.id}>{primaryAccountId === a.id ? '⭐ ' : ''}{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>A cuenta</label>
                <select
                  value={periodicForm.toAccountId}
                  onChange={(e) => setPeriodicForm((f) => ({ ...f, toAccountId: e.target.value }))}
                  className="select-modern"
                  style={styles.modalInput}
                  required
                >
                  {(Array.isArray(accounts) ? accounts : []).map((a) => (
                    <option key={a.id} value={a.id}>{primaryAccountId === a.id ? '⭐ ' : ''}{a.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.modalFormRow}>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Monto (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={periodicForm.amount}
                    onChange={(e) => setPeriodicForm((f) => ({ ...f, amount: e.target.value }))}
                    className="input-modern"
                    style={styles.modalInput}
                    required
                    autoFocus
                  />
                </div>
                <div style={styles.modalField}>
                  <label style={styles.modalLabel}>Día del mes (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={periodicForm.dayOfMonth}
                    onChange={(e) => setPeriodicForm((f) => ({ ...f, dayOfMonth: e.target.value }))}
                    className="input-modern"
                    style={styles.modalInput}
                  />
                </div>
              </div>
              <div style={styles.modalField}>
                <label style={styles.modalLabel}>Descripción (opcional)</label>
                <input
                  value={periodicForm.description}
                  onChange={(e) => setPeriodicForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ej. Traspaso a ahorro"
                  className="input-modern"
                  style={styles.modalInput}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" style={styles.btnPrimary}>{editingPeriodicId ? 'Guardar' : 'Añadir plantilla'}</button>
                <button type="button" onClick={closePeriodicModal} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  section: { marginBottom: '1.5rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' },
  headerActions: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' },
  subtitle: { fontSize: '1.05rem', marginBottom: '0.2rem' },
  hint: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' },
  logOriginPuntual: { color: 'var(--text-muted)', fontSize: '0.85rem' },
  logOriginPeriodic: { color: 'var(--income)', fontWeight: 500, fontSize: '0.85rem' },
  addRow: { marginBottom: '1rem' },
  addDropdownWrap: { position: 'relative' },
  dropdownBackdrop: { position: 'fixed', inset: 0, zIndex: 999 },
  addDropdown: { position: 'absolute', top: '100%', right: 0, marginTop: '0.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 1000, minWidth: '12rem', padding: '0.25rem' },
  dropdownItem: { display: 'block', width: '100%', padding: '0.5rem 0.75rem', border: 'none', background: 'none', color: 'var(--text)', fontSize: '0.9rem', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--radius)', fontFamily: 'inherit' },
  btnIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-edit-bg)', color: 'var(--btn-edit-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', marginRight: '0.25rem' },
  btnApplyIcon: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-apply-bg)', color: 'var(--btn-apply-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', marginRight: '0.25rem' },
  modalFormRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' },
  tableCard: {
    maxWidth: 720,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-card)',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
  },
  table: { width: '100%', borderCollapse: 'collapse', background: 'var(--surface)' },
  th: { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem' },
  thActions: { textAlign: 'right', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--border)', background: 'var(--bg)', fontWeight: 600, fontSize: '0.85rem', width: 80 },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.4rem 0.6rem', fontSize: '0.9rem' },
  tdActions: { padding: '0.25rem 0.6rem', textAlign: 'right', display: 'flex', gap: '0.25rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' },
  tableEmpty: { padding: '0.75rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', margin: 0 },
  btnPrimary: { padding: '0.4rem 0.75rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 500, fontSize: '0.9rem', minHeight: 0 },
  btnSecondary: { padding: '0.4rem 0.75rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem', minHeight: 0 },
  btnIconDanger: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, minWidth: 32, minHeight: 32, padding: 0, background: 'var(--btn-delete-bg)', color: 'var(--btn-delete-color)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modalBox: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: '1.25rem', maxWidth: 560, width: '100%', boxShadow: '0 24px 48px rgba(0,0,0,0.3)' },
  modalTitle: { margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 600 },
  modalField: { marginBottom: '0.75rem' },
  modalLabel: { display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' },
  modalInput: { width: '100%' },
  modalActions: { display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' },
};
