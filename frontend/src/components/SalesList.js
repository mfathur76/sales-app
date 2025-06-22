import React, { useState, useEffect } from 'react';
import { salesApi } from '../api/salesApi';
import './SalesList.css';

const SalesList = ({ user }) => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    outlet: user?.outlet || ''
  });
  const [outletOptions, setOutletOptions] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Edit state
  const [editingSale, setEditingSale] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadSales();
    loadOutletOptions();
  }, [filters]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const response = await salesApi.getSales(filters);
      
      // Handle different response formats
      if (response.success && response.data) {
        setSales(response.data);
      } else if (Array.isArray(response)) {
        setSales(response);
      } else {
        setSales([]);
      }
      setError('');
    } catch (err) {
      setError('Gagal memuat data penjualan');
      console.error('Error loading sales:', err);
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

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      start_date: '',
      end_date: '',
      outlet: user?.outlet || ''
    });
  };

  const handleDelete = async (outlet, date) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
      try {
        await salesApi.deleteSale(outlet, date);
        showMessage('success', 'Data berhasil dihapus');
        loadSales(); // Reload data
      } catch (err) {
        showMessage('error', 'Gagal menghapus data');
        console.error('Error deleting sale:', err);
      }
    }
  };

  const handleEdit = (sale) => {
    setEditingSale({ ...sale });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSale) return;
    
    try {
      await salesApi.updateSale(editingSale.outlet, editingSale.date, editingSale);
      showMessage('success', 'Data berhasil diperbarui');
      setShowEditModal(false);
      setEditingSale(null);
      loadSales(); // Reload data
    } catch (err) {
      showMessage('error', 'Gagal memperbarui data');
      console.error('Error updating sale:', err);
    }
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingSale(null);
  };

  const handleEditChange = (field, value) => {
    setEditingSale(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  if (loading) {
    return (
      <div className="mobile-sales-list">
        <div className="mobile-loading">
          <div className="loading-spinner">⏳</div>
          <p>Memuat data penjualan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-sales-list">
      {/* Header */}
      <div className="sales-header">
        <h2>📊 Data Penjualan</h2>
        <button onClick={loadSales} className="refresh-btn">
          🔄
        </button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`mobile-message ${message.type}`}>
          {message.text}
        </div>
      )}

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

      {/* Sales Cards */}
      {sales.length === 0 ? (
        <div className="no-data">
          <div className="no-data-icon">📭</div>
          <h3>Tidak ada data</h3>
          <p>Belum ada data penjualan untuk periode yang dipilih</p>
        </div>
      ) : (
        <>
          <div className="sales-cards">
            {sales.map((sale, index) => (
              <div key={index} className="sale-card">
                <div className="sale-header">
                  <div className="sale-info">
                    <span className="sale-outlet">🏪 {sale.outlet}</span>
                    <span className="sale-date">📅 {formatDate(sale.date)}</span>
                  </div>
                  <div className="sale-actions">
                    <button
                      onClick={() => handleEdit(sale)}
                      className="edit-btn"
                      title="Edit data"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(sale.outlet, sale.date)}
                      className="delete-btn"
                      title="Hapus data"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="sale-payments">
                  <div className="payment-row">
                    <span className="payment-icon">💵</span>
                    <span className="payment-label">Cash</span>
                    <span className="payment-amount">{formatCurrency(sale.cash)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="payment-icon">📱</span>
                    <span className="payment-label">QRIS</span>
                    <span className="payment-amount">{formatCurrency(sale.qris)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="payment-icon">🟢</span>
                    <span className="payment-label">Gojek</span>
                    <span className="payment-amount">{formatCurrency(sale.gojek)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="payment-icon">🟠</span>
                    <span className="payment-label">Shopee</span>
                    <span className="payment-amount">{formatCurrency(sale.shopee)}</span>
                  </div>
                  <div className="payment-row">
                    <span className="payment-icon">🟢</span>
                    <span className="payment-label">Grab</span>
                    <span className="payment-amount">{formatCurrency(sale.grab)}</span>
                  </div>
                </div>

                <div className="sale-total">
                  <span className="total-label">Total</span>
                  <span className="total-amount">{formatCurrency(sale.total_sales)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="summary-section">
            <div className="summary-card">
              <h3>📈 Ringkasan</h3>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-label">Total Records</span>
                  <span className="stat-value">{sales.length}</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Total Revenue</span>
                  <span className="stat-value">
                    {formatCurrency(sales.reduce((sum, sale) => sum + sale.total_sales, 0))}
                  </span>
                </div>
                <div className="summary-stat">
                  <span className="stat-label">Rata-rata per Record</span>
                  <span className="stat-value">
                    {formatCurrency(sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.total_sales, 0) / sales.length : 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingSale && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <div className="edit-modal-header">
              <h3>✏️ Edit Data Penjualan</h3>
              <button onClick={handleCancelEdit} className="close-btn">✕</button>
            </div>
            
            <div className="edit-modal-content">
              <div className="edit-info">
                <span className="edit-outlet">🏪 {editingSale.outlet}</span>
                <span className="edit-date">📅 {formatDate(editingSale.date)}</span>
              </div>
              
              <div className="edit-payments">
                <div className="edit-payment-row">
                  <span className="edit-payment-icon">💵</span>
                  <span className="edit-payment-label">Cash</span>
                  <input
                    type="number"
                    value={editingSale.cash}
                    onChange={(e) => handleEditChange('cash', e.target.value)}
                    className="edit-payment-input"
                  />
                </div>
                <div className="edit-payment-row">
                  <span className="edit-payment-icon">📱</span>
                  <span className="edit-payment-label">QRIS</span>
                  <input
                    type="number"
                    value={editingSale.qris}
                    onChange={(e) => handleEditChange('qris', e.target.value)}
                    className="edit-payment-input"
                  />
                </div>
                <div className="edit-payment-row">
                  <span className="edit-payment-icon">🟢</span>
                  <span className="edit-payment-label">Gojek</span>
                  <input
                    type="number"
                    value={editingSale.gojek}
                    onChange={(e) => handleEditChange('gojek', e.target.value)}
                    className="edit-payment-input"
                  />
                </div>
                <div className="edit-payment-row">
                  <span className="edit-payment-icon">🟠</span>
                  <span className="edit-payment-label">Shopee</span>
                  <input
                    type="number"
                    value={editingSale.shopee}
                    onChange={(e) => handleEditChange('shopee', e.target.value)}
                    className="edit-payment-input"
                  />
                </div>
                <div className="edit-payment-row">
                  <span className="edit-payment-icon">🟢</span>
                  <span className="edit-payment-label">Grab</span>
                  <input
                    type="number"
                    value={editingSale.grab}
                    onChange={(e) => handleEditChange('grab', e.target.value)}
                    className="edit-payment-input"
                  />
                </div>
              </div>
              
              <div className="edit-total">
                <span className="edit-total-label">Total</span>
                <span className="edit-total-amount">
                  {formatCurrency(editingSale.cash + editingSale.qris + editingSale.gojek + editingSale.shopee + editingSale.grab)}
                </span>
              </div>
            </div>
            
            <div className="edit-modal-actions">
              <button onClick={handleCancelEdit} className="cancel-btn">
                ❌ Batal
              </button>
              <button onClick={handleSaveEdit} className="save-btn">
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList; 