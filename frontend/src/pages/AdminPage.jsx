import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import {
  Building, DollarSign, Calendar, Users, PlusCircle, CheckCircle, AlertCircle,
  Loader2, Mail, Send, Activity, Settings, Edit3, Trash2, Shield, Eye,
  RefreshCw, Search, Check, X, FileText, CreditCard, ChevronRight, Sliders,
  SlidersHorizontal, ArrowRight, Bed, Star, MapPin, Sparkles, Filter, ExternalLink
} from 'lucide-react';
import EmailPreviewModal from '../components/EmailPreviewModal';
import ReceiptModal from '../components/ReceiptModal';
import AvailabilityCalendar from '../components/AvailabilityCalendar';

export default function AdminPage() {
  const { user } = useAuth();

  // Active Tab: 'overview', 'hotels', 'registration', 'users', 'bookings', 'payments', 'notifications'
  const [activeTab, setActiveTab] = useState('overview');

  // Core Data States
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals & Selected Objects
  const [selectedReceiptBooking, setSelectedReceiptBooking] = useState(null);
  const [selectedEmailBooking, setSelectedEmailBooking] = useState(null);
  const [selectedCalendarHotel, setSelectedCalendarHotel] = useState(null);

  // Hotel Edit Modal
  const [editingHotel, setEditingHotel] = useState(null);
  const [showAddHotel, setShowAddHotel] = useState(false);

  // Room Management Drawer / Modals
  const [manageRoomsHotel, setManageRoomsHotel] = useState(null);
  const [editingRoom, setEditingRoom] = useState(null);
  const [showAddRoom, setShowAddRoom] = useState(false);

  // User Edit Modal
  const [editingUser, setEditingUser] = useState(null);

  // Filters & Searches
  const [hotelSearch, setHotelSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');

  // Registration Process Settings State
  const [registrationSettings, setRegistrationSettings] = useState({
    allow_open_registration: true,
    require_phone: false,
    require_email_verification: false,
    min_password_length: 6,
    default_role: 'user',
    allow_guest_checkout: true,
    send_welcome_email: true,
    maintenance_mode: false,
    terms_version: '2026.2'
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Email Diagnostic State
  const [testEmailAddress, setTestEmailAddress] = useState('thiruganamthiruganam2185@gmail.com');
  const [testSending, setTestSending] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [testError, setTestError] = useState('');

  // New Hotel Form Initial State
  const initialNewHotel = {
    name: '',
    description: '',
    address: '',
    city: '',
    country: '',
    latitude: 40.7128,
    longitude: -74.0060,
    star_rating: 4.5,
    cancellation_policy: 'Free cancellation up to 48 hours prior to arrival',
    eco_certified: true,
    amenities: 'Free High-Speed WiFi, Pool, Spa, Breakfast, EV Charging',
    featured_image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    images: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80\nhttps://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80'
  };
  const [newHotel, setNewHotel] = useState(initialNewHotel);

  // New Room Form Initial State
  const initialNewRoom = {
    room_type: '',
    description: '',
    bed_configuration: '1 King Bed',
    max_occupancy: 2,
    base_price: 180,
    taxes_and_fees: 0.12,
    total_units: 5,
    amenities: 'Free High-Speed WiFi, Rainfall Shower, Smart TV, AC',
    photos: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
    free_cancellation: true,
    breakfast_included: false
  };
  const [newRoom, setNewRoom] = useState(initialNewRoom);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAllAdminData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const showToast = (msg, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setTimeout(() => setActionError(''), 5000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(''), 5000);
    }
  };

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        statsData,
        activitiesData,
        hotelsData,
        bookingsData,
        usersData,
        regSettingsData,
        paymentsData,
        notifData
      ] = await Promise.allSettled([
        api.getAdminStats(),
        api.getAdminActivities(50),
        api.searchHotels(),
        api.getAllBookings(),
        api.getAdminUsers(),
        api.getRegistrationSettings(),
        api.getAdminPayments(50),
        api.getAdminNotifications(50)
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (activitiesData.status === 'fulfilled') setActivities(activitiesData.value);
      if (hotelsData.status === 'fulfilled') setHotels(hotelsData.value);
      if (bookingsData.status === 'fulfilled') setBookings(bookingsData.value);
      if (usersData.status === 'fulfilled') setUsersList(usersData.value);
      if (regSettingsData.status === 'fulfilled') setRegistrationSettings(regSettingsData.value);
      if (paymentsData.status === 'fulfilled') setPayments(paymentsData.value);
      if (notifData.status === 'fulfilled') setNotifications(notifData.value);
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Hotel Actions ---
  const handleSaveHotel = async (e) => {
    e.preventDefault();
    try {
      const isEdit = Boolean(editingHotel);
      const rawData = isEdit ? editingHotel : newHotel;

      const payload = {
        name: rawData.name,
        description: rawData.description,
        address: rawData.address,
        city: rawData.city,
        country: rawData.country,
        latitude: parseFloat(rawData.latitude),
        longitude: parseFloat(rawData.longitude),
        star_rating: parseFloat(rawData.star_rating),
        cancellation_policy: rawData.cancellation_policy,
        eco_certified: Boolean(rawData.eco_certified),
        featured_image: rawData.featured_image,
        amenities: typeof rawData.amenities === 'string'
          ? rawData.amenities.split(',').map(s => s.trim()).filter(Boolean)
          : rawData.amenities,
        images: typeof rawData.images === 'string'
          ? rawData.images.split('\n').map(s => s.trim()).filter(Boolean)
          : rawData.images
      };

      if (isEdit) {
        await api.updateHotel(editingHotel.id, payload);
        showToast(`Hotel '${payload.name}' updated successfully!`);
        setEditingHotel(null);
      } else {
        await api.createHotel(payload);
        showToast(`Hotel '${payload.name}' published successfully!`);
        setShowAddHotel(false);
        setNewHotel(initialNewHotel);
      }
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to save hotel', true);
    }
  };

  const handleDeleteHotel = async (hotel) => {
    if (!window.confirm(`Are you sure you want to remove '${hotel.name}' and all associated rooms?`)) {
      return;
    }
    try {
      await api.deleteHotel(hotel.id);
      showToast(`Hotel '${hotel.name}' removed.`);
      await loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to delete hotel', true);
    }
  };

  // --- Room Actions ---
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!manageRoomsHotel) return;

    try {
      const isEdit = Boolean(editingRoom);
      const rawData = isEdit ? editingRoom : newRoom;

      const payload = {
        room_type: rawData.room_type,
        description: rawData.description,
        bed_configuration: rawData.bed_configuration,
        max_occupancy: parseInt(rawData.max_occupancy, 10),
        base_price: parseFloat(rawData.base_price),
        taxes_and_fees: parseFloat(rawData.taxes_and_fees),
        total_units: parseInt(rawData.total_units, 10),
        free_cancellation: Boolean(rawData.free_cancellation),
        breakfast_included: Boolean(rawData.breakfast_included),
        amenities: typeof rawData.amenities === 'string'
          ? rawData.amenities.split(',').map(s => s.trim()).filter(Boolean)
          : rawData.amenities,
        photos: typeof rawData.photos === 'string'
          ? rawData.photos.split('\n').map(s => s.trim()).filter(Boolean)
          : rawData.photos
      };

      if (isEdit) {
        await api.updateRoom(editingRoom.id, payload);
        showToast(`Room '${payload.room_type}' updated.`);
        setEditingRoom(null);
      } else {
        await api.addRoom(manageRoomsHotel.id, payload);
        showToast(`Room '${payload.room_type}' added to ${manageRoomsHotel.name}.`);
        setShowAddRoom(false);
        setNewRoom(initialNewRoom);
      }

      // Refresh hotel detail
      const updatedHotels = await api.searchHotels();
      setHotels(updatedHotels);
      const ref = updatedHotels.find(h => h.id === manageRoomsHotel.id);
      if (ref) setManageRoomsHotel(ref);
      loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to save room', true);
    }
  };

  const handleDeleteRoom = async (room) => {
    if (!window.confirm(`Delete room '${room.room_type}'?`)) return;
    try {
      await api.deleteRoom(room.id);
      showToast(`Room '${room.room_type}' deleted.`);
      const updatedHotels = await api.searchHotels();
      setHotels(updatedHotels);
      const ref = updatedHotels.find(h => h.id === manageRoomsHotel.id);
      if (ref) setManageRoomsHotel(ref);
      loadAllAdminData();
    } catch (err) {
      showToast(err.message || 'Failed to delete room', true);
    }
  };

  // --- Registration Settings Actions ---
  const handleSaveRegistrationSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await api.updateRegistrationSettings(registrationSettings);
      setRegistrationSettings(updated);
      showToast('Registration policies and rules updated successfully!');
      // Refresh activities
      const acts = await api.getAdminActivities(50);
      setActivities(acts);
    } catch (err) {
      showToast(err.message || 'Failed to update registration settings', true);
    } finally {
      setSavingSettings(false);
    }
  };

  // --- User Directory Actions ---
  const handleToggleUserRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = targetUser.role === 'admin'
      ? `Demote ${targetUser.name} (${targetUser.email}) from Admin to standard User?`
      : `Promote ${targetUser.name} (${targetUser.email}) to Administrator?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateAdminUser(targetUser.id, { role: newRole });
      showToast(`User ${targetUser.email} role updated to '${newRole}'.`);
      const usersData = await api.getAdminUsers(userSearch, userRoleFilter);
      setUsersList(usersData);
    } catch (err) {
      showToast(err.message || 'Failed to change role', true);
    }
  };

  const handleSaveUserEdit = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.updateAdminUser(editingUser.id, {
        name: editingUser.name,
        phone: editingUser.phone,
        role: editingUser.role
      });
      showToast(`User ${editingUser.email} updated.`);
      setEditingUser(null);
      const usersData = await api.getAdminUsers(userSearch, userRoleFilter);
      setUsersList(usersData);
    } catch (err) {
      showToast(err.message || 'Failed to update user', true);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert("You cannot delete your own active administrator account.");
      return;
    }
    if (!window.confirm(`Delete user account ${targetUser.email}? This will erase all associated profile data.`)) return;

    try {
      await api.deleteAdminUser(targetUser.id);
      showToast(`Account ${targetUser.email} deleted.`);
      const usersData = await api.getAdminUsers(userSearch, userRoleFilter);
      setUsersList(usersData);
    } catch (err) {
      showToast(err.message || 'Failed to delete user', true);
    }
  };

  // --- Booking Status Actions ---
  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      await api.updateBookingStatus(bookingId, newStatus);
      showToast(`Booking status updated to '${newStatus}'.`);
      const bookingsData = await api.getAllBookings(bookingStatusFilter);
      setBookings(bookingsData);
      const acts = await api.getAdminActivities(50);
      setActivities(acts);
    } catch (err) {
      showToast(err.message || 'Failed to update booking status', true);
    }
  };

  // --- Email Diagnostic Test ---
  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    setTestSending(true);
    setTestMessage('');
    setTestError('');
    try {
      const res = await api.sendTestEmail(testEmailAddress);
      setTestMessage(res.message || `Test email dispatched to ${testEmailAddress}`);
      const notifs = await api.getAdminNotifications(50);
      setNotifications(notifs);
    } catch (err) {
      setTestError(err.message || 'Failed to send test email.');
    } finally {
      setTestSending(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{
          maxWidth: '460px',
          margin: '0 auto',
          padding: '40px 32px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            margin: '0 auto 16px auto'
          }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', marginBottom: '8px' }}>
            Administrator Access Required
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '24px', lineHeight: 1.5 }}>
            This portal is restricted to authorized platform administrators and hotel managers.
          </p>
          <Link
            to="/admin/login"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: '#d97706',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
              marginBottom: '16px'
            }}
          >
            <span>Go to Dedicated Admin Login Portal</span>
            <ArrowRight size={18} />
          </Link>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
            Looking for hotel stays? <Link to="/" style={{ color: '#38bdf8' }}>Return to Guest Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Filtered Hotels
  const filteredHotels = hotels.filter(h => {
    if (!hotelSearch) return true;
    const s = hotelSearch.toLowerCase();
    return h.name.toLowerCase().includes(s) || h.city.toLowerCase().includes(s) || h.country.toLowerCase().includes(s);
  });

  // Filtered Bookings
  const filteredBookings = bookings.filter(b => {
    const matchesSearch = !bookingSearch ||
      b.booking_reference.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.guest_name.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.guest_email.toLowerCase().includes(bookingSearch.toLowerCase());
    const matchesStatus = !bookingStatusFilter || b.status === bookingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Users
  const filteredUsers = usersList.filter(u => {
    const matchesSearch = !userSearch ||
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = !userRoleFilter || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', paddingBottom: '90px' }}>
      {/* Toast Feedback */}
      {actionSuccess && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          <CheckCircle size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: '#991b1b',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          <AlertCircle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Admin Top Header Banner */}
      <div style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        borderBottom: '1px solid #1e293b',
        padding: '24px 0 0 0'
      }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '3px 8px',
                  backgroundColor: '#0f766e',
                  color: '#99f6e4',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  borderRadius: '4px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase'
                }}>
                  HavenStay Admin OS
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Platform Online
                </span>
              </div>
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
                Management & Operations Control Portal
              </h1>
              <p style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '4px' }}>
                Logged in as <strong>{user.name}</strong> ({user.email}) · Role: <span style={{ color: '#38bdf8' }}>{user.role}</span>
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setShowAddHotel(true); setActiveTab('hotels'); }}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <PlusCircle size={16} />
                <span>Publish New Hotel</span>
              </button>
              <button
                onClick={loadAllAdminData}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#334155', color: '#ffffff', borderColor: '#475569' }}
              >
                <RefreshCw size={14} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', borderBottom: '1px solid #334155' }}>
            {[
              { id: 'overview', label: 'Overview & Activities', icon: Activity, count: activities.length },
              { id: 'hotels', label: 'Hotels & Updation', icon: Building, count: hotels.length },
              { id: 'registration', label: 'Registration Process', icon: SlidersHorizontal, badge: registrationSettings.allow_open_registration ? 'Open' : 'Paused' },
              { id: 'users', label: 'Users & Roles', icon: Users, count: usersList.length },
              { id: 'bookings', label: 'Reservations', icon: Calendar, count: bookings.length },
              { id: 'payments', label: 'Payments & Revenue', icon: CreditCard, count: payments.length },
              { id: 'notifications', label: 'Email Diagnostics', icon: Mail, count: notifications.length }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    backgroundColor: isActive ? '#f8fafc' : 'transparent',
                    color: isActive ? '#0f172a' : '#94a3b8',
                    border: 'none',
                    borderTopLeftRadius: '8px',
                    borderTopRightRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.8125rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={16} color={isActive ? '#0f766e' : '#94a3b8'} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#e2e8f0' : '#1e293b',
                      color: isActive ? '#334155' : '#cbd5e1'
                    }}>
                      {tab.count}
                    </span>
                  )}
                  {tab.badge && (
                    <span style={{
                      fontSize: '0.6875rem',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: tab.badge === 'Open' ? '#065f46' : '#991b1b',
                      color: '#ffffff'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '28px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--slate-500)' }}>
            <Loader2 size={36} className="spinner" style={{ margin: '0 auto 12px auto' }} />
            <p>Loading administration data & live streams...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: OVERVIEW & LIVE ACTIVITIES STREAM */}
            {/* ========================================================================= */}
            {activeTab === 'overview' && (
              <div>
                {/* 6 KPI Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '28px'
                }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0f766e', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Total Revenue</span>
                      <DollarSign size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      ${stats?.total_revenue?.toLocaleString() || '0'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                      ✓ 100% Verified Transparent Bookings
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2563eb', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Total Bookings</span>
                      <Calendar size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {stats?.total_bookings || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      {stats?.active_bookings || 0} currently active
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d97706', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Active Hotels</span>
                      <Building size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {stats?.total_hotels || hotels.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      Across global destinations
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#7c3aed', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Room Units</span>
                      <Bed size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {stats?.total_rooms || 0}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      Live database inventory
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0891b2', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Registered Users</span>
                      <Users size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {stats?.total_users || usersList.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                      Registration: {registrationSettings.allow_open_registration ? 'Open' : 'Restricted'}
                    </div>
                  </div>

                  <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-500)' }}>Transactions</span>
                      <CreditCard size={20} />
                    </div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      {stats?.total_payments || payments.length}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 600 }}>
                      Razorpay & UPI Gateway
                    </div>
                  </div>
                </div>

                {/* Main Overview Grid: Live Activities Feed + Quick Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  {/* Left Column: Live Activities Feed */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Activity size={18} color="#0f766e" />
                          <span>Live Web Activities & Operations Stream</span>
                        </h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                          Real-time stream of hotel updates, user registrations, bookings, and payments.
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', fontWeight: 600 }}>
                        {activities.length} Events Logged
                      </span>
                    </div>

                    {activities.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate-400)' }}>
                        <Activity size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
                        <p>No recorded activities yet. Activities will stream here as visitors register and book.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto', paddingRight: '6px' }}>
                        {activities.map((act) => {
                          const badgeColor =
                            act.activity_type.includes('hotel') ? '#0284c7' :
                            act.activity_type.includes('room') ? '#7c3aed' :
                            act.activity_type.includes('booking') ? '#059669' :
                            act.activity_type.includes('registration') ? '#d97706' :
                            act.activity_type.includes('user') ? '#0f766e' : '#475569';

                          return (
                            <div
                              key={act.id}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '14px',
                                padding: '14px',
                                backgroundColor: '#f8fafc',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--slate-200)',
                                transition: 'background-color 0.15s'
                              }}
                            >
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: badgeColor,
                                marginTop: '6px',
                                flexShrink: 0
                              }}></div>
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                  <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--slate-900)' }}>
                                    {act.title}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>
                                    {new Date(act.created_at).toLocaleString()}
                                  </span>
                                </div>
                                <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginTop: '4px', lineHeight: 1.4 }}>
                                  {act.description}
                                </p>
                                {act.actor_email && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '6px' }}>
                                    Triggered by: <strong>{act.actor_email}</strong>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Quick Action Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Registration Status Snapshot */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <SlidersHorizontal size={18} color="#0f766e" />
                        <span>Registration Policy Status</span>
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8125rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--slate-600)' }}>Public Registration:</span>
                          <span style={{ fontWeight: 700, color: registrationSettings.allow_open_registration ? '#059669' : '#dc2626' }}>
                            {registrationSettings.allow_open_registration ? 'Open / Allowed' : 'Paused / Restricted'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--slate-600)' }}>Require Phone Number:</span>
                          <span style={{ fontWeight: 700, color: registrationSettings.require_phone ? '#0f766e' : 'var(--slate-500)' }}>
                            {registrationSettings.require_phone ? 'Yes (Enforced)' : 'Optional'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--slate-600)' }}>Min Password Length:</span>
                          <span style={{ fontWeight: 700, color: 'var(--slate-800)' }}>
                            {registrationSettings.min_password_length} characters
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--slate-600)' }}>Default Assigned Role:</span>
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>
                            {registrationSettings.default_role}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setActiveTab('registration')}
                        className="btn btn-secondary btn-sm"
                        style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <span>Configure Registration Rules</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    {/* Quick Fleet Health */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '20px', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={18} color="#2563eb" />
                        <span>Hotel Fleet Summary</span>
                      </h3>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
                        <p>Total published properties: <strong>{hotels.length} hotels</strong></p>
                        <p style={{ marginTop: '4px' }}>Eco-certified properties: <strong>{hotels.filter(h => h.eco_certified).length}</strong></p>
                        <p style={{ marginTop: '4px' }}>Total room categories: <strong>{hotels.reduce((acc, h) => acc + (h.rooms?.length || 0), 0)}</strong></p>
                      </div>
                      <button
                        onClick={() => setActiveTab('hotels')}
                        className="btn btn-primary btn-sm"
                        style={{ width: '100%', marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                      >
                        <span>Manage & Update Hotels</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: HOTEL UPDATION & CATALOG MANAGEMENT */}
            {/* ========================================================================= */}
            {activeTab === 'hotels' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Hotel Inventory & Updation
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                      Edit hotel profiles, update pricing, manage rooms and view real-time availability calendars.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '260px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        placeholder="Search hotel, city or country..."
                        className="form-input"
                        style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8125rem' }}
                        value={hotelSearch}
                        onChange={(e) => setHotelSearch(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => { setShowAddHotel(true); setEditingHotel(null); }}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <PlusCircle size={16} />
                      <span>Add Hotel</span>
                    </button>
                  </div>
                </div>

                {/* Hotel List Table / Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {filteredHotels.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', backgroundColor: '#fff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
                      <Building size={36} color="var(--slate-400)" style={{ margin: '0 auto 10px auto' }} />
                      <p style={{ color: 'var(--slate-500)', fontWeight: 600 }}>No hotels match your search.</p>
                    </div>
                  ) : (
                    filteredHotels.map(h => (
                      <div
                        key={h.id}
                        style={{
                          backgroundColor: '#ffffff',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-color)',
                          padding: '20px',
                          display: 'flex',
                          gap: '20px',
                          flexWrap: 'wrap',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{ width: '180px', height: '130px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                          <img
                            src={h.featured_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80'}
                            alt={h.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {h.eco_certified && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              backgroundColor: 'rgba(5, 150, 105, 0.9)',
                              color: '#fff',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px'
                            }}>
                              Eco Certified
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                                  {h.name}
                                </h3>
                                <span style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#b45309',
                                  backgroundColor: '#fef3c7',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                                  <span>{h.star_rating}★</span>
                                </span>
                              </div>
                              <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                <MapPin size={14} />
                                <span>{h.address}, {h.city}, {h.country}</span>
                              </p>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)' }}>Starting rate</div>
                              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f766e' }}>
                                ${h.starting_price || 0}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--slate-500)' }}> / night</span>
                              </div>
                            </div>
                          </div>

                          <p style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginTop: '8px', lineHeight: 1.4, maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {h.description}
                          </p>

                          {/* Amenities Tags */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                            {(h.amenities || []).slice(0, 5).map((a, i) => (
                              <span key={i} style={{ fontSize: '0.7rem', padding: '2px 8px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '4px' }}>
                                {a}
                              </span>
                            ))}
                            {(h.amenities?.length || 0) > 5 && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--slate-400)', alignSelf: 'center' }}>
                                +{h.amenities.length - 5} more
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => {
                                setEditingHotel({
                                  ...h,
                                  amenities: (h.amenities || []).join(', '),
                                  images: (h.images || []).join('\n')
                                });
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              <Edit3 size={14} />
                              <span>Update Hotel</span>
                            </button>

                            <button
                              onClick={() => setManageRoomsHotel(h)}
                              className="btn btn-sm"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                fontWeight: 700
                              }}
                            >
                              <Bed size={14} />
                              <span>Manage Rooms ({h.rooms?.length || 0})</span>
                            </button>

                            <button
                              onClick={() => setSelectedCalendarHotel(h)}
                              className="btn btn-sm"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                backgroundColor: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1'
                              }}
                            >
                              <Calendar size={14} />
                              <span>Calendar Preview</span>
                            </button>

                            <button
                              onClick={() => handleDeleteHotel(h)}
                              className="btn btn-sm"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                backgroundColor: '#fef2f2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                marginLeft: 'auto'
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: REGISTRATION PROCESS & POLICY STUDIO */}
            {/* ========================================================================= */}
            {activeTab === 'registration' && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    User Registration Process & Platform Controls
                  </h2>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                    Configure guest onboarding rules, mandatory fields, security thresholds, and role assignments in real time.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '28px' }}>
                  {/* Settings Form */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '28px', boxShadow: 'var(--shadow-sm)' }}>
                    <form onSubmit={handleSaveRegistrationSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Section 1: Access & Registration Toggles */}
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-200)', paddingBottom: '8px', marginBottom: '14px' }}>
                          1. Registration Access Controls
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                                Allow Open Public Registration
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                When disabled, new account signups are restricted and visitors see a notice.
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={registrationSettings.allow_open_registration}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, allow_open_registration: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                            />
                          </label>

                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                                Require Contact Phone Number
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                Mandates telephone number entry on the registration form.
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={registrationSettings.require_phone}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, require_phone: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                            />
                          </label>

                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                                Allow Anonymous Guest Checkout
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                Allows travelers to book rooms without creating an account first.
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={registrationSettings.allow_guest_checkout}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, allow_guest_checkout: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                            />
                          </label>

                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--slate-900)' }}>
                                Send Automated Welcome Email
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                Automatically queues an introductory email to newly registered guests.
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={registrationSettings.send_welcome_email}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, send_welcome_email: e.target.checked })}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#0f766e' }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Section 2: Security & Password Rules */}
                      <div>
                        <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--slate-900)', borderBottom: '1px solid var(--slate-200)', paddingBottom: '8px', marginBottom: '14px' }}>
                          2. Password & Role Policy
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div className="form-group">
                            <label className="form-label">
                              Min Password Length: <strong>{registrationSettings.min_password_length} chars</strong>
                            </label>
                            <input
                              type="range"
                              min="6"
                              max="16"
                              step="1"
                              value={registrationSettings.min_password_length}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, min_password_length: parseInt(e.target.value, 10) })}
                              style={{ width: '100%', cursor: 'pointer', accentColor: '#0f766e' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                              <span>6 chars (Basic)</span>
                              <span>12 chars (Strict)</span>
                              <span>16 chars</span>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label">Default New Account Role</label>
                            <select
                              className="form-input"
                              value={registrationSettings.default_role}
                              onChange={(e) => setRegistrationSettings({ ...registrationSettings, default_role: e.target.value })}
                            >
                              <option value="user">User (Standard Guest)</option>
                              <option value="hotel_manager">Hotel Manager</option>
                              <option value="admin">Administrator (Caution)</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '12px' }}>
                          <label className="form-label">Terms of Service / Privacy Policy Version</label>
                          <input
                            type="text"
                            className="form-input"
                            value={registrationSettings.terms_version}
                            onChange={(e) => setRegistrationSettings({ ...registrationSettings, terms_version: e.target.value })}
                            placeholder="e.g. 2026.2"
                          />
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '4px' }}>
                            Recorded during registration to guarantee GDPR/DPDP consent audit trails.
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="btn btn-primary"
                        style={{ height: '44px', fontWeight: 700, fontSize: '0.95rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                      >
                        {savingSettings ? <Loader2 size={18} className="spinner" /> : <CheckCircle size={18} />}
                        <span>{savingSettings ? 'Saving Policies...' : 'Save Registration Policies'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Side: Live Guest Experience Preview */}
                  <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <Eye size={18} color="#0f766e" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        Guest Registration Form Preview
                      </h3>
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginBottom: '16px' }}>
                      This live preview shows exactly how visitors see the signup page based on your active policies.
                    </p>

                    <div style={{ border: '2px dashed var(--slate-200)', borderRadius: 'var(--radius-md)', padding: '20px', backgroundColor: '#f8fafc' }}>
                      {!registrationSettings.allow_open_registration ? (
                        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: '0.8125rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <AlertCircle size={18} />
                          <div>
                            <strong>Registration Paused:</strong> New registrations are disabled by the administrator. Guests are advised to sign in with an existing account.
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: 0.9 }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)' }}>Full Name *</div>
                            <div style={{ height: '32px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                              Jordan Lee
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)' }}>Email Address *</div>
                            <div style={{ height: '32px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                              guest@havenstay.com
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                              Phone Number {registrationSettings.require_phone ? <span style={{ color: '#ef4444' }}>* (Required)</span> : '(Optional)'}
                            </div>
                            <div style={{ height: '32px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                              +1 (555) 000-0000
                            </div>
                          </div>

                          <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-700)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Password *</span>
                              <span style={{ color: '#0f766e' }}>Min {registrationSettings.min_password_length} chars</span>
                            </div>
                            <div style={{ height: '32px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '6px 10px', fontSize: '0.75rem', color: '#94a3b8' }}>
                              ••••••••••••
                            </div>
                          </div>

                          <div style={{ fontSize: '0.7rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                            By registering, you accept Terms v{registrationSettings.terms_version} and privacy consent.
                          </div>

                          <div style={{ height: '36px', backgroundColor: '#0f766e', borderRadius: '4px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700 }}>
                            Create Account
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: USERS & ACCESS CONTROL DIRECTORY */}
            {/* ========================================================================= */}
            {activeTab === 'users' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      User Directory & Roles
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                      Inspect registered guests, assign administrator privileges, and manage accounts.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '240px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        placeholder="Search name or email..."
                        className="form-input"
                        style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8125rem' }}
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="form-input"
                      style={{ height: '36px', fontSize: '0.8125rem', width: '130px' }}
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="admin">Admins</option>
                      <option value="user">Users</option>
                    </select>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--slate-600)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px 18px' }}>User</th>
                        <th style={{ padding: '14px 18px' }}>Role</th>
                        <th style={{ padding: '14px 18px' }}>Phone</th>
                        <th style={{ padding: '14px 18px' }}>Bookings</th>
                        <th style={{ padding: '14px 18px' }}>Joined Date</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-400)' }}>
                            No users found matching query.
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: u.role === 'admin' ? '#0f766e' : '#64748b',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '0.8125rem'
                                }}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                                    {u.name} {u.id === user.id && <span style={{ fontSize: '0.7rem', color: '#0f766e', fontWeight: 800 }}>(You)</span>}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: u.role === 'admin' ? '#fef3c7' : '#e2e8f0',
                                color: u.role === 'admin' ? '#b45309' : '#334155'
                              }}>
                                {u.role}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--slate-600)', fontSize: '0.8125rem' }}>
                              {u.phone || <span style={{ color: 'var(--slate-300)' }}>None</span>}
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--slate-800)' }}>
                              {u.bookings_count} stays
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--slate-500)', fontSize: '0.8125rem' }}>
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => handleToggleUserRole(u)}
                                  title={u.role === 'admin' ? 'Demote to User' : 'Promote to Admin'}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--slate-200)',
                                    backgroundColor: '#fff',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: u.role === 'admin' ? '#b45309' : '#0f766e'
                                  }}
                                >
                                  {u.role === 'admin' ? 'Demote' : 'Make Admin'}
                                </button>
                                <button
                                  onClick={() => setEditingUser(u)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--slate-200)',
                                    backgroundColor: '#fff',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    color: 'var(--slate-700)'
                                  }}
                                >
                                  Edit
                                </button>
                                {u.id !== user.id && (
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      border: '1px solid #fecaca',
                                      backgroundColor: '#fef2f2',
                                      fontSize: '0.75rem',
                                      cursor: 'pointer',
                                      color: '#dc2626'
                                    }}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: RESERVATIONS & BOOKINGS */}
            {/* ========================================================================= */}
            {activeTab === 'bookings' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Reservations & Stay Operations
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                      View all customer stays, update reservation status, preview invoices, and dispatch receipts.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ position: 'relative', width: '240px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
                      <input
                        type="text"
                        placeholder="Search ref, guest, email..."
                        className="form-input"
                        style={{ paddingLeft: '32px', height: '36px', fontSize: '0.8125rem' }}
                        value={bookingSearch}
                        onChange={(e) => setBookingSearch(e.target.value)}
                      />
                    </div>
                    <select
                      className="form-input"
                      style={{ height: '36px', fontSize: '0.8125rem', width: '140px' }}
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--slate-600)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px 18px' }}>Reference</th>
                        <th style={{ padding: '14px 18px' }}>Guest Details</th>
                        <th style={{ padding: '14px 18px' }}>Hotel & Room</th>
                        <th style={{ padding: '14px 18px' }}>Dates & Stay</th>
                        <th style={{ padding: '14px 18px' }}>Total Price</th>
                        <th style={{ padding: '14px 18px' }}>Status Override</th>
                        <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-400)' }}>
                            No bookings found.
                          </td>
                        </tr>
                      ) : (
                        filteredBookings.map(b => (
                          <tr key={b.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                #{b.booking_reference}
                              </span>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)', marginTop: '2px' }}>
                                {new Date(b.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>{b.guest_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{b.guest_email}</div>
                              {b.guest_phone && <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{b.guest_phone}</div>}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>{b.hotel_name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>{b.room_type}</div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontSize: '0.8125rem', color: 'var(--slate-800)', fontWeight: 600 }}>
                                {b.check_in} → {b.check_out}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                                {b.nights} {b.nights === 1 ? 'night' : 'nights'} · {b.guests} {b.guests === 1 ? 'guest' : 'guests'}
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ fontWeight: 800, color: '#0f766e', fontSize: '0.95rem' }}>
                                ${b.total_price.toFixed(2)}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#16a34a', fontWeight: 600 }}>
                                0 hidden fees
                              </div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <select
                                value={b.status}
                                onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--slate-300)',
                                  fontWeight: 700,
                                  backgroundColor:
                                    b.status === 'confirmed' ? '#dcfce7' :
                                    b.status === 'completed' ? '#e0e7ff' : '#fee2e2',
                                  color:
                                    b.status === 'confirmed' ? '#166534' :
                                    b.status === 'completed' ? '#3730a3' : '#991b1b',
                                  cursor: 'pointer'
                                }}
                              >
                                <option value="confirmed">Confirmed</option>
                                <option value="checked_in">Checked In</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </td>
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button
                                  onClick={() => setSelectedReceiptBooking(b)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <FileText size={12} />
                                  <span>Invoice</span>
                                </button>
                                <button
                                  onClick={() => setSelectedEmailBooking(b)}
                                  className="btn btn-sm"
                                  style={{ padding: '4px 10px', fontSize: '0.75rem', backgroundColor: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1' }}
                                >
                                  <Mail size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: PAYMENTS & GATEWAY TRANSACTIONS */}
            {/* ========================================================================= */}
            {activeTab === 'payments' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                      Transactions & Gateway Ledger
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                      Inspect all verified payments processed through Razorpay, UPI, cards, and netbanking.
                    </p>
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#0f766e', backgroundColor: '#ccfbf1', padding: '6px 12px', borderRadius: 'var(--radius-md)' }}>
                    Total Processed: ${payments.reduce((acc, p) => acc + (p.amount || 0), 0).toFixed(2)}
                  </div>
                </div>

                <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--slate-600)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                        <th style={{ padding: '14px 18px' }}>Payment ID</th>
                        <th style={{ padding: '14px 18px' }}>Booking Ref</th>
                        <th style={{ padding: '14px 18px' }}>Guest Name</th>
                        <th style={{ padding: '14px 18px' }}>Gateway & Order</th>
                        <th style={{ padding: '14px 18px' }}>Method</th>
                        <th style={{ padding: '14px 18px' }}>Amount</th>
                        <th style={{ padding: '14px 18px' }}>Status</th>
                        <th style={{ padding: '14px 18px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--slate-400)' }}>
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        payments.map(p => (
                          <tr key={p.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                            <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--slate-900)', fontFamily: 'monospace' }}>
                              #{p.id}
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: 700, color: '#0f766e' }}>
                              {p.booking_reference ? `#${p.booking_reference}` : `Booking #${p.booking_id}`}
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--slate-800)' }}>
                              {p.guest_name || 'Guest'}
                            </td>
                            <td style={{ padding: '14px 18px', fontSize: '0.8125rem' }}>
                              <span style={{ fontWeight: 700, textTransform: 'uppercase', color: 'var(--slate-700)' }}>{p.gateway}</span>
                              <div style={{ fontSize: '0.7rem', color: 'var(--slate-400)' }}>{p.gateway_order_id || 'Mock'}</div>
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569', textTransform: 'uppercase' }}>
                                {p.payment_method}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--slate-900)' }}>
                              {p.currency} {p.amount.toFixed(2)}
                            </td>
                            <td style={{ padding: '14px 18px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                backgroundColor: p.status === 'captured' || p.status === 'paid' ? '#dcfce7' : '#fee2e2',
                                color: p.status === 'captured' || p.status === 'paid' ? '#166534' : '#991b1b'
                              }}>
                                {p.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 18px', color: 'var(--slate-400)', fontSize: '0.75rem' }}>
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: EMAIL DIAGNOSTICS & DELIVERY LOGS */}
            {/* ========================================================================= */}
            {activeTab === 'notifications' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                  {/* Left Column: Email Notification Delivery Logs */}
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '4px' }}>
                      Transactional Email Queue & Webhooks
                    </h2>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginBottom: '16px' }}>
                      History of sent reservation confirmations, receipts, and cancellation notices.
                    </p>

                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', color: 'var(--slate-600)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            <th style={{ padding: '12px 16px' }}>Recipient</th>
                            <th style={{ padding: '12px 16px' }}>Type</th>
                            <th style={{ padding: '12px 16px' }}>Subject</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.length === 0 ? (
                            <tr>
                              <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: 'var(--slate-400)' }}>
                                No email notifications logged yet.
                              </td>
                            </tr>
                          ) : (
                            notifications.map(n => (
                              <tr key={n.id} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--slate-900)' }}>
                                  {n.recipient_email}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#e2e8f0', borderRadius: '4px', color: '#334155' }}>
                                    {n.email_type}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--slate-600)', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {n.subject || 'HavenStay Reservation Notice'}
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                  <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: n.status === 'sent' || n.status === 'delivered' ? '#dcfce7' : n.status === 'queued' ? '#fef3c7' : '#fee2e2',
                                    color: n.status === 'sent' || n.status === 'delivered' ? '#166534' : n.status === 'queued' ? '#b45309' : '#991b1b'
                                  }}>
                                    {n.status}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: 'var(--slate-400)', fontSize: '0.75rem' }}>
                                  {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Right Column: Diagnostic Dispatcher */}
                  <div>
                    <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Send size={18} color="#0f766e" />
                        <span>Live Email Diagnostics</span>
                      </h3>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginBottom: '16px', lineHeight: 1.4 }}>
                        Verify your SMTP / Resend.com credentials by sending a live test confirmation email.
                      </p>

                      <form onSubmit={handleSendTestEmail} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div className="form-group">
                          <label className="form-label">Recipient Email Address</label>
                          <input
                            type="email"
                            className="form-input"
                            value={testEmailAddress}
                            onChange={(e) => setTestEmailAddress(e.target.value)}
                            required
                          />
                        </div>

                        {testMessage && (
                          <div style={{ padding: '10px 14px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', color: '#166534', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle size={16} />
                            <span>{testMessage}</span>
                          </div>
                        )}

                        {testError && (
                          <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#991b1b', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <AlertCircle size={16} />
                            <span>{testError}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={testSending}
                          className="btn btn-primary"
                          style={{ height: '40px', fontWeight: 700, fontSize: '0.875rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                        >
                          {testSending ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                          <span>{testSending ? 'Sending Diagnostic...' : 'Send Live Test Email'}</span>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADD OR EDIT HOTEL MODAL */}
      {/* ========================================================================= */}
      {(showAddHotel || editingHotel) && (
        <div className="modal-backdrop" onClick={() => { setShowAddHotel(false); setEditingHotel(null); }}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '720px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {editingHotel ? `Edit Hotel: ${editingHotel.name}` : 'Publish New Hotel Listing'}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Update property details, address, coordinates, star rating, and amenities.
                </p>
              </div>
              <button
                onClick={() => { setShowAddHotel(false); setEditingHotel(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveHotel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Hotel Name *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingHotel ? editingHotel.name : newHotel.name}
                  onChange={(e) => {
                    if (editingHotel) setEditingHotel({ ...editingHotel, name: e.target.value });
                    else setNewHotel({ ...newHotel, name: e.target.value });
                  }}
                  placeholder="e.g. The Green Haven Eco-Hotel"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-input"
                  rows="3"
                  required
                  value={editingHotel ? editingHotel.description : newHotel.description}
                  onChange={(e) => {
                    if (editingHotel) setEditingHotel({ ...editingHotel, description: e.target.value });
                    else setNewHotel({ ...newHotel, description: e.target.value });
                  }}
                  placeholder="Describe property amenities, ambiance, sustainability credentials..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Street Address *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editingHotel ? editingHotel.address : newHotel.address}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, address: e.target.value });
                      else setNewHotel({ ...newHotel, address: e.target.value });
                    }}
                    placeholder="142 Greenwich St"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editingHotel ? editingHotel.city : newHotel.city}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, city: e.target.value });
                      else setNewHotel({ ...newHotel, city: e.target.value });
                    }}
                    placeholder="New York"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Country *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={editingHotel ? editingHotel.country : newHotel.country}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, country: e.target.value });
                      else setNewHotel({ ...newHotel, country: e.target.value });
                    }}
                    placeholder="United States"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={editingHotel ? editingHotel.latitude : newHotel.latitude}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, latitude: e.target.value });
                      else setNewHotel({ ...newHotel, latitude: e.target.value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    className="form-input"
                    value={editingHotel ? editingHotel.longitude : newHotel.longitude}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, longitude: e.target.value });
                      else setNewHotel({ ...newHotel, longitude: e.target.value });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Star Rating (1 - 5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    className="form-input"
                    value={editingHotel ? editingHotel.star_rating : newHotel.star_rating}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, star_rating: e.target.value });
                      else setNewHotel({ ...newHotel, star_rating: e.target.value });
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Featured Image URL</label>
                <input
                  type="url"
                  className="form-input"
                  value={editingHotel ? editingHotel.featured_image : newHotel.featured_image}
                  onChange={(e) => {
                    if (editingHotel) setEditingHotel({ ...editingHotel, featured_image: e.target.value });
                    else setNewHotel({ ...newHotel, featured_image: e.target.value });
                  }}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Verified Amenities (comma-separated)</label>
                <input
                  type="text"
                  className="form-input"
                  value={editingHotel ? editingHotel.amenities : newHotel.amenities}
                  onChange={(e) => {
                    if (editingHotel) setEditingHotel({ ...editingHotel, amenities: e.target.value });
                    else setNewHotel({ ...newHotel, amenities: e.target.value });
                  }}
                  placeholder="Free WiFi, Pool, Spa, EV Charging, Breakfast"
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--slate-800)' }}>
                  <input
                    type="checkbox"
                    checked={editingHotel ? editingHotel.eco_certified : newHotel.eco_certified}
                    onChange={(e) => {
                      if (editingHotel) setEditingHotel({ ...editingHotel, eco_certified: e.target.checked });
                      else setNewHotel({ ...newHotel, eco_certified: e.target.checked });
                    }}
                    style={{ width: '16px', height: '16px', accentColor: '#0f766e' }}
                  />
                  <span>Eco-Certified Property (Green building, renewable energy, zero single-use plastics)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowAddHotel(false); setEditingHotel(null); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingHotel ? 'Save Changes' : 'Publish Hotel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MANAGE ROOMS DRAWER / MODAL */}
      {/* ========================================================================= */}
      {manageRoomsHotel && (
        <div className="modal-backdrop" onClick={() => setManageRoomsHotel(null)}>
          <div
            className="modal-dialog"
            style={{ maxWidth: '820px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Rooms & Inventory: {manageRoomsHotel.name}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '2px' }}>
                  Manage room categories, bed layouts, nightly base pricing, and total units available.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => { setShowAddRoom(true); setEditingRoom(null); }}
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <PlusCircle size={14} />
                  <span>Add Room Category</span>
                </button>
                <button
                  onClick={() => setManageRoomsHotel(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* List Existing Rooms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              {(manageRoomsHotel.rooms || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--slate-400)' }}>
                  No room categories configured yet. Click "Add Room Category" above to create one.
                </div>
              ) : (
                manageRoomsHotel.rooms.map(r => (
                  <div
                    key={r.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--slate-200)',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '1rem' }}>
                          {r.room_type}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#475569', backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>
                          {r.bed_configuration}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--slate-500)', marginTop: '4px' }}>
                        Max Occupancy: <strong>{r.max_occupancy} guests</strong> · Total Fleet Units: <strong>{r.total_units} units</strong> · Taxes: <strong>{(r.taxes_and_fees * 100).toFixed(0)}%</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f766e' }}>
                          ${r.base_price}<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--slate-500)' }}>/night</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => {
                            setEditingRoom({
                              ...r,
                              amenities: (r.amenities || []).join(', '),
                              photos: (r.photos || []).join('\n')
                            });
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(r)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Sub-form: Add/Edit Room Modal/Panel */}
            {(showAddRoom || editingRoom) && (
              <div style={{ borderTop: '2px solid var(--slate-200)', paddingTop: '20px', marginTop: '10px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '14px' }}>
                  {editingRoom ? `Edit Room Category: ${editingRoom.room_type}` : 'Add New Room Category'}
                </h3>

                <form onSubmit={handleSaveRoom} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Room Type *</label>
                      <input
                        type="text"
                        className="form-input"
                        required
                        value={editingRoom ? editingRoom.room_type : newRoom.room_type}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, room_type: e.target.value });
                          else setNewRoom({ ...newRoom, room_type: e.target.value });
                        }}
                        placeholder="e.g. Deluxe Skyline King"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bed Layout</label>
                      <input
                        type="text"
                        className="form-input"
                        value={editingRoom ? editingRoom.bed_configuration : newRoom.bed_configuration}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, bed_configuration: e.target.value });
                          else setNewRoom({ ...newRoom, bed_configuration: e.target.value });
                        }}
                        placeholder="1 King Bed"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows="2"
                      value={editingRoom ? editingRoom.description : newRoom.description}
                      onChange={(e) => {
                        if (editingRoom) setEditingRoom({ ...editingRoom, description: e.target.value });
                        else setNewRoom({ ...newRoom, description: e.target.value });
                      }}
                      placeholder="Room details, view, bedding, private bathroom features..."
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">Base Rate ($/night) *</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        required
                        value={editingRoom ? editingRoom.base_price : newRoom.base_price}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, base_price: e.target.value });
                          else setNewRoom({ ...newRoom, base_price: e.target.value });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Total Units *</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        required
                        value={editingRoom ? editingRoom.total_units : newRoom.total_units}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, total_units: e.target.value });
                          else setNewRoom({ ...newRoom, total_units: e.target.value });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Occupancy</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={editingRoom ? editingRoom.max_occupancy : newRoom.max_occupancy}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, max_occupancy: e.target.value });
                          else setNewRoom({ ...newRoom, max_occupancy: e.target.value });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tax Rate (e.g. 0.12 = 12%)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={editingRoom ? editingRoom.taxes_and_fees : newRoom.taxes_and_fees}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, taxes_and_fees: e.target.value });
                          else setNewRoom({ ...newRoom, taxes_and_fees: e.target.value });
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingRoom ? editingRoom.free_cancellation : newRoom.free_cancellation}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, free_cancellation: e.target.checked });
                          else setNewRoom({ ...newRoom, free_cancellation: e.target.checked });
                        }}
                        style={{ accentColor: '#0f766e' }}
                      />
                      <span>Free Cancellation Available</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editingRoom ? editingRoom.breakfast_included : newRoom.breakfast_included}
                        onChange={(e) => {
                          if (editingRoom) setEditingRoom({ ...editingRoom, breakfast_included: e.target.checked });
                          else setNewRoom({ ...newRoom, breakfast_included: e.target.checked });
                        }}
                        style={{ accentColor: '#0f766e' }}
                      />
                      <span>Breakfast Included</span>
                    </label>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                    <button
                      type="button"
                      onClick={() => { setShowAddRoom(false); setEditingRoom(null); }}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary btn-sm">
                      {editingRoom ? 'Update Room' : 'Add Room'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT USER MODAL */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="modal-backdrop" onClick={() => setEditingUser(null)}>
          <div className="modal-dialog" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Edit User Account
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email (Read-only)</label>
                <input
                  type="email"
                  className="form-input"
                  disabled
                  value={editingUser.email}
                  style={{ backgroundColor: '#f1f5f9' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className="form-input"
                  value={editingUser.phone || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">User Role</label>
                <select
                  className="form-input"
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                >
                  <option value="user">User (Standard Guest)</option>
                  <option value="admin">Administrator</option>
                  <option value="hotel_manager">Hotel Manager</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingUser(null)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CALENDAR PREVIEW DRAWER */}
      {/* ========================================================================= */}
      {selectedCalendarHotel && (
        <div className="modal-backdrop" onClick={() => setSelectedCalendarHotel(null)}>
          <div className="modal-dialog" style={{ maxWidth: '680px', width: '95%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  Availability & Rates: {selectedCalendarHotel.name}
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
                  Real-time calendar inventory showing remaining room units and demand status.
                </p>
              </div>
              <button onClick={() => setSelectedCalendarHotel(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <AvailabilityCalendar
              hotelId={selectedCalendarHotel.id}
              hotelName={selectedCalendarHotel.name}
              onSelectDates={() => {}}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RECEIPT / INVOICE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {selectedReceiptBooking && (
        <ReceiptModal
          booking={selectedReceiptBooking}
          onClose={() => setSelectedReceiptBooking(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EMAIL PREVIEW MODAL */}
      {/* ========================================================================= */}
      {selectedEmailBooking && (
        <EmailPreviewModal
          booking={selectedEmailBooking}
          isOpen={Boolean(selectedEmailBooking)}
          onClose={() => setSelectedEmailBooking(null)}
        />
      )}
    </div>
  );
}
