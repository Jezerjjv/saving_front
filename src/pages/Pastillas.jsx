import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useLayoutHeader } from '../context/LayoutHeaderContext';
import { useMessage } from '../context/MessageContext';
import Loader from '../components/Loader';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const PRESET_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);
  const daysInMonth = last.getDate();
  const firstWeekday = (first.getDay() + 6) % 7;
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  const lastWeek = weeks[weeks.length - 1];
  while (lastWeek.length < 7) lastWeek.push(null);
  return weeks;
}

export default function Pastillas() {
  useLayoutHeader('Recordatorio');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm } = useMessage();

  useEffect(() => {
    if (user != null && !user.is_admin) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [pillTypes, setPillTypes] = useState([]);
  const [selectedPillId, setSelectedPillId] = useState(null);
  const [logByDate, setLogByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [adding, setAdding] = useState(false);
  const [openDay, setOpenDay] = useState(null);
  const [pendingPillIds, setPendingPillIds] = useState(new Set());
  const [savingDay, setSavingDay] = useState(false);

  const monthGrid = useMemo(() => getMonthGrid(year, month), [year, month]);

  useEffect(() => {
    if (openDay) {
      setPendingPillIds(new Set((logByDate[openDay] || []).map((p) => p.id)));
    }
  }, [openDay]);

  useEffect(() => {
    api.pillLog.getTypes()
      .then((list) => {
        setPillTypes(Array.isArray(list) ? list : []);
        if (list?.length > 0 && !selectedPillId) setSelectedPillId(list[0].id);
      })
      .catch(() => setPillTypes([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.pillLog.getMonth(year, month)
      .then((byDate) => setLogByDate(typeof byDate === 'object' && byDate !== null ? byDate : {}))
      .catch(() => setLogByDate({}))
      .finally(() => setLoading(false));
  }, [year, month]);

  const getPillsForDay = (day) => {
    if (day == null) return [];
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return logByDate[dateStr] || [];
  };

  const hasPillOnDay = (day, pillTypeId) => getPillsForDay(day).some((p) => p.id === pillTypeId);

  const dateStrForDay = (day) => day == null ? null : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const togglePillForDate = async (dateStr, pillTypeId) => {
    if (!dateStr || pillTypeId == null) return;
    const pillsOnDay = logByDate[dateStr] || [];
    const add = !pillsOnDay.some((p) => p.id === pillTypeId);
    setToggling(`${dateStr}-${pillTypeId}`);
    try {
      await api.pillLog.setDay(dateStr, pillTypeId, add);
      setLogByDate((prev) => {
        const next = { ...prev };
        const arr = next[dateStr] ? [...next[dateStr]] : [];
        const pill = pillTypes.find((p) => p.id === pillTypeId);
        if (add && pill) {
          arr.push(pill);
          next[dateStr] = arr;
        } else {
          next[dateStr] = arr.filter((p) => p.id !== pillTypeId);
          if (next[dateStr].length === 0) delete next[dateStr];
        }
        return next;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(null);
    }
  };

  const openDayMenu = (day) => {
    if (day == null || pillTypes.length === 0) return;
    setOpenDay(dateStrForDay(day));
  };

  const togglePendingPill = (pillTypeId) => {
    setPendingPillIds((prev) => {
      const next = new Set(prev);
      if (next.has(pillTypeId)) next.delete(pillTypeId);
      else next.add(pillTypeId);
      return next;
    });
  };

  const markAllDay = () => setPendingPillIds(new Set(pillTypes.map((p) => p.id)));
  const unmarkAllDay = () => setPendingPillIds(new Set());

  const applyDayPills = async () => {
    if (!openDay) return;
    setSavingDay(true);
    try {
      const current = new Set((logByDate[openDay] || []).map((p) => p.id));
      const toAdd = [...pendingPillIds].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !pendingPillIds.has(id));
      await Promise.all([
        ...toAdd.map((id) => api.pillLog.setDay(openDay, id, true)),
        ...toRemove.map((id) => api.pillLog.setDay(openDay, id, false)),
      ]);
      const pills = pillTypes.filter((p) => pendingPillIds.has(p.id));
      setLogByDate((prev) => {
        const next = { ...prev };
        if (pills.length) next[openDay] = pills;
        else delete next[openDay];
        return next;
      });
      setOpenDay(null);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingDay(false);
    }
  };

  const closeDayMenu = (cancel = true) => {
    if (cancel) setOpenDay(null);
  };

  const addPillType = async (e) => {
    e?.preventDefault();
    const name = newName?.trim() || 'Nuevo';
    setAdding(true);
    try {
      const created = await api.pillLog.createType({ name, color: newColor });
      if (created) {
        setPillTypes((prev) => [...prev, created]);
        setSelectedPillId(created.id);
        setNewName('');
        setNewColor(PRESET_COLORS[(pillTypes.length % PRESET_COLORS.length)]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const deletePillType = async (id) => {
    try {
      await api.pillLog.deleteType(id);
      const nextTypes = pillTypes.filter((p) => p.id !== id);
      setPillTypes(nextTypes);
      if (selectedPillId === id) setSelectedPillId(nextTypes[0]?.id ?? null);
    } catch (err) {
      console.error(err);
    }
  };

  const askDeletePillType = (p) => {
    confirm({
      title: 'Eliminar',
      message: `¿Eliminar "${p.name}"? Se quitará de todos los días.`,
      onConfirm: () => deletePillType(p.id),
    });
  };

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); } else setMonth((m) => m + 1);
  };

  const today = now.getDate();
  const isCurrentMonth = year === currentYear && month === currentMonth;

  if (user != null && !user.is_admin) {
    return null;
  }

  return (
    <div className="page-pastillas">
      <p className="page-pastillas-hint">
        Haz clic en un elemento para añadirlo o quitarlo del día de hoy. Haz clic en un día del calendario para abrir el menú y marcar por fecha.
      </p>

      <section className="page-pastillas-section">
        <h2 className="page-pastillas-section-title">Mis elementos</h2>
        {pillTypes.length === 0 ? (
          <div className="page-pastillas-card">
            <form onSubmit={addPillType} className="page-pastillas-add-form">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre (ej. Creatina, Vitamina D, suplemento)"
                className="page-pastillas-input"
                maxLength={100}
              />
              <div className="page-pastillas-color-row">
                <label className="page-pastillas-color-label">Color</label>
                <input
                  type="color"
                  value={newColor}
                  onChange={(e) => setNewColor(e.target.value)}
                  className="page-pastillas-color-picker"
                  title="Color"
                />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`page-pastillas-color-preset ${newColor === c ? 'is-selected' : ''}`}
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
              <button type="submit" disabled={adding} className="page-pastillas-btn-same">
                {adding ? '…' : 'Crear'}
              </button>
            </form>
          </div>
        ) : (
          <>
            <div className="page-pastillas-chips">
              {pillTypes.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    if (e.target.closest('.page-pastillas-chip-del')) return;
                    setSelectedPillId(p.id);
                    togglePillForDate(getTodayDateStr(), p.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedPillId(p.id);
                      togglePillForDate(getTodayDateStr(), p.id);
                    }
                  }}
                  className={`page-pastillas-chip touch-target ${selectedPillId === p.id ? 'is-active' : ''}`}
                  style={{ borderColor: selectedPillId === p.id ? p.color : undefined }}
                  title={`${p.name}. Clic: añadir o quitar del día de hoy.`}
                  aria-pressed={selectedPillId === p.id}
                >
                  <span className="page-pastillas-chip-dot" style={{ background: p.color }} />
                  <span className="page-pastillas-chip-name">{p.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); askDeletePillType(p); }}
                    className="page-pastillas-chip-del"
                    aria-label={`Eliminar ${p.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={addPillType} className="page-pastillas-add-inline">
              <div className="page-pastillas-input-wrap">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="+ Añadir otro"
                  className="page-pastillas-input-inline"
                  maxLength={100}
                />
              </div>
              <div className="page-pastillas-row-mobile">
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="page-pastillas-color-picker-small" title="Color" />
                <button type="submit" disabled={adding} className="page-pastillas-btn-same">
                  {adding ? '…' : 'Añadir'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>

      {/* Navegación mes (mismo aspecto que Calendario) */}
      <div className="nav-month">
        <button type="button" onClick={prevMonth} className="nav-month-btn" aria-label="Mes anterior">‹</button>
        <div className="nav-month-month-year">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mes">
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año">
            {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={nextMonth} className="nav-month-btn" aria-label="Mes siguiente">›</button>
      </div>

      {/* Submenú del día seleccionado */}
      {openDay && (
        <div className="page-pastillas-day-menu" role="dialog" aria-label="Marcar del día">
          <div className="page-pastillas-day-menu-backdrop" onClick={() => closeDayMenu(true)} aria-hidden />
          <div className="page-pastillas-day-menu-card">
            <div className="page-pastillas-day-menu-header">
              <span>
                Día {openDay.slice(8, 10)} de {MONTHS[month - 1]}
              </span>
              <button type="button" onClick={() => closeDayMenu(true)} className="page-pastillas-day-menu-close" aria-label="Cerrar">
                ×
              </button>
            </div>
            <p className="page-pastillas-day-menu-hint">Marca lo que tomaste este día:</p>
            <div className="page-pastillas-day-menu-actions">
              <button type="button" onClick={markAllDay} disabled={savingDay} className="page-pastillas-day-menu-btn-secondary">
                Marcar todas
              </button>
              <button type="button" onClick={unmarkAllDay} disabled={savingDay} className="page-pastillas-day-menu-btn-secondary">
                Desmarcar todo
              </button>
            </div>
            <ul className="page-pastillas-day-menu-list">
              {pillTypes.map((p) => {
                const taken = pendingPillIds.has(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => togglePendingPill(p.id)}
                      disabled={savingDay}
                      className={`page-pastillas-day-menu-item touch-target ${taken ? 'is-taken' : ''}`}
                      style={{ ['--pill-color']: p.color }}
                    >
                      <span className="page-pastillas-day-menu-dot" style={{ background: p.color }} />
                      <span className="page-pastillas-day-menu-name">{p.name}</span>
                      <span className="page-pastillas-day-menu-check">{taken ? '✓' : ''}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {pillTypes.length === 0 && <p className="page-pastillas-day-menu-empty">Crea al menos un elemento arriba.</p>}
            <div className="page-pastillas-day-menu-footer">
              <button type="button" onClick={() => closeDayMenu(true)} disabled={savingDay} className="page-pastillas-day-menu-btn-cancel">
                Cancelar
              </button>
              <button type="button" onClick={applyDayPills} disabled={savingDay} className="page-pastillas-day-menu-btn-apply">
                {savingDay ? '…' : 'Aceptar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendario */}
      {loading ? (
        <Loader />
      ) : (
        <div className="calendar-month-grid-wrap">
          <table className="calendar-month-grid pastillas-calendar-grid" role="grid" aria-label={`Recordatorio ${MONTHS[month - 1]} ${year}`}>
            <thead>
              <tr>
                {WEEKDAYS.map((wd) => (
                  <th key={wd} scope="col" className="calendar-weekday">{wd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthGrid.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => {
                    const pills = getPillsForDay(day);
                    const isToday = isCurrentMonth && day === today;
                    const dateStr = dateStrForDay(day);
                    return (
                      <td key={di} className="calendar-day-cell">
                        <div className="calendar-day-inner pastillas-cell-inner">
                          {day == null ? (
                            <span className="pastillas-day-slot pastillas-day-empty" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => openDayMenu(day)}
                              disabled={pillTypes.length === 0}
                              className={`pastillas-day-slot touch-target ${isToday ? 'pastillas-day-today' : ''}`}
                              title={pills.length ? pills.map((p) => p.name).join(', ') : 'Clic para marcar'}
                              aria-label={`Día ${day}. Clic para abrir menú.`}
                            >
                              <span className="pastillas-day-num">{day}</span>
                              {pills.length > 0 && (
                                <span className="pastillas-day-dots">
                                  {pills.map((p) => (
                                    <span key={p.id} className="pastillas-day-dot" style={{ background: p.color }} title={p.name} />
                                  ))}
                                </span>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
