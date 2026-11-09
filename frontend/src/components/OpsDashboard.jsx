import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock, AlertTriangle, ShieldCheck, IndianRupee, Truck } from 'lucide-react';

export function OpsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('company_a_token');
      const res = await fetch('/api/v1/dashboard/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading Fleet Analytics...</div>;

  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
          Executive Operations & Working Capital Dashboard
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Monitoring Company A (340 Trucks: 140 Own + 200 Hired) &bull; Chhatrapati Sambhajinagar Fleet HQ
        </p>
      </header>

      {/* Financial ROI Cards — Directly from Company A Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ borderTop: '4px solid #16a34a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span>WORKING CAPITAL UNLOCKED</span>
            <TrendingUp size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#16a34a' }} className="mono">
            ₹{metrics?.working_capital_unlocked_cr} Cr
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Billing brought 14 days forward across ₹84.48 Cr annual freight
          </p>
        </div>

        <div className="card" style={{ borderTop: '4px solid #0284c7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span>ANNUAL INTEREST SAVINGS</span>
            <IndianRupee size={16} color="#0284c7" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0284c7' }} className="mono">
            ₹{metrics?.annual_interest_saved_lakh} Lakh
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            At 12% bank interest rate on accelerated cash collections
          </p>
        </div>

        <div className="card" style={{ borderTop: '4px solid #d97706' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span>POD-TO-INVOICE CYCLE</span>
            <Clock size={16} color="#d97706" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#d97706' }} className="mono">
            {metrics?.avg_pod_to_invoice_days} Days
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Down from 18 days baseline (Goal: &le; 4 days achieved)
          </p>
        </div>

        <div className="card" style={{ borderTop: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginBottom: '4px' }}>
            <span>POD DISPUTE RECOVERY</span>
            <ShieldCheck size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#dc2626' }} className="mono">
            ₹{metrics?.dispute_savings_lakh} Lakh
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
            Reduced lost PODs from 1.5% to 0.5% (Saved 396 disputes)
          </p>
        </div>
      </div>

      {/* Branch Breakdown & Aging Analysis */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
            Branch Turnaround Time & Active Fleet
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Branch Hub</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>Trucks</th>
                <th style={{ padding: '8px', textAlign: 'center' }}>POD Days</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.branch_stats?.map((b) => (
                <tr key={b.branch} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px', fontWeight: 500 }}>{b.branch}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }} className="mono">{b.active_trucks}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }} className="mono">{b.avg_days}d</td>
                  <td style={{ padding: '8px', textAlign: 'right' }}>
                    <span className={`badge ${b.status === 'On Track' ? 'badge-success' : 'badge-warning'}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px' }}>
            Critical Aging Alerts (&gt;4 Days)
          </h3>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '12px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b91c1c', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertTriangle size={16} /> {metrics?.critical_aging_trips_count} Trips Missing POD &gt; 4 Days
            </div>
            <p style={{ fontSize: '0.8rem', color: '#7f1d1d', marginTop: '4px' }}>
              Trips like <strong>TRP-66162 (Kasara Ghat)</strong> are in dead zones. Drivers notified via SMS alert.
            </p>
          </div>

          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Fleet Invoices Generated: <strong className="mono">{metrics?.invoiced_count}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
            Trips in Review Queue: <strong className="mono">{metrics?.needs_review_count}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

