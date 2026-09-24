import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { MapPin, Compass, ExternalLink, Sparkles, Landmark, Church, TreePine, Palette, Loader2, Camera, Eye, X } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: 'All Attractions', icon: Compass },
  { key: 'temples', label: 'Temples & Holy Shrines', icon: Church },
  { key: 'monuments', label: 'Monuments & Heritage', icon: Landmark },
  { key: 'nature', label: 'Nature & Parks', icon: TreePine },
  { key: 'museums', label: 'Museums & Culture', icon: Palette },
];

export default function NearbyPlacesSection({ lat, lng, city, locationName, onLocationUpdate }) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [previewPlace, setPreviewPlace] = useState(null);

  // If coordinates are provided use them; otherwise fallback to city or default center
  const queryLat = lat || null;
  const queryLng = lng || null;

  useEffect(() => {
    async function loadPlaces() {
      setLoading(true);
      try {
        const res = await api.getNearbyPlaces(queryLat, queryLng, activeCategory, 40, city);
        setPlaces(res.places || []);
      } catch (err) {
        console.error("Failed to load nearby places:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPlaces();
  }, [queryLat, queryLng, city, activeCategory]);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const geo = await api.reverseGeocode(latitude, longitude);
          const detectedCity = geo?.city || 'Your Current Location';
          if (onLocationUpdate) {
            onLocationUpdate({ lat: latitude, lng: longitude, city: detectedCity });
          }
        } catch (e) {
          if (onLocationUpdate) {
            onLocationUpdate({ lat: latitude, lng: longitude, city: 'Nearby You' });
          }
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        console.warn("Location permission not granted:", err.message);
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const openGoogleImages = (place) => {
    const url = place.google_images_url || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + ' photos')}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <section style={{
      marginTop: '32px',
      paddingTop: '28px',
      borderTop: '2px solid var(--slate-200)',
    }}>
      {/* Section Header with Location Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            <Compass size={16} />
            <span>LOCAL SURROUNDINGS & TOURIST SPOTS</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--slate-900)' }}>
            Nearby Places & Temples to Explore
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', marginTop: '2px' }}>
            Explore revered temples, historic architecture, and scenic spots near <strong>{locationName || 'your area'}</strong>. Click any photo to access direct Google Images & visitor galleries.
          </p>
        </div>

        {/* Location Access & Status Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '6px 14px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8125rem',
            fontWeight: 600
          }}>
            <MapPin size={14} color="#059669" />
            <span>Near: <strong>{locationName || 'Active Area'}</strong></span>
          </div>

          <button
            onClick={handleDetectLocation}
            disabled={locating}
            className="btn btn-outline-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {locating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Compass size={14} />
                <span>Use My Location</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '24px'
      }}>
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--slate-200)',
                backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                color: isSelected ? '#ffffff' : 'var(--slate-700)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 8px var(--primary-glow)' : 'none'
              }}
            >
              <Icon size={15} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Places Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <Loader2 size={32} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 8px auto' }} />
          <div style={{ color: 'var(--slate-600)', fontSize: '0.875rem' }}>Discovering nearby temples and heritage sights...</div>
        </div>
      ) : places.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--slate-500)' }}>No places found for this category within 40 km.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}>
          {places.map((place, idx) => (
            <div
              key={idx}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {/* Image Container with Google Images Access */}
              <div 
                style={{ 
                  position: 'relative', 
                  height: '190px', 
                  overflow: 'hidden', 
                  backgroundColor: 'var(--slate-100)',
                  cursor: 'pointer'
                }}
                onClick={() => openGoogleImages(place)}
                title={`Click to access authentic Google Images & photos of ${place.name}`}
              >
                <img
                  src={place.image || `https://images.unsplash.com/photo-1543731068-7e0f5beff43a?auto=format&fit=crop&w=600&q=80`}
                  alt={place.name}
                  loading="lazy"
                  onError={(e) => {
                    // Fallback to verified temple photo
                    e.currentTarget.src = "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Kumbeswarar_temple_01.jpg/1280px-Kumbeswarar_temple_01.jpg";
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />

                {/* Category Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(6px)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--slate-800)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  zIndex: 2
                }}>
                  {place.category_label || place.category}
                </div>

                {/* Google Photos Access Badge */}
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(15, 23, 42, 0.82)',
                  backdropFilter: 'blur(6px)',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  zIndex: 2,
                  transition: 'background-color 0.2s ease'
                }}>
                  <Camera size={12} color="#60a5fa" />
                  <span>Google Photos ↗</span>
                </div>

                {/* Distance Badge */}
                {place.distance_km !== undefined && (
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '12px',
                    backgroundColor: 'rgba(15, 118, 110, 0.92)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    zIndex: 2
                  }}>
                    {place.distance_km < 1 ? `${Math.round(place.distance_km * 1000)}m away` : `${place.distance_km.toFixed(1)} km away`}
                  </div>
                )}

                {/* Hover overlay hint */}
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
                  padding: '24px 12px 8px 12px',
                  color: '#ffffff',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: 0.92
                }}>
                  <ExternalLink size={12} />
                  <span>Click to view photos on Google</span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '6px', lineHeight: 1.3 }}>
                    {place.name}
                  </h3>
                  <p style={{
                    fontSize: '0.8125rem',
                    color: 'var(--slate-600)',
                    lineHeight: 1.45,
                    marginBottom: '16px',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {place.description}
                  </p>
                </div>

                {/* Action Links */}
                <div style={{
                  borderTop: '1px solid var(--slate-100)',
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {/* Google Images Direct Access Link */}
                  <a
                    href={place.google_images_url || `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(place.name + ' photos')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#1d4ed8',
                      backgroundColor: '#eff6ff',
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      border: '1px solid #bfdbfe',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#dbeafe';
                      e.currentTarget.style.borderColor = '#93c5fd';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#bfdbfe';
                    }}
                    title="Access authentic images, tourist photos, and visitor galleries on Google"
                  >
                    <Camera size={13} color="#2563eb" />
                    <span>Google Photos</span>
                    <ExternalLink size={12} />
                  </a>

                  {/* Quick Preview & Map View */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPreviewPlace(place)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--slate-600)',
                        backgroundColor: '#f8fafc',
                        border: '1px solid var(--slate-200)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '5px 8px',
                        cursor: 'pointer'
                      }}
                      title="Preview photo details"
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>

                    <a
                      href={place.google_maps_url || place.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: 'var(--slate-600)',
                        textDecoration: 'none'
                      }}
                      title="View location and directions on Map"
                    >
                      <MapPin size={13} color="var(--primary)" />
                      <span>Map</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Preview Modal */}
      {previewPlace && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setPreviewPlace(null)}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 'var(--radius-xl)',
              maxWidth: '560px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image */}
            <div style={{ position: 'relative', height: '280px', backgroundColor: 'var(--slate-900)' }}>
              <img 
                src={previewPlace.image} 
                alt={previewPlace.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                type="button"
                onClick={() => setPreviewPlace(null)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                  {previewPlace.name}
                </h3>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-full)'
                }}>
                  {previewPlace.category_label || previewPlace.category}
                </span>
              </div>

              <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5, marginBottom: '20px' }}>
                {previewPlace.description}
              </p>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => openGoogleImages(previewPlace)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={16} />
                  <span>Access Google Images Gallery ↗</span>
                </button>

                <a
                  href={previewPlace.google_maps_url || previewPlace.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 16px',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--slate-700)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    textDecoration: 'none',
                    border: '1px solid var(--slate-200)'
                  }}
                >
                  <MapPin size={16} color="var(--primary)" />
                  <span>Open Map</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
