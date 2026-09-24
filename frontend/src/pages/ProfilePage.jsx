import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Download, Trash2, Heart, Save, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    try {
      const data = await api.getFavorites();
      setFavorites(data);
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    try {
      await api.updateMe({ name, phone });
      await refreshProfile();
      setSuccessMsg('Profile information updated successfully.');
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await api.exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `havenstay-personal-data-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert('Data export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'GDPR Account Erasure: Are you sure you wish to completely delete your account? All your personal profile records, contact numbers, and saved lists will be permanently erased.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.deleteMe();
      logout();
      alert('Your account and all associated personal data have been completely deleted.');
      navigate('/');
    } catch (err) {
      alert('Account deletion failed: ' + err.message);
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p>Please sign in to access your profile settings.</p>
        <Link to="/auth?mode=login" className="btn btn-primary" style={{ marginTop: '12px' }}>
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '36px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
          Account & Privacy Settings
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '32px' }}>
          Manage your personal details, review your saved hotels, and exercise your GDPR/DPDP data rights.
        </p>

        {successMsg && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--trust-green-bg)',
            border: '1px solid var(--trust-green-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-dark)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '24px'
          }}>
            ✓ {successMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Profile Details Card */}
          <div className="card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="var(--primary)" />
              <span>Personal Information</span>
            </h2>

            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address (Immutable)</label>
                <input
                  type="email"
                  className="form-input"
                  value={user.email}
                  disabled
                  style={{ backgroundColor: 'var(--slate-100)', cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                  Email serves as your unique security identity
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div style={{ textAlign: 'right', marginTop: '8px' }}>
                <button type="submit" disabled={saving} className="btn btn-primary">
                  <Save size={16} />
                  <span>{saving ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Saved / Favorite Hotels */}
          <div className="card" style={{ padding: '28px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={20} color="#ef4444" fill="#ef4444" />
              <span>Saved & Favorite Stays ({favorites.length})</span>
            </h2>

            {favorites.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                You haven't saved any hotels yet. Click the heart icon on any hotel card to pin it here!
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                {favorites.map((h) => (
                  <div key={h.id} style={{
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    backgroundColor: 'var(--slate-50)'
                  }}>
                    <img
                      src={h.featured_image || (h.images && h.images[0])}
                      alt={h.name}
                      style={{ width: '100%', height: '120px', objectFit: 'cover' }}
                    />
                    <div style={{ padding: '12px' }}>
                      <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '4px' }}>
                        {h.name}
                      </h4>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '8px' }}>
                        {h.city}, {h.country}
                      </div>
                      <Link to={`/hotel/${h.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                        <span>View Rooms</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Responsible Data Privacy & GDPR Rights Card */}
          <div className="card" style={{ padding: '28px', borderLeft: '4px solid var(--accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldCheck size={24} color="var(--accent)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                Responsible Data Privacy Center (GDPR / DPDP Rights)
              </h2>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '20px' }}>
              In accordance with ethical engineering and data minimization practices, you retain absolute authority to export all system records associated with your account or permanently delete your profile at any time.
            </p>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleExportData}
                disabled={exporting}
                className="btn btn-secondary"
              >
                <Download size={16} />
                <span>{exporting ? 'Generating JSON...' : 'Export My Personal Data (JSON)'}</span>
              </button>

              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="btn btn-danger"
              >
                <Trash2 size={16} />
                <span>{deleting ? 'Deleting...' : 'Delete My Account & Personal Data'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
