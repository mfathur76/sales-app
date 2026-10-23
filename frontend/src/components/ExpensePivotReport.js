import React, { useState, useEffect, useMemo } from 'react';
import { expenseApi } from '../api/expenseApi';
import { authApi } from '../api/salesApi';
import './ExpensePivotReport.css';

const currentMonth = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 7);
};

const daysOfMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
};

const formatNumber = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(n || 0);
const formatCurrency = (n) => `Rp ${formatNumber(Math.round(n || 0))}`;
const weekdayShort = (date) => new Date(`${date}T00:00:00`).toLocaleDateString('id-ID', { weekday: 'short' });
const isWeekend = (date) => [0, 6].includes(new Date(`${date}T00:00:00`).getDay());

const sumValues = (byDate) => Object.values(byDate).reduce((s, v) => s + v, 0);

/** Groups expenses into categories → items → { date: { amount, qty, lines } }. */
function buildPivot(expenses, items, categories) {
  const itemById = new Map(items.map((i) => [i.id, i]));
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const groups = new Map();

  for (const e of expenses) {
    if (e.status === 'rejected') continue;
    const item = itemById.get(e.itemId);
    const categoryId = item?.categoryId || 'uncategorized';
    const group = groups.get(categoryId) || {
      id: categoryId,
      name: categoryName.get(categoryId) || 'Tanpa Kategori',
      rows: new Map(),
    };
    const row = group.rows.get(e.itemId) || {
      id: e.itemId,
      name: item?.name || 'Item tidak dikenal',
      unit: item?.unit || '',
      cells: {},
    };
    const cell = row.cells[e.date] || { amount: 0, qty: 0, lines: [] };
    cell.amount += Number(e.totalPrice || 0);
    cell.qty += Number(e.quantity || 0);
    cell.lines.push(e);
    row.cells[e.date] = cell;
    group.rows.set(e.itemId, row);
    groups.set(categoryId, group);
  }

  const rowTotal = (row) => sumValues(Object.fromEntries(Object.entries(row.cells).map(([d, c]) => [d, c.amount])));
  return Array.from(groups.values())
    .map((g) => {
      const rows = Array.from(g.rows.values()).sort((a, b) => rowTotal(b) - rowTotal(a));
      return { ...g, rows, total: rows.reduce((s, r) => s + rowTotal(r), 0) };
    })
    .sort((a, b) => b.total - a.total);
}

