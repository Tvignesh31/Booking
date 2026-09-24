import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ReceiptModal from '../components/ReceiptModal';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import confetti from 'canvas-confetti';
import { ShieldCheck, CheckCircle2, Lock, ArrowLeft, Building, Calendar, Users, AlertCircle, Loader2 } from 'lucide-react';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const hotelId = parseInt(searchParams.get('hotel_id') || '0', 10);
  const roomId = parseInt(searchParams.get('room_id') || '0', 10);
  const checkIn = searchParams.get('check_in') || '';
  const checkOut = searchParams.get('check_out') || '';
  const adults = parseInt(searchParams.get('adults') || searchParams.get('guests') || '2', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const roomsCount = parseInt(searchParams.get('rooms') || '1', 10);
  const childrenAges = searchParams.get('children_ages') ? searchParams.get('children_ages').split(',').map(Number) : [];
  const guests = adults + children;

  const [hotel, setHotel] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [paymentOrderData, setPaymentOrderData] = useState(null);

  // Guest details form state
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [specialRequests, setSpecialRequests] = useState('');

  // Confirmed booking state for receipt modal
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    if (user) {
      if (!guestName) setGuestName(user.name);
      if (!guestEmail) setGuestEmail(user.email);
      if (!guestPhone && user.phone) setGuestPhone(user.phone);
    }
  }, [user]);

  useEffect(() => {
    async function loadData() {
      if (!hotelId || !roomId) {
        setError("Missing hotel or room selection.");
        setLoading(false);
        return;
      }
      try {
        const hotelData = await api.getHotel(hotelId);
        setHotel(hotelData);

        const roomsData = await api.getHotelRooms(hotelId, checkIn, checkOut, guests);
        const selected = roomsData.find(r => r.id === roomId);
        if (selected) {
          setRoom(selected);
        } else {
          setError("Selected room is no longer available for these dates.");
        }
      } catch (err) {
        console.error("Checkout data load error:", err);
        setError("Failed to load reservation details.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [hotelId, roomId, checkIn, checkOut, guests]);

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.round(diff));
  };

  const nights = calculateNights();

  const baseRate = room ? room.base_price : 0;
  const baseSubtotal = Math.round(baseRate * nights * roomsCount * 100) / 100;
  const taxRate = room ? room.taxes_and_fees : 0.12;
  const taxesTotal = Math.round(baseSubtotal * taxRate * 100) / 100;
  const grandTotal = Math.round((baseSubtotal + taxesTotal) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        hotel_id: hotelId,
        room_id: roomId,
        check_in: checkIn,
        check_out: checkOut,
        guests: guests,
        rooms_count: roomsCount,
        adults_count: adults,
        children_count: children,
        children_ages: childrenAges,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        special_requests: specialRequests
      };

      const booking = await api.createBooking(payload);
      setPendingBooking(booking);

      // Create live payment session / intent
      const intent = await api.createPaymentIntent(booking.id);
      setPaymentOrderData(intent);
      setShowPaymentModal(true);
    } catch (err) {
      console.error("Booking creation failed:", err);
      setError(err.message || "Failed to initiate reservation. Please check room availability.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentResult) => {
    setShowPaymentModal(false);
    setConfirmedBooking({
      ...pendingBooking,
      status: 'confirmed',
      payment: paymentResult,
      payment_method: paymentResult.payment_method || 'card',
      gateway_payment_id: paymentResult.razorpay_payment_id || `pay_${Date.now()}`
    });

    // Trigger celebratory confetti
    confetti({
      particleCount: 100,
      spread: 75,
      origin: { y: 0.6 }
    });

    setShowReceipt(true);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <Loader2 size={40} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
        <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Preparing your reservation...</div>
      </div>
    );
  }

  if (error && !hotel) {
    return (
      <div className="container" style={{ padding: '80px 20px' }}>
        <div style={{
          padding: '24px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 'var(--radius-lg)',
          color: '#991b1b',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertCircle size={24} />
          <div>{error}</div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <Link to="/search" className="btn btn-primary">Back to Search</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '32px', paddingBottom: '80px' }}>
      <div className="container">
        {/* Back Link */}
        <Link
          to={`/hotel/${hotelId}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--slate-600)',
            fontWeight: 600,
            fontSize: '0.875rem',
            marginBottom: '20px'
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Hotel & Rooms</span>
        </Link>

        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
          Review & Complete Your Reservation
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)', marginBottom: '32px' }}>
          No hidden fees, no pre-ticked add-ons, and free cancellation according to policy.
        </p>

        {error && (
          <div style={{
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)',
            color: '#991b1b',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* 2-Column Checkout Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '36px',
          alignItems: 'start'
        }}
        className="checkout-layout-grid"
        >
          {/* Left Column: Guest Details Form */}
          <div>
            <form onSubmit={handleSubmit} style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '20px' }}>
                Guest Information
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Eleanor Vance"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                    Must match government photo ID presented at check-in
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address (for instant booking receipt) *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    required
                  />
                  {user?.email ? (
                    <span style={{ fontSize: '0.75rem', color: '#166534', backgroundColor: '#f0fdf4', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '4px' }}>
                      ✓ Logged in as <strong>{user.email}</strong>. Booking receipt will automatically link to your profile & be sent to this email.
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px', display: 'block' }}>
                      Official booking receipt will be emailed immediately. If this matches a registered account, it will automatically link to your DB history.
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number (optional)</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Special Requests (optional)</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Early check-in request, quiet room, high floor, etc."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  />
                </div>

                {/* Responsible Privacy Assurance Box */}
                <div style={{
                  backgroundColor: 'var(--trust-green-bg)',
                  border: '1px solid var(--trust-green-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'flex-start'
                }}>
                  <ShieldCheck size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ fontSize: '0.8125rem', color: 'var(--accent-dark)', lineHeight: 1.4 }}>
                    <strong>Responsible Data Protection:</strong> We collect only the contact information required by hospitality law to issue your reservation key. We do not sell your email or sign you up for unwanted marketing spam.
                  </div>
                </div>

                {/* Confirm Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginTop: '12px' }}
                >
                  <Lock size={18} />
                  <span>{submitting ? 'Preparing Secure Payment...' : `Proceed to Secure Payment • $${grandTotal.toFixed(2)}`}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Complete Itemized Price Summary */}
          <div>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)',
              position: 'sticky',
              top: 'calc(var(--nav-height) + 20px)'
            }}>
              {/* Hotel & Room Snapshot */}
              <div style={{ display: 'flex', gap: '14px', paddingBottom: '20px', borderBottom: '1px solid var(--slate-100)', marginBottom: '20px' }}>
                <img
                  src={hotel?.featured_image || (hotel?.images && hotel.images[0])}
                  alt={hotel?.name}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                />
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    {hotel?.name}
                  </h3>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--primary)', fontWeight: 600 }}>
                    {room?.room_type}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                    {hotel?.address}, {hotel?.city}
                  </div>
                </div>
              </div>

              {/* Dates & Occupancy Summary */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '20px', borderBottom: '1px solid var(--slate-100)', marginBottom: '20px', fontSize: '0.875rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Dates:</span>
                  <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{checkIn} → {checkOut} ({nights} nights)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Rooms:</span>
                  <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>{roomsCount} Room{roomsCount > 1 ? 's' : ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Guests:</span>
                  <span style={{ fontWeight: 600, color: 'var(--slate-900)' }}>
                    {adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--slate-500)' }}>Cancellation Policy:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Free cancellation</span>
                </div>
              </div>

              {/* Itemized Transparent Pricing */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)', marginBottom: '12px' }}>
                  Itemized Price Breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.875rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)' }}>
                    <span>${baseRate} × {nights} nights{roomsCount > 1 ? ` × ${roomsCount} rooms` : ''}</span>
                    <span style={{ fontWeight: 600 }}>${baseSubtotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--slate-600)' }}>
                    <span>Mandatory Taxes ({Math.round(taxRate * 100)}%)</span>
                    <span style={{ fontWeight: 600 }}>${taxesTotal.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent)', fontWeight: 600 }}>
                    <span>Resort Fees & Surcharges</span>
                    <span>$0.00 (None)</span>
                  </div>
                </div>

                <div style={{
                  borderTop: '2px solid var(--slate-900)',
                  marginTop: '16px',
                  paddingTop: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline'
                }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--slate-900)' }}>
                    Total Payable
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.45rem', color: 'var(--slate-900)' }}>
                    ${grandTotal.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Anti-Drip Guarantee note */}
              <div style={{
                backgroundColor: 'var(--slate-50)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                fontSize: '0.75rem',
                color: 'var(--slate-600)',
                lineHeight: 1.4
              }}>
                🔒 <strong>No surprise check-in fees:</strong> Unlike traditional OTAs, we disclose every single fee upfront before your reservation is finalized.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Method Razorpay / UPI / Card / NetBanking Payment Gateway Modal */}
      {showPaymentModal && pendingBooking && (
        <PaymentGatewayModal
          isOpen={showPaymentModal}
          booking={pendingBooking}
          orderData={paymentOrderData}
          onClose={() => setShowPaymentModal(false)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Confirmation Receipt Modal */}
      {showReceipt && confirmedBooking && (
        <ReceiptModal
          booking={confirmedBooking}
          onClose={() => {
            setShowReceipt(false);
            navigate('/bookings');
          }}
        />
      )}

      <style>{`
        @media (max-width: 900px) {
          .checkout-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
