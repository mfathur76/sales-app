import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/salesApi';
import './AdminSalesReport.css';

const AdminSalesReport = () => {
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const monthStart = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: monthStart,
    end_date: monthEnd,
    outlet: ''
  });
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchSales();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    generateReport();
  }, [sales]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getAllSales(filters);
      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      setError(`Failed to load sales: ${error.message}`);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (!sales.length) {
      setReportData([]);
      return;
    }

    // Group sales by outlet and date
    const groupedData = {};
    
    sales.forEach(sale => {
      const key = `${sale.outlet}_${sale.date}`;
      if (!groupedData[key]) {
        // Staff input: original sales data from outlet
        const staffInput = {
          totalSales: sale.totalSales,
          cash: sale.cash,
          qris: sale.qris,
          gojek: sale.gojek,
          shopee: sale.shopee,
          grab: sale.grab,
          totalBank: sale.totalBank || 0,
          qrisBank: sale.qrisBank || 0,
          gojekBank: sale.gojekBank || 0,
          shopeeBank: sale.shopeeBank || 0,
          grabBank: sale.grabBank || 0,
          bcaBank: sale.bcaBank || 0,
          mandiriBank: sale.mandiriBank || 0
        };

        // Admin input: bank transfer data input by admin
        const adminInput = {
          totalSales: sale.totalBank || 0, // Admin input is the bank transfer total
          cash: 0, // Admin doesn't input cash
          qris: sale.qrisBank || 0,
          gojek: sale.gojekBank || 0,
          shopee: sale.shopeeBank || 0,
          grab: sale.grabBank || 0,
          totalBank: sale.totalBank || 0,
          qrisBank: sale.qrisBank || 0,
          gojekBank: sale.gojekBank || 0,
          shopeeBank: sale.shopeeBank || 0,
          grabBank: sale.grabBank || 0,
          bcaBank: sale.bcaBank || 0,
          mandiriBank: sale.mandiriBank || 0
        };

        groupedData[key] = {
          outlet: sale.outletRef?.name || sale.outlet,
          date: sale.date,
          status: sale.status,
          staffInput,
          adminInput
        };
      }
    });

    // Convert to array and calculate differences
    const reportArray = Object.values(groupedData).map(item => {
      const staffTotal = item.staffInput.totalSales;
      const adminTotal = item.adminInput.totalSales;
      const difference = adminTotal - staffTotal;
      const percentage = staffTotal > 0 ? ((adminTotal / staffTotal) * 100) : 0;

      return {
        ...item,
        difference: {
          amount: difference,
          percentage: percentage,
          status: difference > 0 ? 'over' : difference < 0 ? 'under' : 'match'
        }
      };
    });

    // Sort by date (newest first)
    reportArray.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setReportData(reportArray);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  const getDifferenceColor = (status) => {
    switch (status) {
      case 'over': return 'difference-over';
      case 'under': return 'difference-under';
      case 'match': return 'difference-match';
      default: return '';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge pending">Pending</span>;
      case 'verified':
        return <span className="status-badge verified">Verified</span>;
      case 'approved':
        return <span className="status-badge approved">Approved</span>;
      case 'rejected':
        return <span className="status-badge rejected">Rejected</span>;
      default:
        return <span className="status-badge pending">Pending</span>;
    }
  };

  const exportToCSV = () => {
    if (!reportData.length) return;

    const headers = [
      'Tanggal',
      'Nama Outlet',
      'Status',
      'Staff Cash',
      'Admin Cash',
      'Staff QRIS',
      'Admin QRIS',
      'Staff Gojek',
      'Admin Gojek',
      'Staff Shopee',
      'Admin Shopee',
      'Staff Grab',
      'Admin Grab',
      'Staff BCA',
      'Admin BCA',
      'Staff Mandiri',
      'Admin Mandiri',
      'Total Staff',
      'Total Admin',
      'Selisih',
      'Status'
    ];

    const csvData = reportData.map(item => [
      formatDate(item.date),
      item.outlet,
      item.status,
      item.staffInput.cash,
      item.adminInput.cash,
      item.staffInput.qris,
      item.adminInput.qris,
      item.staffInput.gojek,
      item.adminInput.gojek,
      item.staffInput.shopee,
      item.adminInput.shopee,
      item.staffInput.grab,
      item.adminInput.grab,
      item.staffInput.bcaBank,
      item.adminInput.bcaBank,
      item.staffInput.mandiriBank,
      item.adminInput.mandiriBank,
      item.staffInput.totalSales,
      item.adminInput.totalSales,
      item.difference.amount,
      item.difference.status.toUpperCase()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `admin_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-sales-report">
      <div className="report-header">
        <h1>Laporan Sales - Staff vs Admin Input Comparison</h1>
        <div className="header-actions">
          <button 
            className="export-btn"
            onClick={exportToCSV}
            disabled={!reportData.length}
          >
            📊 Export to CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-item">
            <label>Start Date:</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({...filters, start_date: e.target.value})}
            />
          </div>
          <div className="filter-item">
            <label>End Date:</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({...filters, end_date: e.target.value})}
            />
          </div>
          <div className="filter-item">
            <label>Outlet:</label>
            <input
              type="text"
              placeholder="Outlet code"
              value={filters.outlet}
              onChange={(e) => setFilters({...filters, outlet: e.target.value})}
            />
          </div>
          <div className="filter-item">
            <label>&nbsp;</label>
            <button 
              className="refresh-btn"
              onClick={fetchSales}
              disabled={loading}
            >
              {loading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <h2>❌ Error</h2>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Close</button>
        </div>
      )}

      {loading && (
        <div className="loading">Loading report data...</div>
      )}

      {!loading && !error && (
        <div className="report-content">
          <div className="report-summary">
            <h2>Report Summary ({reportData.length} records)</h2>
            {reportData.length > 0 && (
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Records:</span>
                  <span className="stat-value">{reportData.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Staff Input:</span>
                  <span className="stat-value">
                    {formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.totalSales, 0))}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Admin Input:</span>
                  <span className="stat-value">
                    {formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.totalSales, 0))}
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Difference:</span>
                  <span className="stat-value">
                    {formatCurrency(reportData.reduce((sum, item) => sum + item.difference.amount, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>

          {reportData.length === 0 ? (
            <div className="no-data">No data found for the selected filters</div>
          ) : (
            <div className="table-container">
              <table className="report-table">
                <thead>
                  <tr>
                    <th rowSpan="2">Tanggal</th>
                    <th rowSpan="2">Nama Outlet</th>
                    <th rowSpan="2">Status</th>
                    <th colSpan="2">Cash</th>
                    <th colSpan="2">QRIS</th>
                    <th colSpan="2">Gojek</th>
                    <th colSpan="2">Shopee</th>
                    <th colSpan="2">Grab</th>
                    <th colSpan="2">BCA</th>
                    <th colSpan="2">Mandiri</th>
                    <th rowSpan="2">Total Staff</th>
                    <th rowSpan="2">Total Admin</th>
                    <th rowSpan="2">Selisih</th>
                    <th rowSpan="2">Status</th>
                  </tr>
                  <tr>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                    <th>Staff</th>
                    <th>Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((item, index) => (
                    <tr key={index}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.outlet}</td>
                      <td>{getStatusBadge(item.status)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.cash)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.cash)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.qris)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.qris)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.gojek)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.gojek)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.shopee)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.shopee)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.grab)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.grab)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.bcaBank)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.bcaBank)}</td>
                      <td className="amount-cell">{formatCurrency(item.staffInput.mandiriBank)}</td>
                      <td className="amount-cell">{formatCurrency(item.adminInput.mandiriBank)}</td>
                      <td className="amount-cell total-staff">
                        {formatCurrency(item.staffInput.totalSales)}
                      </td>
                      <td className="amount-cell total-admin">
                        {formatCurrency(item.adminInput.totalSales)}
                      </td>
                      <td className={`difference-cell ${getDifferenceColor(item.difference.status)}`}>
                        {formatCurrency(item.difference.amount)}
                      </td>
                      <td className={`status-cell ${getDifferenceColor(item.difference.status)}`}>
                        {item.difference.status.toUpperCase()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-footer">
                    <td colSpan="3" className="footer-label">TOTAL</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.cash, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.cash, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.qris, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.qris, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.gojek, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.gojek, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.shopee, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.shopee, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.grab, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.grab, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.bcaBank, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.bcaBank, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.mandiriBank, 0))}</td>
                    <td className="amount-cell footer-total">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.mandiriBank, 0))}</td>
                    <td className="amount-cell footer-total total-staff">{formatCurrency(reportData.reduce((sum, item) => sum + item.staffInput.totalSales, 0))}</td>
                    <td className="amount-cell footer-total total-admin">{formatCurrency(reportData.reduce((sum, item) => sum + item.adminInput.totalSales, 0))}</td>
                    <td className="amount-cell footer-total difference-cell">{formatCurrency(reportData.reduce((sum, item) => sum + item.difference.amount, 0))}</td>
                    <td className="amount-cell footer-total status-cell">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSalesReport;
