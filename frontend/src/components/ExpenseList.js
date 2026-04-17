import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseList.css';

const ExpenseList = forwardRef(({ user }, ref) => {
  const today = new Date().toISOString().split('T')[0];
  const [expenses, setExpenses] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingExpense, setEditingExpense] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [filters, setFilters] = useState({
    categoryId: '',
    startDate: today,
    endDate: today
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
      startDate: today,
      endDate: today
    });
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleDeleteExpense = async (expense) => {
    if (!window.confirm('Hapus data expense ini?')) return;

    try {
      await expenseApi.deleteExpense(expense.id);
      showMessage('success', 'Expense berhasil dihapus');
      await loadData();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showMessage('error', error.message || 'Gagal menghapus expense');
    }
  };

  const handleOpenEdit = (expense) => {
    setEditingExpense({
      id: expense.id,
      date: (expense.date || '').split('T')[0],
      quantity: expense.quantity,
      actualPrice: expense.actualPrice,
      notes: expense.notes || '',
      isCash: !!expense.isCash,
    });
  };

  const handleEditChange = (field, value) => {
    setEditingExpense((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    const quantity = Number(editingExpense.quantity);
    const actualPrice = Number(editingExpense.actualPrice);

    if (!editingExpense.date || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(actualPrice) || actualPrice <= 0) {
      showMessage('error', 'Tanggal, quantity, dan harga harus valid');
      return;
    }

    try {
      setSavingEdit(true);
      await expenseApi.updateExpense(editingExpense.id, {
        date: editingExpense.date,
        quantity,
        actualPrice,
        notes: editingExpense.notes,
        isCash: !!editingExpense.isCash,
      });

      setEditingExpense(null);
      showMessage('success', 'Expense berhasil diperbarui');
      await loadData();
    } catch (error) {
      console.error('Error updating expense:', error);
      showMessage('error', error.message || 'Gagal memperbarui expense');
    } finally {
      setSavingEdit(false);
    }
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
                      <th>Aksi</th>
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
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="action-btn edit"
                              onClick={() => handleOpenEdit(expense)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              onClick={() => handleDeleteExpense(expense)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="7" className="tfoot-label">Total Cash</td>
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
                      <th>Aksi</th>
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
                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="action-btn edit"
                              onClick={() => handleOpenEdit(expense)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              onClick={() => handleDeleteExpense(expense)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="7" className="tfoot-label">Total Non-Cash</td>
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

      {editingExpense && (
        <div className="expense-modal-overlay">
          <div className="expense-modal">
            <h3>Edit Expense</h3>

            <div className="expense-modal-form">
              <div className="filter-group">
                <label>Tanggal</label>
                <input
                  type="date"
                  value={editingExpense.date}
                  onChange={(e) => handleEditChange('date', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={editingExpense.quantity}
                  onChange={(e) => handleEditChange('quantity', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Harga Aktual</label>
                <input
                  type="number"
                  min="0"
                  value={editingExpense.actualPrice}
                  onChange={(e) => handleEditChange('actualPrice', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Pembayaran</label>
                <select
                  value={editingExpense.isCash ? 'cash' : 'non-cash'}
                  onChange={(e) => handleEditChange('isCash', e.target.value === 'cash')}
                >
                  <option value="cash">Cash</option>
                  <option value="non-cash">Non-Cash</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Catatan</label>
                <textarea
                  rows="3"
                  value={editingExpense.notes}
                  onChange={(e) => handleEditChange('notes', e.target.value)}
                />
              </div>

              <div className="expense-edit-total">
                Total: {formatCurrency(Number(editingExpense.quantity || 0) * Number(editingExpense.actualPrice || 0))}
              </div>

              <div className="expense-modal-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setEditingExpense(null)}
                  disabled={savingEdit}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="action-btn edit"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ExpenseList.displayName = 'ExpenseList';

export default ExpenseList;
