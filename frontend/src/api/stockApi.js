import { request, query } from './orderApi';

export const productApi = {
  // all = include inactive (admin only)
  list: (all = false) => request(`/products${all ? '?all=1' : ''}`),
  create: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  createBatch: (products) => request('/products/batch', { method: 'POST', body: JSON.stringify({ products }) }),
  update: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) })
};

export const shipmentApi = {
  // filters: { outlet, from, to, status }
  list: (filters) => request(`/stock/shipments${query(filters)}`),
  create: (data) => request('/stock/shipments', { method: 'POST', body: JSON.stringify(data) }),
  update: (s, data) => request(`/stock/shipments/${s.outlet}/${s.id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (s) => request(`/stock/shipments/${s.outlet}/${s.id}`, { method: 'DELETE' }),
  // lines: [{ productId, receivedQty }]; products left out count as received in full
  receive: (s, lines) => request(`/stock/shipments/${s.outlet}/${s.id}/receive`, { method: 'POST', body: JSON.stringify({ lines }) })
};

export const stockApi = {
  getClosing: (date, outlet) => request(`/stock/closing${query({ date, outlet })}`),
  saveClosing: (data) => request('/stock/closing', { method: 'PUT', body: JSON.stringify(data) }),
  removeClosing: (outlet, date) => request(`/stock/closing/${outlet}/${date}`, { method: 'DELETE' }),
  report: (from, to, outlet) => request(`/stock/report${query({ from, to, outlet })}`)
};

export const PRODUCT_KIND = {
  produksi: 'Produksi',
  beli_jadi: 'Beli jadi'
};

/** Shops only: the kitchen account is not a stock location for shipments or counts. */
export const shopOutlets = (outlets) => (outlets || []).filter((o) => o.role !== 'dapur');

export const NO_CATEGORY = 'Lainnya';

/** Groups items under their category, keeping the order in which categories first appear. */
export function groupByCategory(items, getCategory = (x) => x.category) {
  const groups = [];
  const byName = new Map();
  items.forEach((item) => {
    const category = (getCategory(item) || '').trim() || NO_CATEGORY;
    let g = byName.get(category);
    if (!g) {
      g = { category, items: [] };
      byName.set(category, g);
      groups.push(g);
    }
    g.items.push(item);
  });
  return groups;
}

// Kitchen stock. Admins act on the only kitchen account unless `kitchen` is given.
export const kitchenApi = {
  listEntries: (from, to) => request(`/stock/kitchen/entries${query({ from, to })}`),
  // kind: 'produksi' | 'masuk'; lines: [{ productId, qty }]
  createEntry: (data) => request('/stock/kitchen/entries', { method: 'POST', body: JSON.stringify(data) }),
  removeEntry: (id) => request(`/stock/kitchen/entries/${id}`, { method: 'DELETE' }),
  getCount: (date) => request(`/stock/kitchen/count${query({ date })}`),
  saveCount: (date, lines) => request('/stock/kitchen/count', { method: 'PUT', body: JSON.stringify({ date, lines }) }),
  report: (from, to) => request(`/stock/kitchen/report${query({ from, to })}`)
};

// Resellers take stock from the kitchen and pay later. Kitchen and admins only.
export const resellerApi = {
  // filters: { customerId, from, to, unpaid }
  listSales: (filters) => request(`/resellers/sales${query(filters)}`),
  summary: (today) => request(`/resellers/summary${query({ today })}`),
  // data: { customerId, date, dueDate?, lines: [{ productId, qty, price? }], payment?, notes? }
  createSale: (data) => request('/resellers/sales', { method: 'POST', body: JSON.stringify(data) }),
  updateSale: (id, data) => request(`/resellers/sales/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  removeSale: (id) => request(`/resellers/sales/${id}`, { method: 'DELETE' }),
  addPayment: (id, payment) => request(`/resellers/sales/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
  removePayment: (id, paymentId) => request(`/resellers/sales/${id}/payments/${paymentId}`, { method: 'DELETE' })
};
