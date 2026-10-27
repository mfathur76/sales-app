import React, { useState, useEffect, useCallback } from 'react';
import { productApi, PRODUCT_KIND } from '../api/stockApi';
import { formatRupiah } from '../api/orderApi';
import './Orders.css';
import './Stock.css';

const EMPTY = { name: '', price: '', cost: '', kind: 'produksi', sortOrder: '' };

const toNumber = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

/**
 * One product per line: "Nama; Harga; Jenis; Modal". Jenis and Modal are optional.
 * Jenis is "beli" / "beli jadi" / "konsinyasi" for bought-in goods, anything else is produksi.
 * Prices may be written as 5000, 5.000 or Rp 5.000.
 */
function parseImport(text) {
  const money = (s) => {
    const digits = String(s || '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : undefined;
  };
  const rows = [];
  const errors = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(/[;\t|]/).map((p) => p.trim());
    const [name, price, kind, cost] = parts;
    const priceNum = money(price);
    if (!name || priceNum === undefined) {
      errors.push(`Baris ${i + 1}: "${line}" — butuh minimal nama dan harga`);
      return;
    }
    rows.push({
      name,
      price: priceNum,
      kind: /beli|konsin/i.test(kind || '') ? 'beli_jadi' : 'produksi',
      cost: money(cost)
    });
  });
  return { rows, errors };
}

const ProductManager = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingId, setEditingId] = useState(null); // 'new' for the add row
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setProducts(await productApi.list(true));
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const startEdit = (p) => {
    setEditingId(p ? p.id : 'new');
    setForm(p
      ? { name: p.name, price: String(p.price), cost: p.cost !== undefined ? String(p.cost) : '', kind: p.kind, sortOrder: String(p.sortOrder) }
      : EMPTY);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      price: toNumber(form.price) ?? 0,
      cost: toNumber(form.cost),
      kind: form.kind,
      sortOrder: toNumber(form.sortOrder)
    };
    setSaving(true);
    try {
      if (editingId === 'new') await productApi.create(payload);
      else await productApi.update(editingId, payload);
      setEditingId(null);
      setMessage({ type: 'success', text: 'Produk tersimpan' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    if (p.isActive && !window.confirm(`Nonaktifkan ${p.name}? Produk tidak muncul lagi di kiriman dan tutup toko.`)) return;
    try {
      await productApi.update(p.id, { isActive: !p.isActive });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const preview = parseImport(importText);

  const runImport = async () => {
    if (preview.errors.length || preview.rows.length === 0) return;
    setSaving(true);
    try {
      await productApi.createBatch(preview.rows);
      setMessage({ type: 'success', text: `${preview.rows.length} produk berhasil diimport` });
      setImportText('');
      setShowImport(false);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const visible = products.filter((p) => showInactive || p.isActive);

  const renderForm = () => (
    <form className="stk-product-form" onSubmit={save}>
      <input placeholder="Nama produk" value={form.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
      <input type="number" inputMode="numeric" min="0" placeholder="Harga jual" value={form.price} onChange={(e) => set('price', e.target.value)} required />
      <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
        {Object.entries(PRODUCT_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <input type="number" inputMode="numeric" min="0" placeholder="Modal (opsional)" value={form.cost} onChange={(e) => set('cost', e.target.value)} />
      <input type="number" inputMode="numeric" placeholder="Urutan" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
      <div className="ord-actions">
        <button type="button" className="ord-btn ghost" onClick={() => setEditingId(null)} disabled={saving}>Batal</button>
        <button type="submit" className="ord-btn primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  );

  return (
    <div className="ord-container">
      <div className="ord-header">
        <h2>📦 Master Produk</h2>
        <div className="ord-actions" style={{ marginTop: 0 }}>
          <button className="ord-btn ghost" onClick={() => setShowImport(!showImport)}>📋 Tempel Daftar</button>
          <button className="ord-btn primary" onClick={() => startEdit(null)}>➕ Produk</button>
        </div>
      </div>
      <p className="ord-line muted">Barang jadi yang dijual di outlet. Harga jual sama untuk semua outlet.</p>

      {message.text && <div className={`ord-alert ${message.type === 'error' ? 'error' : 'success'}`}>{message.text}</div>}

      {showImport && (
        <div className="ord-panel inset">
          <h4>Tempel daftar produk</h4>
          <p className="ord-line muted small">
            Satu produk per baris: <code>Nama; Harga; Jenis; Modal</code>. Jenis dan modal boleh dikosongkan.
            Tulis "beli jadi" untuk barang yang dibeli dari supplier. Bisa juga copy langsung dari Excel.
          </p>
          <textarea
            className="stk-import"
            rows="8"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={'Risol Mayo; 5000\nRisol Ragout; 6000\nBolu Pandan; 10000; beli jadi; 7000'}
          />
          {preview.errors.map((err) => <div key={err} className="ord-line small" style={{ color: 'var(--danger)' }}>{err}</div>)}
          {preview.rows.length > 0 && preview.errors.length === 0 && (
            <div className="ord-line small">
              {preview.rows.length} produk siap diimport:{' '}
              {preview.rows.map((r) => `${r.name} (${formatRupiah(r.price)}${r.kind === 'beli_jadi' ? ', beli jadi' : ''})`).join(', ')}
            </div>
          )}
          <div className="ord-actions">
            <button className="ord-btn ghost" onClick={() => setShowImport(false)}>Batal</button>
            <button
              className="ord-btn primary"
              onClick={runImport}
              disabled={saving || preview.errors.length > 0 || preview.rows.length === 0}
            >
              Import {preview.rows.length || ''} Produk
            </button>
          </div>
        </div>
      )}

      {editingId === 'new' && <div className="ord-panel">{renderForm()}</div>}

      {loading ? (
        <div className="ord-empty">Memuat produk...</div>
      ) : visible.length === 0 ? (
        <div className="ord-empty">Belum ada produk. Klik "Tempel Daftar" untuk memasukkan banyak produk sekaligus.</div>
      ) : (
        <div className="stk-table-wrap">
          <table className="stk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Produk</th>
                <th>Jenis</th>
                <th className="num">Harga</th>
                <th className="num">Modal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                editingId === p.id ? (
                  <tr key={p.id}><td colSpan="6">{renderForm()}</td></tr>
                ) : (
                  <tr key={p.id} className={p.isActive ? '' : 'dim'}>
                    <td className="muted">{p.sortOrder}</td>
                    <td>{p.name}{!p.isActive && <span className="muted"> (nonaktif)</span>}</td>
                    <td>{PRODUCT_KIND[p.kind]}</td>
                    <td className="num">{formatRupiah(p.price)}</td>
                    <td className="num muted">{p.cost !== undefined ? formatRupiah(p.cost) : '-'}</td>
                    <td className="stk-row-actions">
                      <button className="ord-btn ghost small" onClick={() => startEdit(p)}>✏️</button>
                      <button className="ord-btn ghost small" onClick={() => toggleActive(p)}>
                        {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="ord-line muted small stk-check">
        <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Tampilkan produk nonaktif
      </label>
    </div>
  );
};

export default ProductManager;
