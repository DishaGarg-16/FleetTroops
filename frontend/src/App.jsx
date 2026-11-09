import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DemoRoleBar } from './components/DemoRoleBar';
import { DriverCapture } from './components/DriverCapture';
import { SmsUploadFlow } from './components/SmsUploadFlow';
import { BillingDesk } from './components/BillingDesk';
import { OpsDashboard } from './components/OpsDashboard';
import { ClientPortal } from './components/ClientPortal';
import { ExternalLink } from 'lucide-react';

function MainApp() {
  const { user } = useAuth();
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
            {showSmsDemo ? 'Return to Role View' : 'Demo Hired Driver SMS Link (TRP-66141)'}
          </button>
        </div>

        {showSmsDemo ? (
          <SmsUploadFlow tripId="TRP-66141" onBack={() => setShowSmsDemo(false)} />
        ) : user?.role === 'DRIVER' ? (
          <DriverCapture user={user} />
        ) : user?.role === 'BILLING_EXECUTIVE' ? (
          <BillingDesk />
        ) : user?.role === 'OPS_HEAD' ? (
          <OpsDashboard />
        ) : user?.role === 'CLIENT' ? (
          <ClientPortal />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Please select a demo role from the top bar to proceed.
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

