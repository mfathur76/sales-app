import React, { useState, useEffect } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseVerification.css';

const ExpenseVerification = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({
    status: 'pending',
    outlet: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadExpenses();
  }, [filters]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseApi.getAllExpenses(
        filters.outlet || undefined,
        undefined, // categoryId
        filters.startDate ? new Date(filters.startDate) : undefined,
        filters.endDate ? new Date(filters.endDate) : undefined,
        filters.status
      );
      setExpenses(data);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setMessage({ type: 'error', text: 'Failed to load expenses' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (expenseId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      await expenseApi.approveExpense(expenseId, userData.username);
      setMessage({ type: 'success', text: 'Expense approved successfully!' });
      loadExpenses();
    } catch (error) {
      console.error('Error approving expense:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to approve expense' });
    }
  };

  const handleReject = async (expenseId, reason) => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a rejection reason' });
      return;
    }

    try {
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      await expenseApi.rejectExpense(expenseId, userData.username, reason);
      setMessage({ type: 'success', text: 'Expense rejected successfully!' });
      loadExpenses();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to reject expense' });
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

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', text: 'Pending' },
      approved: { class: 'status-approved', text: 'Approved' },
      rejected: { class: 'status-rejected', text: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={`status-badge ${config.class}`}>{config.text}</span>;
  };

  const showRejectModal = (expenseId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (reason !== null) {
      handleReject(expenseId, reason);
    }
  };

  return (
    <div className="expense-verification">
      <div className="verification-header">
        <h2>Expense Verification</h2>
        <button onClick={loadExpenses} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-item">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="">All</option>
            </select>
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
            <label>Start Date:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            />
          </div>
          <div className="filter-item">
            <label>End Date:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <div className="no-expenses">No expenses found</div>
      ) : (
        <div className="expenses-grid">
          {expenses.map(expense => (
            <div key={expense.id} className="expense-card">
              <div className="expense-header">
                <h3>{expense.itemRef?.name || 'Unknown Item'}</h3>
                {getStatusBadge(expense.status)}
              </div>
              
              <div className="expense-details">
                <div className="detail-row">
                  <span className="label">Outlet:</span>
                  <span className="value">{expense.outlet}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Category:</span>
                  <span className="value">{expense.itemRef?.categoryRef?.name || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{formatDate(expense.date)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Quantity:</span>
                  <span className="value">{expense.quantity} {expense.itemRef?.unit || 'unit'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Price:</span>
                  <span className="value">{formatCurrency(expense.actualPrice)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Total:</span>
                  <span className="value total">{formatCurrency(expense.totalPrice)}</span>
                </div>
                {expense.notes && (
                  <div className="detail-row">
                    <span className="label">Notes:</span>
                    <span className="value notes">{expense.notes}</span>
                  </div>
                )}
                {expense.rejectionReason && (
                  <div className="detail-row">
                    <span className="label">Rejection Reason:</span>
                    <span className="value rejection-reason">{expense.rejectionReason}</span>
                  </div>
                )}
              </div>

              {expense.status === 'pending' && (
                <div className="expense-actions">
                  <button
                    className="approve-btn"
                    onClick={() => handleApprove(expense.id)}
                  >
                    ✅ Approve
                  </button>
                  <button
                    className="reject-btn"
                    onClick={() => showRejectModal(expense.id)}
                  >
                    ❌ Reject
                  </button>
                </div>
              )}

              {expense.status === 'approved' && (
                <div className="approval-info">
                  <p>Approved by: {expense.approvedByRef?.name || expense.approvedBy}</p>
                  <p>Approved at: {expense.approvedAt ? formatDate(expense.approvedAt) : 'N/A'}</p>
                </div>
              )}

              {expense.status === 'rejected' && (
                <div className="rejection-info">
                  <p>Rejected by: {expense.approvedByRef?.name || expense.approvedBy}</p>
                  <p>Rejected at: {expense.approvedAt ? formatDate(expense.approvedAt) : 'N/A'}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExpenseVerification;
