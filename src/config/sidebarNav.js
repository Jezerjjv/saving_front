/** Claves de visibilidad del menú lateral (guardadas en app_settings.menuVisibility). */
export const MENU_VISIBILITY_DEFAULTS = {
  inicio: true,
  movimientos: true,
  tablaRapida: true,
  cuentasRapida: true,
  calendario: true,
  cuentas: true,
  transferencias: true,
  criptomonedas: true,
  acciones: true,
  intereses: true,
  pastillas: true,
  calculadora: true,
  configuracion: true,
};

/** Rutas → clave de menú (para redirigir si la sección está oculta). */
export const PATH_TO_MENU_KEY = {
  '/': 'tablaRapida',
  '/inicio': 'inicio',
  '/movimientos': 'movimientos',
  '/rapidos-y-fijos': 'movimientos',
  '/tabla-rapida': 'tablaRapida',
  '/cuentas-rapida': 'cuentasRapida',
  '/calendario': 'calendario',
  '/cuentas': 'cuentas',
  '/transferencias': 'transferencias',
  '/criptomonedas': 'criptomonedas',
  '/acciones': 'acciones',
  '/intereses': 'intereses',
  '/pastillas': 'pastillas',
  '/calculadora': 'calculadora',
  '/configuracion': 'configuracion',
};

export const MENU_ITEMS_CONFIG = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'movimientos', label: 'Movimientos' },
  { key: 'tablaRapida', label: 'Tabla rápida' },
  { key: 'cuentasRapida', label: 'Cuentas rápida' },
  { key: 'calendario', label: 'Calendario' },
  { key: 'cuentas', label: 'Cuentas' },
  { key: 'transferencias', label: 'Transferencias' },
  { key: 'criptomonedas', label: 'Criptomonedas', group: 'Inversiones' },
  { key: 'acciones', label: 'Acciones', group: 'Inversiones' },
  { key: 'intereses', label: 'Intereses', group: 'Inversiones' },
  { key: 'pastillas', label: 'Recordatorio (Mis apps)', group: 'Mis apps', adminOnly: true },
  { key: 'calculadora', label: 'Calculadora' },
  { key: 'configuracion', label: 'Config' },
];

export function mergeMenuVisibility(saved) {
  const merged = { ...MENU_VISIBILITY_DEFAULTS };
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(MENU_VISIBILITY_DEFAULTS)) {
      if (typeof saved[key] === 'boolean') merged[key] = saved[key];
    }
  }
  return merged;
}

export function getFirstVisiblePath(menuVisibility, { isAdmin = false, interestEligible = false } = {}) {
  const order = [
    { key: 'tablaRapida', path: '/tabla-rapida' },
    { key: 'inicio', path: '/inicio' },
    { key: 'movimientos', path: '/movimientos' },
    { key: 'cuentasRapida', path: '/cuentas-rapida' },
    { key: 'calendario', path: '/calendario' },
    { key: 'cuentas', path: '/cuentas' },
    { key: 'transferencias', path: '/transferencias' },
    { key: 'criptomonedas', path: '/criptomonedas' },
    { key: 'acciones', path: '/acciones' },
    { key: 'intereses', path: '/intereses', needsInterest: true },
    { key: 'pastillas', path: '/pastillas', adminOnly: true },
    { key: 'calculadora', path: '/calculadora' },
    { key: 'configuracion', path: '/configuracion' },
  ];
  for (const item of order) {
    if (item.adminOnly && !isAdmin) continue;
    if (item.needsInterest && !interestEligible) continue;
    if (menuVisibility[item.key] !== false) return item.path;
  }
  return '/configuracion';
}

/** Filtra ítems del sidebar según visibilidad guardada en BD. */
export function filterSidebarNav(items, { isMenuItemVisible, isAdmin, interestEligible }) {
  const visible = (key) => !key || isMenuItemVisible(key);

  const filterChildren = (children) =>
    (children || [])
      .map((child) => {
        if (child?.type === 'group' && child.children) {
          const nested = filterChildren(child.children);
          if (nested.length === 0) return null;
          return { ...child, children: nested };
        }
        const key = child.menuKey;
        if (child.to === '/intereses' && !interestEligible) return null;
        if (!visible(key)) return null;
        return child;
      })
      .filter(Boolean);

  return items
    .map((item) => {
      if (item.label === 'Mis apps' && !isAdmin) return null;
      if (item.type === 'group') {
        const children = filterChildren(item.children);
        if (children.length === 0) return null;
        return { ...item, children };
      }
      if (!visible(item.menuKey)) return null;
      return item;
    })
    .filter(Boolean);
}
