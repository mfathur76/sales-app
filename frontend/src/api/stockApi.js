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
