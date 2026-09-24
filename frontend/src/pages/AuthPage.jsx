import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';
import { Sparkles, ShieldCheck, Lock, Mail, User, Phone, AlertCircle, Info } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [policy, setPolicy] = useState({
    allow_open_registration: true,
    require_phone: false,
    min_password_length: 6,
    terms_version: '2026.2'
  });

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const p = await api.getPublicRegistrationPolicy();
        if (p) setPolicy(p);
      } catch (err) {
        // Fallback to defaults
      }
    };
    fetchPolicy();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!policy.allow_open_registration) {
          throw new Error('Registration is currently paused by the platform administrator.');
        }
        if (policy.require_phone && (!phone || !phone.trim())) {
          throw new Error('Contact phone number is required by registration policy.');
        }
        if (password.length < (policy.min_password_length || 6)) {
          throw new Error(`Password must be at least ${policy.min_password_length || 6} characters.`);
        }
        await signup({ name, email, password, phone: phone || null });
      } else {
        await login({ email, password });
      }
      navigate(-1); // Return to previous page or home
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail, demoPassword) => {
    setError('');
    setLoading(true);
    try {
      await login({ email: demoEmail, password: demoPassword });
      navigate(-1);
    } catch (err) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - var(--nav-height) - 100px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: 'radial-gradient(circle at 50% 0%, #ccfbf1 0%, #f8fafc 80%)'
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 'var(--radius-xl)',
        padding: '36px',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-xl)'
      }}>
        {/* Brand logo & heading */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            margin: '0 auto 12px auto',
            boxShadow: '0 4px 10px rgba(15, 118, 110, 0.25)'
          }}>
            <Sparkles size={26} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            {isSignUp ? 'Join HavenStay' : 'Welcome Back'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '4px' }}>
            {isSignUp ? 'Create your privacy-first hotel booking account' : 'Sign in to access your stays and saved hotels'}
          </p>
        </div>

        {/* Tab switch */}
        <div style={{
          display: 'flex',
          backgroundColor: 'var(--slate-100)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: !isSignUp ? '#ffffff' : 'transparent',
              color: !isSignUp ? 'var(--slate-900)' : 'var(--slate-500)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: !isSignUp ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isSignUp ? '#ffffff' : 'transparent',
              color: isSignUp ? 'var(--slate-900)' : 'var(--slate-500)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              boxShadow: isSignUp ? 'var(--shadow-sm)' : 'none'
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: '#991b1b',
            fontSize: '0.8125rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {isSignUp && !policy.allow_open_registration && (
          <div style={{
            padding: '14px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)',
            color: '#b45309',
            fontSize: '0.8125rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <Info size={18} />
            <div>
              <strong>Public Registration Paused:</strong> New accounts are temporarily restricted by the administrator. Please sign in with an existing account.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="e.g. Jordan Lee"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="email"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div className="form-group">
              <label className="form-label">
                Phone Number {policy.require_phone ? <span style={{ color: '#ef4444', fontWeight: 700 }}>* (Required)</span> : <span style={{ color: 'var(--slate-400)' }}>(Optional)</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                <input
                  type="tel"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required={policy.require_phone}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
              {isSignUp && (
                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
                  Min {policy.min_password_length || 6} characters
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
              <input
                type="password"
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={policy.min_password_length || 6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (isSignUp && !policy.allow_open_registration)}
            className="btn btn-primary"
            style={{ width: '100%', height: '44px', marginTop: '8px', fontSize: '1rem' }}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* 1-Click Quick Demo Account for Guest */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--slate-200)', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--slate-400)', textAlign: 'center', marginBottom: '10px' }}>
            Instant Demo Sign In
          </div>
          <div>
            <button
              type="button"
              onClick={() => handleQuickLogin('guest@hotelbooking.com', 'GuestPass123!')}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', fontSize: '0.8125rem', padding: '8px' }}
            >
              One-Click Demo Guest Sign In
            </button>
          </div>
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
            Are you a hotel manager or system admin?{' '}
            <Link to="/admin/login" style={{ color: '#b45309', fontWeight: 700, textDecoration: 'none' }}>
              Access Admin Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
