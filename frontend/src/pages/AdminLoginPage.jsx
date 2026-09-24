import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Lock,
  Mail,
  Building,
  KeyRound,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Sparkles,
  ChevronLeft,
  Server
} from 'lucide-react';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already logged in as admin, navigate directly to /admin
  useEffect(() => {
    if (user && user.role === 'admin') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login({ email: email.trim(), password });
      if (loggedUser.role !== 'admin') {
        setError('Access denied: This account does not possess administrative privileges.');
        return;
      }
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Administrative authentication failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const loggedUser = await login({
        email: 'admin@hotelbooking.com',
        password: 'AdminPass123!'
      });
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else {
        setError('Configured demo admin does not have admin permissions.');
      }
    } catch (err) {
      setError(err.message || 'Quick admin sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--nav-height) - 40px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(ellipse at 50% 20%, #1e293b 0%, #0f172a 100%)',
      color: '#f8fafc'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '40px 36px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(245, 158, 11, 0.15)'
      }}>
        {/* Top Back Link */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8125rem',
              color: '#94a3b8',
              textDecoration: 'none',
              transition: 'color 0.15s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#f8fafc'}
            onMouseOut={(e) => e.currentTarget.style.color = '#94a3b8'}
          >
            <ChevronLeft size={16} />
            <span>Return to HavenStay Guest Website</span>
          </Link>
        </div>

        {/* Security Badge Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 20px rgba(217, 119, 6, 0.35)',
            border: '2px solid rgba(253, 230, 138, 0.3)'
          }}>
            <Shield size={28} />
          </div>

          <div style={{
            display: 'inline-block',
            padding: '3px 10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#fbbf24',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}>
            Administrative Portal
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', margin: '0 0 6px 0' }}>
            Operations & Control Hub
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
            Restricted access for hotel property managers and system administrators
          </p>
        </div>

        {/* Warning if logged in as normal user */}
        {user && user.role !== 'admin' && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.8125rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              You are currently signed in as <strong>{user.email}</strong> (Role: {user.role}). Sign in below with admin credentials to proceed.
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            color: '#fca5a5',
            fontSize: '0.8125rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Admin Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                placeholder="admin@hotelbooking.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
              Admin Security Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  backgroundColor: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '8px',
              padding: '12px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.4)',
              transition: 'background-color 0.15s'
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#b45309'; }}
            onMouseOut={(e) => { if (!loading) e.currentTarget.style.backgroundColor = '#d97706'; }}
          >
            <KeyRound size={18} />
            <span>{loading ? 'Authenticating Admin...' : 'Authenticate to Admin Console'}</span>
          </button>
        </form>

        {/* 1-Click Quick Demo Admin Credentials */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #334155',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            color: '#64748b',
            marginBottom: '12px'
          }}>
            Quick Admin Sandbox Sign-In
          </div>
          <button
            type="button"
            onClick={handleQuickAdminLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
          >
            <Shield size={16} color="#fbbf24" />
            <span>One-Click Login as Hotel Administrator</span>
          </button>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>
            admin@hotelbooking.com • AdminPass123!
          </div>
        </div>

        {/* Switch to Guest Sign In */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.8125rem', color: '#94a3b8' }}>
          Are you a hotel guest or traveler?{' '}
          <Link
            to="/auth"
            style={{ color: '#38bdf8', fontWeight: 600, textDecoration: 'none' }}
          >
            Go to Guest Sign In & Register →
          </Link>
        </div>
      </div>
    </div>
  );
}
