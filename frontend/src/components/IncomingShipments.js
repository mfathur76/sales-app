import React, { useState, useEffect, useCallback } from 'react';
import { shipmentApi } from '../api/stockApi';
import { localDate, formatDay } from '../api/orderApi';
import QtyInput from './QtyInput';
import './Orders.css';
import './Stock.css';

/**
 * Shipments arriving at `outlet` (an outlet, or the kitchen for returns) from the last 14 days.
 * Waiting ones can be checked line by line and confirmed with Terima.
 */
const IncomingShipments = ({ outlet, outletName = (c) => c, onReceived, emptyText = 'Tidak ada kiriman yang menunggu diterima.' }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState({}); // shipmentId -> { productId: qty }
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!outlet) return;
    try {
      setLoading(true);
      // Outlet staff get both directions back, so keep only what comes in
      const all = await shipmentApi.list({ outlet, from: localDate(-14) });
      setShipments(all.filter((s) => s.outlet === outlet));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [outlet]);

  useEffect(() => { load(); }, [load]);

  const qtyFor = (s, l) => received[s.id]?.[l.productId] ?? l.qty;
  const from = (s) => (s.source ? outletName(s.source) : 'Dapur Pusat');

  const receive = async (s) => {
    const lines = s.lines.map((l) => ({ productId: l.productId, receivedQty: qtyFor(s, l) }));
    const diff = lines.filter((x, i) => x.receivedQty !== s.lines[i].qty);
    if (diff.length && !window.confirm(`Jumlah diterima beda dengan yang dikirim untuk ${diff.length} produk. Simpan?`)) return;
    setBusy(s.id);
    setError('');
    try {
      await shipmentApi.receive(s, lines);
      await load();
      onReceived?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="ord-empty">Memuat kiriman...</div>;

  const waiting = shipments.filter((s) => s.status === 'dikirim');
  const done = shipments.filter((s) => s.status === 'diterima');

  return (
    <div>
      {error && <div className="ord-alert error">{error}</div>}
      {waiting.length === 0 && <div className="ord-empty">{emptyText}</div>}

      {waiting.map((s) => (
        <div key={s.id} className="ord-panel">
          <div className="ord-row-between">
            <strong>Dari {from(s)} · {formatDay(s.date)}</strong>
            <span className="ord-chip" style={{ background: '#d97706' }}>Belum diterima</span>
          </div>
          <p className="ord-line muted small">Cek barangnya. Kalau jumlah yang datang beda, ubah angkanya dulu.</p>
          <div className="stk-lines">
            {s.lines.map((l) => (
              <div key={l.productId} className={`stk-line ${qtyFor(s, l) !== l.qty ? 'changed' : ''}`}>
                <span className="stk-line-name">
                  {l.name}
                  <span className="muted small"> dikirim {l.qty}</span>
                </span>
                <QtyInput
                  value={qtyFor(s, l)}
                  steps={[]}
                  onChange={(n) => setReceived((prev) => ({ ...prev, [s.id]: { ...prev[s.id], [l.productId]: n } }))}
                />
              </div>
            ))}
          </div>
          {s.notes && <p className="ord-line muted small">📝 {s.notes}</p>}
          <div className="ord-actions">
            <button className="ord-btn primary" onClick={() => receive(s)} disabled={busy === s.id}>
              {busy === s.id ? 'Menyimpan...' : '✅ Terima'}
            </button>
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <>
          <h4 className="ord-section-title">Sudah diterima (14 hari)</h4>
          <div className="ord-list">
            {done.map((s) => (
              <div key={s.id} className="ord-card stk-card">
                <div className="ord-row-between">
                  <strong>{formatDay(s.date)} · dari {from(s)}</strong>
                  <span className="muted small">{s.receivedBy ? `diterima ${s.receivedBy}` : ''}</span>
                </div>
                <div className="ord-items full">
                  {s.lines.map((l) => (l.receivedQty !== undefined && l.receivedQty !== l.qty
                    ? `${l.name} ${l.receivedQty} (dikirim ${l.qty})`
                    : `${l.name} ${l.qty}`)).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default IncomingShipments;
