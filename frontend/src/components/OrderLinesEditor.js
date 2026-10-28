import React, { useState } from 'react';
import { groupByCategory } from '../api/stockApi';
import { formatRupiah } from '../api/orderApi';
import QtyInput from './QtyInput';
import './Orders.css';
import './Stock.css';

let nextKey = 1;
const withKey = (line) => ({ ...line, key: nextKey++ });

export const linesTotal = (lines) => lines.reduce((s, l) => s + (l.qty || 0) * (Number(l.price) || 0), 0);

/**
 * Pick order lines from the product list (price defaults to the selling price and can be changed),
 * or add a free-text item with its own price. `lines` is [{ key, productId?, name, qty, price }].
 */
const OrderLinesEditor = ({ products, lines, onChange }) => {
  const [search, setSearch] = useState('');
  const [browsing, setBrowsing] = useState(lines.length === 0);

  const update = (key, patch) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key) => onChange(lines.filter((l) => l.key !== key));

  const add = (p) => {
    const existing = lines.find((l) => l.productId === p.id);
    if (existing) update(existing.key, { qty: existing.qty + 1 });
    else onChange([...lines, withKey({ productId: p.id, name: p.name, qty: 1, price: p.price })]);
  };

  const addCustom = () => onChange([...lines, withKey({ name: '', qty: 1, price: '' })]);

  const term = search.trim().toLowerCase();
  const matches = term
    ? products.filter((p) => p.name.toLowerCase().includes(term) || (p.category || '').toLowerCase().includes(term))
    : products;
  const picked = new Map(lines.filter((l) => l.productId).map((l) => [l.productId, l.qty]));

  return (
    <div className="ord-field">
      <span>Yang diorder *</span>

      {lines.length > 0 && (
        <div className="stk-lines">
          {lines.map((l) => (
            <div key={l.key} className="stk-line filled ord-line-item">
              <div className="ord-line-main">
                {l.productId ? (
                  <span className="stk-line-name">{l.name}</span>
                ) : (
                  <input
                    className="ord-line-name"
                    value={l.name}
                    onChange={(e) => update(l.key, { name: e.target.value })}
                    placeholder="Nama barang"
                  />
                )}
                <span className="stk-price">
                  @{' '}
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={l.price}
                    placeholder="harga"
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => update(l.key, { price: e.target.value === '' ? '' : Number(e.target.value) })}
                  />
                </span>
                <span className="muted small">= {formatRupiah(l.qty * (Number(l.price) || 0))}</span>
              </div>
              <div className="ord-line-qty">
                <QtyInput value={l.qty} steps={[5, 10]} onChange={(n) => (n === 0 ? remove(l.key) : update(l.key, { qty: n }))} />
                <button type="button" className="ord-btn ghost small" onClick={() => remove(l.key)} aria-label="Hapus">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ord-actions" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
        <button type="button" className="ord-btn ghost small" onClick={() => setBrowsing(!browsing)}>
          {browsing ? 'Tutup daftar produk' : '➕ Tambah produk'}
        </button>
        <button type="button" className="ord-btn ghost small" onClick={addCustom}>➕ Barang lain</button>
      </div>

      {browsing && (
        <div className="ord-panel inset">
          <input
            className="ord-search"
            type="search"
            placeholder="🔍 Cari produk atau kategori"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="stk-lines ord-product-browser">
            {groupByCategory(matches).map((g) => (
              <React.Fragment key={g.category}>
                <div className="stk-line-group">{g.category}</div>
                {g.items.map((p) => (
                  <button type="button" key={p.id} className={`stk-line ord-product-pick ${picked.has(p.id) ? 'filled' : ''}`} onClick={() => add(p)}>
                    <span className="stk-line-name">{p.name}</span>
                    <span className="muted small">{formatRupiah(p.price)}</span>
                    <span className="ord-pick-qty">{picked.has(p.id) ? `×${picked.get(p.id)}` : '+'}</span>
                  </button>
                ))}
              </React.Fragment>
            ))}
            {matches.length === 0 && <div className="ord-line muted" style={{ padding: 10 }}>Produk tidak ditemukan.</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export const toEditorLines = (lines) => (lines || []).map(withKey);

export default OrderLinesEditor;
