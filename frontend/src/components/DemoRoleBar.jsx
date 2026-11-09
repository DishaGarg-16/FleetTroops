import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Receipt, BarChart3, Building2, LogOut } from 'lucide-react';

export function DemoRoleBar() {
  const { user, loginAsRole, logout, loading } = useAuth();

  const roles = [
    { id: 'DRIVER', label: 'Ramesh (Driver)', icon: Truck },
    { id: 'BILLING_EXECUTIVE', label: 'Priya (Billing Desk)', icon: Receipt },
    { id: 'OPS_HEAD', label: 'Anand (Ops Head)', icon: BarChart3 },
    { id: 'CLIENT', label: 'Company B (Client)', icon: Building2 },
  ];

  return (
    <div className="demo-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <strong style={{ letterSpacing: '0.5px' }}>COMPANY A</strong>
        <span style={{ opacity: 0.6 }}>| Chhatrapati Sambhajinagar</span>
      </div>

      <div className="demo-buttons">
        <span style={{ alignSelf: 'center', color: '#94a3b8', fontSize: '0.75rem', marginRight: '4px' }}>
          EVALUATOR QUICK-SWITCH:
        </span>
        {roles.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            disabled={loading}
            className={`btn-demo ${user?.role === id ? 'active' : ''}`}
            onClick={() => loginAsRole(id)}
          >
            <Icon size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
            {label}
          </button>
        ))}
        {user && (
          <button className="btn-demo" onClick={logout} title="Sign Out">
            <LogOut size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

