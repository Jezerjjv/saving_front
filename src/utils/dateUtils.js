/** Fecha de hoy en zona local (YYYY-MM-DD). Evita que toISOString() devuelva el día anterior en zonas detrás de UTC. */
export function getTodayLocalDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
