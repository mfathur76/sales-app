#!/bin/bash

echo "🔧 Fixing Admin Report Issues..."

# Set variables
SERVER_IP="your-server-ip"
SSH_KEY="DOSSHKEY"
FRONTEND_DIR="/var/www/sales-app/frontend"

# Create fixed AdminReport.js content
cat > frontend/src/components/AdminReport_fixed.js << 'EOF'
import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/salesApi';
import './AdminReport.css';

const AdminReport = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    outlet: ''
  });
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchSales();
  }, [filters]);

  useEffect(() => {
    generateReport();
  }, [sales]);

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

  const formatPercentage = (percentage) => {
    return `${percentage.toFixed(2)}%`;
  };

  const getDifferenceColor = (status) => {
    switch (status) {
      case 'over': return 'difference-over';
      case 'under': return 'difference-under';
      case 'match': return 'difference-match';
      default: return '';
    }
  };

  const exportToCSV = () => {
    if (!reportData.length) return;

    const headers = [
      'Tanggal',
      'Nama Outlet',
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
    link.setAttribute('download', `admin_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-report">
      <div className="report-header">
        <h1>Admin Report - Staff vs Admin Input Comparison</h1>
        <div className="header-actions">
          <button 
            className="export-btn"
            onClick={exportToCSV}
            disabled={!reportData.length}
          >
            📊 Export to CSV
          </button>
          <button 
            className="logout-btn"
            onClick={() => {
              adminApi.logout();
              window.location.reload();
            }}
          >
            Logout
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
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReport;
EOF

# Create fixed AdminReport.css content
cat > frontend/src/components/AdminReport_fixed.css << 'EOF'
.admin-report {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e0e0e0;
}

.report-header h1 {
  color: #333;
  margin: 0;
  font-size: 28px;
}

.header-actions {
  display: flex;
  gap: 15px;
  align-items: center;
}

.export-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.export-btn:hover:not(:disabled) {
  background-color: #218838;
}

.export-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.logout-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background-color: #c82333;
}

/* Filters Section */
.filters-section {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e0e0e0;
}

.filters-section h3 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 18px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.filter-item {
  display: flex;
  flex-direction: column;
}

.filter-item label {
  margin-bottom: 5px;
  font-weight: 500;
  color: #555;
}

.filter-item input,
.filter-item select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.filter-item input:focus,
.filter-item select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.refresh-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.refresh-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

/* Error and Success Messages */
.error-message,
.success-message {
  padding: 15px;
  border-radius: 5px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.error-message {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.success-message {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.error-message button,
.success-message button {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-weight: bold;
  padding: 5px 10px;
  border-radius: 3px;
}

.error-message button:hover {
  background-color: #f1b0b7;
}

.success-message button:hover {
  background-color: #c3e6cb;
}

/* Loading */
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

/* Report Content */
.report-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.report-summary {
  padding: 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.report-summary h2 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 20px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  border-radius: 5px;
  border: 1px solid #e0e0e0;
}

.stat-label {
  font-weight: 500;
  color: #555;
}

.stat-value {
  font-weight: bold;
  color: #333;
}

.no-data {
  text-align: center;
  padding: 40px;
  color: #666;
  font-style: italic;
}

/* Table Container */
.table-container {
  overflow-x: auto;
  overflow-y: auto;
  max-width: 100%;
  max-height: 70vh;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}

.report-table th,
.report-table td {
  padding: 6px 4px;
  text-align: center;
  border: 1px solid #e0e0e0;
  vertical-align: middle;
}

.report-table th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: sticky;
  top: 0;
  z-index: 10;
  white-space: nowrap;
}

.report-table th[rowspan="2"] {
  background-color: #e9ecef;
  font-weight: 700;
}

.report-table th[colspan="2"] {
  background-color: #dee2e6;
  font-weight: 600;
}

.report-table tr:hover {
  background-color: #f8f9fa;
}

.amount-cell {
  font-weight: 500;
  min-width: 80px;
  font-size: 10px;
}

.total-staff {
  background-color: #e3f2fd;
  font-weight: 600;
}

.total-admin {
  background-color: #f3e5f5;
  font-weight: 600;
}

.breakdown {
  margin-top: 5px;
  font-size: 12px;
  color: #666;
}

.breakdown small {
  display: block;
  margin: 2px 0;
}

.difference-cell {
  font-weight: bold;
  text-align: center;
}

.difference-over {
  color: #28a745;
  background-color: #d4edda;
}

.difference-under {
  color: #dc3545;
  background-color: #f8d7da;
}

.difference-match {
  color: #6c757d;
  background-color: #e2e3e5;
}

.percentage-cell {
  text-align: center;
  font-weight: 500;
}

.status-cell {
  text-align: center;
  font-weight: bold;
  text-transform: uppercase;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-cell.difference-over {
  background-color: #d4edda;
  color: #155724;
}

.status-cell.difference-under {
  background-color: #f8d7da;
  color: #721c24;
}

.status-cell.difference-match {
  background-color: #e2e3e5;
  color: #6c757d;
}

/* Responsive Design */
@media (max-width: 768px) {
  .admin-report {
    padding: 10px;
  }

  .report-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .report-header h1 {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .filters-grid {
    grid-template-columns: 1fr;
  }

  .summary-stats {
    grid-template-columns: 1fr;
  }

  .report-table {
    font-size: 12px;
  }

  .report-table th,
  .report-table td {
    padding: 8px 6px;
  }

  .amount-cell {
    min-width: 120px;
  }

  .breakdown {
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .report-table {
    font-size: 11px;
  }

  .report-table th,
  .report-table td {
    padding: 6px 4px;
  }

  .amount-cell {
    min-width: 100px;
  }

  .breakdown {
    font-size: 10px;
  }
}
EOF

# Upload the fixed files
echo "📤 Uploading fixed AdminReport files..."
scp -i $SSH_KEY frontend/src/components/AdminReport_fixed.js root@$SERVER_IP:$FRONTEND_DIR/src/components/AdminReport.js
scp -i $SSH_KEY frontend/src/components/AdminReport_fixed.css root@$SERVER_IP:$FRONTEND_DIR/src/components/AdminReport.css

if [ $? -eq 0 ]; then
    echo "✅ AdminReport files uploaded successfully"
else
    echo "❌ Failed to upload AdminReport files"
    exit 1
fi

# SSH into server and restart frontend
echo "🔧 Restarting frontend..."
ssh -i $SSH_KEY root@$SERVER_IP << 'EOF'
    cd /var/www/sales-app/frontend
    
    # Build the frontend
    echo "🔨 Building frontend..."
    npm run build
    
    # Restart PM2 process
    echo "🔄 Restarting PM2 frontend process..."
    pm2 restart sales-frontend
    
    # Check status
    echo "📊 PM2 Status:"
    pm2 status
    
    echo "✅ Admin Report issues fixed successfully!"
    echo "🔧 Changes made:"
    echo "   - Fixed data separation between staff and admin inputs"
    echo "   - Staff input shows original sales data"
    echo "   - Admin input shows bank transfer data"
    echo "   - Fixed horizontal and vertical scrolling"
    echo "   - Improved table layout and styling"
EOF

echo "🎉 Fix completed!" 