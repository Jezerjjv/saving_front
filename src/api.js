const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  productTypes: {
    list: () => request('/product-types'),
    get: (id) => request(`/product-types/${id}`),
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
    monthlySummary: (year) => request(`/transactions/monthly-summary?year=${year}`),
    expensesByCategory: (month, year) => request(`/transactions/expenses-by-category?month=${month}&year=${year}`),
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
  settings: {
    get: () => request('/settings'),
    update: (body) => request('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  },
};
