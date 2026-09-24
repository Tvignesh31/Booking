import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';
import {
  Mail,
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  RefreshCw,
  Eye,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export default function EmailPreviewModal({ booking, onClose }) {
  const { user } = useAuth();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);

  // Resend state - prioritize registered account email or booking guest email
  const [resendEmailAddress, setResendEmailAddress] = useState(user?.email || booking?.guest_email || '');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState(null);
  const [resendError, setResendError] = useState(null);

  useEffect(() => {
    if (booking?.id) {
      loadEmails();
    }
  }, [booking?.id]);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await api.getBookingEmails(booking.id);
      setEmails(data || []);
      if (data && data.length > 0) {
        setSelectedEmail(data[0]);
      }
    } catch (err) {
      console.error("Failed to load booking emails:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmailAddress || !booking?.id) return;
    setResending(true);
    setResendMessage(null);
    setResendError(null);

    try {
      const res = await api.resendBookingEmail(booking.id, resendEmailAddress);
      setResendMessage(res.message || `Confirmation email dispatched to ${resendEmailAddress}!`);
      // Reload emails after brief delay
      setTimeout(() => {
        loadEmails();
      }, 1000);
    } catch (err) {
      setResendError(err.message || "Failed to resend confirmation email.");
    } finally {
      setResending(false);
    }
  };

  if (!booking) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '24px' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--slate-100)',
          paddingBottom: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#eff6ff',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Mail size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Booking Status & Email Dispatch
              </h2>
              <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
                Reservation Ref: <strong>{booking.booking_reference}</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--slate-400)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Resend Action Bar */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 18px',
          border: '1px solid var(--slate-200)',
          marginBottom: '18px'
        }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-800)', marginBottom: '8px' }}>
            Resend Status Notification to Email
          </div>
          <form onSubmit={handleResend} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="email"
              className="form-input"
              value={resendEmailAddress}
              onChange={(e) => setResendEmailAddress(e.target.value)}
              placeholder="Guest email address"
              required
              style={{ flex: 1, minWidth: '220px', height: '38px', fontSize: '0.875rem' }}
            />
            <button
              type="submit"
              disabled={resending}
              className="btn btn-primary btn-sm"
              style={{ height: '38px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {resending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              <span>{resending ? 'Sending...' : 'Send Confirmation Email'}</span>
            </button>
          </form>

          {/* Quick Selection Chips */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Quick Fill:</span>
            {user?.email && (
              <button
                type="button"
                onClick={() => setResendEmailAddress(user.email)}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: resendEmailAddress === user.email ? '1px solid #16a34a' : '1px solid var(--slate-300)',
                  backgroundColor: resendEmailAddress === user.email ? '#ecfdf5' : '#ffffff',
                  color: resendEmailAddress === user.email ? '#166534' : 'var(--slate-700)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <UserCheck size={12} />
                <span>Registered Account ({user.email})</span>
              </button>
            )}
            {booking?.guest_email && booking.guest_email !== user?.email && (
              <button
                type="button"
                onClick={() => setResendEmailAddress(booking.guest_email)}
                style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: resendEmailAddress === booking.guest_email ? '1px solid var(--primary)' : '1px solid var(--slate-300)',
                  backgroundColor: resendEmailAddress === booking.guest_email ? 'var(--primary-light)' : '#ffffff',
                  color: resendEmailAddress === booking.guest_email ? 'var(--primary)' : 'var(--slate-700)',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Guest Email ({booking.guest_email})
              </button>
            )}
          </div>

          {/* Feedback toasts */}
          {resendMessage && (
            <div style={{
              marginTop: '10px',
              fontSize: '0.8125rem',
              color: '#166534',
              backgroundColor: '#f0fdf4',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle2 size={16} />
              <span>{resendMessage}</span>
            </div>
          )}

          {resendError && (
            <div style={{
              marginTop: '10px',
              fontSize: '0.8125rem',
              color: '#991b1b',
              backgroundColor: '#fef2f2',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={16} />
              <span>{resendError}</span>
            </div>
          )}
        </div>

        {/* Email Logs & Preview Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--slate-700)' }}>
              Dispatched Notification Logs ({emails.length})
            </span>
            <button
              type="button"
              onClick={loadEmails}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem', padding: '4px 8px', height: '26px' }}
              title="Refresh logs"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--slate-500)' }}>
              <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 8px auto', color: 'var(--primary)' }} />
              <div>Fetching email notification logs...</div>
            </div>
          ) : emails.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '30px 16px',
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--slate-300)',
              color: 'var(--slate-600)',
              fontSize: '0.875rem'
            }}>
              <Mail size={32} color="var(--slate-400)" style={{ margin: '0 auto 8px auto' }} />
              <div>No email records recorded yet for this booking.</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                Use the form above to dispatch an official confirmation email.
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '16px', flex: 1, overflow: 'hidden' }}>
              {/* Left: Email List Tabs */}
              <div style={{
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                paddingRight: '6px'
              }}>
                {emails.map((item) => {
                  const isSelected = selectedEmail?.id === item.id;
                  const isDelivered = ['sent', 'delivered'].includes(item.status);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedEmail(item)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: isDelivered ? '#dcfce7' : '#fee2e2',
                          color: isDelivered ? '#15803d' : '#b91c1c',
                          textTransform: 'uppercase'
                        }}>
                          {item.status}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--slate-400)' }}>
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-800)', marginTop: '4px', textTransform: 'capitalize' }}>
                        {item.email_type?.replace('_', ' ') || 'Booking Email'}
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--slate-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        To: {item.recipient_email}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right: Rendered Email Preview Container */}
              <div style={{
                border: '1px solid var(--slate-200)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {selectedEmail ? (
                  <>
                    <div style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--slate-50)',
                      borderBottom: '1px solid var(--slate-200)',
                      fontSize: '0.75rem',
                      color: 'var(--slate-700)'
                    }}>
                      <div><strong>Subject:</strong> {selectedEmail.subject || "HavenStay Booking Confirmation"}</div>
                      <div style={{ marginTop: '2px', color: 'var(--slate-500)' }}>
                        <strong>Recipient:</strong> {selectedEmail.recipient_email} • <strong>Status:</strong> {selectedEmail.status.toUpperCase()}
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                      {selectedEmail.html_content ? (
                        <div dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }} />
                      ) : (
                        <div style={{ padding: '20px', color: 'var(--slate-600)', fontSize: '0.875rem' }}>
                          <p><strong>Status:</strong> {selectedEmail.status}</p>
                          <p><strong>Dispatched To:</strong> {selectedEmail.recipient_email}</p>
                          <p><strong>Provider Message ID:</strong> <code>{selectedEmail.provider_message_id || 'Captured by Email Provider'}</code></p>
                          {selectedEmail.error_message && (
                            <p style={{ color: '#dc2626' }}><strong>Error:</strong> {selectedEmail.error_message}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)' }}>
                    Select an email on the left to preview content
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          borderTop: '1px solid var(--slate-100)',
          paddingTop: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="var(--accent)" /> Responsible Automated Delivery Guarantee
          </span>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
