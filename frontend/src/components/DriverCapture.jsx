import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle2, AlertTriangle, RefreshCw, Volume2, Wifi, WifiOff, MapPin } from 'lucide-react';
import { compressImage } from '../utils/compression';
import { speakPrompt, playChime } from '../utils/speech';
import { saveOfflinePOD, getPendingOfflinePODs, removeOfflinePOD } from '../utils/offlineQueue';

export function DriverCapture({ user }) {
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [language, setLanguage] = useState('mr'); // Default Marathi for Maharashtra fleet
  const [statusState, setStatusState] = useState(null); // 'UPLOADING' | 'VERIFIED' | 'RETAKE' | 'REVIEW'
  const [resultData, setResultData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [fileSizeInfo, setFileSizeInfo] = useState(null);
  const [gpsCoords, setGpsCoords] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    checkQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkQueue = async () => {
    try {
      const pending = await getPendingOfflinePODs();
      setPendingSyncCount(pending.length);
    } catch (e) {
      console.warn('Queue check failed', e);
    }
  };

  // Fetch trips assigned to driver
  useEffect(() => {
    fetchTrips();
  }, [user]);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('company_a_token');
      const res = await fetch('/api/v1/trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips || []);
        if (data.trips?.length > 0) {
          const active = data.trips.find(t => t.status === 'PENDING_POD' || t.status === 'RETAKE_REQUESTED') || data.trips[0];
          setSelectedTrip(active);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch browser GPS coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log('GPS unavailable, using destination coords', err),
        { timeout: 5000 }
      );
    }
  }, []);

  // Offline queue auto-sync when network returns
  const syncOfflineQueue = async () => {
    const pending = await getPendingOfflinePODs();
    if (pending.length === 0) return;

    for (const item of pending) {
      try {
        await executeUpload(item.tripId, item.file, item.gps);
        await removeOfflinePOD(item.id);
      } catch (e) {
        console.error('Offline sync item failed', e);
      }
    }
    checkQueue();
    fetchTrips();
  };

  // Trigger camera capture
  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTrip) return;

    setLoading(true);
    setStatusState('UPLOADING');

    try {
      // 1. Client-side Canvas Compression (<300 KB constraint)
      const compressed = await compressImage(file, 260);
      setImagePreview(compressed.previewUrl);
      setFileSizeInfo(compressed.sizeKb);

      // 2. If Offline: Save to IndexedDB
      if (!navigator.onLine) {
        await saveOfflinePOD(selectedTrip.trip_id, compressed.file, gpsCoords);
        await checkQueue();
        setStatusState('SAVED_OFFLINE');
        const offlineMsg = language === 'mr' 
          ? "इंटरनेट नाही. फोटो सेव्ह केला आहे, रेंज आल्यावर आपोआप पाठवला जाईल." 
          : "इंटरनेट नहीं है। फोटो सेव हो गया है, नेटवर्क आते ही अपने आप अपलोड हो जाएगा।";
        speakPrompt(offlineMsg, language);
        setLoading(false);
        return;
      }

      // 3. If Online: Upload to Vision AI endpoint
      await executeUpload(selectedTrip.trip_id, compressed.file, gpsCoords);

    } catch (err) {
      console.error(err);
      alert('Error capturing photo: ' + err.message);
      setStatusState(null);
    } finally {
      setLoading(false);
    }
  };

  const executeUpload = async (tripId, file, gps) => {
    const token = localStorage.getItem('company_a_token');
    const formData = new FormData();
    formData.append('file', file);
    if (gps) {
      formData.append('gps_lat', gps.lat);
      formData.append('gps_lng', gps.lng);
    }

    const res = await fetch(`/api/v1/pod/upload/${tripId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    setResultData(data);

    // Speak bilingual audio prompt & chime based on AI verdict
    const promptToSpeak = language === 'mr' ? data.audio_prompt_mr : data.audio_prompt_hi;
    speakPrompt(promptToSpeak, language);

    if (data.status === 'VERIFIED') {
      setStatusState('VERIFIED');
    } else if (data.status === 'RETAKE_REQUESTED') {
      setStatusState('RETAKE');
    } else {
      setStatusState('REVIEW');
    }

    fetchTrips();
  };

  return (
    <div className="driver-screen">
      {/* Hidden native camera input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Network & Language Header */}
      <div className="driver-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isOnline ? (
            <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Wifi size={12} /> Online
            </span>
          ) : (
            <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <WifiOff size={12} /> Offline (Range Nighali)
            </span>
          )}
          {pendingSyncCount > 0 && (
            <span className="badge badge-warning">{pendingSyncCount} Saved Offline</span>
          )}
        </div>

        {/* Marathi / Hindi voice switcher */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className={`btn-lang ${language === 'mr' ? 'active' : ''}`}
            onClick={() => { setLanguage('mr'); speakPrompt("मराठी आवाज निवडला आहे", 'mr'); }}
          >
            मराठी
          </button>
          <button 
            className={`btn-lang ${language === 'hi' ? 'active' : ''}`}
            onClick={() => { setLanguage('hi'); speakPrompt("हिंदी आवाज चुना गया है", 'hi'); }}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Active Trip Banner */}
      {selectedTrip && (
        <div className="trip-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="mono vehicle-plate">{selectedTrip.vehicle_number}</span>
              <h2 style={{ fontSize: '1.25rem', marginTop: '4px' }}>
                {selectedTrip.destination}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {selectedTrip.client_name} &bull; LR: <span className="mono">{selectedTrip.lr_number}</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                ₹{selectedTrip.freight_amount.toLocaleString('en-IN')}
              </span>
              <div style={{ marginTop: '4px' }}>
                <span className={`badge ${
                  selectedTrip.status === 'VERIFIED' ? 'badge-success' : 
                  selectedTrip.status === 'RETAKE_REQUESTED' ? 'badge-danger' : 'badge-warning'
                }`}>
                  {selectedTrip.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {gpsCoords && (
            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} /> Consignee Gate GPS: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* State Feedback Card */}
      {statusState && (
        <div className={`status-feedback-box ${statusState}`}>
          {statusState === 'UPLOADING' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <RefreshCw className="spin" size={24} />
              <div>
                <strong>Checking POD photo at gate...</strong>
                <p style={{ fontSize: '0.8rem' }}>AI checking stamp, signature & LR match</p>
              </div>
            </div>
          )}

          {statusState === 'VERIFIED' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={32} color="#16a34a" />
              <div>
                <strong style={{ color: '#16a34a', fontSize: '1.1rem' }}>
                  {language === 'mr' ? 'पावती स्वीकारली (Verified)!' : 'बिल्टी स्वीकार हो गई (Verified)!'}
                </strong>
                <p style={{ fontSize: '0.85rem' }}>
                  {language === 'mr' ? 'आपण गाडी पुढे नेऊ शकता.' : 'आप गाड़ी आगे बढ़ा सकते हैं।'}
                </p>
              </div>
            </div>
          )}

          {statusState === 'RETAKE' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={32} color="#dc2626" />
              <div>
                <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>
                  {language === 'mr' ? 'पुन्हा फोटो काढा (Retake)' : 'दोबारा फोटो लें (Retake)'}
                </strong>
                <p style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 500 }}>
                  {resultData?.remarks || 'Consignee stamp not visible'}
                </p>
              </div>
            </div>
          )}

          {statusState === 'REVIEW' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={32} color="#d97706" />
              <div>
                <strong style={{ color: '#d97706', fontSize: '1.1rem' }}>
                  {language === 'mr' ? 'ऑफिस तपासणीसाठी पाठवले' : 'ऑफिस रिव्यू के लिए भेजा गया'}
                </strong>
                <p style={{ fontSize: '0.85rem' }}>
                  {resultData?.remarks || 'Shortage remarks or max retakes reached'}
                </p>
              </div>
            </div>
          )}

          {statusState === 'SAVED_OFFLINE' && (
            <div>
              <strong>Saved Offline in Device</strong>
              <p style={{ fontSize: '0.85rem' }}>Will auto-upload when you get mobile range.</p>
            </div>
          )}

          {fileSizeInfo && (
            <div style={{ fontSize: '0.75rem', marginTop: '6px', color: '#64748b' }}>
              Compressed upload size: <strong>{fileSizeInfo} KB</strong> (&lt;300 KB OK)
            </div>
          )}
        </div>
      )}

      {/* Big One-Touch Camera Button */}
      <div className="capture-area">
        <button 
          className={`big-camera-btn ${statusState === 'RETAKE' ? 'btn-retake' : ''}`}
          onClick={handleCaptureClick}
          disabled={loading}
        >
          <Camera size={64} strokeWidth={2.2} />
          <span style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '8px' }}>
            {statusState === 'RETAKE' 
              ? (language === 'mr' ? 'पुन्हा फोटो काढा' : 'दोबारा फोटो लें')
              : (language === 'mr' ? 'पावतीचा फोटो काढा' : 'बिल्टी का फोटो लें')}
          </span>
          <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
            (GPS & Time Watermarked)
          </span>
        </button>
      </div>

      {/* Voice Prompt Playback Button */}
      {resultData && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button 
            className="btn-demo" 
            style={{ color: '#0f172a', background: '#e2e8f0', borderColor: '#cbd5e1' }}
            onClick={() => speakPrompt(language === 'mr' ? resultData.audio_prompt_mr : resultData.audio_prompt_hi, language)}
          >
            <Volume2 size={16} style={{ verticalAlign: '-3px', marginRight: '6px' }} />
            {language === 'mr' ? 'आवाज पुन्हा ऐका (Replay Audio)' : 'आवाज फिर से सुनें'}
          </button>
        </div>
      )}

      {/* Trip Switcher for multi-trip demoing */}
      {trips.length > 1 && (
        <div style={{ marginTop: '30px' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
            SELECT ASSIGNED TRIP TO DEMO:
          </p>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
            {trips.map(t => (
              <button
                key={t.trip_id}
                className={`btn-demo ${selectedTrip?.trip_id === t.trip_id ? 'active' : ''}`}
                style={{ color: '#0f172a', background: '#fff', border: '1px solid #cbd5e1' }}
                onClick={() => {
                  setSelectedTrip(t);
                  setStatusState(null);
                  setResultData(null);
                }}
              >
                {t.trip_id} ({t.destination})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
