import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Heart, User, LogOut, Compass, Sparkles, Building, Menu, X } from 'lucide-react';

export default function Navbar({ onOpenPrivacyModal }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    setProfileDropdownOpen(false);
    navigate('/');
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--slate-200)',
      height: 'var(--nav-height)'
    }}>
      <div className="container" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.5px', color: 'var(--slate-900)' }}>
              Haven<span style={{ color: 'var(--accent)' }}>Stay</span>
            </div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Responsible Hotel Discovery
            </div>
          </div>
        </Link>

        {/* Responsible Transparency Badge */}
        <div style={{
          display: 'none',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--trust-green-bg)',
          border: '1px solid var(--trust-green-border)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.8125rem',
          color: 'var(--accent-dark)',
          fontWeight: 600,
          cursor: 'pointer'
        }}
        onClick={onOpenPrivacyModal}
        className="desktop-trust-badge"
        >
          <ShieldCheck size={16} color="var(--accent)" />
          <span>Zero Dark Patterns • 100% Upfront Pricing</span>
        </div>

        {/* Desktop Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link
            to="/search"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: location.pathname === '/search' ? 'var(--primary)' : 'var(--slate-600)',
              transition: 'color 0.2s'
            }}
          >
            <Compass size={18} />
            <span>Find Rooms</span>
          </Link>

          {user && (
            <Link
              to="/bookings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: location.pathname === '/bookings' ? 'var(--primary)' : 'var(--slate-600)',
                transition: 'color 0.2s'
              }}
            >
              <Building size={18} />
              <span>My Stays</span>
            </Link>
          )}

          {user?.role === 'admin' && (
            <Link
              to="/admin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: '#b45309',
                backgroundColor: '#fef3c7',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                transition: 'background-color 0.2s'
              }}
            >
              <span>Admin Portal</span>
            </Link>
          )}

          {/* User Auth state */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--slate-100)',
                  border: '1px solid var(--slate-200)',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--slate-800)'
                }}
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 700
                }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span>{user.name.split(' ')[0]}</span>
              </button>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  backgroundColor: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-color)',
                  width: '210px',
                  padding: '8px 0',
                  zIndex: 100
                }}>
                  <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--slate-100)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{user.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{user.email}</div>
                  </div>

                  {user.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#b45309',
                        backgroundColor: '#fffbeb',
                        transition: 'background-color 0.15s'
                      }}
                    >
                      <Building size={16} />
                      <span>Admin Hub</span>
                    </Link>
                  )}

                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '0.875rem',
                      color: 'var(--slate-700)',
                      transition: 'background-color 0.15s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--slate-50)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={16} />
                    <span>Profile & Privacy</span>
                  </Link>

                  <button
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      fontSize: '0.875rem',
                      color: '#b91c1c',
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/admin/login"
                style={{
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#b45309',
                  backgroundColor: '#fef3c7',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  textDecoration: 'none'
                }}
              >
                Admin Portal
              </Link>
              <Link to="/auth?mode=login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/auth?mode=signup" className="btn btn-primary btn-sm">
                Join Free
              </Link>
            </div>
          )}
        </nav>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .desktop-trust-badge {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
