import React, { useState } from 'react';
import { Camera, CheckCircle2, ShieldCheck, Truck, UploadCloud } from 'lucide-react';
import { compressImage } from '../utils/compression';

export function SmsUploadFlow({ tripId = "TRP-66141", onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [sizeKb, setSizeKb] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFile = async (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const compressed = await compressImage(selected, 250);
    setFile(compressed.file);
    setPreview(compressed.previewUrl);
    setSizeKb(compressed.sizeKb);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/v1/pod/upload/${tripId}`, {
        method: 'POST',
        headers: {
          // Tokenless or demo token for SMS hired drivers
          Authorization: `Bearer ${localStorage.getItem('company_a_token') || ''}`
        },
        body: formData
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        alert('Upload failed');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '0 auto', padding: '16px' }}>
      <div className="card" style={{ textAlign: 'center', borderColor: '#38bdf8' }}>
        <div style={{ background: '#e0f2fe', width: '56px', height: '56px', borderRadius: '50%', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Truck size={28} color="#0284c7" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Company A Transport</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
          SMS One-Click POD Upload for Hired Truck (No App Required)
        </p>

        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '6px', textAlign: 'left', marginBottom: '16px', fontSize: '0.85rem' }}>
          <div>Trip ID: <strong className="mono">{tripId}</strong></div>
          <div>Vehicle: <strong className="mono">MH17 BY 3092 (Hired)</strong></div>
          <div>Route: <strong>Chhatrapati Sambhajinagar &rarr; Indore</strong></div>
        </div>

        {success ? (
          <div style={{ padding: '24px 0' }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ color: '#16a34a' }}>POD Photo Uploaded!</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '6px' }}>
              Checked by FleetTroops AI. Consignment marked for billing.
            </p>
          </div>
        ) : (
          <div>
            <label 
              htmlFor="sms-camera-input" 
              className="card" 
              style={{ display: 'block', cursor: 'pointer', border: '2px dashed #94a3b8', padding: '28px 12px', background: '#fafafa', marginBottom: '16px' }}
            >
              {preview ? (
                <div>
                  <img src={preview} alt="POD" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px' }} />
                  <p style={{ fontSize: '0.75rem', marginTop: '6px', color: '#16a34a', fontWeight: 600 }}>
                    Compressed: {sizeKb} KB (&lt;300 KB constraint)
                  </p>
                </div>
              ) : (
                <div>
                  <Camera size={42} color="#0284c7" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Tap here to take photo of signed LR</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Camera opens directly</p>
                </div>
              )}
            </label>

            <input 
              id="sms-camera-input"
              type="file" 
              accept="image/*" 
              capture="environment" 
              style={{ display: 'none' }}
              onChange={handleFile}
            />

            <button
              disabled={!file || uploading}
              onClick={handleUpload}
              style={{
                width: '100%',
                padding: '12px',
                background: file ? '#16a34a' : '#94a3b8',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: file ? 'pointer' : 'not-allowed'
              }}
            >
              {uploading ? 'Verifying with Vision AI...' : 'Submit POD to Office'}
            </button>
          </div>
        )}

        <div style={{ marginTop: '20px', fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ShieldCheck size={14} /> DPDP Act 2023 Compliant &bull; Secure Gate Link
        </div>
      </div>
    </div>
  );
}

