import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import EmailPreviewModal from '../components/EmailPreviewModal';
import { Building, Calendar, Users, FileText, XCircle, CheckCircle, AlertCircle, Loader2, ArrowRight, Mail } from 'lucide-react';

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'confirmed', 'cancelled'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [selectedEmailBooking, setSelectedEmailBooking] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadBookings();
  }, [user]);

  const loadBookings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (err) {
      console.error("Failed to load user bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId, reference) => {
    const confirmCancel = window.confirm(`Are you sure you want to cancel reservation ${reference}? Free cancellation will be applied immediately with zero cancellation penalties.`);
    if (!confirmCancel) return;

    setActionLoading(bookingId);
    try {
      await api.cancelBooking(bookingId);
      setMessage(`Reservation ${reference} was successfully cancelled.`);
      await loadBookings();
    } catch (err) {
      alert(err.message || "Failed to cancel reservation.");
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{
          maxWidth: '480px',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <Building size={48} color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
            Sign in to view your stays
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '24px' }}>
            Manage your upcoming trips, download official receipts, or easily modify reservations.
          </p>
          <Link to="/auth?mode=login" className="btn btn-primary" style={{ width: '100%' }}>
            Sign In to HavenStay
          </Link>
        </div>
      </div>
    );
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === 'confirmed') return b.status === 'confirmed';
    if (activeTab === 'cancelled') return b.status === 'cancelled';
    return true;
  });

  return (
    <div style={{ paddingTop: '36px', paddingBottom: '80px' }}>
      <div className="container" style={{ maxWidth: '960px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              My Hotel Reservations
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '4px' }}>
              Transparent reservation records, itemized tax invoices, and 1-click cancellations
            </p>
          </div>

          <Link to="/search" className="btn btn-secondary btn-sm">
            <span>Discover New Rooms</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Feedback message */}
        {message && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'var(--trust-green-bg)',
            border: '1px solid var(--trust-green-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-dark)',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-dark)' }}>✕</button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--slate-200)',
          marginBottom: '24px'
        }}>
          {[
            { key: 'all', label: `All Stays (${bookings.length})` },
            { key: 'confirmed', label: `Active / Upcoming (${bookings.filter(b => b.status === 'confirmed').length})` },
            { key: 'cancelled', label: `Cancelled (${bookings.filter(b => b.status === 'cancelled').length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.key ? 'var(--primary)' : 'var(--slate-600)',
                fontWeight: activeTab === tab.key ? 700 : 500,
                fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader2 size={36} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 12px auto' }} />
            <div style={{ color: 'var(--slate-600)' }}>Retrieving your reservation records...</div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)'
          }}>
            <Building size={40} color="var(--slate-400)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '6px' }}>
              No stays found in this category
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginBottom: '20px' }}>
              Ready for your next peaceful getaway? Browse our curated eco-conscious hotels.
            </p>
            <Link to="/search" className="btn btn-primary btn-sm">
              Search Hotel Rooms
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredBookings.map((b) => {
              const isConfirmed = b.status === 'confirmed';

              return (
                <div key={b.id} className="card" style={{ padding: '24px' }}>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '16px',
                    borderBottom: '1px solid var(--slate-100)',
                    paddingBottom: '16px',
                    marginBottom: '16px'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          backgroundColor: isConfirmed ? 'var(--trust-green-bg)' : '#fee2e2',
                          color: isConfirmed ? 'var(--trust-green)' : '#b91c1c',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: 'uppercase'
                        }}>
                          {b.status}
                        </span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                          Ref: <strong style={{ color: 'var(--slate-900)' }}>{b.booking_reference}</strong>
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', marginTop: '6px' }}>
                        {b.hotel_name || 'HavenStay Hotel'}
                      </h2>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                        {b.hotel_address}, {b.hotel_city}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Total Paid (All-In)</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        ${b.total_price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
                        ✓ Zero hidden resort fees
                      </div>
                    </div>
                  </div>

                  {/* Booking Metadata Row */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    fontSize: '0.875rem',
                    color: 'var(--slate-700)',
                    marginBottom: '20px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Calendar size={18} color="var(--primary)" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Dates & Duration</div>
                        <div><strong>{b.check_in}</strong> → <strong>{b.check_out}</strong> ({b.nights}n)</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Users size={18} color="var(--primary)" />
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Room & Guests</div>
                        <div>{b.room_type} • {b.guests} guest{b.guests > 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setSelectedEmailBooking(b)}
                      className="btn btn-secondary btn-sm"
                      title="View email dispatch status & resend"
                    >
                      <Mail size={15} />
                      <span>Email Status</span>
                    </button>

                    <button
                      onClick={() => setSelectedReceipt(b)}
                      className="btn btn-secondary btn-sm"
                    >
                      <FileText size={15} />
                      <span>View Receipt & Invoice</span>
                    </button>

                    {isConfirmed && (
                      <button
                        onClick={() => handleCancelBooking(b.id, b.booking_reference)}
                        disabled={actionLoading === b.id}
                        className="btn btn-danger btn-sm"
                      >
                        <XCircle size={15} />
                        <span>{actionLoading === b.id ? 'Cancelling...' : 'Cancel Stay (Zero Penalties)'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          booking={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Email Notification Preview & Resend Modal */}
      {selectedEmailBooking && (
        <EmailPreviewModal
          booking={selectedEmailBooking}
          onClose={() => setSelectedEmailBooking(null)}
        />
      )}
    </div>
  );
}