const ExpensePivotReport = () => {
  const [month, setMonth] = useState(currentMonth);
  const [outlet, setOutlet] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [mode, setMode] = useState('amount'); // 'amount' | 'qty'
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [data, setData] = useState({ expenses: [], items: [], categories: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi.getOutlets()
      .then((res) => { if (res.success && res.data) setOutlets(res.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!month) return;
    const days = daysOfMonth(month);
    let cancelled = false;
    setLoading(true);
    setError('');
    Promise.all([
      expenseApi.getExpenses({ startDate: days[0], endDate: days[days.length - 1], outlet }),
      expenseApi.getItems(),
      expenseApi.getCategories(),
    ])
      .then(([expenses, items, categories]) => {
        if (!cancelled) setData({ expenses: expenses || [], items: items || [], categories: categories || [] });
      })
      .catch((err) => { if (!cancelled) setError(err.message || 'Gagal memuat pengeluaran'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [month, outlet]);

  const days = useMemo(() => (month ? daysOfMonth(month) : []), [month]);
  const pivot = useMemo(() => buildPivot(data.expenses, data.items, data.categories), [data]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pivot;
    return pivot
      .map((g) => ({ ...g, rows: g.rows.filter((r) => r.name.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)) }))
      .filter((g) => g.rows.length > 0);
  }, [pivot, search]);

  const isAmount = mode === 'amount';
  const pick = (cell) => (cell ? (isAmount ? cell.amount : cell.qty) : 0);
  const show = (v) => (v ? formatNumber(v) : '');

  const dayTotals = days.map((d) => visible.reduce((s, g) => s + g.rows.reduce((t, r) => t + (r.cells[d]?.amount || 0), 0), 0));
  const grandTotal = dayTotals.reduce((s, v) => s + v, 0);
  const itemCount = visible.reduce((s, g) => s + g.rows.length, 0);

  const cellTitle = (row, date) => {
    const cell = row.cells[date];
    if (!cell) return undefined;
    return cell.lines
      .map((e) => `${e.outlet}: ${formatNumber(e.quantity)} ${row.unit} × ${formatCurrency(e.actualPrice)} = ${formatCurrency(e.totalPrice)}${e.notes ? ` (${e.notes})` : ''}`)
      .join('\n');
  };

  const exportCsv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const header = ['Kategori', 'Item', 'Satuan', ...days.map((d) => d.slice(8)), 'Total'];
    const lines = [header.map(esc).join(';')];
    visible.forEach((g) => g.rows.forEach((r) => {
      const values = days.map((d) => pick(r.cells[d]));
      lines.push([esc(g.name), esc(r.name), esc(r.unit), ...values, values.reduce((s, v) => s + v, 0)].join(';'));
    }));
    if (isAmount) lines.push([esc('TOTAL'), '', '', ...dayTotals, grandTotal].join(';'));
    const blob = new Blob([`﻿${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pivot-pengeluaran-${month}${outlet ? `-${outlet}` : ''}-${isAmount ? 'rupiah' : 'qty'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggle = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const allCollapsed = visible.length > 0 && visible.every((g) => collapsed[g.id]);
  const setAll = (value) => setCollapsed(Object.fromEntries(pivot.map((g) => [g.id, value])));

  return (
    <div className="expense-pivot-report">
      <div className="ep-header">
        <h2>Pivot Pengeluaran</h2>
        <p>Baris = item, kolom = tanggal. Arahkan kursor ke angka untuk melihat rinciannya.</p>
      </div>

      <div className="ep-controls">
        <label className="ep-field">
          Bulan
          <input type="month" value={month} max={currentMonth()} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <label className="ep-field">
          Outlet
          <select value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            <option value="">Semua outlet</option>
            {outlets.map((o) => (
              <option key={o.code} value={o.code}>{o.code} – {o.name}</option>
            ))}
          </select>
        </label>
        <div className="ep-field">
          Tampilkan
          <div className="ep-toggle">
            <button type="button" className={isAmount ? 'active' : ''} onClick={() => setMode('amount')}>Rupiah</button>
            <button type="button" className={!isAmount ? 'active' : ''} onClick={() => setMode('qty')}>Jumlah</button>
          </div>
        </div>
        <label className="ep-field ep-search">
          Cari item / kategori
          <input type="search" value={search} placeholder="mis. bawang" onChange={(e) => setSearch(e.target.value)} />
        </label>
        <div className="ep-actions">
          <button type="button" onClick={() => setAll(!allCollapsed)} disabled={!visible.length}>
            {allCollapsed ? 'Buka semua' : 'Ringkas per kategori'}
          </button>
          <button type="button" onClick={exportCsv} disabled={!visible.length}>⬇️ Excel (CSV)</button>
        </div>
      </div>

      {error && <div className="ep-message error">{error}</div>}
      {loading && <div className="ep-message">Memuat pengeluaran…</div>}
      {!loading && !error && visible.length === 0 && (
        <div className="ep-message">Tidak ada pengeluaran untuk bulan dan outlet ini.</div>
      )}

      {!loading && visible.length > 0 && (
        <>
          <div className="ep-summary">
            <span><strong>{formatCurrency(grandTotal)}</strong> total</span>
            <span><strong>{itemCount}</strong> item</span>
            <span><strong>{dayTotals.filter(Boolean).length}</strong> hari ada pengeluaran</span>
          </div>

          <div className="ep-table-wrap">
            <table className="ep-table">
              <thead>
                <tr>
                  <th scope="col" className="ep-name">Item</th>
                  {days.map((d) => (
                    <th scope="col" key={d} className={isWeekend(d) ? 'weekend' : ''}>
                      {Number(d.slice(8))}
                      <small>{weekdayShort(d)}</small>
                    </th>
                  ))}
                  <th scope="col" className="ep-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((g) => {
                  const groupDay = days.map((d) => g.rows.reduce((s, r) => s + (r.cells[d]?.amount || 0), 0));
                  return (
                    <React.Fragment key={g.id}>
                      <tr className="ep-group" onClick={() => toggle(g.id)}>
                        <th scope="row" className="ep-name">
                          <span className="ep-caret">{collapsed[g.id] ? '▸' : '▾'}</span>
                          {g.name} <small>({g.rows.length})</small>
                        </th>
                        {groupDay.map((v, i) => (
                          <td key={days[i]} className={isWeekend(days[i]) ? 'weekend' : ''}>{isAmount ? show(v) : ''}</td>
                        ))}
                        <td className="ep-total">{formatNumber(groupDay.reduce((s, v) => s + v, 0))}</td>
                      </tr>
                      {!collapsed[g.id] && g.rows.map((r) => {
                        const values = days.map((d) => pick(r.cells[d]));
                        return (
                          <tr key={r.id} className="ep-item">
                            <th scope="row" className="ep-name">
                              {r.name}
                              {!isAmount && r.unit && <small> ({r.unit})</small>}
                            </th>
                            {values.map((v, i) => (
                              <td key={days[i]} className={isWeekend(days[i]) ? 'weekend' : ''} title={cellTitle(r, days[i])}>
                                {show(v)}
                              </td>
                            ))}
                            <td className="ep-total">{formatNumber(values.reduce((s, v) => s + v, 0))}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="ep-name">Total per hari (Rp)</th>
                  {dayTotals.map((v, i) => (
                    <td key={days[i]} className={isWeekend(days[i]) ? 'weekend' : ''}>{show(v)}</td>
                  ))}
                  <td className="ep-total">{formatNumber(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpensePivotReport;
