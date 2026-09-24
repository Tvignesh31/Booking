import React, { useState } from 'react';
import { api } from '../api/api';
import { X, CreditCard, QrCode, Building, Wallet, ShieldCheck, Lock, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';

const NET_BANKING_BANKS = [
  { id: 'HDFC', name: 'HDFC Bank' },
  { id: 'SBI', name: 'State Bank of India' },
  { id: 'ICICI', name: 'ICICI Bank' },
  { id: 'AXIS', name: 'Axis Bank' },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank' },
  { id: 'PNB', name: 'Punjab National Bank' },
  { id: 'BOB', name: 'Bank of Baroda' },
  { id: 'CANARA', name: 'Canara Bank' },
];

export default function PaymentGatewayModal({
  booking,
  orderData,
  isOpen,
  onClose,
  onPaymentSuccess
}) {
  if (!isOpen || !booking) return null;

  const [activeMethod, setActiveMethod] = useState('card'); // 'card', 'upi', 'netbanking', 'wallet'
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // Card form state
  const [cardNumber, setCardNumber] = useState('4111 2222 3333 4444');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('123');
  const [cardHolder, setCardHolder] = useState(booking.guest_name || 'Cardholder');

  // UPI state
  const [upiId, setUpiId] = useState('traveler@okhdfcbank');

  // Net banking state
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Wallet state
  const [selectedWallet, setSelectedWallet] = useState('phonepe');

  // Total in INR (Razorpay standard test currency)
  const amountInr = orderData?.amount ? (orderData.amount / 100).toFixed(2) : (booking.total_price * 85).toFixed(2);

  const handleLaunchRazorpayStandard = () => {
    // If Razorpay SDK is available on window, we can also launch official popup
    if (window.Razorpay && orderData?.order_id && !orderData.order_id.startsWith('order_mock')) {
      const options = {
        key: orderData.key_id || 'rzp_test_TZYopKZRAf9Kk3',
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'HavenStay Responsible Stays',
        description: `Booking #${booking.booking_reference}`,
        order_id: orderData.order_id,
        prefill: {
          name: booking.guest_name,
          email: booking.guest_email,
          contact: booking.guest_phone || '9999999999'
        },
        theme: {
          color: '#0f766e'
        },
        handler: async function (response) {
          await verifyAndComplete(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature, 'razorpay_popup');
        }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
      return;
    }
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    // Simulate payment transaction verification for demo sandbox
    const paymentId = `pay_demo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const orderId = orderData?.order_id || `order_${booking.booking_reference}`;
    const signature = `sig_simulated_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      await verifyAndComplete(paymentId, orderId, signature, activeMethod);
    } catch (err) {
      setError(err.message || 'Payment processing failed. Please try another method.');
      setProcessing(false);
    }
  };

  const verifyAndComplete = async (paymentId, orderId, signature, method) => {
    try {
      const verifyRes = await api.verifyPayment({
        booking_id: booking.id,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        payment_method: method
      });

      if (verifyRes.success) {
        onPaymentSuccess({
          ...booking,
          payment_id: paymentId,
          payment_status: 'paid',
          payment_method: method
        });
      } else {
        throw new Error('Payment signature verification failed.');
      }
    } catch (err) {
      setError(err.message || 'Verification error.');
      setProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', padding: 0, overflow: 'hidden' }}
      >
        {/* Gateway Brand Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #059669 100%)',
          color: '#ffffff',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Lock size={18} />
              <h2 style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>
                Razorpay Secure Gateway
              </h2>
            </div>
            <p style={{ fontSize: '0.8125rem', color: '#ccfbf1' }}>
              Booking Ref: <strong>{booking.booking_reference}</strong> • 256-bit Encrypted
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: '#ccfbf1' }}>Total Payable</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff' }}>
              ₹{amountInr} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>(${booking.total_price} USD)</span>
            </div>
          </div>
        </div>

        {/* Payment Methods Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          backgroundColor: 'var(--slate-100)',
          borderBottom: '1px solid var(--slate-200)'
        }}>
          {[
            { id: 'card', label: 'Cards', icon: CreditCard },
            { id: 'upi', label: 'UPI / QR', icon: QrCode },
            { id: 'netbanking', label: 'Net Banking', icon: Building },
            { id: 'wallet', label: 'Wallets', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeMethod === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveMethod(tab.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 6px',
                  border: 'none',
                  backgroundColor: isSelected ? '#ffffff' : 'transparent',
                  color: isSelected ? 'var(--primary)' : 'var(--slate-600)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  borderBottom: isSelected ? '3px solid var(--primary)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Payment Form Content */}
        <div style={{ padding: '28px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#991b1b',
              fontSize: '0.8125rem',
              marginBottom: '18px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleProcessPayment}>
            {/* Method 1: Credit & Debit Cards */}
            {activeMethod === 'card' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Card Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4111 2222 3333 4444"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Expiry (MM/YY)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="12/28"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CVV / CVC</label>
                    <input
                      type="password"
                      maxLength={4}
                      className="form-input"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      placeholder="123"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Name on Card</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Method 2: UPI & QR Code */}
            {activeMethod === 'upi' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', textAlign: 'center' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#ffffff',
                  border: '2px solid var(--slate-200)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  {/* Dynamic Scalable SVG QR Code */}
                  <svg width="150" height="150" viewBox="0 0 100 100" style={{ display: 'block', margin: '0 auto' }}>
                    <rect width="100" height="100" fill="#ffffff" />
                    {/* QR Code finder patterns */}
                    <rect x="5" y="5" width="26" height="26" fill="#0f172a" />
                    <rect x="9" y="9" width="18" height="18" fill="#ffffff" />
                    <rect x="13" y="13" width="10" height="10" fill="#0f766e" />
                    
                    <rect x="69" y="5" width="26" height="26" fill="#0f172a" />
                    <rect x="73" y="9" width="18" height="18" fill="#ffffff" />
                    <rect x="77" y="13" width="10" height="10" fill="#0f766e" />

                    <rect x="5" y="69" width="26" height="26" fill="#0f172a" />
                    <rect x="9" y="73" width="18" height="18" fill="#ffffff" />
                    <rect x="13" y="77" width="10" height="10" fill="#0f766e" />

                    {/* Data modules */}
                    <rect x="36" y="10" width="8" height="8" fill="#0f172a" />
                    <rect x="48" y="10" width="12" height="8" fill="#0f172a" />
                    <rect x="36" y="24" width="8" height="12" fill="#0f172a" />
                    <rect x="48" y="24" width="8" height="8" fill="#059669" />
                    <rect x="10" y="36" width="12" height="8" fill="#0f172a" />
                    <rect x="26" y="36" width="8" height="8" fill="#0f172a" />
                    <rect x="38" y="38" width="24" height="24" fill="#0f766e" />
                    <rect x="68" y="36" width="12" height="12" fill="#0f172a" />
                    <rect x="84" y="36" width="8" height="8" fill="#0f172a" />
                    <rect x="36" y="68" width="12" height="12" fill="#0f172a" />
                    <rect x="52" y="68" width="8" height="8" fill="#059669" />
                    <rect x="68" y="68" width="8" height="12" fill="#0f172a" />
                    <rect x="80" y="76" width="12" height="12" fill="#0f172a" />
                  </svg>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginTop: '8px' }}>
                    Scan with Google Pay, PhonePe, Paytm, or BHIM
                  </div>
                </div>

                <div style={{ width: '100%' }} className="form-group">
                  <label className="form-label" style={{ textAlign: 'left' }}>Or Pay via UPI Virtual Payment Address (VPA)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    required
                  />
                </div>
              </div>
            )}

            {/* Method 3: Net Banking */}
            {activeMethod === 'netbanking' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-label">Select Your Bank</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {NET_BANKING_BANKS.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBank(b.id)}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        border: selectedBank === b.id ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                        backgroundColor: selectedBank === b.id ? 'var(--primary-light)' : '#ffffff',
                        color: selectedBank === b.id ? 'var(--primary)' : 'var(--slate-800)',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Method 4: Digital Wallets */}
            {activeMethod === 'wallet' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-label">Select Digital Wallet</div>
                {['phonepe', 'paytm', 'amazonpay', 'mobikwik'].map((w) => (
                  <label
                    key={w}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 16px',
                      borderRadius: 'var(--radius-md)',
                      border: selectedWallet === w ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                      backgroundColor: selectedWallet === w ? 'var(--primary-light)' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="wallet"
                      checked={selectedWallet === w}
                      onChange={() => setSelectedWallet(w)}
                    />
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                      {w === 'amazonpay' ? 'Amazon Pay Wallet' : w}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Trust Assurance */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '0.78rem',
              color: 'var(--slate-600)',
              background: '#f8fafc',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--slate-200)',
              marginTop: '18px',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--primary)" />
                <span><strong>Demo Sandbox Mode:</strong> Instant simulated 256-bit encrypted checkout.</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--slate-400)' }}>Zero real money deducted</span>
            </div>

            {/* Official Razorpay Popup Alternative */}
            {orderData?.order_id && !orderData.order_id.startsWith('order_mock') && (
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <button
                  type="button"
                  onClick={handleLaunchRazorpayStandard}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '4px 8px'
                  }}
                >
                  ⚡ Or test with official Razorpay Popup
                </button>
              </div>
            )}

            {/* CTA Button */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="btn btn-primary"
                style={{ flex: 2 }}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Confirming with Razorpay...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ₹{amountInr} & Confirm</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
