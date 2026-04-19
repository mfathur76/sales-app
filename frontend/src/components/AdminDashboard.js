import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/salesApi';
import AdminSalesReport from './AdminSalesReport';
import ExpenseCategoryManager from './ExpenseCategoryManager';
import ItemMasterManager from './ItemMasterManager';
import ExpenseManagement from './ExpenseVerification';
import ExpenseReports from './ExpenseReports';
import OutletManager from './OutletManager';
import UserManager from './UserManager';
import ChangePassword from './ChangePassword';
import './AdminDashboard.css';

const AdminDashboard = ({ admin, onLogout }) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeTab, setActiveTab] = useState('sales-verification');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [bankTransferData, setBankTransferData] = useState({
    qrisBank: 0,
    gojekBank: 0,
    shopeeBank: 0,
    grabBank: 0,
    bcaBank: 0,
    mandiriBank: 0,
    notes: ''
  });
  const [filters, setFilters] = useState({
    start_date: today,
    end_date: today,
    outlet: '',
    status: ''
  });
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const tabs = [
    { id: 'sales-verification', label: 'Verifikasi Sales', icon: '🔍' },
    { id: 'sales-reports', label: 'Laporan Sales', icon: '📈' },
    { id: 'expense-categories', label: 'Kategori Pengeluaran', icon: '🏷️' },
    { id: 'item-master', label: 'Item Master', icon: '📦' },
    { id: 'expense-management', label: 'Kelola Pengeluaran', icon: '✏️' },
    { id: 'expense-reports', label: 'Laporan Pengeluaran', icon: '📈' },
    { id: 'outlet-management', label: 'Manajemen Outlet', icon: '🏪' },
    { id: 'user-management', label: 'Manajemen User', icon: '👥' },
    { id: 'change-password', label: 'Ganti Password', icon: '🔐' }
  ];

  useEffect(() => {
    if (activeTab === 'sales-verification') {
      fetchSales();
    }
  }, [filters, activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleBankTransferSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSale) return;

    try {
      setLoading(true);
      await adminApi.updateBankTransfer(
        selectedSale.outlet,
        selectedSale.date,
        bankTransferData
      );

      setSuccessMessage('Bank transfer amounts updated successfully!');
      setShowBankTransferModal(false);
      setSelectedSale(null);
      setBankTransferData({
        qrisBank: 0,
        gojekBank: 0,
        shopeeBank: 0,
        grabBank: 0,
        bcaBank: 0,
        mandiriBank: 0,
        notes: ''
      });

      // Refresh sales data
      fetchSales();
    } catch (error) {
      console.error('Error updating bank transfer:', error);
      setError(`Failed to update bank transfer: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openBankTransferModal = (sale) => {
    setSelectedSale(sale);
    setBankTransferData({
      qrisBank: sale.qrisBank || 0,
      gojekBank: sale.gojekBank || 0,
      shopeeBank: sale.shopeeBank || 0,
      grabBank: sale.grabBank || 0,
      bcaBank: sale.bcaBank || 0,
      mandiriBank: sale.mandiriBank || 0,
      notes: sale.notes || ''
    });
    setShowBankTransferModal(true);
  };

  const closeBankTransferModal = () => {
    setShowBankTransferModal(false);
    setSelectedSale(null);
    setBankTransferData({
      qrisBank: 0,
      gojekBank: 0,
      shopeeBank: 0,
      grabBank: 0,
      bcaBank: 0,
      mandiriBank: 0,
      notes: ''
    });
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

  const renderSalesVerification = () => (
    <div className="sales-verification-content">
      <div className="verification-header">
        <h1>Bank Transfer Verification</h1>
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
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
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

      {successMessage && (
        <div className="success-message">
          <h2>✅ Success</h2>
          <p>{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)}>Close</button>
        </div>
      )}

      {loading && (
        <div className="loading">Loading sales data...</div>
      )}

      {!loading && !error && (
        <div className="sales-list">
          <h2>Sales Records ({sales.length})</h2>
          {sales.length === 0 ? (
            <div className="no-data">No sales records found</div>
          ) : (
            <div className="sales-grid">
              {sales.map((sale, index) => (
                <div key={index} className="sale-card">
                  <div className="sale-header">
                    <h3>{sale.outletRef?.name || sale.outlet}</h3>
                    <span className={`status-badge status-${sale.status}`}>
                      {sale.status}
                    </span>
                  </div>

                  <div className="sale-details">
                    <p><strong>Date:</strong> {formatDate(sale.date)}</p>
                    <p><strong>Total Sales:</strong> {formatCurrency(sale.totalSales)}</p>

                    <div className="payment-breakdown">
                      <h4>Payment Methods:</h4>
                      <p>Cash: {formatCurrency(sale.cash)}</p>
                      <p>QRIS: {formatCurrency(sale.qris)}</p>
                      <p>Gojek: {formatCurrency(sale.gojek)}</p>
                      <p>Shopee: {formatCurrency(sale.shopee)}</p>
                      <p>Grab: {formatCurrency(sale.grab)}</p>
                    </div>

                    {sale.totalBank > 0 && (
                      <div className="bank-breakdown">
                        <h4>Digital Payment Bank Transfer:</h4>
                        <p>Total: {formatCurrency(sale.totalBank)}</p>
                        <p>Overall Percentage: {sale.overallPercent?.toFixed(2)}% (of digital sales)</p>

                        <div className="payment-percentages">
                          <h5>Per Payment Method:</h5>
                          {sale.qris > 0 && (
                            <p>QRIS: {sale.qrisPercent?.toFixed(2)}% ({formatCurrency(sale.qrisBank)} / {formatCurrency(sale.qris)})</p>
                          )}
                          {sale.gojek > 0 && (
                            <p>Gojek: {sale.gojekPercent?.toFixed(2)}% ({formatCurrency(sale.gojekBank)} / {formatCurrency(sale.gojek)})</p>
                          )}
                          {sale.shopee > 0 && (
                            <p>Shopee: {sale.shopeePercent?.toFixed(2)}% ({formatCurrency(sale.shopeeBank)} / {formatCurrency(sale.shopee)})</p>
                          )}
                          {sale.grab > 0 && (
                            <p>Grab: {sale.grabPercent?.toFixed(2)}% ({formatCurrency(sale.grabBank)} / {formatCurrency(sale.grab)})</p>
                          )}
                          {sale.bcaBank > 0 && (
                            <p>BCA: {formatCurrency(sale.bcaBank)} transfer</p>
                          )}
                          {sale.mandiriBank > 0 && (
                            <p>Mandiri: {formatCurrency(sale.mandiriBank)} transfer</p>
                          )}
                        </div>
                      </div>
                    )}

                    {sale.verifiedBy && (
                      <p><strong>Verified by:</strong> {sale.verifiedByRef?.name || sale.verifiedBy}</p>
                    )}

                    {sale.notes && (
                      <p><strong>Notes:</strong> {sale.notes}</p>
                    )}
                  </div>

                  <div className="sale-actions">
                    <button
                      className="btn-primary"
                      onClick={() => openBankTransferModal(sale)}
                      disabled={sale.status === 'approved'}
                    >
                      {sale.totalBank > 0 ? 'Edit Bank Transfer' : 'Input Bank Transfer'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Transfer Modal */}
      {showBankTransferModal && selectedSale && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Input Digital Payment Bank Transfer</h2>
              <button className="close-btn" onClick={closeBankTransferModal}>×</button>
            </div>

            <form onSubmit={handleBankTransferSubmit}>
              <div className="modal-body">
                <div className="sale-info">
                  <h3>{selectedSale.outletRef?.name || selectedSale.outlet}</h3>
                  <p>Date: {formatDate(selectedSale.date)}</p>
                  <p>Total Sales: {formatCurrency(selectedSale.totalSales)}</p>
                  <div className="cash-note">
                    <p><strong>💡 Note:</strong> Cash is received directly and doesn't require bank transfer.</p>
                  </div>
                </div>

                <div className="bank-inputs">
                  <h4>Digital Payment Bank Transfer Amounts:</h4>

                  <div className="input-group">
                    <label>QRIS Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.qrisBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        qrisBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Original: {formatCurrency(selectedSale.qris)}</small>
                  </div>

                  <div className="input-group">
                    <label>Gojek Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.gojekBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        gojekBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Original: {formatCurrency(selectedSale.gojek)}</small>
                  </div>

                  <div className="input-group">
                    <label>Shopee Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.shopeeBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        shopeeBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Original: {formatCurrency(selectedSale.shopee)}</small>
                  </div>

                  <div className="input-group">
                    <label>Grab Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.grabBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        grabBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Original: {formatCurrency(selectedSale.grab)}</small>
                  </div>

                  <div className="input-group">
                    <label>BCA Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.bcaBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        bcaBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Transfer to BCA account</small>
                  </div>

                  <div className="input-group">
                    <label>Mandiri Bank Transfer:</label>
                    <input
                      type="number"
                      step="0.01"
                      value={bankTransferData.mandiriBank}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        mandiriBank: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                    />
                    <small>Transfer to Mandiri account</small>
                  </div>

                  {/* Preview Percentages */}
                  <div className="preview-percentages">
                    <h4>Preview Percentages:</h4>
                    <div className="percentage-grid">
                      {selectedSale.qris > 0 && (
                        <div className="percentage-item">
                          <span>QRIS:</span>
                          <span className={bankTransferData.qrisBank > selectedSale.qris ? 'percentage-warning' : 'percentage-normal'}>
                            {((bankTransferData.qrisBank / selectedSale.qris) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {selectedSale.gojek > 0 && (
                        <div className="percentage-item">
                          <span>Gojek:</span>
                          <span className={bankTransferData.gojekBank > selectedSale.gojek ? 'percentage-warning' : 'percentage-normal'}>
                            {((bankTransferData.gojekBank / selectedSale.gojek) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {selectedSale.shopee > 0 && (
                        <div className="percentage-item">
                          <span>Shopee:</span>
                          <span className={bankTransferData.shopeeBank > selectedSale.shopee ? 'percentage-warning' : 'percentage-normal'}>
                            {((bankTransferData.shopeeBank / selectedSale.shopee) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {selectedSale.grab > 0 && (
                        <div className="percentage-item">
                          <span>Grab:</span>
                          <span className={bankTransferData.grabBank > selectedSale.grab ? 'percentage-warning' : 'percentage-normal'}>
                            {((bankTransferData.grabBank / selectedSale.grab) * 100).toFixed(2)}%
                          </span>
                        </div>
                      )}
                      {bankTransferData.bcaBank > 0 && (
                        <div className="percentage-item">
                          <span>BCA:</span>
                          <span className="percentage-normal">
                            {formatCurrency(bankTransferData.bcaBank)} transfer
                          </span>
                        </div>
                      )}
                      {bankTransferData.mandiriBank > 0 && (
                        <div className="percentage-item">
                          <span>Mandiri:</span>
                          <span className="percentage-normal">
                            {formatCurrency(bankTransferData.mandiriBank)} transfer
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="overall-preview">
                      <strong>Overall Digital Sales:</strong>
                      <span className="percentage-normal">
                        {(() => {
                          const totalDigital = selectedSale.qris + selectedSale.gojek + selectedSale.shopee + selectedSale.grab;
                          const totalBank = bankTransferData.qrisBank + bankTransferData.gojekBank + bankTransferData.shopeeBank + bankTransferData.grabBank + bankTransferData.bcaBank + bankTransferData.mandiriBank;
                          return totalDigital > 0 ? ((totalBank / totalDigital) * 100).toFixed(2) : '0.00';
                        })()}%
                      </span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Notes:</label>
                    <textarea
                      value={bankTransferData.notes}
                      onChange={(e) => setBankTransferData({
                        ...bankTransferData,
                        notes: e.target.value
                      })}
                      placeholder="Add any notes about this verification..."
                      rows="3"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeBankTransferModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Bank Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'sales-verification':
        return renderSalesVerification();
      case 'sales-reports':
        return <AdminSalesReport />;
      case 'expense-categories':
        return <ExpenseCategoryManager />;
      case 'item-master':
        return <ItemMasterManager />;
      case 'expense-management':
        return <ExpenseManagement />;
      case 'expense-reports':
        return <ExpenseReports />;
      case 'outlet-management':
        return <OutletManager />;
      case 'user-management':
        return <UserManager />;
      case 'change-password':
        return <ChangePassword />;
      default:
        return renderSalesVerification();
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Admin Dashboard</h1>
          <p>Welcome, {admin?.name || 'Administrator'}</p>
        </div>
        <button className="logout-btn" onClick={onLogout}>Logout</button>
      </div>

      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminDashboard; 