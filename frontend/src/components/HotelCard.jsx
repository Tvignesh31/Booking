import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Star, Sparkles, Heart, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight, Bed } from 'lucide-react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function HotelCard({
  hotel,
  checkIn,
  checkOut,
  guests,
  adults,
  children,
  childrenAges,
  rooms = 1
}) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(hotel.is_favorite || false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = hotel.images && hotel.images.length > 0
    ? hotel.images
    : [hotel.featured_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'];

  const handleFavoriteClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Please sign in to save hotels to your favorites.");
      return;
    }
    try {
      const res = await api.toggleFavorite(hotel.id);
      setIsFavorite(res.is_favorite);
    } catch (err) {
      console.error("Favorite toggle failed:", err);
    }
  };

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Calculate nights
  let nights = 1;
  if (checkIn && checkOut) {
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    nights = Math.max(1, Math.round(diff));
  }

  const roomMultiplier = rooms || 1;
  const basePrice = hotel.starting_price || 150;
  const subtotal = basePrice * nights * roomMultiplier;
  const estimatedTaxes = Math.round(subtotal * 0.12);
  const totalUpfront = Math.round(subtotal + estimatedTaxes);

  const query = new URLSearchParams();
  if (checkIn) query.set('check_in', checkIn);
  if (checkOut) query.set('check_out', checkOut);
  if (guests) query.set('guests', guests);
  if (adults) query.set('adults', adults);
  if (children !== undefined && children !== null) query.set('children', children);
  if (rooms) query.set('rooms', rooms);
  if (childrenAges && childrenAges.length > 0) query.set('children_ages', Array.isArray(childrenAges) ? childrenAges.join(',') : childrenAges);

  const detailUrl = `/hotel/${hotel.id}?${query.toString()}`;

  return (
    <div className="card" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(260px, 320px) 1fr',
      minHeight: '240px',
      position: 'relative'
    }}>
      {/* Image Column */}
      <div style={{ position: 'relative', overflow: 'hidden', height: '100%', minHeight: '220px' }}>
        <img
          src={images[currentImageIndex]}
          alt={hotel.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'transform 0.3s ease'
          }}
        />

        {/* Eco Badge */}
        {hotel.eco_certified && (
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(4px)',
            borderRadius: 'var(--radius-full)',
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--accent-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Sparkles size={14} color="var(--accent)" />
            <span>Eco-Certified</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-md)',
            transition: 'transform 0.15s ease'
          }}
          title={isFavorite ? "Remove from saved" : "Save hotel"}
        >
          <Heart size={18} color={isFavorite ? "#ef4444" : "var(--slate-600)"} fill={isFavorite ? "#ef4444" : "none"} />
        </button>

        {/* Image Carousel Controls */}
        {images.length > 1 && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            display: 'flex',
            gap: '4px'
          }}>
            <button
              onClick={prevImage}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextImage}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'rgba(15, 23, 42, 0.65)',
                color: '#fff',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Details Column */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          {/* Top meta row: Star Rating + Guest Rating */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', color: '#f59e0b' }}>
                {[...Array(Math.floor(hotel.star_rating || 4))].map((_, i) => (
                  <Star key={i} size={14} fill="#f59e0b" />
                ))}
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--slate-500)', marginLeft: '4px' }}>
                {hotel.star_rating} Star Hotel
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--slate-700)' }}>
                {hotel.guest_rating >= 4.8 ? 'Exceptional' : hotel.guest_rating >= 4.5 ? 'Superb' : 'Very Good'}
              </span>
              <div className="badge-rating">{hotel.guest_rating?.toFixed(1) || '4.8'}</div>
            </div>
          </div>

          {/* Hotel Name */}
          <Link to={detailUrl}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: 700,
              color: 'var(--slate-900)',
              marginBottom: '6px',
              transition: 'color 0.15s'
            }}>
              {hotel.name}
            </h3>
          </Link>

          {/* Location & Distance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--slate-600)', marginBottom: '12px' }}>
            <MapPin size={14} color="var(--primary)" />
            <span>{hotel.address}, {hotel.city}</span>
            {hotel.distance_km !== null && hotel.distance_km !== undefined && (
              <span style={{
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem'
              }}>
                {hotel.distance_km < 1 ? `${Math.round(hotel.distance_km * 1000)}m away` : `${hotel.distance_km.toFixed(1)} km away`}
              </span>
            )}
          </div>

          {/* Description snippet */}
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--slate-600)',
            lineHeight: 1.4,
            marginBottom: '14px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {hotel.description}
          </p>

          {/* Amenities Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
            {(hotel.amenities || []).slice(0, 4).map((amenity, i) => (
              <span key={i} style={{
                backgroundColor: 'var(--slate-100)',
                color: 'var(--slate-700)',
                fontSize: '0.75rem',
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)'
              }}>
                {amenity}
              </span>
            ))}
            {(hotel.amenities || []).length > 4 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--slate-400)', alignSelf: 'center' }}>
                +{hotel.amenities.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Bottom Pricing & CTA Area: Responsible Transparent Pricing */}
        <div style={{
          borderTop: '1px solid var(--slate-100)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)', fontSize: '0.8125rem', fontWeight: 600 }}>
              <ShieldCheck size={16} />
              <span>{hotel.cancellation_policy || 'Free cancellation up to 48h before check-in'}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              Includes all taxes & mandatory fees • No resort fees at checkout
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>
              From <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--slate-900)' }}>${basePrice}</span> / night
            </div>
            {nights > 1 && (
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary)' }}>
                ${totalUpfront} total ({nights} nights incl. taxes)
              </div>
            )}
            <Link to={detailUrl} className="btn btn-primary btn-sm" style={{ marginTop: '8px' }}>
              <span>View Available Rooms</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .card {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
