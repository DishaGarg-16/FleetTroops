import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, FileText, Download, Eye, ExternalLink, Check } from 'lucide-react';

export function BillingDesk() {
  const [activeTab, setActiveTab] = useState('review'); // 'review' | 'billing'
  const [reviewTrips, setReviewTrips] = useState([]);
  const [billingTrips, setBillingTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [overrideQty, setOverrideQty] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    const token = localStorage.getItem('company_a_token');
    try {
      if (activeTab === 'review') {
        const res = await fetch('/api/v1/billing/review-queue', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setReviewTrips(data);
          if (data.length > 0) setSelectedTrip(data[0]);
        }
      } else {
        const res = await fetch('/api/v1/billing/queue', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBillingTrips(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    if (!selectedTrip) return;
    setLoading(true);
    const token = localStorage.getItem('company_a_token');
    try {
      const res = await fetch(`/api/v1/billing/review/${selectedTrip.trip_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          received_quantity: parseInt(overrideQty) || 494,
          reviewer_notes: notes || 'Verified against gate receipt scan',
          action: 'APPROVE'
        })
      });
      if (res.ok) {
        alert(`Trip ${selectedTrip.trip_id} approved & moved to Billing Queue!`);
        fetchData();
        setSelectedTrip(null);
      }
    } catch (e) {
      alert('Error approving trip');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInvoice = async (tripId) => {
    const token = localStorage.getItem('company_a_token');
    try {
      const res = await fetch(`/api/v1/billing/generate-invoice/${tripId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`Invoice created and linked to Tally!`);
        fetchData();
      }
    } catch (e) {
      alert('Error generating invoice');
    }
  };

  const handleDownloadTallyXml = () => {
    const token = localStorage.getItem('company_a_token');
    window.open('/api/v1/billing/export/tally-xml', '_blank');
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
        <button
          className={`btn-demo ${activeTab === 'review' ? 'active' : ''}`}
          style={{ fontSize: '0.9rem', padding: '8px 16px', color: activeTab === 'review' ? '#0f172a' : '#64748b' }}
          onClick={() => setActiveTab('review')}
        >
          Exception Review Queue ({reviewTrips.length})
        </button>
        <button
          className={`btn-demo ${activeTab === 'billing' ? 'active' : ''}`}
          style={{ fontSize: '0.9rem', padding: '8px 16px', color: activeTab === 'billing' ? '#0f172a' : '#64748b' }}
          onClick={() => setActiveTab('billing')}
        >
          Billing & Tally Export ({billingTrips.length})
        </button>
      </div>

      {activeTab === 'review' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '20px' }}>
          {/* Trip List */}
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: '#64748b' }}>
              FLAGGED PODS REQUIRING HUMAN REVIEW:
            </h3>
            {reviewTrips.map((t) => (
              <div
                key={t.trip_id}
                onClick={() => setSelectedTrip(t)}
                className="card"
                style={{
                  cursor: 'pointer',
                  marginBottom: '10px',
                  borderColor: selectedTrip?.trip_id === t.trip_id ? 'var(--primary)' : 'var(--border)',
                  background: selectedTrip?.trip_id === t.trip_id ? '#f0f9ff' : '#fff'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono vehicle-plate">{t.vehicle_number}</span>
                  <span className="badge badge-warning">{t.status}</span>
                </div>
                <div style={{ marginTop: '6px', fontWeight: 600 }}>{t.trip_id} &bull; {t.destination}</div>
                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '4px' }}>
                  <strong>Issue:</strong> {t.remarks || 'Consignee stamp missing or shortage reported'}
                </div>
              </div>
            ))}
          </div>

          {/* Side-by-Side Verification (Image is Source of Truth) */}
          {selectedTrip ? (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>
                Inspection Desk — <span className="mono">{selectedTrip.trip_id}</span>
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
                Rule: The image stays the absolute source of truth. Executive confirms quantities before invoicing.
              </p>

              {/* Sample POD Scan Display */}
              <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '6px', padding: '16px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', borderRadius: '4px' }}>
                  <FileText size={48} color="#94a3b8" />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                    [LORRY RECEIPT SCAN — {selectedTrip.lr_number}]
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>
                    Remark on scan: "{selectedTrip.remarks || 'Shortage 6 cartons'}"
                  </span>
                </div>
              </div>

              {/* Editable Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Dispatched Qty:</label>
                  <input type="text" disabled value="500 units" style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', background: '#f8fafc' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Received Qty (Verified):</label>
                  <input
                    type="number"
                    placeholder="494"
                    value={overrideQty}
                    onChange={(e) => setOverrideQty(e.target.value)}
                    style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #0284c7' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Executive Audit Notes:</label>
                <input
                  type="text"
                  placeholder="Acknowledged 6 cartons shortage with consignee depot manager"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    padding: '10px',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Check size={16} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
                  Confirm & Move to Billing Queue
                </button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
              Select a trip on the left to inspect
            </div>
          )}
        </div>
      ) : (
        /* Billing Queue & Tally Export */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Verified Trips Ready for Invoicing</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                All trips below have verified signed PODs with stamp and signature.
              </p>
            </div>
            <button
              onClick={handleDownloadTallyXml}
              style={{
                background: '#0284c7',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={16} /> Export to Tally Prime XML
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px' }}>Trip ID</th>
                  <th style={{ padding: '10px' }}>Client</th>
                  <th style={{ padding: '10px' }}>Vehicle</th>
                  <th style={{ padding: '10px' }}>Route</th>
                  <th style={{ padding: '10px' }}>Freight</th>
                  <th style={{ padding: '10px' }}>POD Proof</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {billingTrips.map((t) => (
                  <tr key={t.trip_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px' }} className="mono font-semibold">{t.trip_id}</td>
                    <td style={{ padding: '10px' }}>{t.client_name}</td>
                    <td style={{ padding: '10px' }}><span className="mono vehicle-plate">{t.vehicle_number}</span></td>
                    <td style={{ padding: '10px' }}>{t.origin} &rarr; {t.destination}</td>
                    <td style={{ padding: '10px' }} className="mono">₹{t.freight_amount.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="badge badge-success">Verified Stamp</span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <button
                        onClick={() => handleGenerateInvoice(t.trip_id)}
                        className="btn-demo"
                        style={{ background: '#0284c7', color: '#fff', borderColor: '#0284c7' }}
                      >
                        Generate Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

