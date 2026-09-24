import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import GuestRoomSelector from '../components/GuestRoomSelector';
import NearbyPlacesSection from '../components/NearbyPlacesSection';
import AvailabilityCalendar from '../components/AvailabilityCalendar';
import { Star, MapPin, Sparkles, Heart, ShieldCheck, Check, Calendar, Users, Coffee, Bed, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function HotelDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || getDefaultCheckIn());
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || getDefaultCheckOut());
  const [adults, setAdults] = useState(parseInt(searchParams.get('adults') || searchParams.get('guests') || '2', 10));
  const [children, setChildren] = useState(parseInt(searchParams.get('children') || '0', 10));
  const [childrenAges, setChildrenAges] = useState(searchParams.get('children_ages') ? searchParams.get('children_ages').split(',').map(Number) : []);
  const [roomsCount, setRoomsCount] = useState(parseInt(searchParams.get('rooms') || '1', 10));
  const guests = adults + children;

  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);

  function getDefaultCheckIn() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  function getDefaultCheckOut() {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split('T')[0];
  }

  // Load hotel and rooms
  useEffect(() => {
    async function fetchDetails() {
      setLoading(true);
      setError(null);
      try {
        const hotelData = await api.getHotel(id);
        setHotel(hotelData);
        setIsFavorite(hotelData.is_favorite);

        const roomsData = await api.getHotelRooms(id, checkIn, checkOut, guests);
        setRooms(roomsData);
      } catch (err) {
        console.error("Failed to fetch hotel details:", err);
        setError("Failed to load hotel profile. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [id, checkIn, checkOut, guests]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      alert("Please sign in to save hotels.");
      return;
    }
    try {
      const res = await api.toggleFavorite(hotel.id);
      setIsFavorite(res.is_favorite);
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
    }
  };

  const calculateNights = () => {
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return Math.max(1, Math.round(diff));
  };

  const nights = calculateNights();

  const handleSelectRoom = (room) => {
    const params = new URLSearchParams({
      hotel_id: hotel.id,
      room_id: room.id,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      adults: adults,
      children: children,
      rooms: roomsCount,
      ...(childrenAges.length ? { children_ages: childrenAges.join(',') } : {})
    });
    navigate(`/checkout?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '100px 20px', textAlign: 'center' }}>
        <Loader2 size={40} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 16px auto' }} />
        <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>Loading property information...</div>
      </div>
    );
  }

  if (error || !hotel) {
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
          <div>{error || "Hotel not found."}</div>
        </div>
      </div>
    );
  }

  const galleryImages = (hotel.images && hotel.images.length > 0)
    ? hotel.images
    : [hotel.featured_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80'];

  return (
    <div style={{ paddingTop: '28px', paddingBottom: '80px' }}>
      <div className="container">
        {/* Breadcrumb & Top Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
            <Link to="/" style={{ color: 'var(--primary)', fontWeight: 600 }}>Home</Link> &gt;{' '}
            <Link to={`/search?city=${encodeURIComponent(hotel.city)}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>{hotel.city}</Link> &gt;{' '}
            <span>{hotel.name}</span>
          </div>

          <button
            onClick={handleFavoriteToggle}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Heart size={16} color={isFavorite ? "#ef4444" : "var(--slate-600)"} fill={isFavorite ? "#ef4444" : "none"} />
            <span>{isFavorite ? 'Saved to Favorites' : 'Save Hotel'}</span>
          </button>
        </div>

        {/* Title & Ratings Header */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', color: '#f59e0b' }}>
              {[...Array(Math.floor(hotel.star_rating || 4))].map((_, i) => (
                <Star key={i} size={16} fill="#f59e0b" />
              ))}
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-500)' }}>
              {hotel.star_rating} Star Verified Property
            </span>
            {hotel.eco_certified && (
              <span className="badge badge-eco">
                <Sparkles size={12} />
                <span>Eco-Certified Stay</span>
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '8px' }}>
            {hotel.name}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9375rem', color: 'var(--slate-600)' }}>
            <MapPin size={16} color="var(--primary)" />
            <span>{hotel.address}, {hotel.city}, {hotel.country}</span>
          </div>
        </div>

        {/* High-Resolution Photo Gallery Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '14px',
          height: '420px',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          marginBottom: '36px',
          boxShadow: 'var(--shadow-md)'
        }}
        className="photo-gallery-grid"
        >
          <div style={{ height: '100%', position: 'relative' }}>
            <img
              src={galleryImages[activePhoto] || galleryImages[0]}
              alt={hotel.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(auto-fit, minmax(80px, 1fr))',
            gap: '10px'
          }}>
            {galleryImages.slice(0, 3).map((imgUrl, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhoto(idx)}
                style={{
                  height: '100%',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 'var(--radius-md)',
                  border: activePhoto === idx ? '3px solid var(--primary)' : '1px solid var(--slate-200)'
                }}
              >
                <img
                  src={imgUrl}
                  alt={`View ${idx + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Responsible Transparency Banner */}
        <div className="responsible-banner">
          <div className="responsible-icon">
            <ShieldCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--slate-900)', fontSize: '0.9375rem' }}>
              HavenStay Honest Pricing & Real Inventory Guarantee
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--slate-600)', marginTop: '2px' }}>
              The prices shown below include all compulsory occupancy taxes and municipal fees. We never hide resort fees, and the available unit counts reflect genuine room keys in the property's database.
            </div>
          </div>
        </div>

        {/* Layout: Hotel Info + Room Selection */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 340px',
          gap: '36px',
          alignItems: 'start'
        }}
        className="hotel-content-grid"
        >
          {/* Main Left Column: Overview, Rooms List, Amenities */}
          <div>
            {/* About Property */}
            <div style={{ marginBottom: '36px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '12px', color: 'var(--slate-900)' }}>
                About the Property
              </h2>
              <p style={{ fontSize: '1rem', color: 'var(--slate-700)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {hotel.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--slate-900)' }}>
                Popular Amenities & Services
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px'
              }}>
                {(hotel.amenities || []).map((amenity, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    backgroundColor: '#ffffff',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.875rem',
                    color: 'var(--slate-800)',
                    fontWeight: 500
                  }}>
                    <Check size={16} color="var(--accent)" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Availability Calendar with Shades */}
            <div id="availability-calendar-section" style={{ marginBottom: '40px' }}>
              <AvailabilityCalendar
                hotelId={hotel.id}
                initialCheckIn={checkIn}
                initialCheckOut={checkOut}
                onSelectDates={(newCi, newCo) => {
                  setCheckIn(newCi);
                  setCheckOut(newCo);
                }}
              />
            </div>

            {/* Room Availability Section */}
            <div id="rooms-section" style={{ marginBottom: '48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                    Available Rooms & Rates
                  </h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                    For {nights} night{nights > 1 ? 's' : ''} ({checkIn} → {checkOut})
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {rooms.map((room) => {
                  const baseTotal = Math.round(room.base_price * nights);
                  const taxesTotal = Math.round(baseTotal * room.taxes_and_fees);
                  const totalWithTaxes = baseTotal + taxesTotal;
                  const isAvailable = room.available_units_now > 0;

                  return (
                    <div
                      key={room.id}
                      className="card room-card-grid"
                      style={{
                        padding: '24px',
                        display: 'grid',
                        gridTemplateColumns: '220px 1fr 220px',
                        gap: '24px',
                        border: isAvailable ? '1px solid var(--border-color)' : '1px solid #e2e8f0',
                        opacity: isAvailable ? 1 : 0.65
                      }}
                    >
                      {/* Room Photo */}
                      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '150px' }}>
                        <img
                          src={room.photos && room.photos[0] ? room.photos[0] : hotel.featured_image}
                          alt={room.room_type}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>

                      {/* Room Specs */}
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '6px' }}>
                          {room.room_type}
                        </h3>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.8125rem', color: 'var(--slate-600)', marginBottom: '12px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Bed size={15} color="var(--primary)" /> {room.bed_configuration}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={15} color="var(--primary)" /> Max {room.max_occupancy} Guests
                          </span>
                        </div>

                        <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.4, marginBottom: '12px' }}>
                          {room.description}
                        </p>

                        {/* Room Perks */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                          {room.free_cancellation && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✓ Free cancellation
                            </span>
                          )}
                          {room.breakfast_included && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Coffee size={13} /> Breakfast included
                            </span>
                          )}
                          {/* Real verified room inventory */}
                          <span style={{
                            fontSize: '0.75rem',
                            color: room.available_units_now <= 2 ? '#b45309' : 'var(--slate-500)',
                            fontWeight: 600
                          }}>
                            {room.available_units_now} unit{room.available_units_now !== 1 ? 's' : ''} currently available
                          </span>
                        </div>
                      </div>

                      {/* Itemized Pricing & Reservation CTA */}
                      <div style={{
                        borderLeft: '1px solid var(--slate-100)',
                        paddingLeft: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'right'
                      }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Nightly Base Rate</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                            ${room.base_price}
                          </div>

                          <div style={{
                            marginTop: '10px',
                            padding: '8px',
                            backgroundColor: 'var(--slate-50)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.75rem',
                            color: 'var(--slate-600)',
                            textAlign: 'right'
                          }}>
                            <div>${baseTotal} base ({nights}n)</div>
                            <div>+ ${taxesTotal} ({Math.round(room.taxes_and_fees * 100)}% taxes)</div>
                            <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.875rem', marginTop: '4px' }}>
                              ${totalWithTaxes} All-In Total
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectRoom(room)}
                          disabled={!isAvailable}
                          className="btn btn-primary"
                          style={{ width: '100%', marginTop: '16px' }}
                        >
                          <span>{isAvailable ? 'Select & Reserve' : 'Sold Out'}</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar: Stay Dates & Property Summary */}
          <div style={{ position: 'sticky', top: 'calc(var(--nav-height) + 20px)' }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-md)'
            }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '16px', color: 'var(--slate-900)' }}>
                Your Stay Details
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="form-label">Check-in Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkIn}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Check-out Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>

                <GuestRoomSelector
                  rooms={roomsCount}
                  adults={adults}
                  children={children}
                  childrenAges={childrenAges}
                  compact={true}
                  onChange={(val) => {
                    setRoomsCount(val.rooms);
                    setAdults(val.adults);
                    setChildren(val.children);
                    setChildrenAges(val.childrenAges);
                  }}
                />
              </div>

              <div style={{
                backgroundColor: 'var(--slate-50)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                color: 'var(--slate-600)',
                marginBottom: '16px'
              }}>
                <div style={{ fontWeight: 700, color: 'var(--slate-800)', marginBottom: '4px' }}>
                  Property Policies
                </div>
                <div>• Check-in: 3:00 PM | Check-out: 11:00 AM</div>
                <div>• {hotel.cancellation_policy}</div>
                <div>• Government photo ID required at front desk</div>
              </div>

              <a
                href="#rooms-section"
                className="btn btn-primary"
                style={{ width: '100%', textAlign: 'center' }}
              >
                Choose from {rooms.length} Room Types
              </a>

              <a
                href="#availability-calendar-section"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  color: 'var(--primary)',
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: '12px'
                }}
              >
                <Calendar size={14} />
                <span>View Live Availability Calendar</span>
              </a>
            </div>
          </div>
        </div>

        {/* Nearby Places to Explore around this hotel */}
        {hotel && (
          <div style={{ marginTop: '56px' }}>
            <NearbyPlacesSection
              lat={hotel.latitude}
              lng={hotel.longitude}
              locationName={`${hotel.name} (${hotel.city})`}
            />
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 900px) {
          .photo-gallery-grid {
            grid-template-columns: 1fr !important;
            height: 300px !important;
          }
          .hotel-content-grid {
            grid-template-columns: 1fr !important;
          }
          .room-card-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
