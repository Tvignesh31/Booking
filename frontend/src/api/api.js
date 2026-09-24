const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMsg = data?.detail || `Error ${response.status}: ${response.statusText}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // --- Auth ---
  signup: (userData) => request('/auth/signup', { method: 'POST', body: JSON.stringify(userData) }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  getMe: () => request('/auth/me'),
  updateMe: (data) => request('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMe: () => request('/auth/me', { method: 'DELETE' }),
  exportData: () => request('/auth/me/export'),

  // --- Hotels & Discovery ---
  searchHotels: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, v]) => v !== null && v !== undefined && v !== '')
    );
    const queryString = new URLSearchParams(cleanParams).toString();
    return request(`/hotels/search${queryString ? `?${queryString}` : ''}`);
  },
  getHotel: (hotelId, lat, lng) => {
    let q = '';
    if (lat && lng) q = `?lat=${lat}&lng=${lng}`;
    return request(`/hotels/${hotelId}${q}`);
  },
  reverseGeocode: (lat, lng) => request(`/hotels/location/reverse?lat=${lat}&lng=${lng}`),
  getIpFallback: () => request('/hotels/location/ip'),
  createHotel: (hotelData) => request('/hotels', { method: 'POST', body: JSON.stringify(hotelData) }),

  // --- Rooms ---
  getHotelRooms: (hotelId, checkIn, checkOut, guests) => {
    const params = new URLSearchParams();
    if (checkIn) params.append('check_in', checkIn);
    if (checkOut) params.append('check_out', checkOut);
    if (guests) params.append('guests', guests);
    const qs = params.toString();
    return request(`/rooms/hotel/${hotelId}${qs ? `?${qs}` : ''}`);
  },
  getAvailabilityCalendar: (hotelId, startDate, endDate, roomId) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (roomId) params.append('room_id', roomId);
    const qs = params.toString();
    return request(`/rooms/hotel/${hotelId}/availability-calendar${qs ? `?${qs}` : ''}`);
  },

  // --- Bookings ---
  createBooking: (bookingData) => request('/bookings', { method: 'POST', body: JSON.stringify(bookingData) }),
  getMyBookings: () => request('/bookings/me'),
  getBookingByRef: (ref) => request(`/bookings/reference/${ref}`),
  cancelBooking: (bookingId) => request(`/bookings/${bookingId}/cancel`, { method: 'PATCH' }),
  resendBookingEmail: (bookingId, recipientEmail = null, sendToRegisteredUser = false) =>
    request(`/bookings/${bookingId}/resend-email`, {
      method: 'POST',
      body: JSON.stringify({
        recipient_email: recipientEmail || undefined,
        send_to_registered_user: sendToRegisteredUser
      })
    }),
  getBookingEmails: (bookingId) => request(`/bookings/${bookingId}/emails`),

  // --- Email System & Testing ---
  sendTestEmail: (recipientEmail) =>
    request('/internal/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ recipient_email: recipientEmail })
    }),

  // --- Favorites ---
  getFavorites: () => request('/favorites'),
  toggleFavorite: (hotelId) => request(`/favorites/${hotelId}`, { method: 'POST' }),

  // --- Admin & Registration ---
  getAdminStats: () => request('/admin/stats'),
  getAllBookings: (status) => request(`/admin/bookings${status ? `?status_filter=${status}` : ''}`),
  updateBookingStatus: (bookingId, status) =>
    request(`/admin/bookings/${bookingId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    }),
  getAdminActivities: (limit = 50) => request(`/admin/activities?limit=${limit}`),
  getRegistrationSettings: () => request('/admin/registration-settings'),
  updateRegistrationSettings: (data) =>
    request('/admin/registration-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  getPublicRegistrationPolicy: () => request('/auth/registration-policy'),
  getAdminUsers: (search = '', role = '') => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (role) params.set('role', role);
    const qs = params.toString();
    return request(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  updateAdminUser: (userId, data) =>
    request(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    }),
  deleteAdminUser: (userId) =>
    request(`/admin/users/${userId}`, {
      method: 'DELETE'
    }),
  updateHotel: (hotelId, data) =>
    request(`/hotels/${hotelId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteHotel: (hotelId) =>
    request(`/hotels/${hotelId}`, {
      method: 'DELETE'
    }),
  updateRoom: (roomId, data) =>
    request(`/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteRoom: (roomId) =>
    request(`/rooms/${roomId}`, {
      method: 'DELETE'
    }),
  getAdminPayments: (limit = 50) => request(`/admin/payments?limit=${limit}`),
  getAdminNotifications: (limit = 50) => request(`/admin/notifications?limit=${limit}`),

  // --- Nearby Places to Explore ---
  getNearbyPlaces: (lat, lng, category = 'all', radius = 50, city = null) => {
    const params = new URLSearchParams();
    if (lat !== undefined && lat !== null) params.set('lat', lat);
    if (lng !== undefined && lng !== null) params.set('lng', lng);
    if (city) params.set('city', city);
    if (category) params.set('category', category);
    if (radius) params.set('radius', radius);
    return request(`/places/nearby?${params.toString()}`);
  },

  // --- Razorpay Payments ---
  createPaymentIntent: (bookingId, currency = 'INR') =>
    request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, currency })
    }),
  verifyPayment: (payload) =>
    request('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getPaymentStatus: (bookingId) => request(`/payments/${bookingId}/status`),
};
