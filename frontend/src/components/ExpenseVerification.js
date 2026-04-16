import React, { useEffect, useMemo, useState } from 'react';
import { expenseApi } from '../api/expenseApi';
import { authApi } from '../api/salesApi';
import './ExpenseVerification.css';

const defaultFormState = {
  outlet: '',
  itemId: '',
  date: '',
  quantity: '',
  actualPrice: '',
  notes: '',
  isCash: true,
};

const ExpenseManagement = () => {
  const [expenses, setExpenses] = useState([]);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [outlets, setOutlets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [formData, setFormData] = useState(defaultFormState);
  const [filters, setFilters] = useState({
    outlet: '',
    categoryId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    loadLookups();
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemMap = useMemo(() => items.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {}), [items]);

  const categoryMap = useMemo(() => categories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {}), [categories]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const loadLookups = async () => {
    try {
      const [itemsData, categoriesData, outletResponse] = await Promise.all([
        expenseApi.getItems(),
        expenseApi.getCategories(),
        authApi.getOutlets(),
      ]);

      setItems(itemsData || []);
      setCategories(categoriesData || []);
      setOutlets(outletResponse?.data || outletResponse || []);
    } catch (error) {
      console.error('Error loading expense lookups:', error);
      showMessage('error', 'Gagal memuat data master pengeluaran');
    }
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await expenseApi.getAllExpenses(
        filters.outlet || undefined,
        filters.categoryId || undefined,
        filters.startDate ? new Date(filters.startDate) : undefined,
        filters.endDate ? new Date(filters.endDate) : undefined,
      );
      setExpenses(data || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      showMessage('error', 'Gagal memuat pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount || 0);
  };

  const openEditModal = (expense) => {
    setSelectedExpense(expense);
    setFormData({
      outlet: expense.outlet || '',
      itemId: expense.itemId || '',
      date: expense.date || '',
      quantity: expense.quantity?.toString() || '',
      actualPrice: expense.actualPrice?.toString() || '',
      notes: expense.notes || '',
      isCash: expense.isCash ?? true,
    });
  };

  const closeEditModal = () => {
    setSelectedExpense(null);
    setFormData(defaultFormState);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selectedExpense) return;

    if (!formData.outlet || !formData.itemId || !formData.date || !formData.quantity || !formData.actualPrice) {
      showMessage('error', 'Outlet, item, tanggal, qty, dan harga wajib diisi');
      return;
    }

    try {
      setSaving(true);
      await expenseApi.updateExpense(selectedExpense.id, {
        outlet: formData.outlet,
        itemId: formData.itemId,
        date: formData.date,
        quantity: parseFloat(formData.quantity),
        actualPrice: parseFloat(formData.actualPrice),
        notes: formData.notes,
        isCash: formData.isCash,
      });

      showMessage('success', 'Pengeluaran berhasil diperbarui');
      closeEditModal();
      await loadExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      showMessage('error', error.message || 'Gagal memperbarui pengeluaran');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    if (!window.confirm('Hapus pengeluaran ini?')) {
      return;
    }

    try {
      setSaving(true);
      await expenseApi.deleteExpense(expenseId);
      if (selectedExpense?.id === expenseId) {
        closeEditModal();
      }
      showMessage('success', 'Pengeluaran berhasil dihapus');
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      showMessage('error', error.message || 'Gagal menghapus pengeluaran');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expense-verification">
      <div className="verification-header">
        <div>
          <h2>Kelola Pengeluaran</h2>
          <p className="verification-subtitle">Pengeluaran tidak lagi melalui approval. Admin bisa langsung edit atau hapus data yang sudah tercatat.</p>
        </div>
        <button onClick={loadExpenses} className="refresh-btn" disabled={loading}>
          🔄 Refresh
        </button>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="filters-section">
        <h3>Filters</h3>
        <div className="filters-grid">
          <div className="filter-item">
            <label>Outlet:</label>
            <select
              value={filters.outlet}
              onChange={(e) => setFilters({...filters, outlet: e.target.value})}
            >
              <option value="">Semua outlet</option>
              {outlets.map((outlet) => (
                <option key={outlet.code} value={outlet.code}>{outlet.name} ({outlet.code})</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>Kategori:</label>
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({...filters, categoryId: e.target.value})}
            >
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
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
          {expenses.map((expense) => {
            const item = itemMap[expense.itemId];
            const category = categoryMap[item?.categoryId];

            return (
              <div key={expense.id} className="expense-card">
                <div className="expense-header">
                  <div>
                    <h3>{item?.name || 'Unknown Item'}</h3>
                    <p className="expense-subtitle">{category?.name || 'Tanpa kategori'}</p>
                  </div>
                  <span className={`payment-badge ${expense.isCash ? 'cash' : 'noncash'}`}>
                    {expense.isCash ? 'Cash' : 'Non-Cash'}
                  </span>
                </div>

                <div className="expense-details">
                  <div className="detail-row">
                    <span className="label">Outlet:</span>
                    <span className="value">{expense.outlet}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Date:</span>
                    <span className="value">{formatDate(expense.date)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">Quantity:</span>
                    <span className="value">{expense.quantity} {item?.unit || 'unit'}</span>
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
                  <div className="detail-row">
                    <span className="label">Tercatat oleh:</span>
                    <span className="value">{expense.createdBy || '-'}</span>
                  </div>
                </div>

                <div className="expense-actions">
                  <button className="edit-btn" onClick={() => openEditModal(expense)}>
                    ✏️ Edit
                  </button>
                  <button className="delete-btn" onClick={() => handleDelete(expense.id)} disabled={saving}>
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedExpense && (
        <div className="modal-overlay">
          <div className="edit-modal">
            <div className="modal-header">
              <div>
                <h3>Edit Pengeluaran</h3>
                <p>Perubahan disimpan langsung tanpa proses verifikasi.</p>
              </div>
              <button className="close-btn" onClick={closeEditModal} disabled={saving}>×</button>
            </div>

            <form onSubmit={handleSave} className="edit-form">
              <div className="form-grid">
                <div className="filter-item">
                  <label>Outlet</label>
                  <select value={formData.outlet} onChange={(e) => handleInputChange('outlet', e.target.value)} required>
                    <option value="">Pilih outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.code} value={outlet.code}>{outlet.name} ({outlet.code})</option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Item</label>
                  <select value={formData.itemId} onChange={(e) => handleInputChange('itemId', e.target.value)} required>
                    <option value="">Pilih item</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} - {categoryMap[item.categoryId]?.name || 'Tanpa kategori'}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-item">
                  <label>Tanggal</label>
                  <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} required />
                </div>
                <div className="filter-item">
                  <label>Jenis Pembayaran</label>
                  <select value={formData.isCash ? 'cash' : 'noncash'} onChange={(e) => handleInputChange('isCash', e.target.value === 'cash')}>
                    <option value="cash">Cash</option>
                    <option value="noncash">Non-Cash</option>
                  </select>
                </div>
                <div className="filter-item">
                  <label>Qty</label>
                  <input type="number" min="0.01" step="0.01" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} required />
                </div>
                <div className="filter-item">
                  <label>Harga Aktual</label>
                  <input type="number" min="1" step="1" value={formData.actualPrice} onChange={(e) => handleInputChange('actualPrice', e.target.value)} required />
                </div>
              </div>

              <div className="filter-item full-width">
                <label>Catatan</label>
                <textarea rows="3" value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} />
              </div>

              <div className="edit-summary">
                <span>Total Baru</span>
                <strong>{formatCurrency((parseFloat(formData.quantity) || 0) * (parseFloat(formData.actualPrice) || 0))}</strong>
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeEditModal} disabled={saving}>Batal</button>
                <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseManagement;
