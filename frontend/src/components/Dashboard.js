import React, { useState, useEffect } from 'react';
import { salesApi } from '../api/salesApi';
import './Dashboard.css';

const Dashboard = ({ user }) => {
  const formatDateInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const now = new Date();
  const monthStart = formatDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = formatDateInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    start_date: monthStart,
    end_date: monthEnd,
    outlet: user?.outlet || ''
  });
  const [, setOutletOptions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadStats();
    loadOutletOptions();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await salesApi.getSalesStats(filters);
      
      // Handle different response formats
      if (response.success && response.data) {
        setStats(response.data);
      } else if (response && typeof response === 'object') {
        setStats(response);
      } else {
        setStats(null);
      }
      setError('');
    } catch (err) {
      setError('Gagal memuat statistik');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadOutletOptions = async () => {
    try {
      const response = await salesApi.getOutletOptions();
      
      // Handle different response formats
      if (response.success && response.data) {
        setOutletOptions(response.data);
      } else if (Array.isArray(response)) {
        setOutletOptions(response);
      } else {
        setOutletOptions([]);
      }
    } catch (err) {
      console.error('Error loading outlet options:', err);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      start_date: monthStart,
      end_date: monthEnd,
      outlet: user?.outlet || ''
    });
  };

  const getPaymentMethodPercentage = (amount, total) => {
    if (total === 0) return 0;
    return ((amount / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="mobile-dashboard">
        <div className="mobile-loading">
          <div className="loading-spinner">⏳</div>
          <p>Memuat statistik...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h2>📊 Dashboard</h2>
        <button onClick={loadStats} className="refresh-btn">
          🔄
        </button>
      </div>

      {/* Quick Filters */}
      <div className="quick-filters">
        <div className="filter-row">
          <div className="filter-item">
            <label>Dari:</label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
              className="filter-input"
            />
          </div>
          <div className="filter-item">
            <label>Sampai:</label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
        <button onClick={clearFilters} className="clear-btn">
          🗑️ Clear
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mobile-error">
          ❌ {error}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <>
          {/* Overview Cards */}
          <div className="overview-cards">
            <div className="overview-card primary">
              <div className="card-icon">💰</div>
              <div className="card-content">
                <div className="card-value">{formatCurrency(stats.total_revenue)}</div>
                <div className="card-label">Total Revenue</div>
                <div className="card-subtitle">{formatNumber(stats.total_sales)} records</div>
              </div>
            </div>

            <div className="overview-card success">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <div className="card-value">{formatCurrency(stats.average_daily_sales)}</div>
                <div className="card-label">Rata-rata Harian</div>
                <div className="card-subtitle">per hari</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="dashboard-tabs">
            <button 
              className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
              onClick={() => setActiveTab('payments')}
            >
              💳 Payments
            </button>
            <button 
              className={`tab-btn ${activeTab === 'outlets' ? 'active' : ''}`}
              onClick={() => setActiveTab('outlets')}
            >
              🏪 Outlets
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'overview' && (
              <div className="overview-tab">
                <div className="summary-stats">
                  <div className="summary-item">
                    <span className="summary-icon">💵</span>
                    <span className="summary-label">Cash</span>
                    <span className="summary-value">{formatCurrency(stats.total_cash)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">📱</span>
                    <span className="summary-label">QRIS</span>
                    <span className="summary-value">{formatCurrency(stats.total_qris)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🟢</span>
                    <span className="summary-label">Gojek</span>
                    <span className="summary-value">{formatCurrency(stats.total_gojek)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🟠</span>
                    <span className="summary-label">Shopee</span>
                    <span className="summary-value">{formatCurrency(stats.total_shopee)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-icon">🟢</span>
                    <span className="summary-label">Grab</span>
                    <span className="summary-value">{formatCurrency(stats.total_grab)}</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="payments-tab">
                <div className="payment-methods-list">
                  <div className="payment-method-item">
                    <div className="payment-header">
                      <span className="payment-icon">💵</span>
                      <span className="payment-name">Cash</span>
                      <span className="payment-amount">{formatCurrency(stats.total_cash)}</span>
                    </div>
                    <div className="payment-bar">
                      <div 
                        className="payment-progress"
                        style={{ 
                          width: `${getPaymentMethodPercentage(stats.total_cash, stats.total_revenue)}%`,
                          backgroundColor: '#10B981'
                        }}
                      ></div>
                    </div>
                    <div className="payment-percentage">
                      {getPaymentMethodPercentage(stats.total_cash, stats.total_revenue)}%
                    </div>
                  </div>

                  <div className="payment-method-item">
                    <div className="payment-header">
                      <span className="payment-icon">📱</span>
                      <span className="payment-name">QRIS</span>
                      <span className="payment-amount">{formatCurrency(stats.total_qris)}</span>
                    </div>
                    <div className="payment-bar">
                      <div 
                        className="payment-progress"
                        style={{ 
                          width: `${getPaymentMethodPercentage(stats.total_qris, stats.total_revenue)}%`,
                          backgroundColor: '#3B82F6'
                        }}
                      ></div>
                    </div>
                    <div className="payment-percentage">
                      {getPaymentMethodPercentage(stats.total_qris, stats.total_revenue)}%
                    </div>
                  </div>

                  <div className="payment-method-item">
                    <div className="payment-header">
                      <span className="payment-icon">🟢</span>
                      <span className="payment-name">Gojek</span>
                      <span className="payment-amount">{formatCurrency(stats.total_gojek)}</span>
                    </div>
                    <div className="payment-bar">
                      <div 
                        className="payment-progress"
                        style={{ 
                          width: `${getPaymentMethodPercentage(stats.total_gojek, stats.total_revenue)}%`,
                          backgroundColor: '#10B981'
                        }}
                      ></div>
                    </div>
                    <div className="payment-percentage">
                      {getPaymentMethodPercentage(stats.total_gojek, stats.total_revenue)}%
                    </div>
                  </div>

                  <div className="payment-method-item">
                    <div className="payment-header">
                      <span className="payment-icon">🟠</span>
                      <span className="payment-name">Shopee</span>
                      <span className="payment-amount">{formatCurrency(stats.total_shopee)}</span>
                    </div>
                    <div className="payment-bar">
                      <div 
                        className="payment-progress"
                        style={{ 
                          width: `${getPaymentMethodPercentage(stats.total_shopee, stats.total_revenue)}%`,
                          backgroundColor: '#F59E0B'
                        }}
                      ></div>
                    </div>
                    <div className="payment-percentage">
                      {getPaymentMethodPercentage(stats.total_shopee, stats.total_revenue)}%
                    </div>
                  </div>

                  <div className="payment-method-item">
                    <div className="payment-header">
                      <span className="payment-icon">🟢</span>
                      <span className="payment-name">Grab</span>
                      <span className="payment-amount">{formatCurrency(stats.total_grab)}</span>
                    </div>
                    <div className="payment-bar">
                      <div 
                        className="payment-progress"
                        style={{ 
                          width: `${getPaymentMethodPercentage(stats.total_grab, stats.total_revenue)}%`,
                          backgroundColor: '#10B981'
                        }}
                      ></div>
                    </div>
                    <div className="payment-percentage">
                      {getPaymentMethodPercentage(stats.total_grab, stats.total_revenue)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'outlets' && (
              <div className="outlets-tab">
                <div className="outlets-list">
                  {stats.outlet_breakdown.map((outlet, index) => (
                    <div key={index} className="outlet-item">
                      <div className="outlet-header">
                        <div className="outlet-info">
                          <span className="outlet-name">{outlet.outlet}</span>
                          <span className="outlet-rank">#{index + 1}</span>
                        </div>
                        <div className="outlet-revenue">
                          {formatCurrency(outlet.total_revenue)}
                        </div>
                      </div>
                      <div className="outlet-details">
                        <span className="outlet-records">{outlet.total_sales} records</span>
                        <span className="outlet-percentage">
                          {((outlet.total_revenue / stats.total_revenue) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="outlet-progress">
                        <div 
                          className="outlet-progress-bar"
                          style={{ 
                            width: `${(outlet.total_revenue / stats.total_revenue) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard; 