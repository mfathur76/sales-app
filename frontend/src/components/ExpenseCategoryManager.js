import React, { useState, useEffect } from 'react';
import { expenseApi } from '../api/expenseApi';
import './ExpenseCategoryManager.css';

const ExpenseCategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await expenseApi.getCategories();
      setCategories(response);
    } catch (error) {
      console.error('Error loading categories:', error);
      showMessage('error', 'Gagal memuat kategori pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showMessage('error', 'Nama kategori harus diisi!');
      return;
    }

    try {
      setLoading(true);
      
      if (editingCategory) {
        // Update existing category
        await expenseApi.updateCategory(editingCategory.id, formData);
        showMessage('success', 'Kategori berhasil diperbarui!');
      } else {
        // Create new category
        await expenseApi.createCategory(formData.name, formData.description);
        showMessage('success', 'Kategori berhasil dibuat!');
      }
      
      // Reset form and refresh categories
      setFormData({ name: '', description: '' });
      setEditingCategory(null);
      setShowForm(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showMessage('error', 'Gagal menyimpan kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kategori ini?')) {
      return;
    }

    try {
      setLoading(true);
      await expenseApi.deleteCategory(categoryId);
      showMessage('success', 'Kategori berhasil dihapus!');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showMessage('error', 'Gagal menghapus kategori');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', description: '' });
    setEditingCategory(null);
    setShowForm(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading && categories.length === 0) {
    return (
      <div className="expense-category-manager">
        <div className="loading">Memuat kategori pengeluaran...</div>
      </div>
    );
  }

  return (
    <div className="expense-category-manager">
      <div className="category-manager-header">
        <h2>📂 Manajemen Kategori Pengeluaran</h2>
        <p>Kelola kategori pengeluaran untuk outlet</p>
      </div>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Add Category Button */}
      <div className="category-actions">
        <button
          className="add-category-btn"
          onClick={() => setShowForm(true)}
          disabled={loading}
        >
          ➕ Tambah Kategori Baru
        </button>
      </div>

      {/* Category Form */}
      {showForm && (
        <div className="category-form-container">
          <div className="category-form">
            <h3>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="categoryName">Nama Kategori *</label>
                <input
                  type="text"
                  id="categoryName"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Contoh: Belanja Pasar, Operasional, dll"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="categoryDescription">Deskripsi (Opsional)</label>
                <textarea
                  id="categoryDescription"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Deskripsi singkat tentang kategori ini"
                  className="form-textarea"
                  rows="3"
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Menyimpan...' : (editingCategory ? 'Update Kategori' : 'Simpan Kategori')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="categories-list">
        <h3>Daftar Kategori ({categories.length})</h3>
        
        {categories.length === 0 ? (
          <div className="no-categories">
            <p>Belum ada kategori pengeluaran. Silakan tambahkan kategori baru.</p>
          </div>
        ) : (
          <div className="categories-grid">
            {categories.map(category => (
              <div key={category.id} className="category-card">
                <div className="category-info">
                  <h4>{category.name}</h4>
                  {category.description && (
                    <p className="category-description">{category.description}</p>
                  )}
                  <div className="category-meta">
                    <span className="category-id">ID: {category.id}</span>
                    <span className="category-count">
                      {category.expenseCount || 0} pengeluaran
                    </span>
                  </div>
                </div>
                
                <div className="category-actions">
                  <button
                    className="btn-edit"
                    onClick={() => handleEdit(category)}
                    disabled={loading}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(category.id)}
                    disabled={loading}
                  >
                    🗑️ Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseCategoryManager;
