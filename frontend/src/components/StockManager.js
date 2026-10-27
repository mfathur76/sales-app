import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/salesApi';
import { shipmentApi, stockApi, shopOutlets } from '../api/stockApi';
import { localDate, formatDay, formatRupiah } from '../api/orderApi';
import { QtyInput } from './ShipmentManager';
import './Orders.css';
import './Stock.css';

const ClosingForm = ({ outlet, isAdmin }) => {
  const [date, setDate] = useState(localDate());
  const [draft, setDraft] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const apply = (data) => {
    setDraft(data);
    setCounts(Object.fromEntries(data.lines.map((l) => [l.productId, {
      remaining: l.remaining ?? '',
      waste: l.waste ?? 0
    }])));
  };

  const load = useCallback(async () => {
    if (!outlet) return;
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      apply(await stockApi.getClosing(date, isAdmin ? outlet : undefined));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setDraft(null);
    } finally {
      setLoading(false);
    }
  }, [date, outlet, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const setCount = (id, field, value) =>
    setCounts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const rows = (draft?.lines || []).map((l) => {
    const c = counts[l.productId] || {};
    const stock = l.opening + l.received;
    const filled = c.remaining !== '' && c.remaining !== undefined;
    const sold = filled ? stock - Number(c.remaining) - Number(c.waste || 0) : null;
    return { ...l, stock, filled, sold, remaining: c.remaining, waste: c.waste || 0 };
  });
  const missing = rows.filter((r) => !r.filled && r.stock > 0).length;
  const totalSold = rows.reduce((s, r) => s + (r.sold > 0 ? r.sold : 0), 0);
  const totalValue = rows.reduce((s, r) => s + (r.sold > 0 ? r.sold * r.price : 0), 0);
  const pending = rows.reduce((s, r) => s + r.pending, 0);
  const negative = rows.filter((r) => r.sold !== null && r.sold < 0);

  const save = async () => {
    if (missing > 0 && !window.confirm(`${missing} produk belum diisi sisanya dan akan dianggap 0. Lanjut simpan?`)) return;
    if (negative.length > 0 && !window.confirm(
      `Sisa ${negative.map((r) => r.name).join(', ')} lebih banyak dari stok. Mungkin ada kiriman yang belum dicatat. Tetap simpan?`
    )) return;

    setSaving(true);
    try {
      const data = await stockApi.saveClosing({
        outlet: isAdmin ? outlet : undefined,
        date,
        lines: rows.map((r) => ({ productId: r.productId, remaining: Number(r.remaining) || 0, waste: Number(r.waste) || 0 }))
      });
      apply(data);
      setMessage({ type: 'success', text: 'Hitungan tutup toko tersimpan' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ord-toolbar">
        <input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} />
        {draft?.saved && <span className="ord-chip" style={{ background: '#15803d' }}>Sudah disimpan</span>}
      </div>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      {loading || !draft ? (
        <div className="ord-empty">{loading ? 'Memuat...' : 'Pilih outlet.'}</div>
      ) : (
        <>
          {draft.isFirstCount ? (
            <div className="ord-alert warn">
              Ini hitungan pertama. Isi semua sisa barang yang ada sekarang; angka ini jadi stok awal, jadi hari ini belum ada hitungan terjual.
            </div>
          ) : (
            <p className="ord-line muted small">
              Stok = sisa hitungan {formatDay(draft.prevDate)} + kiriman sesudahnya. Isi sisa barang yang ada sekarang.
            </p>
          )}
          {pending > 0 && (
            <div className="ord-alert warn">
              Ada {pending} pcs kiriman yang belum ditekan Terima. Sudah dihitung masuk; cek tab Kiriman Masuk kalau jumlahnya beda.
            </div>
          )}

          {rows.length === 0 ? (
            <div className="ord-empty">Belum ada produk.</div>
          ) : (
            <div className="stk-table-wrap">
              <table className="stk-table stk-closing">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th className="num">Stok</th>
                    <th className="num">Sisa</th>
                    <th className="num">Rusak</th>
                    {!draft.isFirstCount && <th className="num">Terjual</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.productId} className={r.stock === 0 && !r.filled ? 'dim' : ''}>
                      <td>
                        {r.name}
                        {!draft.isFirstCount && r.received > 0 && <div className="muted small">+{r.received} kiriman</div>}
                      </td>
                      <td className="num">{draft.isFirstCount ? '-' : r.stock}</td>
                      <td className="num">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          className={r.filled ? '' : 'empty'}
                          value={r.remaining}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCount(r.productId, 'remaining', e.target.value === '' ? '' : Math.max(parseInt(e.target.value, 10) || 0, 0))}
                        />
                      </td>
                      <td className="num">
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={r.waste === 0 ? '' : r.waste}
                          placeholder="0"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => setCount(r.productId, 'waste', Math.max(parseInt(e.target.value, 10) || 0, 0))}
                        />
                      </td>
                      {!draft.isFirstCount && (
                        <td className={`num ${r.sold < 0 ? 'neg' : ''}`}>{r.sold === null ? '' : r.sold}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="stk-sticky-bar">
            {draft.isFirstCount ? (
              <span>Stok awal</span>
            ) : (
              <span>Terjual <strong>{totalSold}</strong> pcs · <strong>{formatRupiah(totalValue)}</strong></span>
            )}
            <button className="ord-btn primary" onClick={save} disabled={saving || rows.length === 0}>
              {saving ? 'Menyimpan...' : '💾 Simpan'}
            </button>
          </div>
          {draft.saved && draft.submittedBy && (
            <p className="ord-line muted small">Terakhir disimpan oleh {draft.submittedBy}</p>
          )}
        </>
      )}
    </div>
  );
};

const IncomingShipments = ({ outlet, isAdmin, onReceived }) => {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [received, setReceived] = useState({}); // shipmentId -> { productId: qty }
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!outlet) return;
    try {
      setLoading(true);
      setShipments(await shipmentApi.list({ outlet: isAdmin ? outlet : undefined, from: localDate(-14) }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [outlet, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const qtyFor = (s, l) => received[s.id]?.[l.productId] ?? l.qty;

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
      {waiting.length === 0 && <div className="ord-empty">Tidak ada kiriman yang menunggu diterima.</div>}

      {waiting.map((s) => (
        <div key={s.id} className="ord-panel">
          <div className="ord-row-between">
            <strong>Kiriman {formatDay(s.date)}</strong>
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
                  <strong>{formatDay(s.date)}</strong>
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

const OutletReport = ({ report, outletName }) => {
  const s = report.summary;
  return (
    <div className="ord-panel">
      <h3>{outletName}</h3>
      {report.days.length === 0 ? (
        <div className="ord-line muted">Belum ada hitungan tutup toko di periode ini.</div>
      ) : (
        <>
          <div className="ord-stats stk-stats">
            <div><strong>{s.sold}</strong><span>pcs terjual</span></div>
            <div><strong>{s.waste}</strong><span>pcs rusak</span></div>
            <div><strong>{formatRupiah(s.value)}</strong><span>nilai terjual</span></div>
            <div><strong>{formatRupiah(s.sales)}</strong><span>uang di Sales</span></div>
            <div className={Math.abs(s.diff) > 0 ? (s.diff < 0 ? 'neg' : 'pos') : ''}>
              <strong>{formatRupiah(s.diff)}</strong><span>selisih</span>
            </div>
          </div>
          <p className="ord-line muted small">
            Selisih = uang di Sales − nilai terjual (terjual × harga dasar). Harga ojol yang lebih mahal membuat selisih cenderung plus.
          </p>

          <div className="stk-table-wrap">
            <table className="stk-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th className="num">Terjual</th>
                  <th className="num">Rusak</th>
                  <th className="num">Nilai</th>
                  <th className="num">Sales</th>
                  <th className="num">Selisih</th>
                </tr>
              </thead>
              <tbody>
                {report.days.map((d) => (
                  <tr key={d.date}>
                    <td>
                      {formatDay(d.date)}
                      {d.isFirstCount && <div className="muted small">stok awal</div>}
                      {d.prevDate && d.prevDate !== localDateBefore(d.date) && (
                        <div className="muted small">sejak {formatDay(d.prevDate)}</div>
                      )}
                      {d.negative.length > 0 && <div className="neg small">⚠️ {d.negative.join(', ')} minus</div>}
                    </td>
                    <td className="num">{d.isFirstCount ? '-' : d.sold}</td>
                    <td className="num">{d.isFirstCount ? '-' : d.waste}</td>
                    <td className="num">{d.isFirstCount ? '-' : formatRupiah(d.value)}</td>
                    <td className="num">{d.isFirstCount ? '-' : formatRupiah(d.sales)}</td>
                    <td className={`num ${d.diff < 0 ? 'neg' : ''}`}>{d.isFirstCount ? '-' : formatRupiah(d.diff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {report.products.length > 0 && (
            <>
              <h4 className="ord-section-title">Per produk</h4>
              <div className="stk-table-wrap">
                <table className="stk-table">
                  <thead>
                    <tr><th>Produk</th><th className="num">Terjual</th><th className="num">Rusak</th><th className="num">Nilai</th></tr>
                  </thead>
                  <tbody>
                    {report.products.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.name}</td>
                        <td className={`num ${p.sold < 0 ? 'neg' : ''}`}>{p.sold}</td>
                        <td className="num">{p.waste}</td>
                        <td className="num">{formatRupiah(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {report.shipmentDiffs.length > 0 && (
        <>
          <h4 className="ord-section-title">Selisih kiriman</h4>
          {report.shipmentDiffs.map((x) => (
            <div key={`${x.shipmentId}-${x.name}`} className="ord-line small">
              {formatDay(x.date)} · {x.name}: dikirim {x.sent}, diterima {x.received} ({x.received - x.sent})
            </div>
          ))}
        </>
      )}
    </div>
  );
};

function localDateBefore(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d - 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

const StockReport = ({ outlet, isAdmin, outlets }) => {
  const [from, setFrom] = useState(localDate(-6));
  const [to, setTo] = useState(localDate());
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setReports(await stockApi.report(from, to, isAdmin ? outlet : undefined));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, outlet, isAdmin]);

  useEffect(() => { load(); }, [load]);

  const name = (code) => {
    const o = outlets.find((x) => x.code === code);
    return o ? `${o.code} - ${o.name}` : code;
  };

  return (
    <div>
      <div className="ord-toolbar">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {error && <div className="ord-alert error">{error}</div>}
      {loading ? (
        <div className="ord-empty">Memuat laporan...</div>
      ) : (
        reports.map((r) => <OutletReport key={r.outlet} report={r} outletName={name(r.outlet)} />)
      )}
    </div>
  );
};

const VIEWS = [
  { id: 'tutup', label: '🌙 Tutup Toko' },
  { id: 'kiriman', label: '🚚 Kiriman Masuk' },
  { id: 'laporan', label: '📊 Laporan' }
];

/** Outlet staff: end-of-day count, incoming shipments, own report. Admins pick the outlet. */
const StockManager = ({ user, isAdmin = false }) => {
  const [view, setView] = useState('tutup');
  const [outlets, setOutlets] = useState([]);
  const [outlet, setOutlet] = useState(isAdmin ? '' : user?.outlet || '');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    authApi.getOutlets().then((res) => setOutlets(shopOutlets(res?.data))).catch(() => setOutlets([]));
  }, []);

  // Admin report may cover all outlets; the count and shipments need one outlet
  const needsOutlet = isAdmin && !outlet && view !== 'laporan';

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>📦 Stok Barang</h2>
      </div>

      <div className="ord-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>

      {isAdmin && (
        <div className="ord-toolbar">
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">{view === 'laporan' ? 'Semua outlet' : 'Pilih outlet'}</option>
            {outlets.map((o) => <option key={o.code} value={o.code}>{o.code} - {o.name}</option>)}
          </select>
        </div>
      )}

      {needsOutlet ? (
        <div className="ord-empty">Pilih outlet dulu.</div>
      ) : (
        <>
          {view === 'tutup' && <ClosingForm key={`${outlet}-${refreshKey}`} outlet={outlet} isAdmin={isAdmin} />}
          {view === 'kiriman' && (
            <IncomingShipments outlet={outlet} isAdmin={isAdmin} onReceived={() => setRefreshKey((k) => k + 1)} />
          )}
          {view === 'laporan' && <StockReport outlet={outlet} isAdmin={isAdmin} outlets={outlets} />}
        </>
      )}
    </div>
  );
};

export default StockManager;
