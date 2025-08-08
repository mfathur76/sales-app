import React, { useState } from 'react';
import SalesManager from './SalesManager';
import ExpenseCategoryManager from './ExpenseCategoryManager';
import ItemMasterManager from './ItemMasterManager';
import ExpenseVerification from './ExpenseVerification';
import ExpenseReports from './ExpenseReports';
import OutletManager from './OutletManager';
import UserManager from './UserManager';
import ChangePassword from './ChangePassword';
import './AdminDashboard.css';

const AdminDashboard = ({ admin }) => {
  const [activeTab, setActiveTab] = useState('sales');

  const tabs = [
    { id: 'sales', label: 'Sales Management', icon: '📊' },
    { id: 'expense-categories', label: 'Kategori Pengeluaran', icon: '🏷️' },
    { id: 'item-master', label: 'Item Master', icon: '📦' },
    { id: 'expense-verification', label: 'Verifikasi Pengeluaran', icon: '✅' },
    { id: 'expense-reports', label: 'Laporan Pengeluaran', icon: '📈' },
    { id: 'outlet-management', label: 'Manajemen Outlet', icon: '🏪' },
    { id: 'user-management', label: 'Manajemen User', icon: '👥' },
    { id: 'change-password', label: 'Ganti Password', icon: '🔐' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'sales':
        return <SalesManager user={admin} />;
      case 'expense-categories':
        return <ExpenseCategoryManager />;
      case 'item-master':
        return <ItemMasterManager />;
      case 'expense-verification':
        return <ExpenseVerification />;
      case 'expense-reports':
        return <ExpenseReports />;
      case 'outlet-management':
        return <OutletManager />;
      case 'user-management':
        return <UserManager />;
      case 'change-password':
        return <ChangePassword />;
      default:
        return <SalesManager user={admin} />;
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {admin?.name || 'Administrator'}</p>
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