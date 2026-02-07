const BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('saving_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const authHeaders = getAuthHeaders();
  const headers = { 'Content-Type': 'application/json', ...authHeaders, ...options.headers };
  const res = await fetch(BASE + path, { ...options, headers });
  if (res.status === 401) {
    // Solo redirigir si habíamos enviado token (sesión expirada). Evita bucle en login.
    if (authHeaders.Authorization && typeof localStorage !== 'undefined') {
      localStorage.removeItem('saving_token');
      localStorage.removeItem('saving_user');
      window.location.href = '/login';
    }
    throw new Error('Sesión expirada');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  auth: {
    getMe: () => request('/auth/me'),
    updateProfile: (body) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(body) }),
  },
  productTypes: {
    list: () => request('/product-types'),
    get: (id) => request(`/product-types/${id}`),
    create: (body) => request('/product-types', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/product-types/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/product-types/${id}`, { method: 'DELETE' }),
  },
  accounts: {
    list: () => request('/accounts'),
    get: (id) => request(`/accounts/${id}`),
    create: (body) => request('/accounts', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/accounts/${id}`, { method: 'DELETE' }),
    products: {
      list: (accountId) => request(`/accounts/${accountId}/products`),
      create: (accountId, body) => request(`/accounts/${accountId}/products`, { method: 'POST', body: JSON.stringify(body) }),
      update: (accountId, productId, body) => request(`/accounts/${accountId}/products/${productId}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (accountId, productId) => request(`/accounts/${accountId}/products/${productId}`, { method: 'DELETE' }),
    },
  },
  icons: {
    list: () => request('/icons'),
    get: (id) => request(`/icons/${id}`),
    create: (body) => request('/icons', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/icons/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/icons/${id}`, { method: 'DELETE' }),
  },
  categories: {
    list: () => request('/categories'),
    get: (id) => request(`/categories/${id}`),
    create: (body) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
  },
  transactions: {
    list: () => request('/transactions'),
    grouped: (month, year) => request(`/transactions/grouped?month=${month}&year=${year}`),
    monthlySummary: (year, accountId) => request(`/transactions/monthly-summary?year=${year}${accountId != null ? `&accountId=${accountId}` : ''}`),
    dailyIndicators: (year, accountId) => request(`/transactions/daily-indicators?year=${year}${accountId != null ? `&accountId=${accountId}` : ''}`),
    expensesByCategory: (month, year, accountId) => request(`/transactions/expenses-by-category?month=${month}&year=${year}${accountId != null ? `&accountId=${accountId}` : ''}`),
    incomesByCategory: (month, year, accountId) => request(`/transactions/incomes-by-category?month=${month}&year=${year}${accountId != null ? `&accountId=${accountId}` : ''}`),
    get: (id) => request(`/transactions/${id}`),
    create: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  },
  fixedIncomes: {
    list: () => request('/fixed-incomes'),
    create: (body) => request('/fixed-incomes', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/fixed-incomes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/fixed-incomes/${id}`, { method: 'DELETE' }),
    applyMonth: (month, year) => request('/fixed-incomes/apply-month', { method: 'POST', body: JSON.stringify({ month, year }) }),
    applyOne: (id, month, year) => request(`/fixed-incomes/${id}/apply`, { method: 'POST', body: JSON.stringify({ month, year }) }),
  },
  fixedExpenses: {
    list: () => request('/fixed-expenses'),
    create: (body) => request('/fixed-expenses', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/fixed-expenses/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/fixed-expenses/${id}`, { method: 'DELETE' }),
    applyMonth: (month, year) => request('/fixed-expenses/apply-month', { method: 'POST', body: JSON.stringify({ month, year }) }),
    applyOne: (id, month, year) => request(`/fixed-expenses/${id}/apply`, { method: 'POST', body: JSON.stringify({ month, year }) }),
  },
  quickTemplates: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.type) q.set('type', params.type);
      if (params.showInQuick !== undefined) q.set('showInQuick', params.showInQuick);
      return request('/quick-templates' + (q.toString() ? '?' + q.toString() : ''));
    },
    create: (body) => request('/quick-templates', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/quick-templates/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/quick-templates/${id}`, { method: 'DELETE' }),
  },
  transfers: {
    list: () => request('/transfers'),
    get: (id) => request(`/transfers/${id}`),
    create: (body) => request('/transfers', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id) => request(`/transfers/${id}`, { method: 'DELETE' }),
  },
  periodicTransfers: {
    list: () => request('/periodic-transfers'),
    create: (body) => request('/periodic-transfers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id, body) => request(`/periodic-transfers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id) => request(`/periodic-transfers/${id}`, { method: 'DELETE' }),
    applyMonth: (month, year) => request('/periodic-transfers/apply-month', { method: 'POST', body: JSON.stringify({ month, year }) }),
    applyOne: (id, month, year) => request(`/periodic-transfers/${id}/apply`, { method: 'POST', body: JSON.stringify({ month, year }) }),
  },
  settings: {
    get: () => request('/settings'),
    update: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
  interestHistory: {
    get: (year, month) => {
      const q = new URLSearchParams();
      if (year != null) q.set('year', String(year));
      if (month != null) q.set('month', String(month));
      return request('/interest-history' + (q.toString() ? '?' + q.toString() : ''));
    },
  },
  crypto: {
    holdings: {
      list: () => request('/crypto/holdings'),
      get: (id) => request(`/crypto/holdings/${id}`),
      create: (body) => request('/crypto/holdings', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) => request(`/crypto/holdings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id) => request(`/crypto/holdings/${id}`, { method: 'DELETE' }),
      dailyHistory: (id, year, month) => {
        const q = new URLSearchParams();
        if (year != null) q.set('year', String(year));
        if (month != null) q.set('month', String(month));
        return request(`/crypto/holdings/${id}/daily-history` + (q.toString() ? '?' + q.toString() : ''));
      },
    },
    prices: (symbols) => request('/crypto/prices?symbols=' + (Array.isArray(symbols) ? symbols.join(',') : encodeURIComponent(String(symbols || '')))),
    dailyClose: (year, month) => {
      const q = new URLSearchParams();
      if (year != null) q.set('year', String(year));
      if (month != null) q.set('month', String(month));
      return request('/crypto/daily-close' + (q.toString() ? '?' + q.toString() : ''));
    },
    eligible: () => request('/crypto/eligible'),
  },
  stocks: {
    holdings: {
      list: () => request('/stocks/holdings'),
      get: (id) => request(`/stocks/holdings/${id}`),
      dailyHistory: (id, year, month) => {
        const q = new URLSearchParams();
        if (year != null) q.set('year', year);
        if (month != null) q.set('month', month);
        return request(`/stocks/holdings/${id}/daily-history` + (q.toString() ? '?' + q.toString() : ''));
      },
      create: (body) => request('/stocks/holdings', { method: 'POST', body: JSON.stringify(body) }),
      update: (id, body) => request(`/stocks/holdings/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
      delete: (id) => request(`/stocks/holdings/${id}`, { method: 'DELETE' }),
    },
    prices: (symbols) => request('/stocks/prices?symbols=' + (Array.isArray(symbols) ? symbols.join(',') : encodeURIComponent(String(symbols || '')))),
    eligible: () => request('/stocks/eligible'),
  },
};
