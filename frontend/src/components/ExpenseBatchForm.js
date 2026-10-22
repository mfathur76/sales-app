import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseBatchForm.css';

// How far back to look for "last shopping" and last-used prices
const LOOKBACK_DAYS = 60;
const MAX_ROWS = 100; // backend batch limit

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

const shiftDate = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
};

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(amount || 0);

const formatDateLabel = (dateStr) => new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
  weekday: 'short', day: 'numeric', month: 'short'
});

let rowSeq = 0;
const emptyRow = (isCash = true) => ({
  key: ++rowSeq,
  itemId: '',
  search: '',
  quantity: '',
  actualPrice: '',
  isCash,
  notes: ''
});

const isBlankRow = (row) => !row.itemId && !row.search && !row.quantity && !row.actualPrice && !row.notes;

// Always keep exactly one blank row at the end so the user can keep typing
const withTrailingBlank = (rows, isCash) => {
  const trimmed = [...rows];
  while (trimmed.length > 1 && isBlankRow(trimmed[trimmed.length - 1]) && isBlankRow(trimmed[trimmed.length - 2])) {
    trimmed.pop();
  }
  if (trimmed.length === 0 || !isBlankRow(trimmed[trimmed.length - 1])) {
    trimmed.push(emptyRow(isCash));
  }
  return trimmed;
};

const rowError = (row) => {
  if (isBlankRow(row)) return '';
  if (!row.itemId) return row.search ? 'Item tidak ditemukan, pilih dari daftar' : 'Pilih item';
  if (!(parseFloat(row.quantity) > 0)) return 'Qty harus > 0';
  if (!(parseFloat(row.actualPrice) > 0)) return 'Harga harus > 0';
  return '';
};

const draftKey = (outlet) => `expenseBatchDraft:${outlet}`;

