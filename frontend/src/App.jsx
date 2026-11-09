import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoRoleBar } from './components/DemoRoleBar';
import { DriverCapture } from './components/DriverCapture';
import { SmsUploadFlow } from './components/SmsUploadFlow';
import { ShieldCheck, Truck, ReceiptText, LineChart, ExternalLink } from 'lucide-react';

function MainApp() {
  const { user, token } = useAuth();
  const [showSmsDemo, setShowSmsDemo] = useState(false);

  return (
    <div>
      <DemoRoleBar />

      <main className="app-container">
        {/* Toggle to inspect the Hired Driver SMS Upload link without installing app */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button
            onClick={() => setShowSmsDemo(!showSmsDemo)}
            className="btn-demo"
            style={{ color: '#0284c7', background: '#e0f2fe', borderColor: '#bae6fd' }}
          >
            <ExternalLink size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
            {showSmsDemo ? 'Return to Standard View' : 'Demo Hired Driver SMS Link (TRP-66141)'}
          </button>
        </div>

        {showSmsDemo ? (
          <SmsUploadFlow tripId="TRP-66141" onBack={() => setShowSmsDemo(false)} />
        ) : user?.role === 'DRIVER' ? (
          <DriverCapture user={user} />
        ) : (
          <div>
            <header style={{ marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                Proof-of-Delivery Capture & Billing Console
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Active Session: <strong>{user?.name || 'Guest'}</strong> &nbsp;|&nbsp;
                Role: <span className="badge badge-info">{user?.role || 'NONE'}</span>
              </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Truck size={20} color="var(--success)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Driver Experience (Phase 4 Ready)</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Switch to <strong>Ramesh (Driver)</strong> in the top bar to test the One-Touch Big Button camera, Marathi/Hindi audio voice synthesis, and offline IndexedDB sync.
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ReceiptText size={20} color="var(--warning)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Billing Review & Tally (Phase 5)</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Exception queue for damaged/short consignments, verified trip cycles, and one-click Tally Prime XML & Excel export.
                </p>
              </div>

              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <LineChart size={20} color="var(--primary)" />
                  <h3 style={{ fontSize: '1.1rem' }}>Operations & Capital ROI (Phase 5)</h3>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Tracking ₹1.02 Cr/yr revenue leakage prevention, missing POD aging (&gt;4 days), and consignor audit portal with DPDP 2023 masking.
                </p>
              </div>
            </div>

            <section className="card" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ShieldCheck size={18} color="var(--success)" />
                <h4 style={{ fontSize: '0.95rem' }}>Session & Security Overview</h4>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Logged in as <strong>{user?.name}</strong>. Evaluators can switch to Driver mode or test the Hired Driver SMS web link anytime.
              </p>
              <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '4px', fontSize: '0.75rem' }} className="mono">
                Active JWT Token: {token ? `${token.substring(0, 48)}...` : 'None'}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

