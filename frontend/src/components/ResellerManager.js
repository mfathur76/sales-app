import React, { useState, useEffect, useCallback } from 'react';
import { productApi, resellerApi, groupByCategory } from '../api/stockApi';
import {
  customerApi, PAYMENT_STATUS, PAYMENT_METHODS, methodLabel,
  formatRupiah, formatDay, localDate, displayPhone
} from '../api/orderApi';
import { CustomerForm } from './CustomerManager';
import QtyInput from './QtyInput';
import './Orders.css';
import './Stock.css';

const TERM_DAYS = 7;

const addDays = (ymd, days) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const reminderLink = (phone, name, remaining, dueDate) => {
  const text = `Halo ${name}, mengingatkan tagihan Risol Mejik sebesar ${formatRupiah(remaining)} `
    + `(jatuh tempo ${formatDay(dueDate)}). Terima kasih.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
};

/** Record a reseller taking stock from the kitchen. */
const PickupForm = ({ products, onSaved }) => {
  const [resellers, setResellers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(localDate());
  const [dueDate, setDueDate] = useState(addDays(localDate(), TERM_DAYS));
  const [qty, setQty] = useState({});
  const [price, setPrice] = useState({});
  const [dp, setDp] = useState('');
  const [dpMethod, setDpMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadResellers = useCallback(async () => {
    try {
      setResellers((await customerApi.list()).filter((c) => c.isReseller));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, []);

  useEffect(() => { loadResellers(); }, [loadResellers]);

  const changeDate = (d) => {
    setDate(d);
    setDueDate(addDays(d, TERM_DAYS));
  };

  const priceOf = (p) => (price[p.id] !== undefined ? price[p.id] : p.resellerPrice ?? '');
  const lines = products.filter((p) => qty[p.id] > 0);
  const total = lines.reduce((s, p) => s + qty[p.id] * (Number(priceOf(p)) || 0), 0);
  const pcs = lines.reduce((s, p) => s + qty[p.id], 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!customerId) { setMessage({ type: 'error', text: 'Pilih reseller' }); return; }
    if (lines.length === 0) { setMessage({ type: 'error', text: 'Isi jumlah minimal satu barang' }); return; }
    const noPrice = lines.filter((p) => priceOf(p) === '');
    if (noPrice.length) {
      setMessage({ type: 'error', text: `Isi harga untuk: ${noPrice.map((p) => p.name).join(', ')}` });
      return;
    }
    const dpAmount = Number(dp) || 0;
    if (dpAmount > total) { setMessage({ type: 'error', text: 'Pembayaran lebih besar dari total' }); return; }

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const sale = await resellerApi.createSale({
        customerId,
        date,
        dueDate,
        lines: lines.map((p) => ({ productId: p.id, qty: qty[p.id], price: Number(priceOf(p)) })),
        payment: dpAmount > 0 ? { amount: dpAmount, method: dpMethod, date, note: 'Bayar saat ambil' } : undefined,
        notes
      });
      setQty({});
      setPrice({});
      setDp('');
      setNotes('');
      setMessage({
        type: 'success',
        text: `${sale.customerName}: ${pcs} pcs, ${formatRupiah(sale.total)}. Sisa tagihan ${formatRupiah(sale.remaining)}, jatuh tempo ${formatDay(sale.dueDate)}.`
      });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ord-form" onSubmit={submit}>
      {adding ? (
        <div className="ord-panel inset">
          <h4>Reseller Baru</h4>
          <CustomerForm
            outlets={[]}
            defaultReseller
            onSaved={(c) => { setAdding(false); loadResellers().then(() => setCustomerId(c.id)); }}
            onUseExisting={(c) => {
              setAdding(false);
              setMessage({ type: 'error', text: `${c.name} sudah terdaftar. Tandai sebagai reseller di menu Customer kalau belum.` });
            }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <div className="ord-field">
          <span>Reseller *</span>
          <div className="ord-row-between">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Pilih reseller</option>
              {resellers.map((c) => <option key={c.id} value={c.id}>{c.name} · {displayPhone(c.phone)}</option>)}
            </select>
            <button type="button" className="ord-btn ghost small" onClick={() => setAdding(true)}>➕ Baru</button>
          </div>
        </div>
      )}

      <div className="ord-grid">
        <label className="ord-field">
          <span>Tanggal ambil</span>
          <input type="date" value={date} max={localDate()} onChange={(e) => changeDate(e.target.value)} required />
        </label>
        <label className="ord-field">
          <span>Jatuh tempo</span>
          <input type="date" value={dueDate} min={date} onChange={(e) => setDueDate(e.target.value)} required />
        </label>
      </div>

      <div className="stk-lines">
        {groupByCategory(products).map((g) => (
          <React.Fragment key={g.category}>
            <div className="stk-line-group">{g.category}</div>
            {g.items.map((p) => (
              <div key={p.id} className={`stk-line ${qty[p.id] ? 'filled' : ''}`}>
                <span className="stk-line-name">
                  {p.name}
                  {qty[p.id] > 0 && (
                    <span className="stk-price">
                      @{' '}
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={priceOf(p)}
                        placeholder="harga"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setPrice((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      />
                    </span>
                  )}
                </span>
                <QtyInput value={qty[p.id] || 0} steps={[10, 50]} onChange={(n) => setQty((prev) => ({ ...prev, [p.id]: n }))} />
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      <div className="ord-grid">
        <label className="ord-field">
          <span>Bayar sekarang (Rp)</span>
          <input type="number" inputMode="numeric" min="0" value={dp} onChange={(e) => setDp(e.target.value)} placeholder="0" />
        </label>
        <label className="ord-field">
          <span>Via</span>
          <select value={dpMethod} onChange={(e) => setDpMethod(e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
      </div>

      <label className="ord-field">
        <span>Catatan</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
      </label>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      <div className="stk-sticky-bar">
        <span><strong>{pcs}</strong> pcs · <strong>{formatRupiah(total)}</strong></span>
        <button type="submit" className="ord-btn primary" disabled={saving}>
          {saving ? 'Menyimpan...' : '💾 Simpan'}
        </button>
      </div>
    </form>
  );
};

/** One bill: lines, payments, record a payment, move the due date. */
const BillDetail = ({ sale, isAdmin, onChanged, onClose }) => {
  const [payment, setPayment] = useState({ amount: String(sale.remaining || ''), method: 'transfer', date: localDate(), note: '' });
  const [dueDate, setDueDate] = useState(sale.dueDate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (action) => {
    setBusy(true);
    setError('');
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const pay = (e) => {
    e.preventDefault();
    run(() => resellerApi.addPayment(sale.id, { ...payment, amount: Number(payment.amount) || 0 }));
  };

  return (
    <div className="ord-modal" role="dialog" aria-modal="true">
      <div className="ord-modal-body">
        <div className="ord-row-between">
          <h3>Tagihan {sale.customerName}</h3>
          <button className="ord-close" onClick={onClose} aria-label="Tutup">✕</button>
        </div>
        <div className="ord-chips">
          <span className="ord-chip" style={{ background: PAYMENT_STATUS[sale.paymentStatus]?.color }}>
            {PAYMENT_STATUS[sale.paymentStatus]?.label}
          </span>
          {sale.remaining > 0 && sale.dueDate < localDate() && (
            <span className="ord-chip" style={{ background: '#dc2626' }}>Lewat jatuh tempo</span>
          )}
        </div>

        <div className="ord-panel">
          <div className="ord-line muted small">Diambil {formatDay(sale.date)}{sale.createdBy ? ` · ${sale.createdBy}` : ''}</div>
          {sale.lines.map((l) => (
            <div key={l.productId} className="ord-row-between ord-line">
              <span>{l.name} × {l.qty}</span>
              <span>{formatRupiah(l.qty * l.price)}</span>
            </div>
          ))}
          {sale.notes && <div className="ord-line muted small">📝 {sale.notes}</div>}
        </div>

        <div className="ord-summary">
          <div><span>Total</span><strong>{formatRupiah(sale.total)}</strong></div>
          <div><span>Sudah dibayar</span><span>{formatRupiah(sale.paid)}</span></div>
          <div className={sale.remaining > 0 ? 'due' : ''}><span>Sisa</span><strong>{formatRupiah(sale.remaining)}</strong></div>
        </div>

        <h4 className="ord-section-title">Pembayaran</h4>
        {sale.payments.length === 0 && <div className="ord-line muted">Belum ada pembayaran.</div>}
        <div className="ord-payments">
          {sale.payments.map((p) => (
            <div key={p.id} className="ord-payment">
              <div>
                <strong>{formatRupiah(p.amount)}</strong> · {methodLabel(p.method)}
                <div className="ord-line muted small">{formatDay(p.date)}{p.note ? ` · ${p.note}` : ''}{p.createdBy ? ` · ${p.createdBy}` : ''}</div>
              </div>
              {isAdmin && (
                <button
                  className="ord-btn ghost small"
                  disabled={busy}
                  onClick={() => window.confirm(`Hapus pembayaran ${formatRupiah(p.amount)}?`) && run(() => resellerApi.removePayment(sale.id, p.id))}
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>

        {sale.remaining > 0 && (
          <form className="ord-panel inset ord-form" onSubmit={pay}>
            <div className="ord-grid">
              <label className="ord-field">
                <span>Jumlah (Rp)</span>
                <input type="number" inputMode="numeric" min="1" max={sale.remaining} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required />
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
                <input value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} />
              </label>
            </div>
            <div className="ord-actions">
              <button type="submit" className="ord-btn primary" disabled={busy}>➕ Catat Pembayaran</button>
            </div>
          </form>
        )}

        {sale.remaining > 0 && (
          <div className="ord-row-between ord-panel">
            <label className="ord-field" style={{ flex: 1 }}>
              <span>Jatuh tempo</span>
              <input type="date" value={dueDate} min={sale.date} onChange={(e) => setDueDate(e.target.value)} />
            </label>
            <button
              className="ord-btn ghost small"
              disabled={busy || dueDate === sale.dueDate}
              onClick={() => run(() => resellerApi.updateSale(sale.id, { dueDate }))}
            >
              Ubah
            </button>
          </div>
        )}

        {error && <div className="ord-alert error">{error}</div>}

        <div className="ord-actions wrap">
          {(isAdmin || sale.payments.length === 0) && (
            <button
              className="ord-btn danger"
              disabled={busy}
              onClick={() => window.confirm('Hapus pengambilan ini? Stok dapur ikut dikembalikan.')
                && run(async () => { await resellerApi.removeSale(sale.id); onClose(); })}
            >
              Hapus
            </button>
          )}
          {sale.remaining > 0 && (
            <a className="ord-wa" href={reminderLink(sale.customerPhone, sale.customerName, sale.remaining, sale.dueDate)} target="_blank" rel="noreferrer">
              💬 Ingatkan via WA
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const BillCard = ({ sale, onClick }) => {
  const overdue = sale.remaining > 0 && sale.dueDate < localDate();
  return (
    <button className="ord-card" onClick={onClick}>
      <div className="ord-row-between">
        <strong>{sale.customerName}</strong>
        <span className={overdue ? 'neg' : ''}>
          {sale.remaining > 0 ? <>Sisa <strong>{formatRupiah(sale.remaining)}</strong></> : formatRupiah(sale.total)}
        </span>
      </div>
      <div className="ord-line muted small">
        Ambil {formatDay(sale.date)} · {sale.lines.reduce((s, l) => s + l.qty, 0)} pcs
        {sale.remaining > 0 && <> · jatuh tempo <span className={overdue ? 'neg' : ''}>{formatDay(sale.dueDate)}</span></>}
      </div>
      <div className="ord-chips">
        <span className="ord-chip" style={{ background: PAYMENT_STATUS[sale.paymentStatus]?.color }}>
          {PAYMENT_STATUS[sale.paymentStatus]?.label}
        </span>
        {overdue && <span className="ord-chip" style={{ background: '#dc2626' }}>Lewat jatuh tempo</span>}
      </div>
    </button>
  );
};

const VIEWS = [
  { id: 'ambil', label: '🤝 Ambil Barang' },
  { id: 'tagihan', label: '💸 Tagihan' },
  { id: 'riwayat', label: '📋 Riwayat' }
];

/** Resellers take stock from the kitchen and pay later. Kitchen account and admins. */
const ResellerManager = ({ isAdmin = false }) => {
  const [view, setView] = useState('ambil');
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [sales, setSales] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    productApi.list().then(setProducts).catch((err) => setError(err.message));
  }, []);

  const load = useCallback(async () => {
    try {
      setError('');
      if (view === 'tagihan') {
        const [sum, open] = await Promise.all([resellerApi.summary(localDate()), resellerApi.listSales({ unpaid: 1 })]);
        setSummary(sum);
        setSales([...open].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      } else if (view === 'riwayat') {
        setSales(await resellerApi.listSales({ from: localDate(-60) }));
      }
    } catch (err) {
      setError(err.message);
    }
  }, [view]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const refresh = async () => {
    setRefreshKey((k) => k + 1);
    if (selected) {
      const fresh = (await resellerApi.listSales({ customerId: selected.customerId })).find((s) => s.id === selected.id);
      setSelected(fresh || null);
    }
  };

  const totalOpen = summary.reduce((s, r) => s + r.remaining, 0);
  const totalOverdue = summary.reduce((s, r) => s + r.overdue, 0);

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>🤝 Reseller</h2>
      </div>

      <div className="ord-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>

      {error && <div className="ord-alert error">{error}</div>}

      {view === 'ambil' && <PickupForm products={products} onSaved={() => setRefreshKey((k) => k + 1)} />}

      {view === 'tagihan' && (
        <>
          {summary.length === 0 ? (
            <div className="ord-empty">Semua tagihan reseller sudah lunas 🎉</div>
          ) : (
            <>
              <div className={`ord-alert ${totalOverdue > 0 ? 'error' : 'warn'}`}>
                Piutang reseller <strong>{formatRupiah(totalOpen)}</strong>
                {totalOverdue > 0 && <> · lewat jatuh tempo <strong>{formatRupiah(totalOverdue)}</strong></>}
              </div>
              <div className="stk-table-wrap">
                <table className="stk-table">
                  <thead>
                    <tr><th>Reseller</th><th className="num">Tagihan</th><th className="num">Sisa</th><th className="num">Lewat tempo</th><th></th></tr>
                  </thead>
                  <tbody>
                    {summary.map((r) => (
                      <tr key={r.customerId}>
                        <td>{r.customerName}<div className="muted small">{displayPhone(r.customerPhone)}</div></td>
                        <td className="num">{r.bills}</td>
                        <td className="num">{formatRupiah(r.remaining)}</td>
                        <td className={`num ${r.overdue > 0 ? 'neg' : ''}`}>{r.overdue > 0 ? formatRupiah(r.overdue) : '-'}</td>
                        <td className="stk-row-actions">
                          <a className="ord-wa" href={reminderLink(r.customerPhone, r.customerName, r.remaining, r.oldestDue)} target="_blank" rel="noreferrer">WA</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <h4 className="ord-section-title">Tagihan terbuka (jatuh tempo terdekat dulu)</h4>
              <div className="ord-list">
                {sales.map((s) => <BillCard key={s.id} sale={s} onClick={() => setSelected(s)} />)}
              </div>
            </>
          )}
        </>
      )}

      {view === 'riwayat' && (
        sales.length === 0 ? (
          <div className="ord-empty">Belum ada pengambilan reseller dalam 60 hari terakhir.</div>
        ) : (
          <div className="ord-list">
            <div className="ord-count">
              {sales.length} pengambilan · {formatRupiah(sales.reduce((s, x) => s + x.total, 0))}
            </div>
            {sales.map((s) => <BillCard key={s.id} sale={s} onClick={() => setSelected(s)} />)}
          </div>
        )
      )}

      {selected && (
        <BillDetail
          key={`${selected.id}-${selected.updatedAt}`}
          sale={selected}
          isAdmin={isAdmin}
          onChanged={refresh}
          onClose={() => { setSelected(null); setRefreshKey((k) => k + 1); }}
        />
      )}
    </div>
  );
};

export default ResellerManager;
