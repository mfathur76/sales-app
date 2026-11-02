import React, { useState } from 'react';
import { expenseApi } from '../api/expenseApi';

const SUGGESTIONS = ['Sewa', 'THR', 'BPJS', 'Penyusutan Alat', 'Pajak'];

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(amount || 0);

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

let nextKey = 1;
const withKey = (c) => ({ ...c, key: nextKey++, amount: String(c.amount ?? ''), endMonth: c.endMonth || '' });
const perMonth = (c) => (Number(c.amount) || 0) / (c.period === 'tahun' ? 12 : 1);

/**
 * Costs paid yearly or outside the app (rent, THR, ...). The profit & loss charges each month its
 * share, so the month the rent is paid does not look like a loss and the others too good.
 */
const FixedCostsEditor = ({ costs, onSaved, onClose }) => {
  const [rows, setRows] = useState(() => costs.map(withKey));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, patch) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => setRows((prev) => prev.filter((r) => r.key !== key));
  const add = () => setRows((prev) => [...prev, withKey({ category: '', name: '', amount: '', period: 'tahun', startMonth: thisMonth() })]);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await expenseApi.saveFixedCosts(rows.map(({ key, ...r }) => ({
        ...r, amount: Number(r.amount) || 0, endMonth: r.endMonth || undefined
      })));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const monthly = rows.filter((r) => !r.endMonth || r.endMonth >= thisMonth()).reduce((s, r) => s + perMonth(r), 0);

  return (
    <div className="pl-fixed">
      <h3>⚙️ Biaya Tetap</h3>
      <p className="pl-fixed-help">
        Biaya yang dibayar tahunan atau di luar aplikasi, seperti sewa dan THR. Setiap bulan otomatis dibebankan bagiannya
        (per tahun ÷ 12) sebagai biaya operasional. Jangan input lagi pembayarannya di Pengeluaran, supaya tidak dihitung dua kali.
      </p>
      <datalist id="fixed-cost-kinds">
        {SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>
      <div className="pl-table-wrap">
        <table className="pl-table pl-fixed-table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>Keterangan</th>
              <th>Jumlah</th>
              <th>Per</th>
              <th>Mulai</th>
              <th>Sampai</th>
              <th>Per bulan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan="8">Belum ada biaya tetap.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.key}>
                <td><input list="fixed-cost-kinds" value={r.category} placeholder="Sewa" onChange={(e) => update(r.key, { category: e.target.value })} /></td>
                <td><input value={r.name || ''} placeholder="RM001" onChange={(e) => update(r.key, { name: e.target.value })} /></td>
                <td><input type="number" inputMode="numeric" min="0" value={r.amount} onChange={(e) => update(r.key, { amount: e.target.value })} /></td>
                <td>
                  <select value={r.period} onChange={(e) => update(r.key, { period: e.target.value })}>
                    <option value="tahun">tahun</option>
                    <option value="bulan">bulan</option>
                  </select>
                </td>
                <td><input type="month" value={r.startMonth} onChange={(e) => update(r.key, { startMonth: e.target.value })} /></td>
                <td><input type="month" value={r.endMonth} onChange={(e) => update(r.key, { endMonth: e.target.value })} /></td>
                <td>{formatCurrency(perMonth(r))}</td>
                <td><button type="button" className="pl-fixed-remove" onClick={() => remove(r.key)} aria-label="Hapus">✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pl-fixed-actions">
        <button type="button" onClick={add}>➕ Tambah</button>
        <span>Total per bulan (yang masih berlaku): <strong>{formatCurrency(monthly)}</strong></span>
        <span className="pl-fixed-spacer" />
        <button type="button" onClick={onClose} disabled={saving}>Batal</button>
        <button type="button" className="primary" onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</button>
      </div>
      {error && <div className="pl-message error">{error}</div>}
    </div>
  );
};

export default FixedCostsEditor;
