import React, { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '../api/salesApi';
import { formatRupiah } from '../api/orderApi';
import './SalesVerificationGrid.css';

/**
 * Bank amounts typed (or pasted) per channel. QRIS usually arrives together with GoFood, so the
 * GoFood column is compared with QRIS + GoFood unless a separate QRIS amount is entered.
 */
const COLUMNS = [
  { key: 'gojekBank', label: 'GoFood (+QRIS)' },
  { key: 'qrisBank', label: 'QRIS terpisah' },
  { key: 'shopeeBank', label: 'Shopee' },
  { key: 'grabBank', label: 'Grab' },
  { key: 'bcaBank', label: 'BCA' },
  { key: 'mandiriBank', label: 'Mandiri' },
];
const FIELDS = COLUMNS.map((c) => c.key);

/** "Rp 1.234.567", "1,234,567.00", "1234567" → 1234567. Empty → ''. */
export function parseAmount(text) {
  let s = String(text ?? '').replace(/rp/i, '').replace(/\s/g, '');
  if (!s) return '';
  // A trailing ,dd or .dd is cents
  s = s.replace(/[.,]\d{1,2}$/, '');
  const digits = s.replace(/[^\d-]/g, '');
  return digits === '' || digits === '-' ? '' : Math.abs(parseInt(digits, 10));
}

/** While typing, the field shows 15.000-style grouping, so every non-digit is just formatting. */
const typedAmount = (text) => {
  const digits = String(text ?? '').replace(/\D/g, '');
  return digits === '' ? '' : parseInt(digits, 10);
};

const rowKey = (s) => `${s.outlet}|${s.date}`;

const fromSale = (s) => ({
  ...Object.fromEntries(FIELDS.map((f) => [f, s[f] ? s[f] : ''])),
  notes: s.notes || '',
});

/** What the bank should have paid for a column, from the cashier's figures. */
function expected(sale, row, key) {
  switch (key) {
    case 'gojekBank': return sale.gojek + (row.qrisBank === '' ? sale.qris : 0);
    case 'qrisBank': return row.qrisBank === '' ? 0 : sale.qris;
    case 'shopeeBank': return sale.shopee;
    case 'grabBank': return sale.grab;
    default: return 0;
  }
}

function pctClass(pct) {
  if (pct === null) return '';
  if (pct > 100.5) return 'svg-over';
  if (pct < 70) return 'svg-low';
  return 'svg-ok';
}

const SalesVerificationGrid = ({ sales, outletName = (c) => c, onSaved }) => {
  const sorted = [...sales].sort((a, b) => a.date.localeCompare(b.date) || a.outlet.localeCompare(b.outlet));
  const [rows, setRows] = useState(() => Object.fromEntries(sales.map((s) => [rowKey(s), fromSale(s)])));
  const [dirty, setDirty] = useState(() => new Set());
  const [status, setStatus] = useState({}); // rowKey -> 'saving' | 'saved' | error message
  const [saving, setSaving] = useState(false);
  const inputs = useRef({});

  const setCell = (key, field, value) => {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setDirty((prev) => new Set(prev).add(key));
    setStatus((prev) => ({ ...prev, [key]: undefined }));
  };

  const focus = (rowIndex, field) => {
    const s = sorted[rowIndex];
    if (s) inputs.current[`${rowKey(s)}|${field}`]?.focus();
  };

  // Enter moves down the column, the way bank statements are usually read
  const onKeyDown = (e, rowIndex, field) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      focus(rowIndex + (e.shiftKey ? -1 : 1), field);
    }
  };

  // Pasting several lines fills this column downwards
  const onPaste = (e, rowIndex, field) => {
    const text = e.clipboardData.getData('text');
    const values = text.split(/\r?\n/).filter((v, i, all) => v.trim() !== '' || i < all.length - 1);
    if (values.length < 2) return;
    e.preventDefault();
    values.forEach((v, i) => {
      const s = sorted[rowIndex + i];
      if (s) setCell(rowKey(s), field, field === 'notes' ? v.trim() : parseAmount(v));
    });
    focus(Math.min(rowIndex + values.length, sorted.length - 1), field);
  };

  const saveAll = useCallback(async () => {
    if (dirty.size === 0 || saving) return;
    setSaving(true);
    const keys = [...dirty];
    const byKey = new Map(sales.map((s) => [rowKey(s), s]));
    const saveRow = async (key) => {
      const sale = byKey.get(key);
      const row = rows[key];
      setStatus((prev) => ({ ...prev, [key]: 'saving' }));
      try {
        await adminApi.updateBankTransfer(sale.outlet, sale.date, {
          ...Object.fromEntries(FIELDS.map((f) => [f, Number(row[f]) || 0])),
          notes: row.notes,
        });
        setStatus((prev) => ({ ...prev, [key]: 'saved' }));
        setDirty((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        return true;
      } catch (err) {
        setStatus((prev) => ({ ...prev, [key]: err.message || 'Gagal' }));
        return false;
      }
    };
    // A few at a time so a long list does not flood the API
    const results = [];
    for (let i = 0; i < keys.length; i += 4) {
      results.push(...(await Promise.all(keys.slice(i, i + 4).map(saveRow))));
    }
    setSaving(false);
    // Reload only when everything went through, so failed rows keep what was typed
    if (results.every(Boolean)) onSaved?.();
  }, [dirty, rows, sales, saving, onSaved]);

  // Ctrl+S / Cmd+S saves everything
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveAll]);

  if (sales.length === 0) return <div className="no-data">Tidak ada data sales di filter ini</div>;

  const doneCount = sales.filter((s) => s.totalBank > 0).length;

  return (
    <div className="svg-wrap">
      <div className="svg-bar">
        <span>
          {sales.length} baris · {doneCount} sudah ada data bank
          {dirty.size > 0 && <> · <strong>{dirty.size} belum disimpan</strong></>}
        </span>
        <button className="svg-save" onClick={saveAll} disabled={saving || dirty.size === 0}>
          {saving ? 'Menyimpan...' : `💾 Simpan semua${dirty.size ? ` (${dirty.size})` : ''}`}
        </button>
      </div>
      <p className="svg-help">
        Enter = turun ke baris berikutnya, Tab = kolom berikutnya, Ctrl+S = simpan. Tempel beberapa angka dari Excel/mutasi
        sekaligus di satu sel untuk mengisi ke bawah. Angka kecil di bawah sel = nilai dari kasir dan % yang masuk.
      </p>

      <div className="svg-scroll">
        <table className="svg-table">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Outlet</th>
              <th className="num">Total kasir</th>
              {COLUMNS.map((c) => <th key={c.key} className="num">{c.label}</th>)}
              <th>Catatan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, rowIndex) => {
              const key = rowKey(s);
              const row = rows[key] || fromSale(s);
              const st = status[key];
              const transfer = s.transfer || 0;
              const bankTransfer = (Number(row.bcaBank) || 0) + (Number(row.mandiriBank) || 0);
              return (
                <tr key={key} className={dirty.has(key) ? 'svg-dirty' : ''}>
                  <td className="svg-nowrap">{s.date.slice(8, 10)}/{s.date.slice(5, 7)}</td>
                  <td className="svg-nowrap" title={outletName(s.outlet)}>{s.outlet}</td>
                  <td className="num svg-muted">{formatRupiah(s.totalSales)}</td>
                  {COLUMNS.map((c) => {
                    const exp = expected(s, row, c.key);
                    const val = Number(row[c.key]) || 0;
                    let hint = null;
                    if (c.key === 'bcaBank' || c.key === 'mandiriBank') {
                      if (c.key === 'bcaBank' && transfer > 0) {
                        const pct = (bankTransfer / transfer) * 100;
                        hint = <span className={pctClass(row.bcaBank === '' && row.mandiriBank === '' ? null : pct)}>tf {formatRupiah(transfer)}{bankTransfer ? ` · ${pct.toFixed(0)}%` : ''}</span>;
                      }
                    } else if (exp > 0) {
                      const pct = row[c.key] === '' ? null : (val / exp) * 100;
                      hint = <span className={pctClass(pct)}>{formatRupiah(exp)}{pct !== null ? ` · ${pct.toFixed(0)}%` : ''}</span>;
                    }
                    return (
                      <td key={c.key} className="num">
                        <input
                          ref={(el) => { inputs.current[`${key}|${c.key}`] = el; }}
                          inputMode="numeric"
                          value={row[c.key] === '' ? '' : Number(row[c.key]).toLocaleString('id-ID')}
                          onChange={(e) => setCell(key, c.key, typedAmount(e.target.value))}
                          onKeyDown={(e) => onKeyDown(e, rowIndex, c.key)}
                          onPaste={(e) => onPaste(e, rowIndex, c.key)}
                          onFocus={(e) => e.target.select()}
                        />
                        <div className="svg-hint">{hint}</div>
                      </td>
                    );
                  })}
                  <td>
                    <input
                      className="svg-notes"
                      ref={(el) => { inputs.current[`${key}|notes`] = el; }}
                      value={row.notes}
                      onChange={(e) => setCell(key, 'notes', e.target.value)}
                      onKeyDown={(e) => onKeyDown(e, rowIndex, 'notes')}
                      onPaste={(e) => onPaste(e, rowIndex, 'notes')}
                    />
                  </td>
                  <td className="svg-nowrap svg-status">
                    {st === 'saving' && '⏳'}
                    {st === 'saved' && '✅'}
                    {st && st !== 'saving' && st !== 'saved' && <span className="svg-low" title={st}>⚠️ gagal</span>}
                    {!st && dirty.has(key) && '●'}
                    {!st && !dirty.has(key) && s.totalBank > 0 && <span className="svg-muted">✓</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesVerificationGrid;
