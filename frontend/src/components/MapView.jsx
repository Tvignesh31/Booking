import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, ArrowRight } from 'lucide-react';

// Custom Map Controller to update bounds/center when hotels or user location changes
function MapController({ hotels, center }) {
  const map = useMap();

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 12);
    } else if (hotels && hotels.length > 0) {
      const bounds = L.latLngBounds(hotels.map(h => [h.latitude, h.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [hotels, center, map]);

  return null;
}

// Function to create sleek price tag markers
function createPriceIcon(price, isSelected) {
  return L.divIcon({
    className: 'custom-hotel-marker',
    html: `
      <div style="
        background-color: ${isSelected ? '#0f766e' : '#ffffff'};
        color: ${isSelected ? '#ffffff' : '#0f172a'};
        border: 2px solid ${isSelected ? '#059669' : '#0f766e'};
        padding: 4px 8px;
        border-radius: 9999px;
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-size: 12px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.18);
        display: flex;
        align-items: center;
        gap: 2px;
        white-space: nowrap;
        cursor: pointer;
        transition: transform 0.15s ease;
      ">
        <span>$${price}</span>
      </div>
    `,
    iconSize: [50, 26],
    iconAnchor: [25, 13],
  });
}

// User location icon
function createUserLocationIcon() {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background-color: #2563eb;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 0 6px rgba(37, 99, 235, 0.25);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

export default function MapView({ hotels = [], userLocation, checkIn, checkOut, guests }) {
  // Default center if no hotels: New York (40.7128, -74.0060)
  const defaultCenter = userLocation
    ? [userLocation.lat, userLocation.lng]
    : hotels.length > 0
    ? [hotels[0].latitude, hotels[0].longitude]
    : [40.7128, -74.0060];

  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: '550px',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-md)',
      position: 'relative'
    }}>
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController hotels={hotels} center={userLocation ? [userLocation.lat, userLocation.lng] : null} />

        {/* Free OpenStreetMap tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User GPS location marker */}
        {userLocation && userLocation.lat && userLocation.lng && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={createUserLocationIcon()}
          >
            <Popup>
              <div style={{ padding: '4px', fontWeight: 600, fontSize: '0.8125rem' }}>
                📍 You are here (Approximate Search Origin)
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hotel Markers */}
        {hotels.map((hotel) => {
          const detailUrl = `/hotel/${hotel.id}?check_in=${checkIn || ''}&check_out=${checkOut || ''}&guests=${guests || 2}`;
          const startingPrice = hotel.starting_price || 150;

          return (
            <Marker
              key={hotel.id}
              position={[hotel.latitude, hotel.longitude]}
              icon={createPriceIcon(startingPrice, false)}
            >
              <Popup>
                <div style={{ width: '220px', fontFamily: 'var(--font-body)' }}>
                  <img
                    src={hotel.featured_image || (hotel.images && hotel.images[0])}
                    alt={hotel.name}
                    style={{
                      width: '100%',
                      height: '110px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '8px'
                    }}
                  />
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)', marginBottom: '4px' }}>
                    {hotel.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Star size={12} fill="#f59e0b" />
                      <span>{hotel.guest_rating} ({hotel.reviews_count})</span>
                    </div>
                    <div style={{ fontWeight: 800, color: 'var(--slate-900)', fontSize: '0.9375rem' }}>
                      ${startingPrice}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--slate-500)' }}>/night</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '8px' }}>
                    ✓ All mandatory taxes included
                  </div>
                  <Link
                    to={detailUrl}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', padding: '6px', fontSize: '0.75rem' }}
                  >
                    <span>View Rooms</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
