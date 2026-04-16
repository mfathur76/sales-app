import React, { useState, useEffect } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseReport.css';

const ExpenseReport = ({ user }) => {
  const [reportType, setReportType] = useState('weekly');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Weekly report state
  const [weekStart, setWeekStart] = useState('');
  
  // Monthly report state
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    // Set default week start to current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    setWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (reportType === 'weekly' && weekStart) {
      loadWeeklyReport();
    } else if (reportType === 'monthly') {
      loadMonthlyReport();
    }
  }, [reportType, weekStart, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadWeeklyReport = async () => {
    if (!weekStart) return;
    
    setLoading(true);
    try {
      const data = await expenseApi.getWeeklyReport(user?.outlet, weekStart);
      setReportData(data);
    } catch (error) {
      console.error('Error loading weekly report:', error);
      showMessage('error', 'Gagal memuat laporan mingguan');
    } finally {
      setLoading(false);
    }
  };

  const loadMonthlyReport = async () => {
    setLoading(true);
    try {
      const data = await expenseApi.getMonthlyReport(user?.outlet, month, year);
      setReportData(data);
    } catch (error) {
      console.error('Error loading monthly report:', error);
      showMessage('error', 'Gagal memuat laporan bulanan');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getMonthName = (monthNumber) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return months[monthNumber - 1];
  };

  const renderWeeklyReport = () => {
    if (!reportData) return null;

    return (
      <div className="report-content">
        <div className="report-header">
          <h3>Laporan Mingguan</h3>
          <p>
            {formatDate(reportData.weekStart)} - {formatDate(reportData.weekEnd)}
          </p>
        </div>

        <div className="report-summary">
          <div className="summary-card total">
            <div className="summary-icon">💰</div>
            <div className="summary-content">
              <div className="summary-label">Total Pengeluaran</div>
              <div className="summary-value">{formatCurrency(reportData.totalExpense)}</div>
            </div>
          </div>
        </div>

        <div className="categories-section">
          <h4>Pengeluaran per Kategori</h4>
          {reportData.expensesByCategory.map((category, index) => (
            <div key={index} className="category-card">
              <div className="category-header">
                <h5>{category.categoryName}</h5>
                <div className="category-total">
                  {formatCurrency(category.totalAmount)}
                </div>
              </div>
              
              <div className="category-stats">
                <span className="stat-item">
                  {category.itemCount} item
                </span>
              </div>

              <div className="items-list">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="item-row">
                    <div className="item-info">
                      <span className="item-name">{item.description}</span>
                      <span className="item-date">{formatDate(item.date)}</span>
                    </div>
                    <div className="item-details">
                      <span className="item-quantity">{item.quantity}</span>
                      <span className="item-price">{formatCurrency(item.unitPrice)}</span>
                      <span className="item-total">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthlyReport = () => {
    if (!reportData) return null;

    return (
      <div className="report-content">
        <div className="report-header">
          <h3>Laporan Bulanan</h3>
          <p>{getMonthName(reportData.month)} {reportData.year}</p>
        </div>

        <div className="report-summary">
          <div className="summary-card total">
            <div className="summary-icon">💰</div>
            <div className="summary-content">
              <div className="summary-label">Total Pengeluaran</div>
              <div className="summary-value">{formatCurrency(reportData.totalExpense)}</div>
            </div>
          </div>
        </div>

        <div className="categories-section">
          <h4>Pengeluaran per Kategori</h4>
          {reportData.expensesByCategory.map((category, index) => (
            <div key={index} className="category-card">
              <div className="category-header">
                <h5>{category.categoryName}</h5>
                <div className="category-total">
                  {formatCurrency(category.totalAmount)}
                </div>
              </div>
              
              <div className="category-stats">
                <span className="stat-item">
                  {category.itemCount} item
                </span>
              </div>

              <div className="items-list">
                {category.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="item-row">
                    <div className="item-info">
                      <span className="item-name">{item.description}</span>
                      <span className="item-date">{formatDate(item.date)}</span>
                    </div>
                    <div className="item-details">
                      <span className="item-quantity">{item.quantity}</span>
                      <span className="item-price">{formatCurrency(item.unitPrice)}</span>
                      <span className="item-total">{formatCurrency(item.totalPrice)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="expense-report-container">
      <div className="expense-report-header">
        <h2>📊 Laporan Pengeluaran</h2>
        <p>Lihat laporan pengeluaran outlet secara detail</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Report Type Selector */}
      <div className="report-type-selector">
        <button
          className={`type-btn ${reportType === 'weekly' ? 'active' : ''}`}
          onClick={() => setReportType('weekly')}
        >
          📅 Laporan Mingguan
        </button>
        <button
          className={`type-btn ${reportType === 'monthly' ? 'active' : ''}`}
          onClick={() => setReportType('monthly')}
        >
          📊 Laporan Bulanan
        </button>
      </div>

      {/* Report Controls */}
      <div className="report-controls">
        {reportType === 'weekly' ? (
          <div className="control-group">
            <label>Minggu Mulai:</label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => setWeekStart(e.target.value)}
              className="control-input"
            />
          </div>
        ) : (
          <div className="controls-row">
            <div className="control-group">
              <label>Bulan:</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="control-select"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{getMonthName(m)}</option>
                ))}
              </select>
            </div>
            <div className="control-group">
              <label>Tahun:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="control-select"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="report-body">
        {loading ? (
          <div className="loading">Memuat laporan...</div>
        ) : (
          <>
            {reportType === 'weekly' ? renderWeeklyReport() : renderMonthlyReport()}
            
            {!reportData && !loading && (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <h3>Tidak ada data</h3>
                <p>Tidak ada data pengeluaran untuk periode yang dipilih</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpenseReport;
