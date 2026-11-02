import React, { useState, useEffect, useCallback } from 'react';
import { orderApi, localDate, formatDay } from '../api/orderApi';
import { groupByCategory, productApi } from '../api/stockApi';
import './Orders.css';
import './Stock.css';

/** Orders still to be handed over: everything except cancelled ones. */
const isBooked = (o) => o.status !== 'batal';

/** productId → pieces booked across `orders` (lines picked from the product list only). */
export function bookedByProduct(orders) {
  const map = new Map();
  orders.filter(isBooked).forEach((o) => (o.lines || []).forEach((l) => {
    if (l.productId) map.set(l.productId, (map.get(l.productId) || 0) + l.qty);
  }));
  return map;
}

/** Orders picked up on `date`, loaded whenever the date changes. `excludeId` leaves out the order being edited. */
export function useBookingsOn(date, excludeId) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!date) { setOrders([]); return undefined; }
    let live = true;
    orderApi.list({ pickupFrom: date, pickupTo: date })
      .then((list) => { if (live) setOrders(list.filter((o) => o.id !== excludeId && isBooked(o))); })
      .catch(() => { if (live) setOrders([]); });
    return () => { live = false; };
  }, [date, excludeId]);
  return orders;
}

/** One pickup day: per product, total pieces and how they split across outlets. */
function summarize(orders, products) {
  const productById = new Map(products.map((p) => [p.id, p]));
  const rows = new Map();
  const outlets = new Set();
  const textOrders = [];
  orders.forEach((o) => {
    outlets.add(o.outlet);
    const picked = (o.lines || []).filter((l) => l.productId);
    if (picked.length === 0) textOrders.push(o);
    picked.forEach((l) => {
      const row = rows.get(l.productId) || {
        productId: l.productId,
        name: productById.get(l.productId)?.name || l.name,
        category: productById.get(l.productId)?.category,
        total: 0,
        byOutlet: {}
      };
      row.total += l.qty;
      row.byOutlet[o.outlet] = (row.byOutlet[o.outlet] || 0) + l.qty;
      rows.set(l.productId, row);
    });
  });
  return { rows: [...rows.values()], outlets: [...outlets].sort(), textOrders };
}

const RANGES = [
  { days: 3, label: '3 hari' },
  { days: 7, label: '7 hari' },
  { days: 14, label: '14 hari' }
];

/**
 * Kitchen and admin: pieces booked by orders for each upcoming pickup day, so production can be
 * planned around them. Goods for orders come off the outlet's shelf on the pickup day.
 */
const BookingSummary = () => {
  const [days, setDays] = useState(7);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    productApi.list(true).then(setProducts).catch(() => setProducts([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await orderApi.list({ pickupFrom: localDate(), pickupTo: localDate(days - 1) });
      setOrders(list.filter(isBooked));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const byDate = new Map();
  orders.forEach((o) => byDate.set(o.pickupDate, [...(byDate.get(o.pickupDate) || []), o]));
  const dates = [...byDate.keys()].sort();

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>📋 Rekap Booking Order</h2>
        <button className="ord-btn ghost" onClick={load} disabled={loading}>🔄 Muat ulang</button>
      </div>
      <p className="ord-line muted">
        Jumlah barang yang sudah dipesan customer per tanggal ambil. Pakai untuk rencana produksi: barang order diambil dari
        rak outlet, jadi kirim lebih ke outlet itu.
      </p>

      <div className="ord-tabs">
        {RANGES.map((r) => (
          <button key={r.days} className={days === r.days ? 'active' : ''} onClick={() => setDays(r.days)}>{r.label}</button>
        ))}
      </div>

      {error && <div className="ord-alert error">{error}</div>}

      {loading ? (
        <div className="ord-empty">Memuat...</div>
      ) : dates.length === 0 ? (
        <div className="ord-empty">Belum ada order untuk {days} hari ke depan.</div>
      ) : (
        dates.map((date) => {
          const dayOrders = byDate.get(date);
          const { rows, outlets, textOrders } = summarize(dayOrders, products);
          const pcs = rows.reduce((s, r) => s + r.total, 0);
          return (
            <div key={date} className="ord-panel">
              <div className="ord-row-between">
                <h3 style={{ margin: 0 }}>{formatDay(date)}{date === localDate() ? ' · hari ini' : date === localDate(1) ? ' · besok' : ''}</h3>
                <span className="muted">{dayOrders.length} order · {pcs} pcs</span>
              </div>
              {rows.length > 0 && (
                <div className="stk-table-wrap">
                  <table className="stk-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th className="num">Total</th>
                        {outlets.length > 1 && outlets.map((o) => <th key={o} className="num">{o}</th>)}
                      </tr>
                    </thead>
                    {groupByCategory(rows).map((g) => (
                      <tbody key={g.category}>
                        <tr className="stk-group"><td colSpan={2 + (outlets.length > 1 ? outlets.length : 0)}>{g.category}</td></tr>
                        {g.items.map((r) => (
                          <tr key={r.productId}>
                            <td>{r.name}</td>
                            <td className="num"><strong>{r.total}</strong></td>
                            {outlets.length > 1 && outlets.map((o) => <td key={o} className="num">{r.byOutlet[o] || ''}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    ))}
                  </table>
                </div>
              )}
              {outlets.length === 1 && <div className="ord-line muted small">Semua dari {outlets[0]}</div>}
              {textOrders.length > 0 && (
                <div className="ord-alert warn">
                  {textOrders.length} order tanpa rincian produk (ditulis manual), cek isinya:
                  {textOrders.map((o) => <div key={o.id} className="small">{o.outlet} · {o.customerName}: {o.items}</div>)}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default BookingSummary;
