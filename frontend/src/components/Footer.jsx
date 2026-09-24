import React from 'react';
import { ShieldCheck, EyeOff, DollarSign, Database, HeartHandshake } from 'lucide-react';

export default function Footer({ onOpenPrivacyModal }) {
  return (
    <footer style={{
      backgroundColor: 'var(--slate-900)',
      color: 'var(--slate-300)',
      marginTop: 'auto',
      borderTop: '1px solid var(--slate-800)',
      padding: '48px 0 24px 0'
    }}>
      <div className="container">
        {/* Responsible Guarantees Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '24px',
          paddingBottom: '40px',
          borderBottom: '1px solid var(--slate-800)',
          marginBottom: '36px'
        }}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.9375rem', marginBottom: '4px' }}>Transparent All-In Pricing</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-400)', lineHeight: 1.4 }}>
                All mandatory taxes & fees are shown upfront. No drip pricing or surprise fees at the hotel front desk.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0
            }}>
              <EyeOff size={20} />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.9375rem', marginBottom: '4px' }}>Zero Dark Patterns</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-400)', lineHeight: 1.4 }}>
                No fake "50 people looking right now" popups, artificial countdown timers, or pre-ticked insurance addons.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0
            }}>
              <Database size={20} />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.9375rem', marginBottom: '4px' }}>Real Inventory Only</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-400)', lineHeight: 1.4 }}>
                Room counts reflect real, verified database units. We prevent double-booking with atomic transactions.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'rgba(5, 150, 105, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              flexShrink: 0
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h4 style={{ color: '#ffffff', fontSize: '0.9375rem', marginBottom: '4px' }}>GDPR Privacy by Design</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-400)', lineHeight: 1.4 }}>
                Opt-in location with Nominatim reverse geocoding. 1-click personal data export and erasure anytime.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontSize: '0.8125rem',
          color: 'var(--slate-400)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>&copy; {new Date().getFullYear()} HavenStay Inc. Dedicated strictly to responsible hotel room discovery.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={onOpenPrivacyModal}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--slate-300)',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                textDecoration: 'underline'
              }}
            >
              Responsible Design & Privacy Charter
            </button>
            <span>•</span>
            <span>OpenStreetMap Geocoding</span>
            <span>•</span>
            <span>WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
