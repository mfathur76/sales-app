import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseList.css';

const ExpenseList = forwardRef(({ user }, ref) => {
  const [expenses, setExpenses] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filters, setFilters] = useState({
    categoryId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadData();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setLoading(true);
      const [expensesData, itemsData, categoriesData] = await Promise.all([
        expenseApi.getExpenses(filters),
        expenseApi.getItems(),
        expenseApi.getCategories()
      ]);
      setExpenses(expensesData);
      setItems(itemsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setMessage({ type: 'error', text: 'Failed to load expenses' });
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    loadExpenses: loadData
  }));

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      categoryId: '',
      startDate: '',
      endDate: ''
    });
  };

  const itemMap = items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {});

  const categoryMap = categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="expense-list">
        <div className="loading">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="expense-list">
      <div className="expense-list-header">
        <h2>Expense List</h2>
        <p>View and manage your expense records</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group">
            <label htmlFor="categoryFilter">Category:</label>
            <select
              id="categoryFilter"
              value={filters.categoryId}
              onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="endDate">End Date:</label>
            <input
              type="date"
              id="endDate"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
            />
          </div>

          <button onClick={clearFilters} className="clear-filters-btn">
            Clear Filters
          </button>
        </div>
      </div>

      {/* Expense Tables - Separated by Payment Type */}
      {expenses.length === 0 ? (
        <div className="no-expenses">
          <p>No expenses found matching your criteria.</p>
        </div>
      ) : (
        <>
          {/* Cash Expenses */}
          {expenses.filter(exp => exp.isCash).length > 0 && (
            <div className="payment-section">
              <h3 className="payment-title">Pembayaran Cash</h3>
              <div className="table-container">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Item</th>
                      <th>Kategori</th>
                      <th>Satuan</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(exp => exp.isCash).map(expense => (
                      <tr key={expense.id}>
                        <td>{new Date(expense.date).toLocaleDateString('id-ID')}</td>
                        <td>{itemMap[expense.itemId]?.name || '-'}</td>
                        <td>{categoryMap[itemMap[expense.itemId]?.categoryId]?.name || '-'}</td>
                        <td>{itemMap[expense.itemId]?.unit || '-'}</td>
                        <td>{expense.quantity}</td>
                        <td>{formatCurrency(expense.actualPrice)}</td>
                        <td className="cell-total">{formatCurrency(expense.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="6" className="tfoot-label">Total Cash</td>
                      <td className="tfoot-total">
                        {formatCurrency(expenses.filter(exp => exp.isCash).reduce((sum, exp) => sum + exp.totalPrice, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Non-Cash Expenses */}
          {expenses.filter(exp => !exp.isCash).length > 0 && (
            <div className="payment-section">
              <h3 className="payment-title">Pembayaran Non-Cash</h3>
              <div className="table-container">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Item</th>
                      <th>Kategori</th>
                      <th>Satuan</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.filter(exp => !exp.isCash).map(expense => (
                      <tr key={expense.id}>
                        <td>{new Date(expense.date).toLocaleDateString('id-ID')}</td>
                        <td>{itemMap[expense.itemId]?.name || '-'}</td>
                        <td>{categoryMap[itemMap[expense.itemId]?.categoryId]?.name || '-'}</td>
                        <td>{itemMap[expense.itemId]?.unit || '-'}</td>
                        <td>{expense.quantity}</td>
                        <td>{formatCurrency(expense.actualPrice)}</td>
                        <td className="cell-total">{formatCurrency(expense.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="6" className="tfoot-label">Total Non-Cash</td>
                      <td className="tfoot-total">
                        {formatCurrency(expenses.filter(exp => !exp.isCash).reduce((sum, exp) => sum + exp.totalPrice, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Grand Total */}
          <div className="grand-total-section">
            <div className="grand-total-card">
              <div className="grand-total-row">
                <span>Total Cash:</span>
                <span className="grand-total-cash">
                  {formatCurrency(expenses.filter(exp => exp.isCash).reduce((sum, exp) => sum + exp.totalPrice, 0))}
                </span>
              </div>
              <div className="grand-total-row">
                <span>Total Non-Cash:</span>
                <span className="grand-total-noncash">
                  {formatCurrency(expenses.filter(exp => !exp.isCash).reduce((sum, exp) => sum + exp.totalPrice, 0))}
                </span>
              </div>
              <div className="grand-total-row grand-total-final">
                <span>Total Keseluruhan:</span>
                <span className="grand-total-final-value">
                  {formatCurrency(expenses.reduce((sum, exp) => sum + exp.totalPrice, 0))}
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="expense-summary">
          <h3>Summary</h3>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Expenses:</span>
              <span className="stat-value">{expenses.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Total Amount:</span>
              <span className="stat-value">
                {formatCurrency(expenses.reduce((sum, exp) => sum + exp.totalPrice, 0))}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ExpenseList.displayName = 'ExpenseList';

export default ExpenseList;
