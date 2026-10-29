import React, { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/salesApi';
import { shipmentApi, stockApi, conversionApi, productApi, shopOutlets, groupByCategory } from '../api/stockApi';
import { localDate, formatDay, formatRupiah } from '../api/orderApi';
import QtyInput from './QtyInput';
import IncomingShipments from './IncomingShipments';
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
    const stock = l.opening + l.received - l.sent + (l.converted || 0);
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

      {(loading || !draft) && message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

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
              Stok = sisa hitungan {formatDay(draft.prevDate)} + kiriman masuk − transfer keluar ± rakit/bongkar pack sesudahnya.
              Isi sisa barang yang ada sekarang.
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
                {groupByCategory(rows).map((g) => (
                <tbody key={g.category}>
                  <tr className="stk-group">
                    <td colSpan={draft.isFirstCount ? 4 : 5}>{g.category}</td>
                  </tr>
                  {g.items.map((r) => (
                    <tr key={r.productId} className={r.stock === 0 && !r.filled ? 'dim' : ''}>
                      <td>
                        {r.name}
                        {!draft.isFirstCount && (r.received > 0 || r.sent > 0 || r.converted) && (
                          <div className="muted small">
                            awal {r.opening}{r.received > 0 && ` · +${r.received} masuk`}{r.sent > 0 && ` · −${r.sent} keluar`}
                            {r.converted > 0 && ` · +${r.converted} rakit/bongkar`}{r.converted < 0 && ` · −${-r.converted} rakit/bongkar`}
                          </div>
                        )}
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
                ))}
              </table>
            </div>
          )}

          <div className="stk-sticky-bar">
            {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}
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

const sum = (items, key) => items.reduce((total, p) => total + (p[key] || 0), 0);
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '');

/** What happened to one product between counts, oldest first. */
const StockCardDetail = ({ product, nameOf }) => (
  <tr className="stk-card-detail">
    <td colSpan={9}>
      {product.periods.map((p) => (
        <div key={p.date} className="stk-period">
          <div className="muted small">Hitungan {formatDay(p.prevDate)}: sisa {p.opening}</div>
          {p.moves.map((m, i) => (
            <div key={i} className={m.direction === 'masuk' ? 'pos' : 'neg'}>
              {formatDay(m.date)} · {m.direction === 'masuk' ? '+' : '−'}{m.qty}{' '}
              {m.conversion
                ? `${m.conversion.kind === 'rakit' ? 'rakit' : 'bongkar'} ${m.conversion.packs} pack isi ${m.conversion.packSize} (${m.conversion.other})`
                : m.direction === 'masuk' ? `dari ${m.counterpart ? nameOf(m.counterpart) : 'Dapur Pusat'}` : `ke ${nameOf(m.counterpart)}`}
              {m.pending && <span className="muted"> (belum diterima)</span>}
            </div>
          ))}
          {p.waste > 0 && <div className="neg">{formatDay(p.date)} · −{p.waste} rusak</div>}
          <div className={p.sold < 0 ? 'neg' : ''}>
            {formatDay(p.date)} · terjual {p.sold}{p.sold < 0 && ' ⚠️ sisa lebih banyak dari stok'}
          </div>
          <div className="muted small">Hitungan {formatDay(p.date)}: sisa {p.remaining}</div>
        </div>
      ))}
    </td>
  </tr>
);

const OutletReport = ({ report, outletName, nameOf }) => {
  const [openProduct, setOpenProduct] = useState(null);
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
              <h4 className="ord-section-title">Kartu stok per produk</h4>
              <p className="ord-line muted small">
                Awal + Masuk − Keluar ± Rakit/Bongkar − Rusak − Terjual = Sisa. Ketuk produk untuk melihat rinciannya.
              </p>
              <div className="stk-table-wrap">
                <table className="stk-table stk-stock-card">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th className="num">Awal</th>
                      <th className="num">Masuk</th>
                      <th className="num">Keluar</th>
                      <th className="num">Rakit/ Bongkar</th>
                      <th className="num">Rusak</th>
                      <th className="num">Terjual</th>
                      <th className="num">Sisa</th>
                      <th className="num">Nilai</th>
                    </tr>
                  </thead>
                  {groupByCategory(report.products).map((g) => (
                    <tbody key={g.category}>
                      <tr className="stk-group">
                        <td>{g.category}</td>
                        <td className="num">{sum(g.items, 'opening')}</td>
                        <td className="num">{sum(g.items, 'received')}</td>
                        <td className="num">{sum(g.items, 'sent')}</td>
                        <td className="num">{signed(sum(g.items, 'converted'))}</td>
                        <td className="num">{sum(g.items, 'waste')}</td>
                        <td className="num">{sum(g.items, 'sold')}</td>
                        <td className="num">{sum(g.items, 'remaining')}</td>
                        <td className="num">{formatRupiah(sum(g.items, 'value'))}</td>
                      </tr>
                      {g.items.map((p) => (
                        <React.Fragment key={p.productId}>
                          <tr
                            className={`stk-card-row ${openProduct === p.productId ? 'open' : ''}`}
                            onClick={() => setOpenProduct(openProduct === p.productId ? null : p.productId)}
                          >
                            <td>{openProduct === p.productId ? '▾' : '▸'} {p.name}</td>
                            <td className="num">{p.opening}</td>
                            <td className="num">{p.received || ''}</td>
                            <td className="num">{p.sent || ''}</td>
                            <td className="num">{signed(p.converted)}</td>
                            <td className="num">{p.waste || ''}</td>
                            <td className={`num ${p.sold < 0 ? 'neg' : ''}`}>{p.sold}</td>
                            <td className="num">{p.remaining}</td>
                            <td className="num">{formatRupiah(p.value)}</td>
                          </tr>
                          {openProduct === p.productId && <StockCardDetail product={p} nameOf={nameOf} />}
                        </React.Fragment>
                      ))}
                    </tbody>
                  ))}
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
              {formatDay(x.date)} · {x.direction === 'keluar' ? `ke ${nameOf(x.counterpart)}` : `dari ${x.counterpart ? nameOf(x.counterpart) : 'Dapur Pusat'}`}
              {' · '}{x.name}: dikirim {x.sent}, diterima {x.received} ({x.received - x.sent})
            </div>
          ))}
        </>
      )}

      {report.transfersOut?.length > 0 && (
        <>
          <h4 className="ord-section-title">Transfer & retur keluar</h4>
          {report.transfersOut.map((t) => (
            <div key={t.shipmentId} className="ord-line small">
              {formatDay(t.date)} · ke {nameOf(t.to)}: {t.qty} pcs
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

const StockReport = ({ outlet, isAdmin, outletName }) => {
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
        reports.map((r) => <OutletReport key={r.outlet} report={r} outletName={outletName(r.outlet)} nameOf={outletName} />)
      )}
    </div>
  );
};

/** Send stock to another outlet, or back to the kitchen. The receiver confirms with Terima. */
const TransferOut = ({ outlet, isAdmin, outlets, outletName, onChanged }) => {
  const [dest, setDest] = useState('');
  const [date, setDate] = useState(localDate());
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState({});
  const [draft, setDraft] = useState(null);
  const [sent, setSent] = useState([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const loadStock = useCallback(async () => {
    try {
      setDraft(await stockApi.getClosing(date, isAdmin ? outlet : undefined));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [date, outlet, isAdmin]);

  const loadSent = useCallback(async () => {
    try {
      const all = await shipmentApi.list({ from: localDate(-14) });
      setSent(all.filter((s) => s.source === outlet));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [outlet]);

  useEffect(() => { loadStock(); }, [loadStock]);
  useEffect(() => { loadSent(); }, [loadSent]);

  const destinations = outlets.filter((o) => o.code !== outlet);
  const isReturn = outlets.find((o) => o.code === dest)?.role === 'dapur';
  const rows = (draft?.lines || []).map((l) => ({ ...l, stock: l.opening + l.received - l.sent + (l.converted || 0) }));
  const over = rows.filter((r) => (qty[r.productId] || 0) > Math.max(r.stock, 0));
  const total = Object.values(qty).reduce((s, n) => s + (n || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    const lines = Object.entries(qty).filter(([, n]) => n > 0).map(([productId, n]) => ({ productId, qty: n }));
    if (!dest) { setMessage({ type: 'error', text: 'Pilih tujuan' }); return; }
    if (lines.length === 0) { setMessage({ type: 'error', text: 'Isi jumlah minimal satu barang' }); return; }
    if (over.length && !window.confirm(`Jumlah ${over.map((r) => r.name).join(', ')} lebih dari stok tercatat. Tetap kirim?`)) return;

    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await shipmentApi.create({ outlet: dest, source: isAdmin ? outlet : undefined, date, lines, notes });
      setQty({});
      setNotes('');
      setMessage({ type: 'success', text: `${isReturn ? 'Retur' : 'Transfer'} ${total} pcs ke ${outletName(dest)} tercatat. Tinggal ditekan Terima oleh penerima.` });
      loadStock();
      loadSent();
      onChanged?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Batalkan kiriman ke ${outletName(s.outlet)} tanggal ${formatDay(s.date)}?`)) return;
    try {
      await shipmentApi.remove(s);
      loadStock();
      loadSent();
      onChanged?.();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  return (
    <div>
      <form className="ord-form" onSubmit={submit}>
        <div className="ord-grid">
          <label className="ord-field">
            <span>Kirim ke *</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)} required>
              <option value="">Pilih tujuan</option>
              {destinations.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.role === 'dapur' ? `🍳 ${o.code} - Dapur Pusat (retur)` : `${o.code} - ${o.name}`}
                </option>
              ))}
            </select>
          </label>
          <label className="ord-field">
            <span>Tanggal</span>
            <input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>

        {draft?.saved && (
          <div className="ord-alert warn">Outlet ini sudah tutup toko tanggal {formatDay(date)}. Pakai tanggal besok.</div>
        )}

        <div className="stk-lines">
          {groupByCategory(rows).map((g) => (
            <React.Fragment key={g.category}>
              <div className="stk-line-group">{g.category}</div>
              {g.items.map((r) => (
                <div
                  key={r.productId}
                  className={`stk-line ${qty[r.productId] ? 'filled' : ''} ${(qty[r.productId] || 0) > Math.max(r.stock, 0) ? 'changed' : ''}`}
                >
                  <span className="stk-line-name">
                    {r.name}
                    <span className="muted small"> stok {r.stock}</span>
                  </span>
                  <QtyInput value={qty[r.productId] || 0} onChange={(n) => setQty((prev) => ({ ...prev, [r.productId]: n }))} />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        <label className="ord-field">
          <span>Alasan / catatan</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isReturn ? 'Misal: kelebihan stok, mendekati kedaluwarsa' : 'Misal: stok outlet tujuan habis'}
          />
        </label>

        <div className="stk-sticky-bar">
          {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}
          <span><strong>{total}</strong> pcs</span>
          <button type="submit" className="ord-btn primary" disabled={saving}>
            {saving ? 'Menyimpan...' : isReturn ? '↩️ Retur ke Dapur' : '🔁 Transfer'}
          </button>
        </div>
      </form>

      <h4 className="ord-section-title">Dikirim dari outlet ini (14 hari)</h4>
      {sent.length === 0 ? (
        <div className="ord-line muted">Belum ada transfer atau retur.</div>
      ) : (
        <div className="ord-list">
          {sent.map((s) => (
            <div key={s.id} className="ord-card stk-card">
              <div className="ord-row-between">
                <strong>Ke {outletName(s.outlet)}</strong>
                <span className="ord-chip" style={{ background: s.status === 'diterima' ? '#15803d' : '#d97706' }}>
                  {s.status === 'diterima' ? 'Diterima' : 'Belum diterima'}
                </span>
              </div>
              <div className="ord-line muted small">{formatDay(s.date)}{s.notes ? ` · ${s.notes}` : ''}</div>
              <div className="ord-items full">
                {s.lines.map((l) => (l.receivedQty !== undefined && l.receivedQty !== l.qty
                  ? `${l.name} ${l.qty} (diterima ${l.receivedQty})`
                  : `${l.name} ${l.qty}`)).join(', ')}
              </div>
              {(isAdmin || s.status === 'dikirim') && (
                <div className="ord-actions">
                  <button className="ord-btn danger small" onClick={() => remove(s)}>Batalkan</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Pack pieces into packs ("rakit") or open packs into pieces ("bongkar"). Both products are counted
 * as they are; the conversion moves stock from one to the other so the stock card shows why.
 */
const PackConversions = ({ outlet, isAdmin, onChanged }) => {
  const [packs, setPacks] = useState([]);
  const [products, setProducts] = useState([]);
  const [list, setList] = useState([]);
  const [draft, setDraft] = useState(null);
  const [date, setDate] = useState(localDate());
  const [direction, setDirection] = useState('rakit');
  const [packProductId, setPackProductId] = useState('');
  const [count, setCount] = useState(0);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    productApi.list()
      .then((all) => {
        setProducts(all);
        setPacks(all.filter((p) => p.packOf && p.packSize));
      })
      .catch((err) => setMessage({ type: 'error', text: err.message }));
  }, []);

  const loadList = useCallback(async () => {
    try {
      setList(await conversionApi.list({ outlet: isAdmin ? outlet : undefined, from: localDate(-14) }));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [outlet, isAdmin]);

  const loadStock = useCallback(async () => {
    try {
      setDraft(await stockApi.getClosing(date, isAdmin ? outlet : undefined));
    } catch {
      setDraft(null);
    }
  }, [date, outlet, isAdmin]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { loadStock(); }, [loadStock]);

  const pack = packs.find((p) => p.id === packProductId);
  const piece = pack && products.find((p) => p.id === pack.packOf);
  const stockOf = (id) => {
    const l = draft?.lines.find((x) => x.productId === id);
    return l ? l.opening + l.received - l.sent + (l.converted || 0) : 0;
  };
  const pieces = pack ? count * pack.packSize : 0;
  // What would go below zero: the pieces when packing, the packs when opening
  const short = pack && (direction === 'rakit' ? pieces > stockOf(pack.packOf) : count > stockOf(pack.id));

  const submit = async (e) => {
    e.preventDefault();
    if (!pack) { setMessage({ type: 'error', text: 'Pilih produk pack' }); return; }
    if (count <= 0) { setMessage({ type: 'error', text: 'Isi jumlah pack' }); return; }
    if (short && !window.confirm('Stok tercatat tidak cukup. Mungkin ada kiriman yang belum dicatat. Tetap simpan?')) return;
    setSaving(true);
    try {
      await conversionApi.create({ outlet: isAdmin ? outlet : undefined, date, direction, packProductId, packs: count, notes });
      setMessage({ type: 'success', text: `${direction === 'rakit' ? 'Rakit' : 'Bongkar'} ${count} pack tercatat` });
      setCount(0);
      setNotes('');
      loadList();
      loadStock();
      onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Hapus ${c.direction} ${c.packs} ${c.packName} tanggal ${formatDay(c.date)}?`)) return;
    try {
      await conversionApi.remove(c);
      loadList();
      loadStock();
      onChanged();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  if (packs.length === 0 && !message.text) {
    return (
      <div className="ord-empty">
        Belum ada produk pack. Admin mengatur "Pack dari" dan isinya di Master Produk.
      </div>
    );
  }

  return (
    <div>
      <form className="ord-form" onSubmit={submit}>
        <div className="ord-tabs">
          <button type="button" className={direction === 'rakit' ? 'active' : ''} onClick={() => setDirection('rakit')}>
            Rakit (pcs → pack)
          </button>
          <button type="button" className={direction === 'bongkar' ? 'active' : ''} onClick={() => setDirection('bongkar')}>
            Bongkar (pack → pcs)
          </button>
        </div>
        <div className="ord-grid">
          <label className="ord-field">
            <span>Produk pack *</span>
            <select value={packProductId} onChange={(e) => setPackProductId(e.target.value)} required>
              <option value="">Pilih pack</option>
              {packs.map((p) => <option key={p.id} value={p.id}>{p.name} (isi {p.packSize})</option>)}
            </select>
          </label>
          <label className="ord-field">
            <span>Tanggal</span>
            <input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>

        {pack && (
          <>
            <label className="ord-field">
              <span>Jumlah pack</span>
              <QtyInput value={count} onChange={setCount} steps={[5]} />
            </label>
            <div className={`ord-alert ${short ? 'warn' : 'success'}`}>
              {direction === 'rakit'
                ? <>−{pieces} {piece?.name} → +{count} {pack.name}</>
                : <>−{count} {pack.name} → +{pieces} {piece?.name}</>}
              <div className="small">
                Stok tercatat: {piece?.name} {stockOf(pack.packOf)} pcs · {pack.name} {stockOf(pack.id)} pack
              </div>
            </div>
          </>
        )}

        <label className="ord-field">
          <span>Catatan</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsional" />
        </label>

        {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

        <div className="ord-actions">
          <button type="submit" className="ord-btn primary" disabled={saving || !pack || count <= 0}>
            {saving ? 'Menyimpan...' : direction === 'rakit' ? '📦 Simpan Rakit' : '📤 Simpan Bongkar'}
          </button>
        </div>
      </form>

      <h4 className="ord-section-title">Rakit/bongkar 14 hari terakhir</h4>
      {list.length === 0 ? (
        <div className="ord-line muted">Belum ada catatan.</div>
      ) : (
        <div className="ord-list">
          {list.map((c) => (
            <div key={c.id} className="ord-card stk-card">
              <div className="ord-row-between">
                <strong>{c.direction === 'rakit' ? '📦 Rakit' : '📤 Bongkar'} {c.packs} {c.packName}</strong>
                <button className="ord-btn danger small" onClick={() => remove(c)}>Hapus</button>
              </div>
              <div className="ord-line muted small">
                {formatDay(c.date)} · {c.direction === 'rakit' ? '−' : '+'}{c.packs * c.packSize} {c.pieceName} (isi {c.packSize})
                {c.createdBy ? ` · oleh ${c.createdBy}` : ''}
              </div>
              {c.notes && <div className="ord-line muted small">📝 {c.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VIEWS = [
  { id: 'tutup', label: '🌙 Tutup Toko' },
  { id: 'kiriman', label: '🚚 Kiriman Masuk' },
  { id: 'transfer', label: '🔁 Transfer Keluar' },
  { id: 'pack', label: '📦 Rakit Pack' },
  { id: 'laporan', label: '📊 Laporan' }
];

/** Outlet staff: end-of-day count, incoming shipments, transfers out, own report. Admins pick the outlet. */
const StockManager = ({ user, isAdmin = false }) => {
  const [view, setView] = useState('tutup');
  const [allOutlets, setAllOutlets] = useState([]);
  const [outlet, setOutlet] = useState(isAdmin ? '' : user?.outlet || '');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    authApi.getOutlets().then((res) => setAllOutlets(res?.data || [])).catch(() => setAllOutlets([]));
  }, []);

  const outlets = shopOutlets(allOutlets);
  const outletName = (code) => {
    const o = allOutlets.find((x) => x.code === code);
    if (!o) return code;
    return o.role === 'dapur' ? 'Dapur Pusat' : `${o.code} - ${o.name}`;
  };

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
            <IncomingShipments outlet={outlet} outletName={outletName} onReceived={() => setRefreshKey((k) => k + 1)} />
          )}
          {view === 'transfer' && (
            <TransferOut
              key={outlet}
              outlet={outlet}
              isAdmin={isAdmin}
              outlets={allOutlets}
              outletName={outletName}
              onChanged={() => setRefreshKey((k) => k + 1)}
            />
          )}
          {view === 'pack' && (
            <PackConversions key={outlet} outlet={outlet} isAdmin={isAdmin} onChanged={() => setRefreshKey((k) => k + 1)} />
          )}
          {view === 'laporan' && <StockReport outlet={outlet} isAdmin={isAdmin} outletName={outletName} />}
        </>
      )}
    </div>
  );
};

export default StockManager;
