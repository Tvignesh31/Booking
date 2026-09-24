import React, { useState } from 'react';
import { X, Printer, CheckCircle, ShieldCheck, Building, Calendar, Users, DollarSign, Mail, Loader2, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';
import EmailPreviewModal from './EmailPreviewModal';

export default function ReceiptModal({ booking, onClose }) {
  const { user } = useAuth();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [receiptSentMsg, setReceiptSentMsg] = useState(null);

  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendToRegisteredUser = async () => {
    setSendingReceipt(true);
    setReceiptSentMsg(null);
    try {
      const res = await api.resendBookingEmail(booking.id, user?.email || null, true);
      setReceiptSentMsg(res.message || "Receipt dispatched to registered database user email!");
      setTimeout(() => setReceiptSentMsg(null), 6000);
    } catch (err) {
      alert(err.message || "Failed to send receipt email.");
    } finally {
      setSendingReceipt(false);
    }
  };

  const breakdown = booking.itemized_breakdown || {};

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="modal-dialog print-area"
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '680px', padding: '32px' }}
        >
          {/* Header with Print & Close buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid var(--slate-100)', paddingBottom: '20px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <CheckCircle size={24} color="var(--accent)" />
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Reservation Confirmation
                </h2>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                Booking Reference: <strong style={{ color: 'var(--slate-900)' }}>{booking.booking_reference}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }} className="no-print">
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                className="btn btn-secondary btn-sm"
                title="View email dispatch status and resend"
              >
                <Mail size={16} />
                <span>Email Status</span>
              </button>
              <button
                onClick={handlePrint}
                className="btn btn-secondary btn-sm"
                title="Print receipt or save to PDF"
              >
                <Printer size={16} />
                <span>Print Receipt</span>
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--slate-400)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Quick Email Receipt to Registered User Banner */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: '20px',
            gap: '12px',
            flexWrap: 'wrap'
          }} className="no-print">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="#16a34a" />
              <span style={{ fontSize: '0.85rem', color: '#166534' }}>
                {user?.email ? (
                  <>Registered account DB email: <strong>{user.email}</strong></>
                ) : (
                  <>Receipt automatically linked to registered user account</>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSendToRegisteredUser}
              disabled={sendingReceipt}
              className="btn btn-sm"
              style={{
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600
              }}
            >
              {sendingReceipt ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Sending Receipt...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Email Receipt to Registered User</span>
                </>
              )}
            </button>
          </div>

          {receiptSentMsg && (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }} className="no-print">
              <CheckCircle size={16} color="#059669" />
              <span>{receiptSentMsg}</span>
            </div>
          )}

        {/* Hotel & Guest Details Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '24px',
          backgroundColor: 'var(--slate-50)',
          padding: '20px',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--slate-400)', fontWeight: 700, marginBottom: '6px' }}>
              Hotel Details
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--slate-900)' }}>
              {booking.hotel_name || 'HavenStay Hotel'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)', marginTop: '2px' }}>
              {booking.hotel_address}, {booking.hotel_city}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600, marginTop: '6px' }}>
              Room: {booking.room_type || 'Selected Room'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--slate-400)', fontWeight: 700, marginBottom: '6px' }}>
              Guest & Dates
            </div>
            <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
              {booking.guest_name} ({booking.guests} Guest{booking.guests > 1 ? 's' : ''})
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--slate-600)' }}>
              {booking.guest_email}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--slate-700)', marginTop: '6px', fontWeight: 600 }}>
              📅 {booking.check_in} → {booking.check_out} ({booking.nights} Night{booking.nights > 1 ? 's' : ''})
            </div>
          </div>
        </div>

        {/* Itemized Price Breakdown Table */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)', marginBottom: '12px' }}>
            Transparent Itemized Receipt
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--slate-100)' }}>
                <td style={{ padding: '10px 0', color: 'var(--slate-600)' }}>
                  Base Room Rate ({booking.nights} night{booking.nights > 1 ? 's' : ''} × {booking.rooms_count || 1} room)
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: 'var(--slate-800)' }}>
                  ${booking.base_total?.toFixed(2) || '0.00'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--slate-100)' }}>
                <td style={{ padding: '10px 0', color: 'var(--slate-600)' }}>
                  Taxes & Local Municipal Fees ({breakdown.tax_rate_percent || 12}%)
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: 'var(--slate-800)' }}>
                  ${booking.taxes_total?.toFixed(2) || '0.00'}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--slate-100)' }}>
                <td style={{ padding: '10px 0', color: 'var(--accent)', fontWeight: 600 }}>
                  Resort Fees & Hidden Surcharges
                </td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                  $0.00 (Guaranteed Free)
                </td>
              </tr>
              <tr>
                <td style={{ padding: '14px 0 0 0', fontWeight: 800, fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                  Total Paid
                </td>
                <td style={{ padding: '14px 0 0 0', textAlign: 'right', fontWeight: 800, fontSize: '1.25rem', color: 'var(--slate-900)' }}>
                  ${booking.total_price?.toFixed(2) || '0.00'}
                </td>
              </tr>
              {(booking.payment_method || booking.gateway_payment_id || booking.payment?.payment_method) && (
                <tr style={{ borderTop: '1px dashed var(--slate-200)' }}>
                  <td style={{ padding: '10px 0', color: 'var(--slate-600)', fontSize: '0.8125rem' }}>
                    Payment Method & Transaction ID
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: 'var(--slate-800)', fontSize: '0.8125rem' }}>
                    {(booking.payment_method || booking.payment?.payment_method || 'Card').toUpperCase()} • {booking.gateway_payment_id || booking.payment?.razorpay_payment_id || 'Captured'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Responsible Guarantee Banner */}
        <div style={{
          backgroundColor: 'var(--trust-green-bg)',
          border: '1px solid var(--trust-green-border)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <ShieldCheck size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--accent-dark)', lineHeight: 1.4 }}>
            <strong>Responsible Transparency Guarantee:</strong> All fees are prepaid in full. The property will not charge any mandatory resort or amenity fees upon check-in.
          </div>
        </div>

        {/* Special Requests note if present */}
        {booking.special_requests && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginBottom: '20px' }}>
            <strong>Special Requests:</strong> {booking.special_requests}
          </div>
        )}

        {/* Close Button */}
        <div style={{ textAlign: 'right' }} className="no-print">
          <button onClick={onClose} className="btn btn-secondary">
            Close Receipt
          </button>
        </div>

        <style>{`
          @media print {
            .no-print {
              display: none !important;
            }
            .modal-backdrop {
              position: static !important;
              background: none !important;
              backdrop-filter: none !important;
              padding: 0 !important;
            }
            .modal-dialog {
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              max-width: 100% !important;
            }
          }
        `}</style>
      </div>
    </div>

    {showEmailModal && (
      <EmailPreviewModal
        booking={booking}
        onClose={() => setShowEmailModal(false)}
      />
    )}
  </>
  );
}
