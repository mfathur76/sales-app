import React, { useState, useEffect, useCallback } from 'react';
import { productApi, kitchenApi, groupByCategory } from '../api/stockApi';
import { localDate, formatDay, formatRupiah } from '../api/orderApi';
import QtyInput from './QtyInput';
import './Orders.css';
import './Stock.css';

const ENTRY_KIND = {
  produksi: { label: 'Hasil Produksi', icon: '🍳', productKind: 'produksi' },
  masuk: { label: 'Beli Jadi Datang', icon: '📥', productKind: 'beli_jadi' }
};

/** Record the kitchen's own production, or bought-in goods arriving from a supplier. */
const EntryForm = ({ products, onSaved }) => {
  const [kind, setKind] = useState('produksi');
  const [date, setDate] = useState(localDate());
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const list = products.filter((p) => p.kind === ENTRY_KIND[kind].productKind);
  const total = list.reduce((s, p) => s + (qty[p.id] || 0), 0);

  const switchKind = (k) => {
    setKind(k);
    setQty({});
  };

  const submit = async (e) => {
    e.preventDefault();
    const lines = list.filter((p) => qty[p.id] > 0).map((p) => ({ productId: p.id, qty: qty[p.id] }));
    if (lines.length === 0) {
      setMessage({ type: 'error', text: 'Isi jumlah minimal satu barang' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await kitchenApi.createEntry({ kind, date, lines, notes });
      setQty({});
      setNotes('');
      setMessage({ type: 'success', text: `${ENTRY_KIND[kind].label} tercatat: ${total} pcs` });
      onSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ord-form" onSubmit={submit}>
      <div className="ord-toggle">
        {Object.entries(ENTRY_KIND).map(([k, v]) => (
          <button type="button" key={k} className={kind === k ? 'active' : ''} onClick={() => switchKind(k)}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      <label className="ord-field">
        <span>Tanggal</span>
        <input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} required />
      </label>

      {list.length === 0 ? (
        <div className="ord-empty">
          Belum ada produk berjenis {kind === 'produksi' ? 'Produksi' : 'Beli jadi'} di Master Produk.
        </div>
      ) : (
        <div className="stk-lines">
          {groupByCategory(list).map((g) => (
            <React.Fragment key={g.category}>
              <div className="stk-line-group">{g.category}</div>
              {g.items.map((p) => (
                <div key={p.id} className={`stk-line ${qty[p.id] ? 'filled' : ''}`}>
                  <span className="stk-line-name">{p.name}</span>
                  <QtyInput
                    value={qty[p.id] || 0}
                    steps={[10, 50]}
                    onChange={(n) => setQty((prev) => ({ ...prev, [p.id]: n }))}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      )}

      <label className="ord-field">
        <span>Catatan</span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={kind === 'masuk' ? 'Misal: nama supplier, no. nota' : 'Opsional'}
        />
      </label>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      <div className="stk-sticky-bar">
        <span><strong>{total}</strong> pcs</span>
        <button type="submit" className="ord-btn primary" disabled={saving || list.length === 0}>
          {saving ? 'Menyimpan...' : '💾 Simpan'}
        </button>
      </div>
    </form>
  );
};

const RecentEntries = ({ refreshKey, isAdmin }) => {
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setEntries(await kitchenApi.listEntries(localDate(-14)));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const remove = async (e) => {
    if (!window.confirm(`Hapus catatan ${ENTRY_KIND[e.kind].label.toLowerCase()} tanggal ${formatDay(e.date)}?`)) return;
    try {
      setError('');
      await kitchenApi.removeEntry(e.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h4 className="ord-section-title">Catatan 14 hari terakhir</h4>
      {error && <div className="ord-alert error">{error}</div>}
      {entries.length === 0 ? (
        <div className="ord-line muted">Belum ada catatan.</div>
      ) : (
        <div className="ord-list">
          {entries.map((e) => (
            <div key={e.id} className="ord-card stk-card">
              <div className="ord-row-between">
                <strong>{ENTRY_KIND[e.kind].icon} {ENTRY_KIND[e.kind].label}</strong>
                <span className="muted small">{formatDay(e.date)}</span>
              </div>
              <div className="ord-items full">{e.lines.map((l) => `${l.name} ${l.qty}`).join(', ')}</div>
              {e.notes && <div className="ord-line muted small">📝 {e.notes}</div>}
              <div className="ord-row-between">
                <span className="muted small">{e.lines.reduce((s, l) => s + l.qty, 0)} pcs{e.createdBy ? ` · ${e.createdBy}` : ''}</span>
                <button className="ord-btn ghost small" onClick={() => remove(e)} title={isAdmin ? '' : 'Catatan yang sudah tercakup opname hanya bisa dihapus admin'}>
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="ord-line muted small">Salah input? Hapus lalu catat ulang.</p>
    </div>
  );
};

/** Expected stock right now, and the weekly count form on the same table. */
const KitchenCount = () => {
  const [date, setDate] = useState(localDate());
  const [draft, setDraft] = useState(null);
  const [counts, setCounts] = useState({});
  const [counting, setCounting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const apply = (data) => {
    setDraft(data);
    setCounts(Object.fromEntries(data.lines.map((l) => [l.productId, { remaining: l.remaining ?? '', waste: l.waste ?? 0 }])));
    setCounting(data.saved);
  };

  const load = useCallback(async () => {
    try {
      setMessage({ type: '', text: '' });
      apply(await kitchenApi.getCount(date));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const setCount = (id, field, value) => setCounts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const rows = (draft?.lines || []).map((l) => {
    const c = counts[l.productId] || {};
    const filled = c.remaining !== '' && c.remaining !== undefined;
    const diff = filled ? Number(c.remaining) + Number(c.waste || 0) - l.expected : null;
    return { ...l, filled, diff, remaining: c.remaining, waste: c.waste || 0 };
  });
  const totalExpected = rows.reduce((s, r) => s + Math.max(r.expected, 0), 0);
  const gapPcs = rows.reduce((s, r) => s + (r.diff || 0), 0);
  const gapValue = rows.reduce((s, r) => s + (r.diff || 0) * r.price, 0);

  const save = async () => {
    const missing = rows.filter((r) => !r.filled && r.expected > 0).length;
    if (missing > 0 && !window.confirm(`${missing} produk belum diisi sisanya dan akan dianggap 0. Lanjut simpan?`)) return;
    setSaving(true);
    try {
      apply(await kitchenApi.saveCount(date, rows.map((r) => ({
        productId: r.productId, remaining: Number(r.remaining) || 0, waste: Number(r.waste) || 0
      }))));
      setMessage({ type: 'success', text: 'Opname dapur tersimpan' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return message.text ? <div className="ord-alert error">{message.text}</div> : <div className="ord-empty">Memuat...</div>;

  return (
    <div>
      <div className="ord-toolbar">
        <input type="date" value={date} max={localDate()} onChange={(e) => setDate(e.target.value)} />
        {draft.saved && <span className="ord-chip" style={{ background: '#15803d' }}>Opname tersimpan</span>}
      </div>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      {draft.isFirstCount ? (
        <div className="ord-alert warn">
          Belum ada opname. Hitung semua barang jadi di freezer dan simpan sebagai opname pertama; angka itu jadi stok awal.
        </div>
      ) : (
        <p className="ord-line muted small">
          Stok seharusnya = opname {formatDay(draft.prevDate)} + produksi + beli jadi datang + retur dari outlet − kiriman ke outlet − diambil reseller sesudahnya.
        </p>
      )}

      <div className="ord-row-between">
        <span className="ord-line">
          {draft.isFirstCount ? '' : <>Total stok seharusnya <strong>{totalExpected}</strong> pcs</>}
        </span>
        {!counting && (
          <button className="ord-btn primary" onClick={() => setCounting(true)}>📝 Mulai Opname</button>
        )}
      </div>

      <div className="stk-table-wrap">
        <table className="stk-table stk-closing">
          <thead>
            <tr>
              <th>Produk</th>
              {!draft.isFirstCount && <th className="num">Seharusnya</th>}
              {counting && <th className="num">Sisa</th>}
              {counting && <th className="num">Rusak</th>}
              {counting && !draft.isFirstCount && <th className="num">Selisih</th>}
            </tr>
          </thead>
          {groupByCategory(rows).map((g) => (
            <tbody key={g.category}>
              <tr className="stk-group"><td colSpan="5">{g.category}</td></tr>
              {g.items.map((r) => (
                <tr key={r.productId} className={!counting && r.expected === 0 ? 'dim' : ''}>
                  <td>
                    {r.name}
                    {!draft.isFirstCount && (r.produced > 0 || r.bought > 0 || r.returned > 0 || r.shipped > 0 || r.resold > 0) && (
                      <div className="muted small">
                        {r.opening} {r.produced > 0 && `+${r.produced} produksi `}{r.bought > 0 && `+${r.bought} masuk `}
                        {r.returned > 0 && `+${r.returned} retur `}{r.shipped > 0 && `−${r.shipped} kirim `}
                        {r.resold > 0 && `−${r.resold} reseller`}
                      </div>
                    )}
                  </td>
                  {!draft.isFirstCount && <td className={`num ${r.expected < 0 ? 'neg' : ''}`}>{r.expected}</td>}
                  {counting && (
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
                  )}
                  {counting && (
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
                  )}
                  {counting && !draft.isFirstCount && (
                    <td className={`num ${r.diff < 0 ? 'neg' : r.diff > 0 ? 'pos' : ''}`}>
                      {r.diff === null ? '' : r.diff > 0 ? `+${r.diff}` : r.diff}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

      {counting && (
        <div className="stk-sticky-bar">
          {draft.isFirstCount ? (
            <span>Stok awal dapur</span>
          ) : (
            <span className={gapPcs < 0 ? 'neg' : ''}>
              Selisih <strong>{gapPcs > 0 ? `+${gapPcs}` : gapPcs}</strong> pcs · {formatRupiah(gapValue)}
            </span>
          )}
          <button className="ord-btn primary" onClick={save} disabled={saving}>
            {saving ? 'Menyimpan...' : '💾 Simpan Opname'}
          </button>
        </div>
      )}
      <p className="ord-line muted small">
        Selisih minus = barang kurang dari catatan (hilang, rusak tidak dicatat, atau produksi/kiriman lupa dicatat).
      </p>
    </div>
  );
};

const KitchenReport = () => {
  const [from, setFrom] = useState(localDate(-29));
  const [to, setTo] = useState(localDate());
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setReport(await kitchenApi.report(from, to));
    } catch (err) {
      setError(err.message);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="ord-toolbar">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {error && <div className="ord-alert error">{error}</div>}
      {!report ? (
        <div className="ord-empty">Memuat...</div>
      ) : (
        <>
          <h4 className="ord-section-title">Hasil opname</h4>
          {report.counts.length === 0 ? (
            <div className="ord-line muted">Belum ada opname di periode ini.</div>
          ) : (
            report.counts.map((c) => (
              <div key={c.date} className="ord-panel">
                <div className="ord-row-between">
                  <strong>{formatDay(c.date)}</strong>
                  {c.isFirstCount ? (
                    <span className="muted small">stok awal</span>
                  ) : (
                    <span className={c.diff < 0 ? 'neg' : ''}>
                      Selisih <strong>{c.diff > 0 ? `+${c.diff}` : c.diff}</strong> pcs · {formatRupiah(c.diffValue)}
                    </span>
                  )}
                </div>
                {!c.isFirstCount && (
                  <div className="ord-line muted small">
                    Sejak {formatDay(c.prevDate)}{c.waste ? ` · ${c.waste} pcs rusak` : ''}
                  </div>
                )}
                {c.lines.filter((l) => l.diff !== 0).map((l) => (
                  <div key={l.productId} className="ord-line small">
                    {l.name}: seharusnya {l.expected}, ada {l.remaining}{l.waste ? ` + ${l.waste} rusak` : ''}{' '}
                    (<span className={l.diff < 0 ? 'neg' : 'pos'}>{l.diff > 0 ? `+${l.diff}` : l.diff}</span>)
                  </div>
                ))}
                {!c.isFirstCount && c.lines.every((l) => l.diff === 0) && (
                  <div className="ord-line small pos">Semua cocok ✅</div>
                )}
              </div>
            ))
          )}

          <h4 className="ord-section-title">Pergerakan barang</h4>
          {report.movement.length === 0 ? (
            <div className="ord-line muted">Belum ada produksi, barang masuk, atau kiriman.</div>
          ) : (
            <div className="stk-table-wrap">
              <table className="stk-table">
                <thead>
                  <tr>
                    <th>Produk</th><th className="num">Produksi</th><th className="num">Masuk</th>
                    <th className="num">Retur</th><th className="num">Dikirim</th><th className="num">Reseller</th>
                  </tr>
                </thead>
                {groupByCategory(report.movement).map((g) => (
                  <tbody key={g.category}>
                    <tr className="stk-group">
                      <td>{g.category}</td>
                      <td className="num">{g.items.reduce((s, m) => s + m.produced, 0) || ''}</td>
                      <td className="num">{g.items.reduce((s, m) => s + m.bought, 0) || ''}</td>
                      <td className="num">{g.items.reduce((s, m) => s + (m.returned || 0), 0) || ''}</td>
                      <td className="num">{g.items.reduce((s, m) => s + m.shipped, 0)}</td>
                      <td className="num">{g.items.reduce((s, m) => s + (m.resold || 0), 0) || ''}</td>
                    </tr>
                    {g.items.map((m) => (
                      <tr key={m.productId}>
                        <td>{m.name}</td>
                        <td className="num">{m.produced || ''}</td>
                        <td className="num">{m.bought || ''}</td>
                        <td className="num">{m.returned || ''}</td>
                        <td className="num">{m.shipped}</td>
                        <td className="num">{m.resold || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const VIEWS = [
  { id: 'catat', label: '📥 Catat Masuk' },
  { id: 'stok', label: '🧊 Stok & Opname' },
  { id: 'laporan', label: '📊 Laporan' }
];

/** Kitchen stock: production and bought-in goods in, shipments out, weekly freezer count. */
const KitchenStock = ({ isAdmin = false }) => {
  const [view, setView] = useState('catat');
  const [products, setProducts] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    productApi.list().then(setProducts).catch((err) => setError(err.message));
  }, []);

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>🧊 Stok Dapur</h2>
      </div>

      <div className="ord-tabs">
        {VIEWS.map((v) => (
          <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>{v.label}</button>
        ))}
      </div>

      {error && <div className="ord-alert error">{error}</div>}

      {view === 'catat' && (
        <>
          <EntryForm products={products} onSaved={() => setRefreshKey((k) => k + 1)} />
          <RecentEntries refreshKey={refreshKey} isAdmin={isAdmin} />
        </>
      )}
      {view === 'stok' && <KitchenCount />}
      {view === 'laporan' && <KitchenReport />}
    </div>
  );
};

export default KitchenStock;
