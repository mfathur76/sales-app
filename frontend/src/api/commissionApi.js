import { request } from './orderApi';

// Employees paid a commission on what their outlets take in (admin only)
export const commissionApi = {
  listEmployees: () => request('/commission/employees'),
  createEmployee: (data) => request('/commission/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id, data) => request(`/commission/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) })
};

/**
 * Money the outlet actually received on one day: cash and transfer as the cashier recorded them,
 * the delivery apps and QRIS as they reached the bank. A channel the cashier sold on but the bank
 * shows nothing for is listed in `unverified`.
 */
export function commissionRow(sale) {
  const gojek = (sale.gojekBank || 0) + (sale.qrisBank || 0);
  const shopee = sale.shopeeBank || 0;
  const grab = sale.grabBank || 0;
  const cash = sale.cash || 0;
  const transfer = sale.transfer || 0;
  const unverified = [
    ['GoFood/QRIS', (sale.gojek || 0) + (sale.qris || 0), gojek],
    ['Shopee', sale.shopee || 0, shopee],
    ['Grab', sale.grab || 0, grab]
  ].filter(([, cashier, bank]) => cashier > 0 && bank === 0).map(([name]) => name);
  return {
    outlet: sale.outlet,
    date: sale.date,
    cash,
    gojek,
    shopee,
    grab,
    transfer,
    subtotal: cash + gojek + shopee + grab + transfer,
    unverified
  };
}
