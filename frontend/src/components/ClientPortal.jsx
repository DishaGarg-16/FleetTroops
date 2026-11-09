import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck, Eye, ExternalLink } from 'lucide-react';

export function ClientPortal() {
  const [clientTrips, setClientTrips] = useState([]);

  useEffect(() => {
    fetchClientTrips();
  }, []);

  const fetchClientTrips = async () => {
    try {
      const token = localStorage.getItem('company_a_token');
      const res = await fetch('/api/v1/trips?client_name=Company%20B%20(cement)', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientTrips(data.trips || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div>
      <header style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          Company B Consignor Audit Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Real-time access to stamped lorry receipts and delivery proof for billed freight invoices.
        </p>
      </header>

      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <ShieldCheck size={20} color="#16a34a" />
        <span style={{ fontSize: '0.85rem', color: '#166534' }}>
          <strong>DPDP Act 2023 Compliant:</strong> Consignee phone numbers and individual identities are masked.
        </span>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '12px' }}>Trip ID</th>
              <th style={{ padding: '12px' }}>LR Number</th>
              <th style={{ padding: '12px' }}>Truck Number</th>
              <th style={{ padding: '12px' }}>Destination Hub</th>
              <th style={{ padding: '12px' }}>Consignee (DPDP Masked)</th>
              <th style={{ padding: '12px' }}>POD Status</th>
              <th style={{ padding: '12px' }}>Audit Proof</th>
            </tr>
          </thead>
          <tbody>
            {clientTrips.map((t) => (
              <tr key={t.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px' }} className="mono font-semibold">{t.trip_id}</td>
                <td style={{ padding: '12px' }} className="mono">{t.lr_number}</td>
                <td style={{ padding: '12px' }}><span className="mono vehicle-plate">{t.vehicle_number}</span></td>
                <td style={{ padding: '12px' }}>{t.destination}</td>
                <td style={{ padding: '12px' }}>
                  <div>{t.consignee_name_masked}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{t.consignee_phone_masked}</div>
                </td>
                <td style={{ padding: '12px' }}>
                  <span className={`badge ${t.status === 'VERIFIED' || t.status === 'INVOICED' ? 'badge-success' : 'badge-warning'}`}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0284c7', cursor: 'pointer', fontWeight: 500 }}>
                    <FileCheck size={16} /> View Stamped LR
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

