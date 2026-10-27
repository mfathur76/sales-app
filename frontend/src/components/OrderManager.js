import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/salesApi';
import { shopOutlets } from '../api/stockApi';
import {
  orderApi, ORDER_STATUS, PAYMENT_STATUS, formatRupiah, formatDay, localDate
} from '../api/orderApi';
import OrderForm from './OrderForm';
import OrderDetail from './OrderDetail';
import CustomerManager from './CustomerManager';
import './Orders.css';

const VIEWS = [
  { id: 'jadwal', label: '📅 Jadwal' },
  { id: 'belum-lunas', label: '💸 Belum Lunas' },
  { id: 'semua', label: '📋 Semua' },
  { id: 'customer', label: '👥 Customer' }
];

const RANGES = [
  { id: 'today', label: 'Hari ini', from: 0, to: 0 },
  { id: 'tomorrow', label: 'Besok', from: 1, to: 1 },
  { id: 'week', label: '7 hari', from: 0, to: 6 }
];

const OrderCard = ({ order, showOutlet, onClick }) => (
  <button className={`ord-card ${order.status === 'selesai' || order.status === 'batal' ? 'dim' : ''}`} onClick={onClick}>
    <div className="ord-row-between">
      <strong>{order.customerName}</strong>
      <span className="ord-time">
        {order.fulfillment === 'antar' ? '🛵' : '🏪'} {order.pickupTime || '--:--'}
      </span>
    </div>
    <div className="ord-items">{order.items}</div>
    <div className="ord-row-between">
      <div className="ord-chips">
        <span className="ord-chip" style={{ background: ORDER_STATUS[order.status]?.color }}>
          {ORDER_STATUS[order.status]?.label}
        </span>
        <span className="ord-chip" style={{ background: PAYMENT_STATUS[order.paymentStatus]?.color }}>
          {PAYMENT_STATUS[order.paymentStatus]?.label}
        </span>
        {showOutlet && <span className="ord-chip outline">{order.outlet}</span>}
      </div>
      <span className="ord-amount">
        {order.remaining > 0 ? <>Sisa <strong>{formatRupiah(order.remaining)}</strong></> : formatRupiah(order.grandTotal)}
      </span>
    </div>
  </button>
);

/** Orders grouped under a date heading, in pickup order. */
const OrderList = ({ orders, showOutlet, onOpen, emptyText }) => {
  if (orders.length === 0) return <div className="ord-empty">{emptyText}</div>;

  const groups = [];
  orders.forEach((o) => {
    const last = groups[groups.length - 1];
    if (last && last.date === o.pickupDate) last.orders.push(o);
    else groups.push({ date: o.pickupDate, orders: [o] });
  });

  return (
    <div className="ord-list">
      {groups.map((g) => (
        <div key={g.date}>
          <div className="ord-date-heading">
            {g.date === localDate() ? 'Hari ini · ' : g.date === localDate(1) ? 'Besok · ' : ''}{formatDay(g.date)}
            <span className="muted"> ({g.orders.length})</span>
          </div>
          {g.orders.map((o) => (
            <OrderCard key={o.id} order={o} showOutlet={showOutlet} onClick={() => onOpen(o.id)} />
          ))}
        </div>
      ))}
    </div>
  );
};

