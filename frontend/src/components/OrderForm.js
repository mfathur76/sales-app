import React, { useState, useEffect } from 'react';
import {
  customerApi, orderApi, ORDER_STATUS, PAYMENT_METHODS, formatRupiah, localDate, displayPhone
} from '../api/orderApi';
import { productApi } from '../api/stockApi';
import { CustomerForm } from './CustomerManager';
import OrderLinesEditor, { linesTotal, toEditorLines } from './OrderLinesEditor';
import './Orders.css';

const CustomerPicker = ({ value, onChange, outlets, isAdmin, defaultOutlet }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        setResults((await customerApi.list(term)).slice(0, 8));
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const pick = (c) => {
    onChange(c);
    setSearch('');
    setResults([]);
    setCreating(false);
  };

  if (value) {
    return (
      <div className="ord-picked">
        <div>
          <strong>{value.name}</strong>
          <div className="ord-line muted">{displayPhone(value.phone)}</div>
        </div>
        <button type="button" className="ord-btn ghost small" onClick={() => onChange(null)}>Ganti</button>
      </div>
    );
  }

  if (creating) {
    return (
      <div className="ord-panel inset">
        <h4>Customer Baru</h4>
        <CustomerForm
          outlets={outlets}
          isAdmin={isAdmin}
          defaultOutlet={defaultOutlet}
          onSaved={pick}
          onUseExisting={pick}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  return (
    <div>
      <input
        className="ord-search"
        type="search"
        placeholder="🔍 Ketik nama atau no. HP customer"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      {results.length > 0 && (
        <div className="ord-results">
          {results.map((c) => (
            <button type="button" key={c.id} onClick={() => pick(c)}>
              <strong>{c.name}</strong> <span className="muted">{displayPhone(c.phone)}</span>
            </button>
          ))}
        </div>
      )}
      {search.trim().length >= 2 && results.length === 0 && (
        <div className="ord-line muted">Tidak ditemukan.</div>
      )}
      <button type="button" className="ord-btn ghost small" onClick={() => setCreating(true)}>
        ➕ Customer baru
      </button>
    </div>
  );
};

/** Create a new order (order == null) or edit an existing one. */
const OrderForm = ({ order, initialCustomer, user, isAdmin, outlets, onClose, onSaved }) => {
  const isEdit = Boolean(order);
  const [customer, setCustomer] = useState(
    order ? { id: order.customerId, name: order.customerName, phone: order.customerPhone } : initialCustomer || null
  );
  const [form, setForm] = useState({
    outlet: order?.outlet || user?.outlet || '',
    orderDate: order?.orderDate || localDate(),
    pickupDate: order?.pickupDate || localDate(1),
    pickupTime: order?.pickupTime || '',
    fulfillment: order?.fulfillment || 'ambil',
    deliveryAddress: order?.deliveryAddress || '',
    deliveryFee: order?.deliveryFee ? String(order.deliveryFee) : '',
    items: order?.items || '',
    total: order?.total ? String(order.total) : '',
    status: order?.status || 'baru',
    notes: order?.notes || '',
    dpAmount: '',
    dpMethod: 'transfer'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState(() => toEditorLines(order?.lines));
  // Orders saved before the product list existed are plain text with a typed total
  const [textMode, setTextMode] = useState(Boolean(order && !order.lines?.length));

  useEffect(() => {
    productApi.list().then(setProducts).catch(() => setProducts([]));
  }, []);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  // Prefill the delivery address from the customer's saved address
  useEffect(() => {
    if (form.fulfillment === 'antar' && !form.deliveryAddress && customer?.address) {
      set('deliveryAddress', customer.address);
    }
  }, [form.fulfillment, customer]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = textMode ? parseFloat(form.total) || 0 : linesTotal(lines);
  const deliveryFee = form.fulfillment === 'antar' ? parseFloat(form.deliveryFee) || 0 : 0;
  const dp = parseFloat(form.dpAmount) || 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer) {
      setError('Pilih atau tambahkan customer dulu');
      return;
    }
    if (!textMode && lines.length === 0) {
      setError('Pilih minimal satu produk');
      return;
    }
    if (!textMode && lines.some((l) => !String(l.name).trim() || l.price === '')) {
      setError('Lengkapi nama dan harga setiap barang');
      return;
    }
    if (!isEdit && dp > total + deliveryFee) {
      setError('DP lebih besar dari total');
      return;
    }

    const payload = {
      customerId: customer.id,
      orderDate: form.orderDate,
      pickupDate: form.pickupDate,
      pickupTime: form.pickupTime,
      fulfillment: form.fulfillment,
      deliveryAddress: form.fulfillment === 'antar' ? form.deliveryAddress : '',
      deliveryFee,
      ...(textMode
        ? { items: form.items, total, lines: [] }
        // The server sums the lines and writes the item summary
        : { items: '', lines: lines.map(({ productId, name, qty, price }) => ({ productId, name, qty, price: Number(price) })) }),
      status: form.status,
      notes: form.notes
    };
    if (isAdmin) payload.outlet = form.outlet;
    if (!isEdit && dp > 0) {
      payload.payment = { amount: dp, method: form.dpMethod, date: form.orderDate, note: 'DP' };
    }

    setSaving(true);
    setError('');
    try {
      const saved = isEdit ? await orderApi.update(order.id, payload) : await orderApi.create(payload);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="ord-modal" role="dialog" aria-modal="true">
      <div className="ord-modal-body">
        <div className="ord-row-between">
          <h3>{isEdit ? 'Edit Order' : 'Order Baru'}</h3>
          <button className="ord-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        {/* Customer picker sits outside the <form> because it can contain its own form */}
        <div className="ord-field">
          <span>Customer *</span>
          <CustomerPicker
            value={customer}
            onChange={setCustomer}
            outlets={outlets}
            isAdmin={isAdmin}
            defaultOutlet={form.outlet}
          />
        </div>

        <form className="ord-form" onSubmit={handleSubmit}>
          {isAdmin && (
            <label className="ord-field">
              <span>Outlet *</span>
              <select value={form.outlet} onChange={(e) => set('outlet', e.target.value)} required>
                <option value="">Pilih outlet</option>
                {outlets.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
              </select>
            </label>
          )}

          <div className="ord-toggle">
            <button type="button" className={form.fulfillment === 'ambil' ? 'active' : ''} onClick={() => set('fulfillment', 'ambil')}>
              🏪 Diambil
            </button>
            <button type="button" className={form.fulfillment === 'antar' ? 'active' : ''} onClick={() => set('fulfillment', 'antar')}>
              🛵 Diantar
            </button>
          </div>

          <div className="ord-grid">
            <label className="ord-field">
              <span>{form.fulfillment === 'antar' ? 'Tanggal antar *' : 'Tanggal ambil *'}</span>
              <input type="date" value={form.pickupDate} onChange={(e) => set('pickupDate', e.target.value)} required />
            </label>
            <label className="ord-field">
              <span>Jam</span>
              <input type="time" value={form.pickupTime} onChange={(e) => set('pickupTime', e.target.value)} />
            </label>
          </div>

          {form.fulfillment === 'antar' && (
            <>
              <label className="ord-field">
                <span>Alamat pengiriman *</span>
                <textarea rows="2" value={form.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} required />
              </label>
              <label className="ord-field">
                <span>Ongkir (Rp)</span>
                <input type="number" inputMode="numeric" min="0" value={form.deliveryFee} onChange={(e) => set('deliveryFee', e.target.value)} />
              </label>
            </>
          )}

          {textMode ? (
            <>
              <label className="ord-field">
                <span>Yang diorder *</span>
                <textarea
                  rows="3"
                  value={form.items}
                  onChange={(e) => set('items', e.target.value)}
                  placeholder="Misal: 50 risol mayo, 30 risol ragout"
                  required
                />
              </label>
              <label className="ord-field">
                <span>Total harga (Rp) *</span>
                <input type="number" inputMode="numeric" min="0" value={form.total} onChange={(e) => set('total', e.target.value)} required />
              </label>
              <button type="button" className="ord-btn ghost small" onClick={() => setTextMode(false)}>
                Ganti ke daftar produk (total dihitung otomatis)
              </button>
            </>
          ) : (
            <OrderLinesEditor products={products} lines={lines} onChange={setLines} />
          )}

          {!isEdit && (
            <div className="ord-grid">
              <label className="ord-field">
                <span>DP (Rp)</span>
                <input type="number" inputMode="numeric" min="0" value={form.dpAmount} onChange={(e) => set('dpAmount', e.target.value)} placeholder="0" />
              </label>
              <label className="ord-field">
                <span>Bayar via</span>
                <select value={form.dpMethod} onChange={(e) => set('dpMethod', e.target.value)}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </label>
            </div>
          )}

          <div className="ord-summary">
            <div><span>Total</span><span>{formatRupiah(total + deliveryFee)}</span></div>
            {!isEdit && <div><span>Sisa bayar</span><strong>{formatRupiah(Math.max(total + deliveryFee - dp, 0))}</strong></div>}
          </div>

          <div className="ord-grid">
            <label className="ord-field">
              <span>Tanggal order</span>
              <input type="date" value={form.orderDate} onChange={(e) => set('orderDate', e.target.value)} required />
            </label>
            <label className="ord-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
          </div>

          <label className="ord-field">
            <span>Catatan</span>
            <textarea rows="2" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </label>

          {error && <div className="ord-alert error">{error}</div>}

          <div className="ord-actions">
            <button type="button" className="ord-btn ghost" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="ord-btn primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderForm;
