import React from 'react';

/** Shows the error instead of a blank page when rendering crashes. */
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ fontFamily: 'sans-serif', padding: 24, maxWidth: 560, margin: '0 auto', color: '#2c3e50' }}>
        <h2>Terjadi kesalahan</h2>
        <p>
          Coba muat ulang. Kalau tetap muncul, tekan "Reset data aplikasi" (Anda perlu login lagi),
          atau kirim foto layar ini ke admin.
        </p>
        <p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 16px', marginRight: 8 }}>
            Muat ulang
          </button>
          <button
            type="button"
            onClick={() => (window.__resetApp ? window.__resetApp() : window.location.reload())}
            style={{ padding: '10px 16px' }}
          >
            Reset data aplikasi
          </button>
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
          {`${error.message || error}\n\n${(error.stack || '').split('\n').slice(0, 6).join('\n')}\n\nBrowser: ${navigator.userAgent}`}
        </pre>
      </div>
    );
  }
}

export default AppErrorBoundary;
