import { authApi, API_BASE_URL } from './salesApi';

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authApi.getToken()}`
    }
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.error || payload?.message || `HTTP error! status: ${response.status}`);
    // Duplicate phone numbers come back with the customer that already owns the number
    error.existingCustomer = payload?.existingCustomer;
    throw error;
  }

  return payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;
}

export const query = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.append(k, v);
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

export const customerApi = {
  list: (q) => request(`/customers${query({ q })}`),
  get: (id) => request(`/customers/${id}`),
  create: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/customers/${id}`, { method: 'DELETE' })
};

export const orderApi = {
  // filters: { outlet, customerId, pickupFrom, pickupTo, status, paymentStatus, unpaid }
  list: (filters) => request(`/orders${query(filters)}`),
  get: (id) => request(`/orders/${id}`),
  create: (data) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/orders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  remove: (id) => request(`/orders/${id}`, { method: 'DELETE' }),
  addPayment: (id, payment) => request(`/orders/${id}/payments`, { method: 'POST', body: JSON.stringify(payment) }),
  removePayment: (id, paymentId) => request(`/orders/${id}/payments/${paymentId}`, { method: 'DELETE' })
};

// ---- Shared display helpers ----

export const ORDER_STATUS = {
  baru: { label: 'Baru', color: '#2563eb' },
  diproses: { label: 'Diproses', color: '#d97706' },
  siap: { label: 'Siap', color: '#7c3aed' },
  selesai: { label: 'Selesai', color: '#15803d' },
  batal: { label: 'Batal', color: '#6b7280' }
};

export const PAYMENT_STATUS = {
  belum_bayar: { label: 'Belum bayar', color: '#dc2626' },
  dp: { label: 'DP', color: '#d97706' },
  lunas: { label: 'Lunas', color: '#15803d' }
};

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'qris', label: 'QRIS' }
];

export const methodLabel = (m) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m;

export const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value || 0);

/** Local YYYY-MM-DD. toISOString() would give yesterday's date before 07:00 WIB. */
export const localDate = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDay = (ymd) => {
  if (!ymd) return '-';
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

export const displayPhone = (phone) => (phone && phone.startsWith('62') ? `0${phone.slice(2)}` : phone || '');

/** wa.me link with a ready-to-send message for the order's current state. */
export const whatsappLink = (phone, order) => {
  let text = '';
  if (order) {
    const name = order.customerName;
    if (order.status === 'siap') {
      text = order.fulfillment === 'antar'
        ? `Halo ${name}, order Anda sudah siap dan akan segera kami antar.`
        : `Halo ${name}, order Anda sudah siap diambil.`;
    } else {
      text = `Halo ${name}, kami konfirmasi order Anda:\n${order.items}\n` +
        `${order.fulfillment === 'antar' ? 'Diantar' : 'Diambil'}: ${formatDay(order.pickupDate)}${order.pickupTime ? ` jam ${order.pickupTime}` : ''}\n` +
        `Total: ${formatRupiah(order.grandTotal)}`;
    }
    if (order.remaining > 0) text += `\nSisa pembayaran: ${formatRupiah(order.remaining)}`;
  }
  return `https://wa.me/${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
};
