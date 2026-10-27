import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/salesApi';
import { productApi, shipmentApi, shopOutlets, groupByCategory } from '../api/stockApi';
import { localDate, formatDay } from '../api/orderApi';
import './Orders.css';
import './Stock.css';

const STEPS = [5, 10];

/** Quantity cell with − / + buttons so the kitchen can fill a shipment with thumbs only. */
export const QtyInput = ({ value, onChange, steps = STEPS }) => {
  const n = Number(value) || 0;
  return (
    <div className="stk-qty">
      <button type="button" onClick={() => onChange(Math.max(n - 1, 0))} aria-label="Kurangi">−</button>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={value === 0 ? '' : value}
        placeholder="0"
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Math.max(parseInt(e.target.value, 10) || 0, 0))}
      />
      {steps.map((s) => (
        <button type="button" key={s} onClick={() => onChange(n + s)}>+{s}</button>
      ))}
    </div>
  );
};

const ShipmentForm = ({ shipment, outlets, products, onSaved, onCancel }) => {
  const [outlet, setOutlet] = useState(shipment?.outlet || '');
  const [date, setDate] = useState(shipment?.date || localDate());
  const [notes, setNotes] = useState(shipment?.notes || '');
  const [qty, setQty] = useState(() => Object.fromEntries((shipment?.lines || []).map((l) => [l.productId, l.qty])));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const total = Object.values(qty).reduce((s, n) => s + (n || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([productId, n]) => ({ productId, qty: n }));
    if (!outlet) { setError('Pilih outlet tujuan'); return; }
    if (lines.length === 0) { setError('Isi jumlah minimal satu barang'); return; }

    setSaving(true);
    setError('');
    try {
      if (shipment) await shipmentApi.update(shipment, { date, lines, notes });
      else await shipmentApi.create({ outlet, date, lines, notes });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ord-form" onSubmit={submit}>
      <div className="ord-grid">
        <label className="ord-field">
          <span>Kirim ke *</span>
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)} disabled={Boolean(shipment)} required>
            <option value="">Pilih outlet</option>
            {outlets.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.name}</option>)}
          </select>
        </label>
        <label className="ord-field">
          <span>Tanggal</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
      </div>

      <div className="stk-lines">
        {groupByCategory(products).map((g) => (
          <React.Fragment key={g.category}>
            <div className="stk-line-group">{g.category}</div>
            {g.items.map((p) => (
              <div key={p.id} className={`stk-line ${qty[p.id] ? 'filled' : ''}`}>
                <span className="stk-line-name">{p.name}</span>
                <QtyInput value={qty[p.id] || 0} onChange={(n) => setQty((prev) => ({ ...prev, [p.id]: n }))} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <label className="ord-field">
        <span>Catatan</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
      </label>

      {error && <div className="ord-alert error">{error}</div>}

      <div className="stk-sticky-bar">
        <span><strong>{total}</strong> pcs</span>
        <div className="ord-actions" style={{ marginTop: 0 }}>
          {onCancel && <button type="button" className="ord-btn ghost" onClick={onCancel} disabled={saving}>Batal</button>}
          <button type="submit" className="ord-btn primary" disabled={saving}>
            {saving ? 'Menyimpan...' : shipment ? 'Simpan Perubahan' : '🚚 Kirim'}
          </button>
        </div>
      </div>
    </form>
  );
};

const ShipmentCard = ({ shipment, outletName, canChange, onEdit, onDelete }) => {
  const total = shipment.lines.reduce((s, l) => s + l.qty, 0);
  const short = shipment.lines.filter((l) => l.receivedQty !== undefined && l.receivedQty !== l.qty);
  return (
    <div className="ord-card stk-card">
      <div className="ord-row-between">
        <strong>{outletName}</strong>
        <span className="ord-chip" style={{ background: shipment.status === 'diterima' ? '#15803d' : '#d97706' }}>
          {shipment.status === 'diterima' ? 'Diterima' : 'Dikirim'}
        </span>
      </div>
      <div className="ord-line muted small">
        {formatDay(shipment.date)} · {total} pcs{shipment.createdBy ? ` · oleh ${shipment.createdBy}` : ''}
      </div>
      <div className="ord-items full">
        {shipment.lines.map((l) => `${l.name} ${l.qty}`).join(', ')}
      </div>
      {short.length > 0 && (
        <div className="ord-alert warn">
          Selisih saat diterima: {short.map((l) => `${l.name} dikirim ${l.qty}, diterima ${l.receivedQty}`).join('; ')}
        </div>
      )}
      {shipment.notes && <div className="ord-line muted small">📝 {shipment.notes}</div>}
      {canChange && (
        <div className="ord-actions">
          <button className="ord-btn danger small" onClick={onDelete}>Hapus</button>
          <button className="ord-btn ghost small" onClick={onEdit}>✏️ Edit</button>
        </div>
      )}
    </div>
  );
};

/** Kitchen account and admins: send finished goods to outlets and see recent shipments. */
const ShipmentManager = ({ isAdmin = false }) => {
  const [outlets, setOutlets] = useState([]);
  const [products, setProducts] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [view, setView] = useState('kirim');
  const [editing, setEditing] = useState(null);
  const [filterOutlet, setFilterOutlet] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    authApi.getOutlets().then((res) => setOutlets(shopOutlets(res?.data))).catch(() => setOutlets([]));
    productApi.list().then(setProducts).catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  const loadShipments = useCallback(async () => {
    try {
      setShipments(await shipmentApi.list({ outlet: filterOutlet, from: localDate(-14) }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [filterOutlet]);

  useEffect(() => { loadShipments(); }, [loadShipments]);

  const outletName = (code) => {
    const o = outlets.find((x) => x.code === code);
    return o ? `${o.code} - ${o.name}` : code;
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus kiriman ke ${outletName(s.outlet)} tanggal ${formatDay(s.date)}?`)) return;
    try {
      await shipmentApi.remove(s);
      loadShipments();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>🚚 Kiriman Barang</h2>
      </div>

      <div className="ord-tabs">
        <button className={view === 'kirim' ? 'active' : ''} onClick={() => { setView('kirim'); setEditing(null); }}>➕ Kirim Baru</button>
        <button className={view === 'riwayat' ? 'active' : ''} onClick={() => setView('riwayat')}>📋 Riwayat 14 Hari</button>
      </div>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      {view === 'kirim' && (
        products.length === 0 ? (
          <div className="ord-empty">Belum ada produk. Admin perlu mengisi Master Produk dulu.</div>
        ) : (
          <ShipmentForm
            key={formKey}
            outlets={outlets}
            products={products}
            onSaved={() => {
              setMessage({ type: 'success', text: 'Kiriman tercatat. Outlet tinggal menekan Terima.' });
              setFormKey((k) => k + 1);
              loadShipments();
            }}
          />
        )
      )}

      {view === 'riwayat' && (
        editing ? (
          <div className="ord-panel">
            <h3>Edit Kiriman ke {outletName(editing.outlet)}</h3>
            <ShipmentForm
              shipment={editing}
              outlets={outlets}
              products={products}
              onCancel={() => setEditing(null)}
              onSaved={() => { setEditing(null); loadShipments(); }}
            />
          </div>
        ) : (
          <>
            <div className="ord-toolbar">
              <select value={filterOutlet} onChange={(e) => setFilterOutlet(e.target.value)}>
                <option value="">Semua outlet</option>
                {outlets.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.name}</option>)}
              </select>
            </div>
            {shipments.length === 0 ? (
              <div className="ord-empty">Belum ada kiriman.</div>
            ) : (
              <div className="ord-list">
                {shipments.map((s) => (
                  <ShipmentCard
                    key={s.id}
                    shipment={s}
                    outletName={outletName(s.outlet)}
                    canChange={isAdmin || s.status === 'dikirim'}
                    onEdit={() => setEditing(s)}
                    onDelete={() => handleDelete(s)}
                  />
                ))}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
};

export default ShipmentManager;