const OrderManager = ({ user, isAdmin = false }) => {
  const [view, setView] = useState('jadwal');
  const [outlets, setOutlets] = useState([]);
  const [outlet, setOutlet] = useState(isAdmin ? '' : user?.outlet || '');
  const [range, setRange] = useState('today');
  const [allFilters, setAllFilters] = useState({ from: localDate(-30), to: localDate(30), status: '' });
  const [search, setSearch] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formState, setFormState] = useState(null); // { order?, customer? }
  const [detailId, setDetailId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    authApi.getOutlets()
      .then((res) => setOutlets(shopOutlets(res?.data)))
      .catch(() => setOutlets([]));
  }, []);

  const load = useCallback(async () => {
    if (view === 'customer') return;
    let filters = { outlet };
    if (view === 'jadwal') {
      const r = RANGES.find((x) => x.id === range);
      filters = { ...filters, pickupFrom: localDate(r.from), pickupTo: localDate(r.to) };
    } else if (view === 'belum-lunas') {
      filters = { ...filters, unpaid: 1 };
    } else {
      filters = { ...filters, pickupFrom: allFilters.from, pickupTo: allFilters.to, status: allFilters.status };
    }

    try {
      setLoading(true);
      setError('');
      let data = await orderApi.list(filters);
      if (view === 'jadwal') data = data.filter((o) => o.status !== 'batal');
      setOrders(data);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [view, outlet, range, allFilters]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const changed = () => setRefreshKey((k) => k + 1);

  const term = search.trim().toLowerCase();
  const visible = term && view === 'semua'
    ? orders.filter((o) => `${o.customerName} ${o.customerPhone} ${o.items}`.toLowerCase().includes(term))
    : orders;

  const unpaidTotal = view === 'belum-lunas' ? orders.reduce((sum, o) => sum + o.remaining, 0) : 0;

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>🧾 Order & Customer</h2>
        <button className="ord-btn primary" onClick={() => setFormState({})}>➕ Order Baru</button>
      </div>

      <div className="ord-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
            {v.label}
          </button>
        ))}
      </div>

      {view !== 'customer' && (
        <div className="ord-toolbar">
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">Semua outlet</option>
            {outlets.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>

          {view === 'jadwal' && (
            <div className="ord-pills">
              {RANGES.map((r) => (
                <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {view === 'semua' && (
            <>
              <input type="date" value={allFilters.from} onChange={(e) => setAllFilters({ ...allFilters, from: e.target.value })} />
              <input type="date" value={allFilters.to} onChange={(e) => setAllFilters({ ...allFilters, to: e.target.value })} />
              <select value={allFilters.status} onChange={(e) => setAllFilters({ ...allFilters, status: e.target.value })}>
                <option value="">Semua status</option>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input
                className="ord-search"
                type="search"
                placeholder="🔍 Cari nama / isi order"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </>
          )}
        </div>
      )}

      {error && <div className="ord-alert error">{error}</div>}

      {view === 'customer' ? (
        <CustomerManager
          user={user}
          isAdmin={isAdmin}
          outlets={outlets}
          refreshKey={refreshKey}
          onNewOrder={(customer) => setFormState({ customer })}
          onOpenOrder={setDetailId}
        />
      ) : loading ? (
        <div className="ord-empty">Memuat order...</div>
      ) : (
        <>
          {view === 'belum-lunas' && orders.length > 0 && (
            <div className="ord-alert warn">
              {orders.length} order belum lunas · total sisa <strong>{formatRupiah(unpaidTotal)}</strong>
            </div>
          )}
          <OrderList
            orders={visible}
            showOutlet={!outlet}
            onOpen={setDetailId}
            emptyText={
              view === 'jadwal' ? 'Tidak ada order untuk diambil/diantar.'
                : view === 'belum-lunas' ? 'Semua order sudah lunas 🎉'
                  : 'Tidak ada order.'
            }
          />
        </>
      )}

      {detailId && (
        <OrderDetail
          orderId={detailId}
          user={user}
          isAdmin={isAdmin}
          outlets={outlets}
          onClose={() => setDetailId(null)}
          onEdit={(order) => { setDetailId(null); setFormState({ order }); }}
          onChanged={changed}
        />
      )}

      {formState && (
        <OrderForm
          order={formState.order}
          initialCustomer={formState.customer}
          user={user}
          isAdmin={isAdmin}
          outlets={outlets}
          onClose={() => setFormState(null)}
          onSaved={(saved) => { setFormState(null); changed(); setDetailId(saved.id); }}
        />
      )}
    </div>
  );
};

export default OrderManager;
