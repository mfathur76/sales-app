import React, { useState, useEffect } from 'react';
import { authApi } from '../api/salesApi';
import './Login.css';

const Login = ({ onLogin }) => {
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [outlets, setOutlets] = useState([]);

  // Load outlets from API
  useEffect(() => {
    const loadOutlets = async () => {
      try {
        const response = await authApi.getOutlets();
        if (response.success && response.data) {
          setOutlets(response.data);
        }
      } catch (error) {
        console.error('Error loading outlets:', error);
        // Fallback to hardcoded outlets if API fails
        setOutlets([
          { code: 'RM001', name: 'Risol Mejik Kelinci Raya' },
          { code: 'RM002', name: 'Risol Mejik Ketileng' },
          { code: 'RM003', name: 'Risol Mejik Tlogosari' },
          { code: 'RM004', name: 'Risol Mejik Karyadi' }
        ]);
      }
    };

    loadOutlets();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedOutlet || !password) {
      setError('Pilih outlet dan masukkan password');
      setLoading(false);
      return;
    }

    try {
      const result = await authApi.login(selectedOutlet, password);
      
      if (result.success && result.data) {
        // Login berhasil
        const userData = {
          outlet: result.data.outlet,
          name: result.data.name,
          token: result.data.token,
          isAuthenticated: true
        };

        // Simpan ke localStorage
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Panggil callback login
        onLogin(userData);
      } else {
        setError(result.message || 'Login gagal');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mobile-login">
      <div className="login-background">
        <div className="login-overlay"></div>
      </div>
      
      <div className="login-content">
        <div className="login-header">
          <div className="login-logo">🏪</div>
          <h1>Risol Mejik</h1>
          <p>Sales Tracker</p>
        </div>

        <div className="login-card">
          <h2>🔐 Login Outlet</h2>
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="outlet">Pilih Outlet</label>
              <select
                id="outlet"
                value={selectedOutlet}
                onChange={(e) => setSelectedOutlet(e.target.value)}
                required
                disabled={loading}
                className="outlet-select"
              >
                <option value="">Pilih Outlet</option>
                {outlets.map((outlet) => (
                  <option key={outlet.code} value={outlet.code}>
                    {outlet.code} - {outlet.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password outlet"
                required
                disabled={loading}
                className="password-input"
              />
            </div>

            {error && (
              <div className="login-error">
                ❌ {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? '⏳ Login...' : '🔐 Login'}
            </button>
          </form>

          <div className="login-help">
            <div className="help-section">
              <h3>💡 Bantuan</h3>
              <p>Hubungi admin untuk mendapatkan password outlet</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login; 