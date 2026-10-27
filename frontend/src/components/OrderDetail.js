import React, { useState, useEffect, useCallback } from 'react';
import {
  orderApi, ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS, methodLabel,
  formatRupiah, formatDay, localDate, displayPhone, whatsappLink
} from '../api/orderApi';
import './Orders.css';

// The next step offered as a one-tap button for each status
const NEXT_STATUS = { baru: 'diproses', diproses: 'siap', siap: 'selesai' };

const OrderDetail = ({ orderId, user, isAdmin, outlets, onClose, onEdit, onChanged }) => {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'cash', date: localDate(), note: '' });

  const load = useCallback(async () => {
    try {
      setError('');
      setOrder(await orderApi.get(orderId));
    } catch (err) {
      setError(err.message);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      if (updated) setOrder(updated);
      onChanged();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const setStatus = (status) => {
    if (status === 'batal' && !window.confirm('Batalkan order ini?')) return;
    run(() => orderApi.update(order.id, { status }));
  };

  const openPaymentForm = () => {
    setPayment({ amount: order.remaining ? String(order.remaining) : '', method: 'cash', date: localDate(), note: '' });
    setShowPayment(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const ok = await run(() => orderApi.addPayment(order.id, { ...payment, amount: parseFloat(payment.amount) || 0 }));
    if (ok) setShowPayment(false);
  };

  const removePayment = (p) => {
    if (!window.confirm(`Hapus pembayaran ${formatRupiah(p.amount)}?`)) return;
    run(() => orderApi.removePayment(order.id, p.id));
  };

  const removeOrder = async () => {
    if (!window.confirm('Hapus order ini permanen?')) return;
    const ok = await run(() => orderApi.remove(order.id).then(() => null));
    if (ok) onClose();
  };

  const canModify = order && (isAdmin || order.outlet === user?.outlet);
  const next = order && NEXT_STATUS[order.status];
  const outletName = order && (outlets.find((o) => o.code === order.outlet)?.name || order.outlet);

  return (
    <div className="ord-modal" role="dialog" aria-modal="true">
      <div className="ord-modal-body">
        <div className="ord-row-between">
          <h3>Detail Order</h3>
          <button className="ord-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>

        {error && <div className="ord-alert error">{error}</div>}
        {!order ? (
          !error && <div className="ord-empty">Memuat...</div>
        ) : (
          <>
            <div className="ord-chips">
              <span className="ord-chip" style={{ background: ORDER_STATUS[order.status]?.color }}>
                {ORDER_STATUS[order.status]?.label}
              </span>
              <span className="ord-chip" style={{ background: PAYMENT_STATUS[order.paymentStatus]?.color }}>
                {PAYMENT_STATUS[order.paymentStatus]?.label}
              </span>
              <span className="ord-chip outline">{outletName}</span>
            </div>

            <div className="ord-panel">
              <div className="ord-row-between">
                <strong>{order.customerName}</strong>
                <a className="ord-wa" href={whatsappLink(order.customerPhone, order)} target="_blank" rel="noreferrer">
                  💬 WA
                </a>
              </div>
              <div className="ord-line muted">{displayPhone(order.customerPhone)}</div>
              <p className="ord-line">
                {order.fulfillment === 'antar' ? '🛵 Diantar' : '🏪 Diambil'}: <strong>{formatDay(order.pickupDate)}</strong>
                {order.pickupTime && <> jam <strong>{order.pickupTime}</strong></>}
              </p>
              {order.fulfillment === 'antar' && <p className="ord-line">📍 {order.deliveryAddress}</p>}
              <div className="ord-items full">{order.items}</div>
              {order.notes && <p className="ord-line muted">📝 {order.notes}</p>}
              <p className="ord-line muted small">Order tanggal {formatDay(order.orderDate)}</p>
            </div>

            <div className="ord-summary">
              <div><span>Harga</span><span>{formatRupiah(order.total)}</span></div>
              {order.deliveryFee > 0 && <div><span>Ongkir</span><span>{formatRupiah(order.deliveryFee)}</span></div>}
              <div><span>Total</span><strong>{formatRupiah(order.grandTotal)}</strong></div>
              <div><span>Sudah dibayar</span><span>{formatRupiah(order.paid)}</span></div>
              <div className={order.remaining > 0 ? 'due' : ''}>
                <span>Sisa</span><strong>{formatRupiah(order.remaining)}</strong>
              </div>
            </div>

            <h4 className="ord-section-title">Pembayaran</h4>
            {order.payments.length === 0 ? (
              <div className="ord-line muted">Belum ada pembayaran.</div>
            ) : (
              <div className="ord-payments">
                {order.payments.map((p) => (
                  <div key={p.id} className="ord-payment">
                    <div>
                      <strong>{formatRupiah(p.amount)}</strong> · {methodLabel(p.method)}
                      <div className="ord-line muted small">
                        {formatDay(p.date)}{p.note ? ` · ${p.note}` : ''}{p.createdBy ? ` · ${p.createdBy}` : ''}
                      </div>
                    </div>
                    {isAdmin && (
                      <button className="ord-btn ghost small" onClick={() => removePayment(p)} disabled={busy}>🗑️</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canModify && order.remaining > 0 && order.status !== 'batal' && !showPayment && (
              <button className="ord-btn ghost" onClick={openPaymentForm}>➕ Catat Pembayaran</button>
            )}

            {showPayment && (
              <form className="ord-panel inset ord-form" onSubmit={submitPayment}>
                <div className="ord-grid">
                  <label className="ord-field">
                    <span>Jumlah (Rp)</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={payment.amount}
                      onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
                      required
                    />
                  </label>
                  <label className="ord-field">
                    <span>Via</span>
                    <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </label>
                </div>
                <div className="ord-grid">
                  <label className="ord-field">
                    <span>Tanggal</span>
                    <input type="date" value={payment.date} onChange={(e) => setPayment({ ...payment, date: e.target.value })} required />
                  </label>
                  <label className="ord-field">
                    <span>Catatan</span>
                    <input value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} placeholder="Misal: pelunasan" />
                  </label>
                </div>
                <div className="ord-actions">
                  <button type="button" className="ord-btn ghost" onClick={() => setShowPayment(false)} disabled={busy}>Batal</button>
                  <button type="submit" className="ord-btn primary" disabled={busy}>Simpan</button>
                </div>
              </form>
            )}

            {canModify && (
              <div className="ord-actions wrap">
                {isAdmin && <button className="ord-btn danger" onClick={removeOrder} disabled={busy}>Hapus</button>}
                {order.status !== 'batal' && order.status !== 'selesai' && (
                  <button className="ord-btn ghost" onClick={() => setStatus('batal')} disabled={busy}>Batalkan</button>
                )}
                <button className="ord-btn ghost" onClick={() => onEdit(order)} disabled={busy}>✏️ Edit</button>
                {next && (
                  <button className="ord-btn primary" onClick={() => setStatus(next)} disabled={busy}>
                    Tandai {ORDER_STATUS[next].label}
                  </button>
                )}
              </div>
            )}
            {!canModify && <div className="ord-line muted small">Order ini milik outlet lain, hanya bisa dilihat.</div>}
          </>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
