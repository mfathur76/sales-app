import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ProfitLossReport.css';

const CHANNELS = [
  { key: 'cash', label: 'Tunai' },
  { key: 'qris', label: 'QRIS' },
  { key: 'gojek', label: 'GoFood' },
  { key: 'shopee', label: 'ShopeeFood' },
  { key: 'grab', label: 'GrabFood' },
  { key: 'transfer', label: 'Transfer BCA/Mandiri' },
];
const FEE_CHANNELS = CHANNELS.filter((c) => ['qris', 'gojek', 'shopee', 'grab'].includes(c.key));

const todayLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

// First / last day of the month `offset` months away from today's month
const monthBoundary = (offset, last = false) => {
  const [y, m] = todayLocal().split('-').map(Number);
  const d = last ? new Date(Date.UTC(y, m + offset, 0)) : new Date(Date.UTC(y, m - 1 + offset, 1));
  return d.toISOString().split('T')[0];
};

const PRESETS = [
  { id: 'compare', label: 'Bulan ini vs lalu', range: () => [monthBoundary(-1), todayLocal()] },
  { id: 'this', label: 'Bulan ini', range: () => [monthBoundary(0), todayLocal()] },
  { id: 'last', label: 'Bulan lalu', range: () => [monthBoundary(-1), monthBoundary(-1, true)] },
  { id: 'three', label: '3 bulan', range: () => [monthBoundary(-2), todayLocal()] },
  { id: 'year', label: 'Tahun ini', range: () => [`${todayLocal().slice(0, 4)}-01-01`, todayLocal()] },
];

const monthsBetween = (start, end) => {
  const out = [];
  let [y, m] = start.split('-').map(Number);
  const last = end.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    if (key > last) return out;
    out.push(key);
    if (++m > 12) { m = 1; y += 1; }
  }
};

const monthLabel = (month) => new Date(`${month}-01T00:00:00`).toLocaleDateString('id-ID', {
  month: 'short', year: 'numeric'
});

const formatDate = (dateStr) => new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
  day: 'numeric', month: 'long', year: 'numeric'
});

const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}).format(amount || 0);

const formatPercent = (part, whole) => (whole ? `${((part / whole) * 100).toFixed(1)}%` : '–');

const sumBy = (rows, pick) => rows.reduce((s, r) => s + pick(r), 0);

/** Pivots the API rows into statement lines with one value per month. */
function buildStatement(data, months) {
  const perMonth = (rows, pick) => months.map((m) => sumBy(rows.filter((r) => r.month === m), pick));

  const channels = CHANNELS.map((c) => ({ label: c.label, values: perMonth(data.revenue, (r) => r[c.key]) }));
  const revenue = perMonth(data.revenue, (r) => r.total);
  const feeLines = FEE_CHANNELS.map((c) => ({
    label: `Admin ${c.label}`, values: perMonth(data.revenue, (r) => r.fees[c.key]),
  }));
  const estimatedFees = perMonth(data.revenue, (r) => r.estimatedFees);
  const unverifiedSales = perMonth(data.revenue, (r) => r.unverifiedSales);

  const categoryLines = (group) => {
    const byCategory = new Map();
    data.expenses.filter((e) => e.group === group).forEach((e) => {
      const line = byCategory.get(e.categoryId) || { label: e.categoryName, rows: [] };
      line.rows.push(e);
      byCategory.set(e.categoryId, line);
    });
    return Array.from(byCategory.values())
      .map((line) => ({ label: line.label, values: perMonth(line.rows, (r) => r.total) }))
      .sort((a, b) => sumBy(b.values, (v) => v) - sumBy(a.values, (v) => v));
  };
  const cogsLines = categoryLines('cogs');
  const opexLines = categoryLines('opex');
  const addUp = (lines) => months.map((_, i) => sumBy(lines, (l) => l.values[i]));
  const cogs = addUp(cogsLines);
  const opex = addUp(opexLines);
  const fees = addUp(feeLines);
  const netRevenue = months.map((_, i) => revenue[i] - fees[i]);
  const grossProfit = months.map((_, i) => netRevenue[i] - cogs[i]);
  const netProfit = months.map((_, i) => grossProfit[i] - opex[i]);

  const salesDays = months.map((m) => Math.max(0, ...data.revenue.filter((r) => r.month === m).map((r) => r.days)));
  const outlets = data.outlets
    .map((o) => ({
      label: `${o.code} – ${o.name}`,
      values: perMonth(data.revenue.filter((r) => r.outlet === o.code), (r) => r.total),
    }))
    .filter((o) => o.values.some(Boolean));

  return { channels, revenue, feeLines, fees, estimatedFees, unverifiedSales, netRevenue, cogsLines, cogs, grossProfit, opexLines, opex, netProfit, salesDays, outlets };
}

