import React from 'react';
import { X, ShieldCheck, MapPin, DollarSign, Database, Trash2, Download } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-200)', paddingBottom: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: 'var(--trust-green-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Responsible Design Charter
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                Our commitment to honest hotel booking and data privacy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--slate-400)',
              cursor: 'pointer',
              padding: '6px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.875rem', color: 'var(--slate-700)', lineHeight: 1.5 }}>
          {/* Section 1: Pricing */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginBottom: '2px' }}>
                100% Upfront Transparent Pricing
              </div>
              <div>
                We do not practice "drip pricing". All mandatory taxes, occupancy surcharges, and local hospitality fees are clearly itemized and displayed before you enter any guest or payment information. The price you see is the price you pay.
              </div>
            </div>
          </div>

          {/* Section 2: No Dark Patterns */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginBottom: '2px' }}>
                Zero Fake Urgency or Artificial Scarcity
              </div>
              <div>
                We strictly ban deceptive UI tricks: no fake countdown timers, no fabricated "12 people are viewing this right now" popups, and no pre-selected paid upgrades. Room counts reflect real, verified room inventory in our database.
              </div>
            </div>
          </div>

          {/* Section 3: Geolocation */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }}>
              <MapPin size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginBottom: '2px' }}>
                Ephemeral, Opt-In Geolocation
              </div>
              <div>
                When you click "Use My Location", your device GPS is queried only with your explicit permission. We calculate distance to hotels in real-time and use OpenStreetMap Nominatim for reverse geocoding. <strong>We never store or track your exact coordinates in our database.</strong>
              </div>
            </div>
          </div>

          {/* Section 4: GDPR Rights */}
          <div style={{
            backgroundColor: 'var(--slate-50)',
            border: '1px solid var(--slate-200)',
            borderRadius: 'var(--radius-md)',
            padding: '16px'
          }}>
            <div style={{ fontWeight: 700, color: 'var(--slate-900)', marginBottom: '6px' }}>
              Your Privacy Rights (GDPR / DPDP)
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginBottom: '12px' }}>
              You maintain full sovereignty over your personal data:
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                to="/profile"
                onClick={onClose}
                className="btn btn-secondary btn-sm"
              >
                <Download size={14} />
                <span>Export My Data</span>
              </Link>
              <Link
                to="/profile"
                onClick={onClose}
                className="btn btn-danger btn-sm"
              >
                <Trash2 size={14} />
                <span>Delete Account & Data</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer close */}
        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button onClick={onClose} className="btn btn-primary">
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}