const ItemPicker = ({ value, selected, items, categoryName, onSearchChange, onSelect, inputRef, invalid }) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const matches = useMemo(() => {
    const term = value.trim().toLowerCase();
    const list = term
      ? items.filter(item =>
          item.name.toLowerCase().includes(term) ||
          categoryName(item).toLowerCase().includes(term))
      : items;
    return list.slice(0, 30);
  }, [value, items, categoryName]);

  const choose = (item) => {
    onSelect(item, true);
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' || (e.key === 'Tab' && open && value.trim())) {
      if (open && matches[highlight]) {
        e.preventDefault();
        choose(matches[highlight]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleBlur = () => {
    // Accept an exact (case-insensitive) name match typed without using the list,
    // but leave focus wherever the user moved it
    if (!selected) {
      const exact = items.find(item => item.name.toLowerCase() === value.trim().toLowerCase());
      if (exact) onSelect(exact, false);
    }
    setOpen(false);
  };

  return (
    <div className="ebf-picker">
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Cari item..."
        className={invalid ? 'invalid' : ''}
        onChange={(e) => {
          onSearchChange(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="ebf-dropdown">
          {matches.map((item, idx) => (
            <li
              key={item.id}
              className={idx === highlight ? 'active' : ''}
              // mousedown fires before the input's blur, so the click is not lost
              onMouseDown={(e) => { e.preventDefault(); choose(item); }}
              onMouseEnter={() => setHighlight(idx)}
            >
              <span className="ebf-item-name">{item.name}</span>
              <span className="ebf-item-meta">{categoryName(item)} · {item.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ExpenseBatchForm = ({ user, onExpenseAdded }) => {
  const outlet = useMemo(() => {
    if (user?.outlet) return user.outlet;
    try {
      return JSON.parse(localStorage.getItem('userData') || '{}').outlet || '';
    } catch {
      return '';
    }
  }, [user]);

  const [date, setDate] = useState(todayLocal);
  const [defaultCash, setDefaultCash] = useState(true);
  const [rows, setRows] = useState(() => [emptyRow()]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const inputRefs = useRef({});
  const draftLoaded = useRef(false);

  // ---- Load master data and any unsaved draft ----
  useEffect(() => {
    Promise.all([expenseApi.getItems(), expenseApi.getCategories()])
      .then(([itemsData, categoriesData]) => {
        setItems([...(itemsData || [])].sort((a, b) => a.name.localeCompare(b.name)));
        setCategories(categoriesData || []);
      })
      .catch(() => setMessage({ type: 'error', text: 'Gagal memuat daftar item' }));

    if (outlet) {
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey(outlet)) || 'null');
        if (draft?.rows?.some(row => !isBlankRow(row))) {
          setDate(draft.date || todayLocal());
          setRows(withTrailingBlank(draft.rows.map(row => ({ ...row, key: ++rowSeq })), true));
          setMessage({ type: 'info', text: 'Draft yang belum disimpan dipulihkan.' });
        }
      } catch {
        // Storage unavailable or corrupt draft: start fresh
      }
    }
    draftLoaded.current = true;
  }, [outlet]);

  // ---- Persist draft so a refresh doesn't lose a half-typed page ----
  useEffect(() => {
    if (!outlet || !draftLoaded.current) return;
    try {
      if (rows.some(row => !isBlankRow(row))) {
        localStorage.setItem(draftKey(outlet), JSON.stringify({ date, rows }));
      } else {
        localStorage.removeItem(draftKey(outlet));
      }
    } catch {
      // Ignore storage errors; draft is a convenience only
    }
  }, [outlet, date, rows]);

  // ---- Expenses around the selected date: last shopping, last prices, duplicates ----
  const loadRecent = useCallback(async () => {
    if (!date) return;
    try {
      const data = await expenseApi.getExpenses({
        outlet,
        startDate: shiftDate(date, -LOOKBACK_DAYS),
        endDate: date
      });
      setRecentExpenses(Array.isArray(data) ? data : []);
    } catch {
      setRecentExpenses([]);
    }
  }, [outlet, date]);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const itemMap = useMemo(() => new Map(items.map(item => [item.id, item])), [items]);
  const categoryMap = useMemo(() => new Map(categories.map(cat => [cat.id, cat.name])), [categories]);
  const categoryName = useCallback(item => categoryMap.get(item.categoryId) || '', [categoryMap]);

  const sortedRecent = useMemo(() => [...recentExpenses].sort((a, b) =>
    b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || '')
  ), [recentExpenses]);

  const lastPriceByItem = useMemo(() => {
    const map = new Map();
    sortedRecent.forEach(exp => {
      if (!map.has(exp.itemId)) map.set(exp.itemId, exp.actualPrice);
    });
    return map;
  }, [sortedRecent]);

  // Shopping days before the selected date, newest first, that can be copied from
  const shoppingDays = useMemo(() => {
    const byDate = new Map();
    sortedRecent
      .filter(exp => exp.date < date)
      .forEach(exp => {
        if (!byDate.has(exp.date)) byDate.set(exp.date, []);
        byDate.get(exp.date).push(exp);
      });
    return Array.from(byDate, ([day, dayRows]) => ({
      date: day,
      rows: dayRows.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
      total: dayRows.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0)
    }));
  }, [sortedRecent, date]);

  const [copyDate, setCopyDate] = useState('');
  useEffect(() => { setCopyDate(''); }, [date]);
  const copySource = shoppingDays.find(day => day.date === copyDate) || shoppingDays[0] || null;

  const existingOnDate = useMemo(
    () => recentExpenses.filter(exp => exp.date === date),
    [recentExpenses, date]
  );

  // ---- Row editing ----
  const updateRow = (key, changes) => {
    setRows(prev => withTrailingBlank(
      prev.map(row => (row.key === key ? { ...row, ...changes } : row)),
      defaultCash
    ));
  };

  const removeRow = (key) => {
    setRows(prev => withTrailingBlank(prev.filter(row => row.key !== key), defaultCash));
  };

  const focusField = (key, field) => {
    setTimeout(() => inputRefs.current[`${key}-${field}`]?.focus(), 0);
  };

  const focusNextRowItem = (key) => {
    const idx = rows.findIndex(row => row.key === key);
    const next = rows[idx + 1];
    if (next) focusField(next.key, 'item');
  };

  const handleSelectItem = (row, item, moveFocus) => {
    const suggestedPrice = lastPriceByItem.get(item.id) ?? item.standardPrice ?? '';
    updateRow(row.key, {
      itemId: item.id,
      search: item.name,
      actualPrice: row.actualPrice || (suggestedPrice ? String(suggestedPrice) : '')
    });
    if (moveFocus) focusField(row.key, 'quantity');
  };

  const handleCopy = () => {
    if (!copySource) return;
    const hasData = rows.some(row => !isBlankRow(row));
    if (hasData && !window.confirm(`Isi tabel saat ini akan diganti dengan belanja ${formatDateLabel(copySource.date)}. Lanjutkan?`)) {
      return;
    }
    const copied = copySource.rows.map(exp => ({
      ...emptyRow(exp.isCash !== false),
      itemId: exp.itemId,
      search: itemMap.get(exp.itemId)?.name || '',
      quantity: String(exp.quantity),
      actualPrice: String(exp.actualPrice)
    }));
    setRows(withTrailingBlank(copied, defaultCash));
    setShowErrors(false);
    setMessage({
      type: 'info',
      text: `${copied.length} item disalin dari ${formatDateLabel(copySource.date)}. Ubah qty/harga yang berbeda, hapus yang tidak dibeli.`
    });
  };

  const handleDefaultCashChange = (value) => {
    setDefaultCash(value);
    // Apply to rows the user hasn't filled yet, so new lines follow the toggle
    setRows(prev => prev.map(row => (isBlankRow(row) ? { ...row, isCash: value } : row)));
  };

  const handleClear = () => {
    if (!window.confirm('Kosongkan semua baris?')) return;
    setRows([emptyRow(defaultCash)]);
    setShowErrors(false);
    setMessage({ type: '', text: '' });
  };

  // ---- Totals ----
  const filledRows = rows.filter(row => !isBlankRow(row));
  const errors = filledRows.map(rowError).filter(Boolean);
  const rowTotal = (row) => (parseFloat(row.quantity) || 0) * (parseFloat(row.actualPrice) || 0);
  const grandTotal = filledRows.reduce((sum, row) => sum + rowTotal(row), 0);
  const cashTotal = filledRows.filter(row => row.isCash).reduce((sum, row) => sum + rowTotal(row), 0);
  const existingTotal = existingOnDate.reduce((sum, exp) => sum + (exp.totalPrice || 0), 0);

  // ---- Save ----
  const handleSave = async () => {
    setMessage({ type: '', text: '' });
    if (!outlet) {
      setMessage({ type: 'error', text: 'Informasi outlet tidak ditemukan. Silakan login ulang.' });
      return;
    }
    if (filledRows.length === 0) {
      setMessage({ type: 'error', text: 'Belum ada baris yang diisi.' });
      return;
    }
    if (errors.length > 0) {
      setShowErrors(true);
      setMessage({ type: 'error', text: `Ada ${errors.length} baris yang belum lengkap (ditandai merah).` });
      return;
    }
    if (filledRows.length > MAX_ROWS) {
      setMessage({ type: 'error', text: `Maksimal ${MAX_ROWS} baris sekali simpan.` });
      return;
    }

    setSaving(true);
    try {
      await expenseApi.createExpensesBatch({
        outlet,
        date,
        items: filledRows.map(row => ({
          itemId: row.itemId,
          quantity: parseFloat(row.quantity),
          actualPrice: parseFloat(row.actualPrice),
          isCash: !!row.isCash,
          notes: row.notes.trim() || undefined
        }))
      });

      setMessage({
        type: 'success',
        text: `✅ ${filledRows.length} pengeluaran tersimpan untuk ${formatDateLabel(date)} (total ${formatCurrency(grandTotal)}).`
      });
      setRows([emptyRow(defaultCash)]);
      setShowErrors(false);
      loadRecent();
      if (onExpenseAdded) onExpenseAdded();
    } catch (error) {
      setMessage({ type: 'error', text: `Gagal menyimpan, tidak ada data yang tersimpan: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expense-batch-form">
      <div className="ebf-toolbar">
        <label className="ebf-field">
          <span>Tanggal</span>
          <input type="date" value={date} max={todayLocal()} onChange={(e) => setDate(e.target.value)} />
        </label>

        <div className="ebf-field">
          <span>Pembayaran baris baru</span>
          <div className="ebf-toggle">
            <button type="button" className={defaultCash ? 'active' : ''} onClick={() => handleDefaultCashChange(true)}>
              Cash
            </button>
            <button type="button" className={!defaultCash ? 'active' : ''} onClick={() => handleDefaultCashChange(false)}>
              Non-cash
            </button>
          </div>
        </div>

        <div className="ebf-toolbar-actions ebf-field">
          <span>Salin belanja dari</span>
          <div className="ebf-copy">
            <select
              value={copySource ? copySource.date : ''}
              onChange={(e) => setCopyDate(e.target.value)}
              disabled={shoppingDays.length === 0}
            >
              {shoppingDays.length === 0 && (
                <option value="">Tidak ada belanja {LOOKBACK_DAYS} hari terakhir</option>
              )}
              {shoppingDays.map((day, idx) => (
                <option key={day.date} value={day.date}>
                  {formatDateLabel(day.date)} · {day.rows.length} item · {formatCurrency(day.total)}
                  {idx === 0 ? ' (terakhir)' : ''}
                </option>
              ))}
            </select>
            <button type="button" className="ebf-btn secondary" onClick={handleCopy} disabled={!copySource}>
              📋 Salin
            </button>
          </div>
        </div>
      </div>

      {existingOnDate.length > 0 && (
        <div className="ebf-notice">
          ℹ️ Sudah ada <strong>{existingOnDate.length}</strong> pengeluaran tercatat pada tanggal ini
          (total {formatCurrency(existingTotal)}). Pastikan tidak mencatat dua kali.
        </div>
      )}

      {message.text && <div className={`ebf-message ${message.type}`}>{message.text}</div>}

      <div className="ebf-grid">
        <div className="ebf-row ebf-head">
          <span>#</span>
          <span>Item</span>
          <span>Qty</span>
          <span>Harga satuan</span>
          <span>Total</span>
          <span>Cash</span>
          <span>Catatan</span>
          <span />
        </div>

        {rows.map((row, idx) => {
          const item = itemMap.get(row.itemId);
          const error = showErrors ? rowError(row) : '';
          const blank = isBlankRow(row);
          return (
            <div key={row.key} className={`ebf-row ${error ? 'has-error' : ''} ${blank ? 'blank' : ''}`}>
              <span className="ebf-num">{idx + 1}</span>

              <div className="ebf-cell-item">
                <ItemPicker
                  value={row.search}
                  selected={!!row.itemId}
                  items={items}
                  categoryName={categoryName}
                  inputRef={(el) => { inputRefs.current[`${row.key}-item`] = el; }}
                  invalid={!!error && !row.itemId}
                  onSearchChange={(text) => updateRow(row.key, {
                    search: text,
                    itemId: item && item.name === text ? row.itemId : ''
                  })}
                  onSelect={(selected, moveFocus) => handleSelectItem(row, selected, moveFocus)}
                />
                {error && <small className="ebf-error">{error}</small>}
              </div>

              <div className="ebf-cell-qty">
                <input
                  ref={(el) => { inputRefs.current[`${row.key}-quantity`] = el; }}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  placeholder={item ? item.unit : 'Qty'}
                  value={row.quantity}
                  onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') focusField(row.key, 'price'); }}
                />
                {item && <span className="ebf-unit">{item.unit}</span>}
              </div>

              <div className="ebf-cell-price">
                <input
                  ref={(el) => { inputRefs.current[`${row.key}-price`] = el; }}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="Harga"
                  value={row.actualPrice}
                  onChange={(e) => updateRow(row.key, { actualPrice: e.target.value })}
                  onKeyDown={(e) => { if (e.key === 'Enter') focusNextRowItem(row.key); }}
                />
              </div>

              <span className="ebf-cell-total">{blank ? '' : formatCurrency(rowTotal(row))}</span>

              <label className="ebf-cell-cash" title="Dibayar cash?">
                <input
                  type="checkbox"
                  checked={!!row.isCash}
                  onChange={(e) => updateRow(row.key, { isCash: e.target.checked })}
                />
                <span className="ebf-cash-label">Cash</span>
              </label>

              <input
                className="ebf-cell-notes"
                type="text"
                placeholder="Catatan"
                value={row.notes}
                onChange={(e) => updateRow(row.key, { notes: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') focusNextRowItem(row.key); }}
              />

              <button
                type="button"
                className="ebf-remove"
                onClick={() => removeRow(row.key)}
                disabled={blank}
                title="Hapus baris"
                aria-label="Hapus baris"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className="ebf-footer">
        <div className="ebf-summary">
          <div><span>Jumlah baris</span><strong>{filledRows.length}</strong></div>
          <div><span>Cash</span><strong>{formatCurrency(cashTotal)}</strong></div>
          <div><span>Non-cash</span><strong>{formatCurrency(grandTotal - cashTotal)}</strong></div>
          <div className="ebf-grand"><span>Total</span><strong>{formatCurrency(grandTotal)}</strong></div>
        </div>
        <div className="ebf-footer-actions">
          <button type="button" className="ebf-btn ghost" onClick={handleClear} disabled={saving || filledRows.length === 0}>
            Kosongkan
          </button>
          <button type="button" className="ebf-btn primary" onClick={handleSave} disabled={saving || filledRows.length === 0}>
            {saving ? 'Menyimpan...' : `Simpan ${filledRows.length || ''} pengeluaran`}
          </button>
        </div>
      </div>

      <p className="ebf-hint">
        Tips: ketik nama item → <kbd>Enter</kbd> → isi qty → <kbd>Enter</kbd> → isi harga → <kbd>Enter</kbd> untuk baris berikutnya.
        Harga terisi otomatis dari harga terakhir yang dipakai.
      </p>
    </div>
  );
};

export default ExpenseBatchForm;
