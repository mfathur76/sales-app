import React, { useState, useEffect, useCallback } from 'react';
import {
  customerApi, ORDER_STATUS, PAYMENT_STATUS, formatRupiah, formatDay, displayPhone, whatsappLink
} from '../api/orderApi';
import './Orders.css';

/**
 * Add/edit form for one customer. Used on the Customer tab and inline in the order form.
 * On a duplicate phone number it offers the existing customer via onUseExisting.
 */
export const CustomerForm = ({ customer, outlets, isAdmin, defaultOutlet, defaultReseller = false, onSaved, onCancel, onUseExisting }) => {
  const [form, setForm] = useState({
    name: customer?.name || '',
    phone: displayPhone(customer?.phone),
    address: customer?.address || '',
    notes: customer?.notes || '',
    outlet: customer?.outlet || defaultOutlet || '',
    isReseller: customer ? customer.isReseller === true : defaultReseller
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existing, setExisting] = useState(null);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setExisting(null);
    try {
      const saved = customer
        ? await customerApi.update(customer.id, form)
        : await customerApi.create(form);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      if (err.existingCustomer) setExisting(err.existingCustomer);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ord-form" onSubmit={handleSubmit}>
      {error && (
        <div className="ord-alert error">
          {error}
          {existing && onUseExisting && (
            <button type="button" className="ord-btn small" onClick={() => onUseExisting(existing)}>
              Pakai customer {existing.name}
            </button>
          )}
        </div>
      )}

      <label className="ord-field">
        <span>Nama *</span>
        <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
      </label>
      <label className="ord-field">
        <span>No. HP / WA *</span>
        <input
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="08xxxxxxxxxx"
          required
        />
      </label>
      <label className="ord-field">
        <span>Alamat</span>
        <textarea rows="2" value={form.address} onChange={(e) => set('address', e.target.value)} />
      </label>
      <label className="ord-field">
        <span>Catatan</span>
        <textarea
          rows="2"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Misal: suka pedas, langganan arisan"
        />
      </label>
      <label className="ord-line stk-check">
        <input type="checkbox" checked={form.isReseller} onChange={(e) => set('isReseller', e.target.checked)} />
        Reseller (ambil barang dari dapur, bayar belakangan)
      </label>
      {isAdmin && !customer && (
        <label className="ord-field">
          <span>Outlet *</span>
          <select value={form.outlet} onChange={(e) => set('outlet', e.target.value)} required>
            <option value="">Pilih outlet</option>
            {outlets.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </label>
      )}

      <div className="ord-actions">
        <button type="button" className="ord-btn ghost" onClick={onCancel} disabled={saving}>Batal</button>
        <button type="submit" className="ord-btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Customer'}
        </button>
      </div>
    </form>
  );
};

const CustomerDetail = ({ customerId, outlets, isAdmin, onBack, onNewOrder, onOpenOrder }) => {
  const [customer, setCustomer] = useState(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setCustomer(await customerApi.get(customerId));
    } catch (err) {
      setError(err.message);
    }
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!window.confirm(`Hapus customer ${customer.name}?`)) return;
    try {
      await customerApi.remove(customer.id);
      onBack(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !customer) return <div className="ord-alert error">{error}</div>;
  if (!customer) return <div className="ord-empty">Memuat...</div>;

  const activeOrders = customer.orders.filter((o) => o.status !== 'batal');
  const totalSpent = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const outletName = outlets.find((o) => o.code === customer.outlet)?.name || customer.outlet;

  return (
    <div>
      <button className="ord-btn ghost small" onClick={() => onBack(false)}>← Kembali ke daftar</button>

      {error && <div className="ord-alert error">{error}</div>}

      {editing ? (
        <div className="ord-panel">
          <h3>Edit Customer</h3>
          <CustomerForm
            customer={customer}
            outlets={outlets}
            isAdmin={isAdmin}
            onSaved={() => { setEditing(false); load(); }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="ord-panel">
          <div className="ord-row-between">
            <h3>{customer.name}</h3>
            <span className="ord-chip outline">{outletName}</span>
          </div>
          <p className="ord-line">
            📱 {displayPhone(customer.phone)}{' '}
            <a className="ord-wa" href={whatsappLink(customer.phone)} target="_blank" rel="noreferrer">Chat WA</a>
          </p>
          {customer.address && <p className="ord-line">📍 {customer.address}</p>}
          {customer.notes && <p className="ord-line muted">📝 {customer.notes}</p>}
          <div className="ord-stats">
            <div><strong>{activeOrders.length}</strong><span>order</span></div>
            <div><strong>{formatRupiah(totalSpent)}</strong><span>total belanja</span></div>
          </div>
          <div className="ord-actions">
            {isAdmin && <button className="ord-btn danger" onClick={handleDelete}>Hapus</button>}
            <button className="ord-btn ghost" onClick={() => setEditing(true)}>✏️ Edit</button>
            <button className="ord-btn primary" onClick={() => onNewOrder(customer)}>➕ Order Baru</button>
          </div>
        </div>
      )}

      <h3 className="ord-section-title">Riwayat Order</h3>
      {customer.orders.length === 0 ? (
        <div className="ord-empty">Belum ada order.</div>
      ) : (
        <div className="ord-list">
          {customer.orders.map((o) => (
            <button key={o.id} className="ord-card" onClick={() => onOpenOrder(o.id)}>
              <div className="ord-row-between">
                <strong>{formatDay(o.pickupDate)}</strong>
                <span>{formatRupiah(o.grandTotal)}</span>
              </div>
              <div className="ord-items">{o.items}</div>
              <div className="ord-chips">
                <span className="ord-chip" style={{ background: ORDER_STATUS[o.status]?.color }}>
                  {ORDER_STATUS[o.status]?.label}
                </span>
                <span className="ord-chip" style={{ background: PAYMENT_STATUS[o.paymentStatus]?.color }}>
                  {PAYMENT_STATUS[o.paymentStatus]?.label}
                </span>
                <span className="ord-chip outline">{o.outlet}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomerManager = ({ user, isAdmin, outlets, onNewOrder, onOpenOrder, refreshKey }) => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setCustomers(await customerApi.list());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (selectedId) {
    return (
      <CustomerDetail
        key={`${selectedId}-${refreshKey}`}
        customerId={selectedId}
        outlets={outlets}
        isAdmin={isAdmin}
        onBack={(changed) => { setSelectedId(null); if (changed) load(); }}
        onNewOrder={onNewOrder}
        onOpenOrder={onOpenOrder}
      />
    );
  }

  const term = search.trim().toLowerCase();
  const phoneTerm = term.replace(/\D/g, '').replace(/^0/, '');
  const filtered = term
    ? customers.filter((c) => c.name.toLowerCase().includes(term) || (phoneTerm.length >= 3 && c.phone.includes(phoneTerm)))
    : customers;

  return (
    <div>
      <div className="ord-toolbar">
        <input
          className="ord-search"
          type="search"
          placeholder="🔍 Cari nama atau no. HP"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="ord-btn primary" onClick={() => setShowForm(true)}>➕ Customer</button>
      </div>

      {showForm && (
        <div className="ord-panel">
          <h3>Customer Baru</h3>
          <CustomerForm
            outlets={outlets}
            isAdmin={isAdmin}
            defaultOutlet={user?.outlet}
            onSaved={(c) => { setShowForm(false); load(); setSelectedId(c.id); }}
            onCancel={() => setShowForm(false)}
            onUseExisting={(c) => { setShowForm(false); setSelectedId(c.id); }}
          />
        </div>
      )}

      {error && <div className="ord-alert error">{error}</div>}

      {loading ? (
        <div className="ord-empty">Memuat customer...</div>
      ) : filtered.length === 0 ? (
        <div className="ord-empty">{term ? 'Customer tidak ditemukan.' : 'Belum ada customer.'}</div>
      ) : (
        <div className="ord-list">
          <div className="ord-count">{filtered.length} customer</div>
          {filtered.map((c) => (
            <button key={c.id} className="ord-card" onClick={() => setSelectedId(c.id)}>
              <div className="ord-row-between">
                <strong>{c.name}</strong>
                <span>
                  {c.isReseller && <span className="ord-chip" style={{ background: '#7c3aed' }}>Reseller</span>}{' '}
                  <span className="ord-chip outline">{c.outlet}</span>
                </span>
              </div>
              <div className="ord-line muted">{displayPhone(c.phone)}{c.address ? ` · ${c.address}` : ''}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
