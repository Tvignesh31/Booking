"""
Email templates module for HavenStay Hotel Booking Backend.
Generates responsive, accessible HTML and clean plain-text representations
for each booking lifecycle event.
"""

from typing import Dict, Any, Optional, Tuple

def _base_html_layout(title: str, preheader: str, body_content: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <style>
    body {{
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }}
    .email-container {{
      max-width: 600px;
      margin: 24px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
    }}
    .email-header {{
      background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .brand-title {{
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0 0 6px 0;
    }}
    .brand-subtitle {{
      font-size: 13px;
      opacity: 0.9;
      margin: 0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      font-weight: 600;
    }}
    .email-body {{
      padding: 32px 28px;
    }}
    .badge {{
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
    }}
    .badge-success {{ background-color: #d1fae5; color: #065f46; }}
    .badge-danger {{ background-color: #fee2e2; color: #991b1b; }}
    .badge-warning {{ background-color: #fef3c7; color: #92400e; }}
    .badge-info {{ background-color: #e0f2fe; color: #0369a1; }}
    .headline {{
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.3;
    }}
    .paragraph {{
      font-size: 15px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 20px 0;
    }}
    .summary-card {{
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 20px;
      margin: 24px 0;
    }}
    .summary-row {{
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #edf2f7;
      font-size: 14px;
    }}
    .summary-row:last-child {{
      border-bottom: none;
    }}
    .summary-label {{
      color: #64748b;
      font-weight: 500;
    }}
    .summary-value {{
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }}
    .pricing-table {{
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      font-size: 14px;
    }}
    .pricing-table td {{
      padding: 8px 0;
      border-bottom: 1px dashed #e2e8f0;
    }}
    .pricing-total {{
      font-size: 16px;
      font-weight: 800;
      color: #0f766e;
      border-top: 2px solid #0f766e !important;
      border-bottom: none !important;
      padding-top: 12px !important;
    }}
    .button-container {{
      text-align: center;
      margin: 32px 0 16px 0;
    }}
    .btn {{
      display: inline-block;
      background-color: #0f766e;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 15px;
      padding: 12px 28px;
      border-radius: 8px;
    }}
    .email-footer {{
      background-color: #f1f5f9;
      padding: 24px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }}
    .email-footer a {{
      color: #0f766e;
      text-decoration: none;
    }}
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#f8fafc;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    {preheader}
  </div>
  <div class="email-container">
    <div class="email-header">
      <h1 class="brand-title">HavenStay</h1>
      <p class="brand-subtitle">Responsible Hospitality • 100% Upfront Pricing</p>
    </div>
    <div class="email-body">
      {body_content}
    </div>
    <div class="email-footer">
      <p>HavenStay Hospitality & Discovery Services</p>
      <p>Zero Hidden Fees • Real Room Inventory • Privacy Guaranteed</p>
      <p>For questions, contact our 24/7 guest relations team at <a href="mailto:support@havenstay.com">support@havenstay.com</a></p>
    </div>
  </div>
</body>
</html>"""


# ----------------------------------------------------------------------
# 1. BOOKING CONFIRMED
# ----------------------------------------------------------------------
def render_booking_confirmation(booking: Any, hotel: Any, room: Any) -> Tuple[str, str, str]:
    hotel_name = getattr(hotel, "name", "Your Hotel")
    hotel_address = getattr(hotel, "address", "")
    hotel_city = getattr(hotel, "city", "")
    room_name = getattr(room, "room_type", "Standard Room")
    ref = booking.booking_reference
    check_in = booking.check_in
    check_out = booking.check_out
    guests = booking.guests
    rooms_count = booking.rooms_count
    total_price = f"${booking.total_price:,.2f}"

    breakdown = booking.itemized_breakdown or {}
    nights = breakdown.get("nights", booking.nights or 1)
    base_subtotal = breakdown.get("base_subtotal", booking.base_total or 0.0)
    taxes_total = breakdown.get("taxes_and_fees", booking.taxes_total or 0.0)
    tax_rate = breakdown.get("tax_rate_percent", 12.0)

    subject = f"Booking Confirmed: {ref} - {hotel_name}"
    preheader = f"Your reservation at {hotel_name} is confirmed. Booking reference: {ref}."

    body_html = f"""
      <div class="badge badge-success">✓ Booking Confirmed</div>
      <h2 class="headline">Pack your bags, {booking.guest_name}!</h2>
      <p class="paragraph">
        Your stay at <strong>{hotel_name}</strong> is officially secured and confirmed.
        We have reserved your room with our zero-dark-patterns guarantee: no unexpected resort fees at check-in.
      </p>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Booking Reference:</span>
          <span class="summary-value" style="font-family: monospace; font-size: 16px; color: #0f766e;">{ref}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Property:</span>
          <span class="summary-value">{hotel_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Location:</span>
          <span class="summary-value">{hotel_address}, {hotel_city}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Room Type:</span>
          <span class="summary-value">{room_name} ({rooms_count} room)</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Dates:</span>
          <span class="summary-value">{check_in} to {check_out} ({nights} night{'s' if nights > 1 else ''})</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Guests:</span>
          <span class="summary-value">{guests} guest{'s' if guests > 1 else ''}</span>
        </div>

        <h4 style="margin: 18px 0 8px 0; color: #0f172a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Transparent Itemized Pricing</h4>
        <table class="pricing-table">
          <tr>
            <td style="color: #64748b;">Room Subtotal ({nights} nights × {rooms_count} room)</td>
            <td style="text-align: right; font-weight: 600;">${base_subtotal:,.2f}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Taxes & Statutory Fees ({tax_rate}%)</td>
            <td style="text-align: right; font-weight: 600;">${taxes_total:,.2f}</td>
          </tr>
          <tr>
            <td style="color: #64748b;">Resort & Facility Fees</td>
            <td style="text-align: right; font-weight: 600; color: #059669;">$0.00 (Zero Hidden Fees)</td>
          </tr>
          <tr>
            <td class="pricing-total">Total Paid</td>
            <td class="pricing-total" style="text-align: right;">{total_price}</td>
          </tr>
        </table>
      </div>

      <p class="paragraph" style="font-size: 13px; color: #64748b;">
        <strong>Check-in Time:</strong> 3:00 PM | <strong>Check-out Time:</strong> 11:00 AM<br>
        <strong>Cancellation Policy:</strong> {getattr(hotel, "cancellation_policy", "Standard HavenStay Cancellation Policy")}
      </p>

      <div class="button-container">
        <a href="http://localhost:5173/receipt/{booking.id}" class="btn">View Reservation & Digital Receipt</a>
      </div>
    """

    html_content = _base_html_layout(subject, preheader, body_html)

    text_content = f"""HAVENSTAY - RESERVATION CONFIRMED
========================================
Dear {booking.guest_name},

Your reservation at {hotel_name} is confirmed!

Booking Reference: {ref}
Property:          {hotel_name}
Address:           {hotel_address}, {hotel_city}
Room:              {room_name} ({rooms_count} room)
Dates:             {check_in} to {check_out} ({nights} nights)
Total Guests:      {guests}

PRICING BREAKDOWN:
- Base Room Subtotal: ${base_subtotal:,.2f}
- Taxes & Fees:       ${taxes_total:,.2f}
- Resort Fees:        $0.00 (Zero hidden fees)
----------------------------------------
Total Paid:           {total_price}

Cancellation Policy: {getattr(hotel, "cancellation_policy", "Standard Policy")}

View your digital reservation receipt:
http://localhost:5173/receipt/{booking.id}

Thank you for choosing HavenStay!
"""
    return subject, html_content, text_content


# ----------------------------------------------------------------------
# 2. BOOKING CANCELLED
# ----------------------------------------------------------------------
def render_booking_cancellation(booking: Any, hotel: Any, room: Any) -> Tuple[str, str, str]:
    hotel_name = getattr(hotel, "name", "Your Hotel")
    ref = booking.booking_reference

    subject = f"Booking Cancelled: {ref} - {hotel_name}"
    preheader = f"Your reservation at {hotel_name} ({ref}) has been cancelled."

    body_html = f"""
      <div class="badge badge-danger">Reservation Cancelled</div>
      <h2 class="headline">Your booking has been cancelled</h2>
      <p class="paragraph">
        Hello {booking.guest_name}, this email confirms that your reservation at
        <strong>{hotel_name}</strong> under booking reference <strong>{ref}</strong> has been cancelled.
      </p>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Booking Reference:</span>
          <span class="summary-value" style="font-family: monospace; color: #991b1b;">{ref}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Property:</span>
          <span class="summary-value">{hotel_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Original Dates:</span>
          <span class="summary-value">{booking.check_in} to {booking.check_out}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Status:</span>
          <span class="summary-value" style="color: #991b1b;">Cancelled</span>
        </div>
      </div>

      <p class="paragraph">
        <strong>Refund Status:</strong> If your booking was eligible for a refund according to the property's
        cancellation policy, the refund has been initiated to your original payment method and will typically
        reflect in 3–5 business days.
      </p>

      <div class="button-container">
        <a href="http://localhost:5173/search" class="btn">Explore Other Destinations</a>
      </div>
    """

    html_content = _base_html_layout(subject, preheader, body_html)

    text_content = f"""HAVENSTAY - RESERVATION CANCELLED
========================================
Hello {booking.guest_name},

This email confirms that your booking has been cancelled.

Booking Reference: {ref}
Property:          {hotel_name}
Original Dates:    {booking.check_in} to {booking.check_out}
Status:            Cancelled

If applicable, any refund will be processed back to your original payment method within 3-5 business days.

Search for new stays anytime at: http://localhost:5173/search
"""
    return subject, html_content, text_content


# ----------------------------------------------------------------------
# 3. PAYMENT FAILED / PENDING
# ----------------------------------------------------------------------
def render_payment_failed(booking: Any, hotel: Any, room: Any, reason: Optional[str] = None) -> Tuple[str, str, str]:
    hotel_name = getattr(hotel, "name", "Your Hotel")
    ref = booking.booking_reference
    failure_detail = reason or "Your card issuer or payment gateway declined the transaction."

    subject = f"Action Required: Payment Failed for Booking {ref}"
    preheader = f"Payment could not be processed for your booking at {hotel_name}."

    body_html = f"""
      <div class="badge badge-warning">Payment Action Required</div>
      <h2 class="headline">Payment Unsuccessful</h2>
      <p class="paragraph">
        Hello {booking.guest_name}, we were unable to complete the payment for your reservation at
        <strong>{hotel_name}</strong>.
      </p>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Booking Reference:</span>
          <span class="summary-value" style="font-family: monospace;">{ref}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Total Amount Due:</span>
          <span class="summary-value" style="color: #92400e;">${booking.total_price:,.2f}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Decline Reason:</span>
          <span class="summary-value">{failure_detail}</span>
        </div>
      </div>

      <p class="paragraph">
        Your room inventory is temporarily on hold for 30 minutes. Please retry payment with an alternative
        card, UPI, or net banking method to guarantee your reservation.
      </p>

      <div class="button-container">
        <a href="http://localhost:5173/checkout?retry_booking_id={booking.id}" class="btn" style="background-color: #b45309;">Complete Payment Now</a>
      </div>
    """

    html_content = _base_html_layout(subject, preheader, body_html)

    text_content = f"""HAVENSTAY - PAYMENT FAILED
========================================
Hello {booking.guest_name},

We could not process your payment for booking reference: {ref}.
Property: {hotel_name}
Amount:   ${booking.total_price:,.2f}
Reason:   {failure_detail}

Please retry your payment within 30 minutes to retain your room reservation:
http://localhost:5173/checkout?retry_booking_id={booking.id}
"""
    return subject, html_content, text_content


# ----------------------------------------------------------------------
# 4. BOOKING MODIFIED
# ----------------------------------------------------------------------
def render_booking_modified(booking: Any, hotel: Any, room: Any, previous_details: Optional[Dict[str, Any]] = None) -> Tuple[str, str, str]:
    hotel_name = getattr(hotel, "name", "Your Hotel")
    ref = booking.booking_reference
    room_name = getattr(room, "room_type", "Selected Room")

    subject = f"Booking Updated: {ref} - {hotel_name}"
    preheader = f"Your reservation details for {hotel_name} have been updated."

    prev_info = ""
    if previous_details:
        prev_info = f"""
        <div style="background:#fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #92400e;">
          <strong>Previous Reservation:</strong> {previous_details.get('check_in')} to {previous_details.get('check_out')}
          ({previous_details.get('guests')} guests, {previous_details.get('rooms_count', 1)} room)
        </div>
        """

    body_html = f"""
      <div class="badge badge-info">Reservation Updated</div>
      <h2 class="headline">Your stay has been modified</h2>
      <p class="paragraph">
        Hello {booking.guest_name}, your reservation changes for <strong>{hotel_name}</strong> have been saved successfully.
      </p>

      {prev_info}

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Booking Reference:</span>
          <span class="summary-value" style="font-family: monospace; color: #0284c7;">{ref}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Property:</span>
          <span class="summary-value">{hotel_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Updated Room:</span>
          <span class="summary-value">{room_name} ({booking.rooms_count} room)</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Updated Dates:</span>
          <span class="summary-value">{booking.check_in} to {booking.check_out} ({booking.nights} nights)</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Updated Guests:</span>
          <span class="summary-value">{booking.guests} guest{'s' if booking.guests > 1 else ''}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Revised Total:</span>
          <span class="summary-value" style="color: #0f766e;">${booking.total_price:,.2f}</span>
        </div>
      </div>

      <div class="button-container">
        <a href="http://localhost:5173/receipt/{booking.id}" class="btn">View Updated Itinerary</a>
      </div>
    """

    html_content = _base_html_layout(subject, preheader, body_html)

    text_content = f"""HAVENSTAY - RESERVATION MODIFIED
========================================
Hello {booking.guest_name},

Your reservation details for booking reference {ref} have been updated.

Property:        {hotel_name}
Updated Dates:   {booking.check_in} to {booking.check_out} ({booking.nights} nights)
Room:            {room_name} ({booking.rooms_count} room)
Guests:          {booking.guests}
Revised Total:   ${booking.total_price:,.2f}

View your updated reservation receipt:
http://localhost:5173/receipt/{booking.id}
"""
    return subject, html_content, text_content


# ----------------------------------------------------------------------
# 5. CHECK-IN REMINDER (24-48h BEFORE ARRIVAL)
# ----------------------------------------------------------------------
def render_checkin_reminder(booking: Any, hotel: Any, room: Any) -> Tuple[str, str, str]:
    hotel_name = getattr(hotel, "name", "Your Hotel")
    hotel_address = getattr(hotel, "address", "")
    hotel_city = getattr(hotel, "city", "")
    ref = booking.booking_reference
    check_in = booking.check_in

    subject = f"Upcoming Stay Reminder: {hotel_name} (Check-in: {check_in})"
    preheader = f"Your trip to {hotel_city} is right around the corner! Check-in details inside."

    body_html = f"""
      <div class="badge badge-success">Upcoming Stay Reminder</div>
      <h2 class="headline">See you soon in {hotel_city}!</h2>
      <p class="paragraph">
        Hello {booking.guest_name}, your stay at <strong>{hotel_name}</strong> is starting soon.
        Here is all the essential information to make your arrival seamless.
      </p>

      <div class="summary-card">
        <div class="summary-row">
          <span class="summary-label">Booking Reference:</span>
          <span class="summary-value" style="font-family: monospace; color: #0f766e;">{ref}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Property:</span>
          <span class="summary-value">{hotel_name}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Address:</span>
          <span class="summary-value">{hotel_address}, {hotel_city}</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Check-in Date:</span>
          <span class="summary-value">{check_in} (from 3:00 PM)</span>
        </div>
        <div class="summary-row">
          <span class="summary-label">Special Requests:</span>
          <span class="summary-value">{booking.special_requests or 'None specified'}</span>
        </div>
      </div>

      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 4px; margin: 20px 0;">
        <h4 style="margin: 0 0 6px 0; color: #065f46; font-size: 14px;">Arrival Tips</h4>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #047857; line-height: 1.5;">
          <li>Present your booking reference and a valid government ID upon arrival.</li>
          <li>Our front desk is staffed 24/7 to assist with early luggage storage.</li>
          <li>Zero surprise resort fees — your stay has been paid in full upfront.</li>
        </ul>
      </div>

      <div class="button-container">
        <a href="https://maps.google.com/?q={hotel_name}+{hotel_address}+{hotel_city}" target="_blank" class="btn">Get Directions on Maps</a>
      </div>
    """

    html_content = _base_html_layout(subject, preheader, body_html)

    text_content = f"""HAVENSTAY - UPCOMING STAY REMINDER
========================================
Hello {booking.guest_name},

Your stay at {hotel_name} is starting on {check_in}!

Booking Reference: {ref}
Property:          {hotel_name}
Address:           {hotel_address}, {hotel_city}
Check-in Time:     From 3:00 PM onwards

Remember: Your stay is 100% upfront pricing with zero hidden fees.

Directions:
https://maps.google.com/?q={hotel_name}+{hotel_address}+{hotel_city}
"""
    return subject, html_content, text_content
