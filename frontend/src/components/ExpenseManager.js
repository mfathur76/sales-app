import React, { useState, useRef } from 'react';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import './ExpenseManager.css';

const ExpenseManager = ({ user }) => {
  const [activeTab, setActiveTab] = useState('form');
  const listRef = useRef();

  return (
    <div className="expense-manager-container">
      <div className="expense-manager-header">
        <h2>💰 Manajemen Pengeluaran</h2>
        <p>Kelola pengeluaran outlet dengan mudah</p>
      </div>

      {/* Tab Navigation */}
      <div className="expense-tabs">
        <button
          className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
          onClick={() => setActiveTab('form')}
        >
          📝 Catat Pengeluaran
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          📋 Daftar Pengeluaran
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'form' ? (
          <ExpenseForm 
            user={user} 
            onExpenseAdded={() => {
              // Refresh the list but stay on form tab
              if (listRef.current && listRef.current.loadExpenses) {
                listRef.current.loadExpenses();
              }
            }}
          />
        ) : (
          <ExpenseList ref={listRef} user={user} />
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;
