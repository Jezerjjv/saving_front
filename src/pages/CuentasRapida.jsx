import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useAppSettings } from '../context/AppSettingsContext';
import { useMessage } from '../context/MessageContext';
import Loader from '../components/Loader';
import { IconEdit, IconTrash, IconHistory } from '../components/Icons.jsx';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

const CURRENCIES = [
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'USD', label: 'Dólar ($)' },
];

function formatMoney(n, currency = 'EUR') {
  return new Intl.NumberFormat('es', { style: 'currency', currency }).format(n ?? 0);
}

function movementLines(row) {
  if (row.lines?.length) return row.lines;
  return [...(row.removedFrom || []), ...(row.addedTo || [])];
}

function isAccountLifecycleNote(note) {
  return note === 'Cuenta agregada' || note === 'Cuenta eliminada' || note === 'Cuenta creada';
}

function lifecycleLabel(note) {
  if (note === 'Cuenta creada') return 'Cuenta agregada';
  return note;
}

function movementLineIsDown(line, movementNote) {
  if (line.amount < 0) return true;
  if (line.amount > 0) return false;
  return movementNote === 'Cuenta eliminada';
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
  const [historyYear, setHistoryYear] = useState(currentYear);
  const [historyMonth, setHistoryMonth] = useState(currentMonth);
  const [historyFilterAccountId, setHistoryFilterAccountId] = useState('');
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [movementAccount, setMovementAccount] = useState(null);
  const [movementType, setMovementType] = useState('add');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementNote, setMovementNote] = useState('');
  const [movementBusy, setMovementBusy] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [transferBusy, setTransferBusy] = useState(false);
  const [compactLayout, setCompactLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setCompactLayout(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const fmt = useCallback(
    (n, currency = 'EUR') =>
      new Intl.NumberFormat('es', {
        style: 'currency',
        currency,
        minimumFractionDigits: compactLayout ? 0 : 2,
        maximumFractionDigits: compactLayout ? 0 : 2,
      }).format(n ?? 0),
    [compactLayout]
  );

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

  const loadHistory = () => {
    setHistoryLoading(true);
    const accountId = historyFilterAccountId === '' ? undefined : Number(historyFilterAccountId);
    api.quickAccounts
      .history(historyYear, historyMonth, accountId)
      .then((data) => setHistory(Array.isArray(data?.history) ? data.history : []))
      .catch((err) => {
        showMessage(err?.message || 'Error al cargar histórico', 'error');
        setHistory([]);
      })
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, [historyYear, historyMonth, historyFilterAccountId]);

  const openMovement = (account, type) => {
    setMovementAccount(account);
    setMovementType(type);
    setMovementAmount('');
    setMovementNote('');
  };

  const closeMovement = () => {
    setMovementAccount(null);
    setMovementAmount('');
    setMovementNote('');
  };

  const openTransfer = (fromAccount = null) => {
    setTransferFromId(fromAccount ? String(fromAccount.id) : '');
    setTransferToId('');
    setTransferAmount('');
    setTransferNote('');
    setShowTransferModal(true);
  };

  const closeTransfer = () => {
    setShowTransferModal(false);
    setTransferFromId('');
    setTransferToId('');
    setTransferAmount('');
    setTransferNote('');
  };

  const submitTransfer = (e) => {
    e.preventDefault();
    const fromId = Number(transferFromId);
    const toId = Number(transferToId);
    const amount = Number(transferAmount);
    if (!fromId || !toId) {
      showMessage('Elige cuenta de origen y destino', 'error');
      return;
    }
    if (fromId === toId) {
      showMessage('Origen y destino deben ser distintos', 'error');
      return;
    }
    if (!amount || amount <= 0) {
      showMessage('El importe debe ser mayor que 0', 'error');
      return;
    }
    setTransferBusy(true);
    api.quickAccounts
      .transfer({ fromAccountId: fromId, toAccountId: toId, amount, note: transferNote.trim() || undefined })
      .then(() => {
        showMessage('Movimiento registrado');
        closeTransfer();
        load();
        loadHistory();
      })
      .catch((err) => showMessage(err?.message || 'Error al mover', 'error'))
      .finally(() => setTransferBusy(false));
  };

  const submitMovement = (e) => {
    e.preventDefault();
    if (!movementAccount) return;
    const amount = Number(movementAmount);
    if (!amount || amount <= 0) {
      showMessage('El importe debe ser mayor que 0', 'error');
      return;
    }
    setMovementBusy(true);
    api.quickAccounts
      .movement(movementAccount.id, {
        type: movementType,
        amount,
        note: movementNote.trim() || undefined,
      })
      .then(() => {
        showMessage(movementType === 'add' ? 'Ingreso externo registrado' : 'Retiro externo registrado');
        closeMovement();
        load();
        loadHistory();
      })
      .catch((err) => showMessage(err?.message || 'Error al registrar movimiento', 'error'))
      .finally(() => setMovementBusy(false));
  };

  const prevHistoryMonth = () => {
    if (historyMonth === 1) {
      setHistoryMonth(12);
      setHistoryYear((y) => y - 1);
    } else setHistoryMonth((m) => m - 1);
  };

  const nextHistoryMonth = () => {
    if (historyMonth === 12) {
      setHistoryMonth(1);
      setHistoryYear((y) => y + 1);
    } else setHistoryMonth((m) => m + 1);
  };

  const historyTableRows = useMemo(() => {
    const rows = [];
    history.forEach((mov) => {
      const lines = movementLines(mov);
      lines.forEach((line, lineIndex) => {
        rows.push({
          key: `${mov.id}-${line.accountId ?? lineIndex}-${lineIndex}`,
          movementId: mov.id,
          createdAt: mov.createdAt,
          note: mov.note,
          line,
          totalAfterEur: mov.totalAfterEur,
          showMovementMeta: lineIndex === 0,
        });
      });
      if (lines.length === 0) {
        rows.push({
          key: `${mov.id}-empty`,
          movementId: mov.id,
          createdAt: mov.createdAt,
          note: mov.note,
          line: null,
          totalAfterEur: mov.totalAfterEur,
          showMovementMeta: true,
        });
      }
    });
    return rows;
  }, [history]);

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
          loadHistory();
        })
        .catch((err) => showMessage(err?.message || 'Error al guardar', 'error'));
    } else {
      api.quickAccounts
        .create({ name, balance, currency: form.currency })
        .then(() => {
          showMessage('Cuenta creada');
          closeModal();
          load();
          loadHistory();
        })
        .catch((err) => showMessage(err?.message || 'Error al crear', 'error'));
    }
  };

  const handleDelete = (a) => {
    confirm({
      title: 'Eliminar cuenta',
      message: `¿Eliminar la cuenta "${a.name}"?`,
      onConfirm: () => {
        api.quickAccounts
          .delete(a.id)
          .then(() => {
            showMessage('Cuenta eliminada');
            load();
            loadHistory();
          })
          .catch((err) => showMessage(err?.message || 'Error al eliminar', 'error'));
      },
    });
  };

  const styles = {
    wrap: { padding: '0.5rem 0', maxWidth: '100%', margin: '0 auto', width: '100%' },
    topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' },
    title: { fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text)' },
    btnAdd: { padding: '0.4rem 0.75rem', fontSize: '0.9rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--accent)', color: '#fff' },
    btnTransfer: { padding: '0.4rem 0.75rem', fontSize: '0.9rem', fontWeight: 600, border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)' },
    tableWrap: { overflowX: 'hidden', maxWidth: '100%', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', tableLayout: 'fixed' },
    th: { textAlign: 'left', padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 },
    td: { padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', color: 'var(--text)' },
    trTotal: { background: 'var(--surface-hover)', fontWeight: 700 },
    tdTotalLabel: { padding: '0.6rem 0.75rem', borderBottom: 'none', color: 'var(--text)' },
    tdAmount: { textAlign: 'right', fontSize: '0.82rem', lineHeight: 1.25 },
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
    historyBlock: { marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' },
    historyHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' },
    historyTitle: { margin: 0, fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' },
    historyNav: { display: 'flex', alignItems: 'center', gap: '0.35rem' },
    historyNavBtn: { width: '2rem', height: '2rem', padding: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' },
    historyNavLabel: { fontSize: '0.9rem', fontWeight: 600, minWidth: '8rem', textAlign: 'center' },
    historyFilters: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' },
    historySelect: { padding: '0.35rem 0.5rem', fontSize: '0.85rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg)', color: 'var(--text)' },
    btnSnapshot: { padding: '0.35rem 0.75rem', fontSize: '0.85rem', fontWeight: 600, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'var(--surface-hover)', color: 'var(--text)', borderWidth: 1, borderStyle: 'solid', borderColor: 'var(--border)' },
    historyHint: { fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' },
    btnMovement: { padding: '0.2rem 0.45rem', fontSize: '0.85rem', fontWeight: 700, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', minWidth: '1.75rem', lineHeight: 1 },
    btnMovementAdd: { background: 'var(--income)', color: '#fff' },
    btnMovementRemove: { background: 'var(--expense)', color: '#fff' },
    btnMovementTransfer: { background: 'var(--surface-hover)', color: 'var(--text)', border: '1px solid var(--border)' },
    movementTypeLabel: { display: 'inline-block', padding: '0.15rem 0.45rem', borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 600 },
  };

  if (loading && accounts.length === 0) return <Loader />;

  const formatHistoryDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (compactLayout) {
      return d.toLocaleString('es', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleString('es', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`page-cuentas-rapida${compactLayout ? ' cuentas-rapida--compact' : ''}`} style={styles.wrap}>
      <div style={styles.topRow}>
        <h1 style={styles.title} className="cuentas-rapida-top-title">Cuentas rápida</h1>
        <div className="cuentas-rapida-top-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => openTransfer()} style={styles.btnTransfer} className="touch-target" disabled={accounts.length < 2}>
            ⇄ Mover entre cuentas
          </button>
          <button type="button" onClick={openCreate} style={styles.btnAdd} className="touch-target">
            + Añadir cuenta
          </button>
        </div>
      </div>

      <div style={styles.configBlock} className="cuentas-rapida-config-block cuentas-rapida-config-above">
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
        <p style={styles.configHint} className="cuentas-rapida-config-hint">Con este valor se convierten los saldos en dólares a euros y al revés para el total.</p>
      </div>

      <div className="cuentas-rapida-tables-row">
        <section className="cuentas-rapida-accounts-col cuentas-rapida-panel" aria-label="Cuentas rápidas">
          <div style={styles.historyHeader} className="cuentas-rapida-panel-header cuentas-rapida-accounts-header">
            <h2 style={styles.historyTitle}>Cuentas</h2>
          </div>
          <div style={styles.historyFilters} className="cuentas-rapida-panel-filters cuentas-rapida-accounts-filters">
            <label style={{ ...styles.configLabel, marginBottom: 0 }} htmlFor="cr-exchange-rate-inline" className="cuentas-rapida-exchange-label">
              1 USD =
            </label>
            <input
              id="cr-exchange-rate-inline"
              type="number"
              step="0.0001"
              min="0"
              value={exchangeRateUsdToEur ?? ''}
              onChange={(e) => setExchangeRateUsdToEur(e.target.value === '' ? '' : e.target.value)}
              style={styles.configInput}
              aria-label="Valor de 1 dólar en euros"
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>EUR</span>
          </div>
          <div className="cuentas-rapida-panel-body">
          {accounts.length === 0 ? (
            <p style={styles.empty} className="cuentas-rapida-empty">No hay cuentas. Pulsa "Añadir cuenta" para crear una; solo existen en esta tabla.</p>
          ) : (
            <div style={styles.tableWrap} className="cuentas-rapida-table-wrap cuentas-rapida-table-wrap--accounts">
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th} className="cuentas-rapida-col-cuenta">Cuenta</th>
                    <th style={styles.th} className="cuentas-rapida-col-moneda">Moneda</th>
                    <th style={{ ...styles.th, textAlign: 'right' }} className="cuentas-rapida-col-saldo">Saldo</th>
                    <th style={styles.th} className="cuentas-rapida-col-acciones">Acciones</th>
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
                        <td style={styles.td} className="cuentas-rapida-col-cuenta">
                          <span className="cuentas-rapida-cuenta-nombre">{a.name}</span>
                          <span className="cuentas-rapida-moneda-inline">{currency}</span>
                        </td>
                        <td style={styles.td} className="cuentas-rapida-col-moneda">{currency}</td>
                        <td style={{ ...styles.td, ...styles.tdAmount, ...blur }} className={`cuentas-rapida-col-saldo ${blurBalance ? 'balance-blur cuentas-rapida-td-amount' : 'cuentas-rapida-td-amount'}`}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.15rem' }}>
                            <span style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)', fontWeight: 600 }}>
                              {fmt(balance, currency)}
                            </span>
                            {isUsd && (
                              <span style={styles.saldoEurLine} className="cuentas-rapida-saldo-eur">
                                ↓ {fmt(inEur, 'EUR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={styles.td} className="cuentas-rapida-col-acciones">
                          <div style={styles.actions} className="cuentas-rapida-actions">
                            <button type="button" onClick={() => openTransfer(a)} style={{ ...styles.btnMovement, ...styles.btnMovementTransfer }} className="btn-movement-cr cuentas-rapida-action-btn" title="Mover desde esta cuenta" aria-label="Mover desde esta cuenta">⇄</button>
                            <button type="button" onClick={() => openMovement(a, 'add')} style={{ ...styles.btnMovement, ...styles.btnMovementAdd }} className="btn-movement-cr cuentas-rapida-action-btn" title="Ingreso externo" aria-label="Ingreso externo">+</button>
                            <button type="button" onClick={() => openMovement(a, 'remove')} style={{ ...styles.btnMovement, ...styles.btnMovementRemove }} className="btn-movement-cr cuentas-rapida-action-btn" title="Retiro externo" aria-label="Retiro externo">−</button>
                            <button type="button" onClick={() => openEdit(a)} style={styles.btnIcon} className="cuentas-rapida-action-btn cuentas-rapida-action-btn-icon" title="Editar" aria-label="Editar">
                              <IconEdit size={18} />
                            </button>
                            <button type="button" onClick={() => handleDelete(a)} style={{ ...styles.btnIcon, color: 'var(--expense)' }} className="cuentas-rapida-action-btn cuentas-rapida-action-btn-icon" title="Eliminar" aria-label="Eliminar">
                              <IconTrash size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={styles.trTotal} className="cuentas-rapida-tr-total">
                    <td style={styles.tdTotalLabel} className="cuentas-rapida-col-cuenta cuentas-rapida-col-total-label">Total (EUR)</td>
                    <td style={styles.td} className="cuentas-rapida-col-moneda" aria-hidden="true" />
                    <td style={{ ...styles.td, ...styles.tdAmount, color: totalEur >= 0 ? 'var(--income)' : 'var(--expense)', ...(blurBalance ? styles.balanceBlur : {}) }} className={`cuentas-rapida-col-saldo ${blurBalance ? 'balance-blur' : ''}`}>
                      {fmt(totalEur, 'EUR')}
                    </td>
                    <td style={styles.td} className="cuentas-rapida-col-acciones" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>

        <section className="cuentas-rapida-history-col cuentas-rapida-panel" aria-label="Histórico de movimientos">
          <div style={styles.historyHeader} className="cuentas-rapida-panel-header cuentas-rapida-history-header">
            <h2 style={styles.historyTitle}>
              <IconHistory size={18} /> Histórico de movimientos
            </h2>
            <div style={styles.historyNav}>
              <button type="button" onClick={prevHistoryMonth} style={styles.historyNavBtn} className="touch-target cuentas-rapida-history-nav-btn" aria-label="Mes anterior">‹</button>
              <span style={styles.historyNavLabel} className="cuentas-rapida-history-nav-label">{MONTHS[historyMonth - 1]} {historyYear}</span>
              <button type="button" onClick={nextHistoryMonth} style={styles.historyNavBtn} className="touch-target cuentas-rapida-history-nav-btn" aria-label="Mes siguiente">›</button>
            </div>
          </div>
          <p style={styles.historyHint} className="cuentas-rapida-history-hint">
            Una fila por cuenta afectada: nombre, importe que entró o salió (↑ verde / ↓ rojo) y saldo que queda en esa cuenta.
          </p>
          <div style={styles.historyFilters} className="cuentas-rapida-panel-filters cuentas-rapida-history-filters">
            <select
              value={historyFilterAccountId}
              onChange={(e) => setHistoryFilterAccountId(e.target.value)}
              style={styles.historySelect}
              aria-label="Filtrar por cuenta"
            >
              <option value="">Todas las cuentas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="cuentas-rapida-panel-body">
          {historyLoading ? (
            <Loader />
          ) : historyTableRows.length === 0 ? (
            <p style={styles.empty} className="cuentas-rapida-empty">No hay movimientos en este mes. Usa «Mover entre cuentas» o los botones de cada fila.</p>
          ) : (
            <div style={styles.tableWrap} className="cuentas-rapida-table-wrap cuentas-rapida-table-wrap--history">
              <table style={styles.table} className="cuentas-rapida-table--history">
                <thead>
                  <tr>
                    <th style={styles.th} className="cuentas-rapida-col-fecha">Fecha</th>
                    <th style={styles.th} className="cuentas-rapida-col-cuenta-h">Cuenta</th>
                    <th style={{ ...styles.th, textAlign: 'right' }} className="cuentas-rapida-col-cambio">Cambio</th>
                    <th style={{ ...styles.th, textAlign: 'right' }} className="cuentas-rapida-col-saldo-h">Saldo</th>
                    <th style={{ ...styles.th, textAlign: 'right' }} className="cuentas-rapida-col-total-h">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {historyTableRows.map((row) => {
                    const blur = blurBalance ? styles.balanceBlur : {};
                    const dateLabel = formatHistoryDate(row.createdAt);
                    const l = row.line;
                    if (!l) {
                      return (
                        <tr key={row.key}>
                          <td style={styles.td}>{dateLabel}</td>
                          <td colSpan={3} style={styles.td}>
                            {isAccountLifecycleNote(row.note) ? lifecycleLabel(row.note) : '—'}
                          </td>
                          <td style={{ ...styles.td, ...styles.tdAmount, fontWeight: 600, ...blur }} className={blurBalance ? 'balance-blur' : ''}>
                            {fmt(row.totalAfterEur, 'EUR')}
                          </td>
                        </tr>
                      );
                    }
                    const isDown = movementLineIsDown(l, row.note);
                    return (
                      <tr key={row.key}>
                        <td style={styles.td}>{row.showMovementMeta ? dateLabel : ''}</td>
                        <td style={styles.td}>
                          {isAccountLifecycleNote(row.note) && row.showMovementMeta && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>
                              {lifecycleLabel(row.note)}
                            </div>
                          )}
                          <span style={{ fontWeight: 500 }}>{l.accountName}</span>
                        </td>
                        <td style={{ ...styles.td, ...styles.tdAmount, color: isDown ? 'var(--expense)' : 'var(--income)', ...blur }} className={blurBalance ? 'balance-blur' : ''}>
                          <span aria-hidden="true" style={{ marginRight: '0.25rem' }}>{isDown ? '↓' : '↑'}</span>
                          {fmt(Math.abs(l.amount), l.currency)}
                        </td>
                        <td style={{ ...styles.td, ...styles.tdAmount, ...blur }} className={blurBalance ? 'balance-blur' : ''}>
                          {l.balanceAfter != null ? fmt(l.balanceAfter, l.currency) : '—'}
                        </td>
                        <td style={{ ...styles.td, ...styles.tdAmount, fontWeight: 600, ...blur }} className={blurBalance ? 'balance-blur' : ''}>
                          {row.showMovementMeta ? fmt(row.totalAfterEur, 'EUR') : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </section>
      </div>

      {showTransferModal && (
        <div style={styles.modalOverlay} onClick={closeTransfer} role="dialog" aria-modal="true" aria-labelledby="cuentas-rapida-transfer-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 id="cuentas-rapida-transfer-title" style={styles.modalTitle}>Mover entre cuentas</h2>
            <form onSubmit={submitTransfer}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-transfer-from">Se quita de</label>
                <select
                  id="cr-transfer-from"
                  value={transferFromId}
                  onChange={(e) => setTransferFromId(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Elegir cuenta…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-transfer-to">Se agrega a</label>
                <select
                  id="cr-transfer-to"
                  value={transferToId}
                  onChange={(e) => setTransferToId(e.target.value)}
                  style={styles.select}
                  required
                >
                  <option value="">Elegir cuenta…</option>
                  {accounts.filter((a) => String(a.id) !== transferFromId).map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance, a.currency)})</option>
                  ))}
                </select>
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-transfer-amount">Importe (moneda de origen)</label>
                <input
                  id="cr-transfer-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  style={styles.input}
                  required
                  autoFocus
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-transfer-note">Nota (opcional)</label>
                <input
                  id="cr-transfer-note"
                  type="text"
                  placeholder="Ej. Cambio de monedero..."
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  style={styles.input}
                />
              </div>
              <div style={styles.modalActions}>
                <button type="submit" disabled={transferBusy} style={styles.btnPrimary}>
                  {transferBusy ? 'Guardando…' : 'Registrar movimiento'}
                </button>
                <button type="button" onClick={closeTransfer} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {movementAccount && (
        <div style={styles.modalOverlay} onClick={closeMovement} role="dialog" aria-modal="true" aria-labelledby="cuentas-rapida-movement-title">
          <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <h2 id="cuentas-rapida-movement-title" style={styles.modalTitle}>
              {movementType === 'add' ? 'Ingreso externo' : 'Retiro externo'} — {movementAccount.name}
            </h2>
            <form onSubmit={submitMovement}>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-movement-amount">Importe</label>
                <input
                  id="cr-movement-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  style={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label} htmlFor="cr-movement-note">Nota (opcional)</label>
                <input
                  id="cr-movement-note"
                  type="text"
                  placeholder={movementType === 'add' ? 'Ej. Nómina, venta...' : 'Ej. Compra, retiro...'}
                  value={movementNote}
                  onChange={(e) => setMovementNote(e.target.value)}
                  style={styles.input}
                />
              </div>
              <p style={{ ...styles.configHint, marginTop: 0 }}>
                Saldo actual: {formatMoney(movementAccount.balance, movementAccount.currency || 'EUR')}
              </p>
              <div style={styles.modalActions}>
                <button
                  type="submit"
                  disabled={movementBusy}
                  style={{
                    ...styles.btnPrimary,
                    background: movementType === 'add' ? 'var(--income)' : 'var(--expense)',
                  }}
                >
                  {movementBusy ? 'Guardando…' : movementType === 'add' ? 'Agregar' : 'Quitar'}
                </button>
                <button type="button" onClick={closeMovement} style={styles.btnSecondary}>Cancelar</button>
              </div>
            </form>
          </div>
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
                <label style={styles.label} htmlFor="cr-balance">
                  {editingId ? 'Saldo' : 'Saldo inicial'}
                </label>
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
