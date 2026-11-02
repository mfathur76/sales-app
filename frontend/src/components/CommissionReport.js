import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, authApi } from '../api/salesApi';
import { commissionApi, commissionRow } from '../api/commissionApi';
import { shopOutlets } from '../api/stockApi';
import './Orders.css';
import './Stock.css';
import './CommissionReport.css';

const number = (n) => Math.round(n || 0).toLocaleString('id-ID');

/** "2026-09" for the month before today, the one usually being paid out. */
function lastMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { start: `${month}-01`, end: `${month}-${String(last).padStart(2, '0')}`, days: last };
}

const monthLabel = (month) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

const dayLabel = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${d}/${m}/${y}`;
};

const EmployeeForm = ({ employee, outlets, onSaved, onCancel }) => {
  const [name, setName] = useState(employee?.name || '');
  const [picked, setPicked] = useState(new Set(employee?.outlets || []));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (code) => setPicked((prev) => {
    const next = new Set(prev);
    if (next.has(code)) next.delete(code); else next.add(code);
    return next;
  });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = { name, outlets: [...picked] };
      if (employee) await commissionApi.updateEmployee(employee.id, data);
      else await commissionApi.createEmployee(data);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="ord-panel inset ord-form" onSubmit={submit}>
      <label className="ord-field">
        <span>Nama karyawan *</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </label>
      <div className="ord-field">
        <span>Outlet yang ditangani *</span>
        <div className="cms-outlets">
          {outlets.map((o) => (
            <label key={o.code} className="stk-check">
              <input type="checkbox" checked={picked.has(o.code)} onChange={() => toggle(o.code)} /> {o.code} - {o.name}
            </label>
          ))}
        </div>
      </div>
      {error && <div className="ord-alert error">{error}</div>}
      <div className="ord-actions">
        <button type="button" className="ord-btn ghost" onClick={onCancel} disabled={saving}>Batal</button>
        <button type="submit" className="ord-btn primary" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</button>
      </div>
    </form>
  );
};

const EmployeeList = ({ employees, outlets, onChanged }) => {
  const [editing, setEditing] = useState(null); // employee, 'new' or null
  const [error, setError] = useState('');

  const toggleActive = async (e) => {
    try {
      await commissionApi.updateEmployee(e.id, { isActive: !e.isActive });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const saved = () => { setEditing(null); onChanged(); };

  return (
    <div className="ord-panel">
      <div className="ord-row-between">
        <h4>Karyawan penerima komisi</h4>
        {!editing && <button className="ord-btn primary small" onClick={() => setEditing('new')}>➕ Karyawan</button>}
      </div>
      {error && <div className="ord-alert error">{error}</div>}
      {editing === 'new' && <EmployeeForm outlets={outlets} onSaved={saved} onCancel={() => setEditing(null)} />}
      {employees.length === 0 && editing !== 'new' && <div className="ord-line muted">Belum ada karyawan.</div>}
      {employees.map((e) => (
        editing?.id === e.id ? (
          <EmployeeForm key={e.id} employee={e} outlets={outlets} onSaved={saved} onCancel={() => setEditing(null)} />
        ) : (
          <div key={e.id} className={`ord-row-between cms-employee ${e.isActive ? '' : 'dim'}`}>
            <span>
              <strong>{e.name}</strong>{!e.isActive && <span className="muted"> (nonaktif)</span>}
              <span className="muted small"> · {e.outlets.join(', ')}</span>
            </span>
            <span className="ord-actions" style={{ marginTop: 0 }}>
              <button className="ord-btn ghost small" onClick={() => setEditing(e)}>✏️</button>
              <button className="ord-btn ghost small" onClick={() => toggleActive(e)}>{e.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button>
            </span>
          </div>
        )
      ))}
    </div>
  );
};

/**
 * Admin: an employee's commission for a month, from the money their outlets took in, laid out
 * like the printed report so it can be saved as PDF straight from the browser.
 */
const CommissionReport = () => {
  const [employees, setEmployees] = useState([]);
  const [allOutlets, setAllOutlets] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(lastMonth());
  const [divisor, setDivisor] = useState(3500);
  const [multiplier, setMultiplier] = useState(100);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEmployees, setShowEmployees] = useState(false);
  const [error, setError] = useState('');

  const loadEmployees = useCallback(async () => {
    try {
      const list = await commissionApi.listEmployees();
      setEmployees(list);
      if (list.length === 0) setShowEmployees(true);
      setEmployeeId((current) => current || list.find((e) => e.isActive)?.id || '');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
    authApi.getOutlets().then((res) => setAllOutlets(res?.data || [])).catch(() => setAllOutlets([]));
  }, [loadEmployees]);

  const employee = employees.find((e) => e.id === employeeId);
  const { start, end, days } = monthRange(month);

  const loadSales = useCallback(async () => {
    if (!employee) { setRows([]); return; }
    setLoading(true);
    setError('');
    try {
      const perOutlet = await Promise.all(
        employee.outlets.map((outlet) => adminApi.getAllSales({ outlet, start_date: start, end_date: end }))
      );
      setRows(perOutlet.flat().map(commissionRow)
        .sort((a, b) => a.date.localeCompare(b.date) || a.outlet.localeCompare(b.outlet)));
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [employee, start, end]);

  useEffect(() => { loadSales(); }, [loadSales]);

  const total = rows.reduce((s, r) => s + r.subtotal, 0);
  const perDivisor = divisor > 0 ? total / divisor : 0;
  const commission = perDivisor * multiplier;
  const unverified = rows.filter((r) => r.unverified.length > 0);
  const missing = employee ? employee.outlets.length * days - rows.length : 0;
  const sum = (key) => rows.reduce((s, r) => s + r[key], 0);

  return (
    <div className="ord-container">
      <div className="ord-header no-print">
        <h2>💸 Komisi Karyawan</h2>
        <div className="ord-actions" style={{ marginTop: 0 }}>
          <button className="ord-btn ghost" onClick={() => setShowEmployees(!showEmployees)}>👥 Kelola Karyawan</button>
          <button className="ord-btn primary" onClick={() => window.print()} disabled={!employee || rows.length === 0}>🖨️ Cetak / PDF</button>
        </div>
      </div>

      {showEmployees && (
        <div className="no-print">
          <EmployeeList employees={employees} outlets={shopOutlets(allOutlets)} onChanged={loadEmployees} />
        </div>
      )}

      <div className="ord-toolbar no-print">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Pilih karyawan</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name} ({e.outlets.join(', ')}){e.isActive ? '' : ' - nonaktif'}</option>
          ))}
        </select>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        <label className="cms-rate">
          ÷ <input type="number" min="1" value={divisor} onChange={(e) => setDivisor(Number(e.target.value) || 0)} />
          × <input type="number" min="0" value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value) || 0)} />
        </label>
      </div>

      {error && <div className="ord-alert error no-print">{error}</div>}
      {unverified.length > 0 && (
        <div className="ord-alert warn no-print">
          ⚠️ {unverified.length} baris belum diverifikasi bank (dihitung 0). Lengkapi di Verifikasi Sales sebelum komisi dibayar.
        </div>
      )}
      {missing > 0 && rows.length > 0 && (
        <div className="ord-alert warn no-print">
          {missing} hari-outlet tidak ada data Sales di bulan ini (outlet tutup atau belum diinput).
        </div>
      )}

      {!employee ? (
        <div className="ord-empty">Pilih karyawan dulu.</div>
      ) : loading ? (
        <div className="ord-empty">Memuat...</div>
      ) : (
        <div className="cms-print">
          <div className="cms-title">
            <h3>Komisi {employee.name} · {monthLabel(month)}</h3>
            <div className="muted small">Outlet: {employee.outlets.join(', ')}</div>
          </div>
          <div className="stk-table-wrap">
            <table className="stk-table cms-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nama Outlet</th>
                  <th className="num">Cash</th>
                  <th className="num">Gojek + QRIS</th>
                  <th className="num">Shopee</th>
                  <th className="num">Grab</th>
                  <th className="num">Transfer</th>
                  <th className="num">Sub Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan="8" className="muted">Tidak ada data Sales di bulan ini.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={`${r.date}-${r.outlet}`} className={r.unverified.length ? 'cms-unverified' : ''}>
                    <td>{dayLabel(r.date)}</td>
                    <td>
                      <span className="cms-chip">{r.outlet}</span>
                      {r.unverified.length > 0 && (
                        <span className="neg small no-print" title={`Belum verifikasi bank: ${r.unverified.join(', ')}`}> ⚠️</span>
                      )}
                    </td>
                    <td className="num">{number(r.cash)}</td>
                    <td className="num">{number(r.gojek)}</td>
                    <td className="num">{number(r.shopee)}</td>
                    <td className="num">{number(r.grab)}</td>
                    <td className="num">{number(r.transfer)}</td>
                    <td className="num">{number(r.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="cms-total">
                  <td colSpan="2">Total</td>
                  <td className="num">{number(sum('cash'))}</td>
                  <td className="num">{number(sum('gojek'))}</td>
                  <td className="num">{number(sum('shopee'))}</td>
                  <td className="num">{number(sum('grab'))}</td>
                  <td className="num">{number(sum('transfer'))}</td>
                  <td className="num">{number(total)}</td>
                </tr>
                <tr>
                  <td colSpan="7">Total/{number(divisor)}</td>
                  <td className="num">{number(perDivisor)}</td>
                </tr>
                <tr className="cms-commission">
                  <td colSpan="7">Komisi{multiplier !== 100 ? ` (× ${number(multiplier)})` : ''}</td>
                  <td className="num">{number(commission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommissionReport;
