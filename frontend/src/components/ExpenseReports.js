import React, { useState, useEffect } from 'react';
import { expenseApi } from '../api/expenseApi';
import { authApi } from '../api/salesApi';
import './ExpenseReports.css';

const ExpenseReports = () => {
  const [activeReport, setActiveReport] = useState('weekly');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [filters, setFilters] = useState({
    weekStart: new Date().toISOString().split('T')[0],
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    loadOutlets();
  }, []);

  useEffect(() => {
    if (activeReport === 'weekly') {
      loadWeeklyReport();
    } else {
      loadMonthlyReport();
    }
  }, [activeReport, filters, selectedOutlets]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOutlets = async () => {
    try {
      const response = await authApi.getOutlets();
      if (response.success && response.data) {
        setOutlets(response.data);
        // Default to all outlets selected
        setSelectedOutlets(response.data.map(outlet => outlet.code));
      }
    } catch (error) {
      console.error('Error loading outlets:', error);
      setMessage({ type: 'error', text: 'Failed to load outlets' });
    }
  };

  const loadWeeklyReport = async () => {
    if (selectedOutlets.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one outlet for weekly report' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const weekStartDate = new Date(filters.weekStart);
      const data = await expenseApi.getWeeklyReport(selectedOutlets, weekStartDate);
      setWeeklyReport(data);
    } catch (error) {
      console.error('Error loading weekly report:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load weekly report' });
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    if (selectedOutlets.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one outlet for monthly report' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const data = await expenseApi.getMonthlyReport(selectedOutlets, filters.month, filters.year);
      setMonthlyReport(data);
    } catch (error) {
      console.error('Error loading monthly report:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to load monthly report' });
    } finally {
      setLoading(false);
    }
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

  const getMonthName = (month) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  };

  const handleOutletToggle = (outletCode) => {
    setSelectedOutlets(prev => {
      if (prev.includes(outletCode)) {
        return prev.filter(code => code !== outletCode);
      } else {
        return [...prev, outletCode];
      }
    });
  };

  const handleSelectAllOutlets = () => {
    setSelectedOutlets(outlets.map(outlet => outlet.code));
  };

  const handleDeselectAllOutlets = () => {
    setSelectedOutlets([]);
  };

  const renderTableReport = (report, reportType) => {
    if (!report || !report.tableData) return null;

    const { tableData, categoryTotals, outletTotals, totalExpense } = report;
    
    // Get unique categories and outlets for table structure
    const categories = [...new Set(tableData.map(item => item.category))].sort();
    const uniqueOutlets = [...new Set(tableData.map(item => item.outlet))].sort();

    return (
      <div className="table-report">
        <div className="report-summary">
          <div className="summary-item">
            <span className="label">Total Pengeluaran:</span>
            <span className="value">{formatCurrency(totalExpense)}</span>
          </div>
          <div className="summary-item">
            <span className="label">Jumlah Item:</span>
            <span className="value">{tableData.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Jumlah Kategori:</span>
            <span className="value">{categories.length}</span>
          </div>
          <div className="summary-item">
            <span className="label">Jumlah Outlet:</span>
            <span className="value">{uniqueOutlets.length}</span>
          </div>
        </div>

        <div className="table-container">
          <table className="expense-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Outlet</th>
                <th>Item</th>
                <th>Kategori</th>
                <th>Qty</th>
                <th>Harga Satuan</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{formatDate(item.date)}</td>
                  <td>{item.outlet}</td>
                  <td>{item.itemName}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.unitPrice)}</td>
                  <td className="total-cell">{formatCurrency(item.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td colSpan="7" className="total-label">Total Keseluruhan:</td>
                <td className="total-value">{formatCurrency(totalExpense)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Category Totals */}
        <div className="totals-section">
          <h4>Total per Kategori:</h4>
          <div className="totals-grid">
            {categoryTotals.map((category, index) => (
              <div key={index} className="total-item">
                <span className="total-label">{category.categoryName}:</span>
                <span className="total-value">{formatCurrency(category.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outlet Totals */}
        <div className="totals-section">
          <h4>Total per Outlet:</h4>
          <div className="totals-grid">
            {outletTotals.map((outlet, index) => (
              <div key={index} className="total-item">
                <span className="total-label">{outlet.outlet}:</span>
                <span className="total-value">{formatCurrency(outlet.totalAmount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="expense-reports">
      <div className="reports-header">
        <h2>Laporan Pengeluaran</h2>
        <div className="report-tabs">
          <button
            className={`tab-btn ${activeReport === 'weekly' ? 'active' : ''}`}
            onClick={() => setActiveReport('weekly')}
          >
            📅 Laporan Mingguan
          </button>
          <button
            className={`tab-btn ${activeReport === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveReport('monthly')}
          >
            📊 Laporan Bulanan
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filter Laporan</h3>
        
        {/* Outlet Selection */}
        <div className="outlet-filter">
          <label>Pilih Outlet:</label>
          <div className="outlet-buttons">
            <button 
              type="button" 
              className="outlet-btn select-all"
              onClick={handleSelectAllOutlets}
            >
              Pilih Semua
            </button>
            <button 
              type="button" 
              className="outlet-btn deselect-all"
              onClick={handleDeselectAllOutlets}
            >
              Hapus Semua
            </button>
          </div>
          <div className="outlet-checkboxes">
            {outlets.map(outlet => (
              <label key={outlet.code} className="outlet-checkbox">
                <input
                  type="checkbox"
                  checked={selectedOutlets.includes(outlet.code)}
                  onChange={() => handleOutletToggle(outlet.code)}
                />
                <span className="outlet-name">{outlet.name} ({outlet.code})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="filters-grid">
          {activeReport === 'weekly' && (
            <div className="filter-item">
              <label>Minggu Mulai:</label>
              <input
                type="date"
                value={filters.weekStart}
                onChange={(e) => setFilters({...filters, weekStart: e.target.value})}
              />
            </div>
          )}
          
          {activeReport === 'monthly' && (
            <>
              <div className="filter-item">
                <label>Bulan:</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({...filters, month: parseInt(e.target.value)})}
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                    <option key={month} value={month}>
                      {getMonthName(month)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <label>Tahun:</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({...filters, year: parseInt(e.target.value)})}
                >
                  {Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Memuat laporan...</div>
      ) : (
        <div className="report-container">
          {activeReport === 'weekly' 
            ? renderTableReport(weeklyReport, 'weekly')
            : renderTableReport(monthlyReport, 'monthly')
          }
        </div>
      )}
    </div>
  );
};

export default ExpenseReports;
