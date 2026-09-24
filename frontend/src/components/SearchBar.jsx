import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Navigation, Loader2 } from 'lucide-react';
import { api } from '../api/api';
import GuestRoomSelector from './GuestRoomSelector';

export default function SearchBar({ initialValues = {}, onSearch, compact = false }) {
  const navigate = useNavigate();
  const [city, setCity] = useState(initialValues.city || '');
  const [checkIn, setCheckIn] = useState(initialValues.checkIn || getDefaultCheckIn());
  const [checkOut, setCheckOut] = useState(initialValues.checkOut || getDefaultCheckOut());

  // Room & Guest state with children ages
  const [rooms, setRooms] = useState(initialValues.rooms || 1);
  const [adults, setAdults] = useState(initialValues.adults || (initialValues.guests ? Math.min(initialValues.guests, 2) : 2));
  const [children, setChildren] = useState(initialValues.children || 0);
  const [childrenAges, setChildrenAges] = useState(initialValues.childrenAges || []);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationLabel, setLocationLabel] = useState(initialValues.locationLabel || '');

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

  // Handle "Use My Location"
  const handleUseCurrentLocation = () => {
    setLocationError('');
    setLocating(true);

    if (!navigator.geolocation) {
      fallbackToIp("Geolocation not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode via OSM Nominatim
          const geo = await api.reverseGeocode(latitude, longitude);
          const detectedCity = geo?.city || 'Near You';
          setCity('');
          setLocationLabel(`${detectedCity} (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`);
          setLocating(false);

          const searchPayload = {
            lat: latitude,
            lng: longitude,
            locationLabel: detectedCity,
            checkIn,
            checkOut,
            guests: adults + children,
            adults,
            children,
            childrenAges,
            rooms
          };

          if (onSearch) {
            onSearch(searchPayload);
          } else {
            navigate(`/search?lat=${latitude}&lng=${longitude}&locationLabel=${encodeURIComponent(detectedCity)}&check_in=${checkIn}&check_out=${checkOut}&guests=${adults + children}&adults=${adults}&children=${children}&rooms=${rooms}&sort_by=distance_asc`);
          }
        } catch (err) {
          fallbackToIp("Reverse geocode timed out, using fallback");
        }
      },
      (err) => {
        console.warn("GPS permission not granted, using IP fallback:", err.message);
        fallbackToIp("Location permission not granted. Used approximate area.");
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const fallbackToIp = async (reason) => {
    try {
      const ipLoc = await api.getIpFallback();
      if (ipLoc?.city) {
        setCity(ipLoc.city);
        setLocationLabel(`${ipLoc.city} (Approximate area)`);
        setLocationError(reason);
      }
    } catch (e) {
      setLocationError("Could not detect location. Please type your city.");
    } finally {
      setLocating(false);
    }
  };

  const handleGuestRoomChange = ({ rooms: r, adults: a, children: c, childrenAges: ca }) => {
    setRooms(r);
    setAdults(a);
    setChildren(c);
    setChildrenAges(ca);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalGuests = adults + children;
    const searchData = {
      city,
      checkIn,
      checkOut,
      guests: totalGuests,
      adults,
      children,
      childrenAges,
      rooms,
      locationLabel: city
    };

    if (onSearch) {
      onSearch(searchData);
    } else {
      const params = new URLSearchParams();
      if (city) params.append('city', city);
      if (checkIn) params.append('check_in', checkIn);
      if (checkOut) params.append('check_out', checkOut);
      params.append('guests', totalGuests);
      params.append('adults', adults);
      params.append('children', children);
      params.append('rooms', rooms);
      if (childrenAges.length > 0) {
        params.append('children_ages', childrenAges.join(','));
      }
      navigate(`/search?${params.toString()}`);
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: compact ? 'var(--radius-lg)' : 'var(--radius-xl)',
      padding: compact ? '16px' : '24px',
      boxShadow: compact ? 'var(--shadow-md)' : 'var(--shadow-xl)',
      border: '1px solid var(--border-color)',
      width: '100%',
      position: 'relative'
    }}>
      <form onSubmit={handleSubmit} style={{
        display: 'grid',
        gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(180px, 1fr))' : 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '14px',
        alignItems: 'end'
      }}>
        {/* Destination / City Input */}
        <div className="form-group" style={{ position: 'relative' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Destination</span>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              title="Locate nearby hotels using GPS or IP fallback"
            >
              {locating ? <Loader2 size={12} className="animate-spin" /> : <Navigation size={12} />}
              <span>{locating ? 'Detecting...' : 'Use My Location'}</span>
            </button>
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder={locationLabel ? locationLabel : "e.g. Kumbakonam, New York, London"}
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                if (locationLabel) setLocationLabel('');
              }}
            />
          </div>
        </div>

        {/* Check-in Date */}
        <div className="form-group">
          <label className="form-label">Check-in</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={checkIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                setCheckIn(e.target.value);
                if (e.target.value >= checkOut) {
                  const nextDay = new Date(e.target.value);
                  nextDay.setDate(nextDay.getDate() + 1);
                  setCheckOut(nextDay.toISOString().split('T')[0]);
                }
              }}
              required
            />
          </div>
        </div>

        {/* Check-out Date */}
        <div className="form-group">
          <label className="form-label">Check-out</label>
          <div style={{ position: 'relative' }}>
            <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
            <input
              type="date"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              value={checkOut}
              min={checkIn}
              onChange={(e) => setCheckOut(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Rooms & Guests Stepper Selector */}
        <GuestRoomSelector
          rooms={rooms}
          adults={adults}
          children={children}
          childrenAges={childrenAges}
          onChange={handleGuestRoomChange}
          compact={compact}
        />

        {/* Search Submit Button */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: '42px', fontSize: '1rem' }}
          >
            <Search size={18} />
            <span>Search Rooms</span>
          </button>
        </div>
      </form>

      {/* Location feedback note */}
      {locationError && (
        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>ℹ️ {locationError}</span>
        </div>
      )}
    </div>
  );
}
