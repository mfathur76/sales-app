import React, { useState } from 'react';
import ShipmentManager from './ShipmentManager';
import ExpenseManager from './ExpenseManager';
import KitchenStock from './KitchenStock';
import './Orders.css';

const VIEWS = [
  { id: 'kiriman', label: '🚚 Kiriman' },
  { id: 'stok', label: '🧊 Stok Dapur' },
  { id: 'pengeluaran', label: '💰 Pengeluaran' }
];

/** Central kitchen account: shipments out, production and bought-in goods in, freezer count, purchases. */
const KitchenApp = ({ user, onLogout }) => {
  const [view, setView] = useState('kiriman');

  return (
    <div className="kitchen-app">
      <header className="mobile-app-header">
        <div className="header-content">
          <div className="header-info">
            <span className="header-outlet">🍳 {user.outlet} - {user.name}</span>
            <span className="header-user">Dapur Pusat</span>
          </div>
          <button onClick={onLogout} className="header-logout-btn" title="Logout">
            🚪
          </button>
        </div>
      </header>

      <div className="ord-container" style={{ paddingBottom: 0 }}>
        <div className="ord-tabs" style={{ marginBottom: 0 }}>
          {VIEWS.map((v) => (
            <button key={v.id} className={view === v.id ? 'active' : ''} onClick={() => setView(v.id)}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <main>
        {view === 'kiriman' && <ShipmentManager />}
        {view === 'stok' && <KitchenStock />}
        {view === 'pengeluaran' && <ExpenseManager user={user} />}
      </main>
    </div>
  );
};

export default KitchenApp;