const total = (values) => sumBy(values, (v) => v);

const ProfitLossReport = () => {
  const [preset, setPreset] = useState('compare');
  const [startDate, setStartDate] = useState(() => PRESETS[0].range()[0]);
  const [endDate, setEndDate] = useState(() => PRESETS[0].range()[1]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!startDate || !endDate || startDate > endDate) return;
    setLoading(true);
    setError('');
    try {
      setData(await expenseApi.getProfitLoss(startDate, endDate));
    } catch (err) {
      setData(null);
      setError(err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const choosePreset = (p) => {
    const [start, end] = p.range();
    setPreset(p.id);
    setStartDate(start);
    setEndDate(end);
  };

  const months = useMemo(() => (data ? monthsBetween(data.startDate, data.endDate) : []), [data]);
  const st = useMemo(() => (data ? buildStatement(data, months) : null), [data, months]);
  const currentMonth = todayLocal().slice(0, 7);
  const showTotal = months.length > 1;
  const revenueTotal = st ? total(st.revenue) : 0;

  const renderLine = (label, values, kind = 'item', estimated = []) => {
    const sum = total(values);
    const cellClass = (v, i) => [
      v < 0 ? 'neg' : '',
      months[i] === currentMonth ? 'running' : '',
      estimated[i] ? 'estimated' : '',
    ].join(' ');
    return (
      <tr key={`${kind}-${label}`} className={`pl-${kind}`}>
        <th scope="row">{label}</th>
        {values.map((v, i) => (
          <td key={months[i]} className={cellClass(v, i)}>
            {estimated[i] ? '≈ ' : ''}{formatCurrency(v)}
          </td>
        ))}
        {showTotal && <td className={sum < 0 ? 'neg' : ''}>{formatCurrency(sum)}</td>}
        <td className="pl-pct">{formatPercent(sum, revenueTotal)}</td>
      </tr>
    );
  };

  const section = (label) => (
    <tr key={`section-${label}`} className="pl-section">
      <th scope="row" colSpan={months.length + (showTotal ? 3 : 2)}>{label}</th>
    </tr>
  );

  const includesRunningMonth = months.includes(currentMonth);
  const netTotal = st ? total(st.netProfit) : 0;
  const grossTotal = st ? total(st.grossProfit) : 0;
  const estimatedTotal = st ? total(st.estimatedFees) : 0;
  const ratePct = (key) => `${((data?.feeRates?.[key] || 0) * 100).toFixed(1).replace('.', ',')}%`;

  return (
    <div className="profit-loss-report">
      <div className="pl-header">
        <div>
          <h2>Laporan Laba Rugi Sementara</h2>
          {data && <p>{formatDate(data.startDate)} – {formatDate(data.endDate)} · semua outlet</p>}
        </div>
        <button type="button" className="pl-print" onClick={() => window.print()} disabled={!st}>
          🖨️ Cetak
        </button>
      </div>

      <div className="pl-controls">
        <div className="pl-presets">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={preset === p.id ? 'active' : ''}
              onClick={() => choosePreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="pl-dates">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => { setPreset(''); setStartDate(e.target.value); }}
          />
          <span>s/d</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => { setPreset(''); setEndDate(e.target.value); }}
          />
        </div>
      </div>

      {error && <div className="pl-message error">{error}</div>}
      {loading && <div className="pl-message">Memuat laporan…</div>}

      {st && !loading && (
        <>
          {includesRunningMonth && (
            <div className="pl-message warning">
              <strong>Bulan berjalan belum lengkap.</strong> Penjualan tercatat sampai{' '}
              {data.lastSalesDate ? formatDate(data.lastSalesDate) : '–'}. Biaya bulanan seperti gaji
              biasanya baru masuk di akhir bulan, jadi laba bulan ini masih akan turun. Bandingkan per
              kategori dengan bulan lalu untuk melihat yang belum dicatat.
            </div>
          )}

          {estimatedTotal > 0 && (
            <div className="pl-message warning">
              <strong>Sebagian potongan admin masih perkiraan (≈).</strong> Transfer untuk penjualan{' '}
              {formatCurrency(total(st.unverifiedSales))} belum diinput di Verifikasi Sales, jadi potongannya{' '}
              ({formatCurrency(estimatedTotal)}) dihitung dari rata-rata 90 hari terakhir: GoFood {ratePct('gojek')},
              ShopeeFood {ratePct('shopee')}, GrabFood {ratePct('grab')}; QRIS 0,7% + Rp 2.000/hari. Angka asli
              otomatis dipakai begitu transfernya diinput. Transfer BCA/Mandiri dari pelanggan pada hari-hari itu
              juga belum masuk pendapatan.
            </div>
          )}

          <div className="pl-cards">
            <div className="pl-card">
              <span>Pendapatan</span>
              <strong>{formatCurrency(revenueTotal)}</strong>
            </div>
            <div className="pl-card">
              <span>Potongan Admin</span>
              <strong>{estimatedTotal > 0 ? '≈ ' : ''}{formatCurrency(total(st.fees))}</strong>
              <small>{formatPercent(total(st.fees), revenueTotal)} dari pendapatan</small>
            </div>
            <div className="pl-card">
              <span>HPP</span>
              <strong>{formatCurrency(total(st.cogs))}</strong>
              <small>{formatPercent(total(st.cogs), revenueTotal)} dari pendapatan</small>
            </div>
            <div className="pl-card">
              <span>Laba Kotor</span>
              <strong className={grossTotal < 0 ? 'neg' : ''}>{formatCurrency(grossTotal)}</strong>
              <small>margin {formatPercent(grossTotal, revenueTotal)}</small>
            </div>
            <div className="pl-card">
              <span>Biaya Operasional</span>
              <strong>{formatCurrency(total(st.opex))}</strong>
              <small>{formatPercent(total(st.opex), revenueTotal)} dari pendapatan</small>
            </div>
            <div className={`pl-card result ${netTotal < 0 ? 'loss' : ''}`}>
              <span>{netTotal < 0 ? 'Rugi Bersih' : 'Laba Bersih'}</span>
              <strong>{formatCurrency(netTotal)}</strong>
              <small>margin {formatPercent(netTotal, revenueTotal)}</small>
            </div>
          </div>

          <div className="pl-table-wrap">
            <table className="pl-table">
              <thead>
                <tr>
                  <th scope="col">Keterangan</th>
                  {months.map((m, i) => (
                    <th scope="col" key={m} className={m === currentMonth ? 'running' : ''}>
                      {monthLabel(m)}
                      <small>{m === currentMonth ? 'berjalan · ' : ''}{st.salesDays[i]} hari jualan</small>
                    </th>
                  ))}
                  {showTotal && <th scope="col">Total</th>}
                  <th scope="col" className="pl-pct">% Pend.</th>
                </tr>
              </thead>
              <tbody>
                {section('Pendapatan')}
                {st.channels.map((c) => renderLine(c.label, c.values))}
                {renderLine('Total Pendapatan Kotor', st.revenue, 'subtotal')}

                {section('Potongan Admin (QRIS & Ojol)')}
                {st.feeLines.map((c) => renderLine(c.label, c.values, 'item', st.estimatedFees))}
                {renderLine('Total Potongan Admin', st.fees, 'subtotal', st.estimatedFees)}
                {renderLine('Pendapatan Bersih', st.netRevenue, 'result', st.estimatedFees)}

                {section('Harga Pokok Penjualan (HPP)')}
                {st.cogsLines.map((c) => renderLine(c.label, c.values))}
                {renderLine('Total HPP', st.cogs, 'subtotal')}
                {renderLine('Laba Kotor', st.grossProfit, 'result')}

                {section('Biaya Operasional')}
                {st.opexLines.map((c) => renderLine(c.label, c.values))}
                {renderLine('Total Biaya Operasional', st.opex, 'subtotal')}
                {renderLine(netTotal < 0 ? 'Rugi Bersih' : 'Laba Bersih', st.netProfit, 'result final')}
              </tbody>
            </table>
          </div>

          {st.outlets.length > 0 && (
            <div className="pl-table-wrap">
              <h3>Pendapatan per Outlet</h3>
              <table className="pl-table">
                <thead>
                  <tr>
                    <th scope="col">Outlet</th>
                    {months.map((m) => (
                      <th scope="col" key={m} className={m === currentMonth ? 'running' : ''}>{monthLabel(m)}</th>
                    ))}
                    {showTotal && <th scope="col">Total</th>}
                    <th scope="col" className="pl-pct">Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {st.outlets.map((o) => renderLine(o.label, o.values))}
                </tbody>
              </table>
            </div>
          )}

          <p className="pl-footnote">
            HPP = Belanja Dapur, Belanja Pasar Johar, Kemasan, Konsinyasi. Kategori lain dihitung sebagai
            biaya operasional. Potongan admin = penjualan − uang yang masuk rekening (dari Verifikasi Sales).
            Sejak transfer QRIS digabung dengan GoFood, potongan QRIS dihitung 0,7% + Rp 2.000 per outlet per
            hari dan sisanya adalah potongan GoFood. Transfer BCA/Mandiri dari pelanggan (diisi admin saat verifikasi) ditambahkan ke pendapatan dan tidak kena potongan.
            Biaya Dapur tidak dibagi ke outlet, jadi laba dihitung gabungan semua outlet.
          </p>
        </>
      )}
    </div>
  );
};

export default ProfitLossReport;
