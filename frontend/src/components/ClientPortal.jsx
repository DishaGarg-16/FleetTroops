import React, { useState, useEffect } from 'react';
import { ShieldCheck, FileCheck, Eye, X, MapPin, Calendar, CheckCircle2, Clock } from 'lucide-react';

export function ClientPortal() {
  const [clientTrips, setClientTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);

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
                  <button
                    onClick={() => setSelectedTrip(t)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#0284c7',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '4px'
                    }}
                    title="Audit Delivery Document"
                  >
                    <FileCheck size={16} /> View Stamped LR
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive POD Audit Modal */}
      {selectedTrip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card" style={{
            maxWidth: '560px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            padding: '24px',
            position: 'relative',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <button
              onClick={() => setSelectedTrip(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <X size={18} color="#64748b" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <FileCheck size={22} color="#0284c7" />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Stamped Lorry Receipt (POD Audit)
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Consignor Delivery Evidence &bull; DPDP 2023 Masked
            </p>

            {/* Document Header Metadata */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>Trip ID: <strong className="mono">{selectedTrip.trip_id}</strong></div>
                <div>LR Number: <strong className="mono">{selectedTrip.lr_number}</strong></div>
                <div>Vehicle: <strong className="mono">{selectedTrip.vehicle_number}</strong></div>
                <div>E-Way Bill: <strong className="mono">{selectedTrip.eway_bill}</strong></div>
              </div>
            </div>

            {/* Stamped Receipt Proof Card */}
            {selectedTrip.status === 'PENDING_POD' ? (
              <div style={{ textAlign: 'center', padding: '36px 16px', background: '#fef3c7', borderRadius: '6px', border: '1px dashed #d97706', marginBottom: '16px' }}>
                <Clock size={36} color="#d97706" style={{ margin: '0 auto 8px' }} />
                <h4 style={{ color: '#b45309' }}>POD In Transit / Awaiting Upload</h4>
                <p style={{ fontSize: '0.8rem', color: '#78350f', marginTop: '4px' }}>
                  Truck is currently en-route or in highway dead zone. Driver will capture proof at destination gate.
                </p>
              </div>
            ) : (
              <div style={{
                background: '#ffffff',
                border: '2px dashed #0284c7',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                position: 'relative',
                marginBottom: '16px',
                backgroundBlendMode: 'multiply'
              }}>
                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#64748b', marginBottom: '12px' }}>
                  --- GOODS CONSIGNMENT NOTE & ACKNOWLEDGMENT ---
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '4px' }}>
                  COMPANY A LOGISTICS FLEET &bull; CHHATRAPATI SAMBHAJINAGAR
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '16px' }}>
                  Destination: {selectedTrip.destination} &bull; Freight: ₹{selectedTrip.freight_amount.toLocaleString('en-IN')}
                </div>

                {/* Simulated Consignee Rubber Stamp Watermark */}
                <div style={{
                  display: 'inline-block',
                  border: '3px solid #16a34a',
                  color: '#16a34a',
                  padding: '10px 18px',
                  borderRadius: '6px',
                  transform: 'rotate(-5deg)',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  backgroundColor: 'rgba(240, 253, 244, 0.85)',
                  boxShadow: '0 2px 4px rgba(22, 163, 74, 0.15)',
                  margin: '12px 0'
                }}>
                  <div>RECEIVED IN FULL - VERIFIED</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '2px', fontWeight: 600 }}>ULTRATECH CEMENT DEPOT NAGPUR</div>
                  <div style={{ fontSize: '0.7rem', color: '#15803d' }}>ACKNOWLEDGED & SIGNED</div>
                </div>

                <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-around' }}>
                  <span>Gate In: Verified</span>
                  <span>Packages: 500 Bags</span>
                  <span>Signature: On File</span>
                </div>
              </div>
            )}

            {/* GPS & Timestamp Stamping (Brief constraint) */}
            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#0284c7" /> GPS: 19.8762° N, 75.3433° E
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} color="#0284c7" /> Stamped at Gate: 14:22 IST
              </span>
            </div>

            <button
              onClick={() => setSelectedTrip(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '10px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Close Audit View
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
