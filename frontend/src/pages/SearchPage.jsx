import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import HotelCard from '../components/HotelCard';
import MapView from '../components/MapView';
import NearbyPlacesSection from '../components/NearbyPlacesSection';
import { api } from '../api/api';
import { List, Map, Columns, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Search parameters from URL
  const city = searchParams.get('city') || '';
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
  const locationLabel = searchParams.get('locationLabel') || '';
  const checkIn = searchParams.get('check_in') || '';
  const checkOut = searchParams.get('check_out') || '';
  const adults = parseInt(searchParams.get('adults') || searchParams.get('guests') || '2', 10);
  const children = parseInt(searchParams.get('children') || '0', 10);
  const guests = adults + children;
  const childrenAges = searchParams.get('children_ages') ? searchParams.get('children_ages').split(',').map(Number) : [];
  const rooms = parseInt(searchParams.get('rooms') || '1', 10);
  const sortBy = searchParams.get('sort_by') || (lat && lng ? 'distance_asc' : 'popularity');

  // Filters state
  const [filters, setFilters] = useState({
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    min_star: searchParams.get('min_star') ? Number(searchParams.get('min_star')) : undefined,
    min_rating: searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined,
    free_cancellation: searchParams.get('free_cancellation') === 'true' ? true : undefined,
    breakfast_included: searchParams.get('breakfast_included') === 'true' ? true : undefined,
    amenities: searchParams.get('amenities') || '',
  });

  // Layout View Mode: 'split', 'list', 'map'
  const [viewMode, setViewMode] = useState('split');
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load hotels when parameters change
  useEffect(() => {
    async function fetchHotels() {
      setLoading(true);
      setError(null);
      try {
        const query = {
          city,
          lat,
          lng,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          sort_by: sortBy,
          ...filters
        };
        const results = await api.searchHotels(query);
        setHotels(results);
      } catch (err) {
        console.error("Failed to load hotels:", err);
        setError("Unable to search hotels at this time. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchHotels();
  }, [city, lat, lng, checkIn, checkOut, guests, rooms, sortBy, filters]);

  // Handle SearchBar trigger
  const handleSearch = (newParams) => {
    const updated = new URLSearchParams();
    if (newParams.city) updated.set('city', newParams.city);
    if (newParams.lat && newParams.lng) {
      updated.set('lat', newParams.lat);
      updated.set('lng', newParams.lng);
      updated.set('sort_by', 'distance_asc');
    }
    if (newParams.locationLabel) updated.set('locationLabel', newParams.locationLabel);
    if (newParams.checkIn) updated.set('check_in', newParams.checkIn);
    if (newParams.checkOut) updated.set('check_out', newParams.checkOut);
    if (newParams.guests) updated.set('guests', newParams.guests);
    if (newParams.adults) updated.set('adults', newParams.adults);
    if (newParams.children !== undefined) updated.set('children', newParams.children);
    if (newParams.childrenAges && newParams.childrenAges.length > 0) {
      updated.set('children_ages', newParams.childrenAges.join(','));
    }
    if (newParams.rooms) updated.set('rooms', newParams.rooms);

    setSearchParams(updated);
  };

  const handleSortChange = (newSort) => {
    const updated = new URLSearchParams(searchParams);
    updated.set('sort_by', newSort);
    setSearchParams(updated);
  };

  const handleResetFilters = () => {
    setFilters({
      max_price: undefined,
      min_star: undefined,
      min_rating: undefined,
      free_cancellation: undefined,
      breakfast_included: undefined,
      amenities: ''
    });
  };

  const userLocation = (lat && lng) ? { lat, lng } : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - var(--nav-height))' }}>
      {/* Top Search Filter Header */}
      <div style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--slate-200)',
        padding: '16px 0',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div className="container">
          <SearchBar
            initialValues={{ city, checkIn, checkOut, guests, adults, children, childrenAges, rooms, locationLabel }}
            onSearch={handleSearch}
            compact={true}
          />
        </div>
      </div>

      {/* Main Results Container */}
      <div className="container" style={{ paddingTop: '24px', paddingBottom: '60px', flex: 1 }}>
        {/* Header Bar: Results count, active location, view toggles */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              {city
                ? `Hotel Rooms in ${city}`
                : locationLabel
                ? `Hotel Rooms near ${locationLabel}`
                : 'Available Hotel Rooms'}
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--slate-500)', marginTop: '2px' }}>
              {loading ? 'Finding honest inventory...' : `Showing ${hotels.length} verified stays • Transparent upfront pricing`}
            </p>
          </div>

          {/* View Mode Buttons */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--slate-100)',
            padding: '4px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--slate-200)'
          }}>
            <button
              onClick={() => setViewMode('split')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'split' ? '#ffffff' : 'transparent',
                color: viewMode === 'split' ? 'var(--primary)' : 'var(--slate-600)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'split' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Split map and list view"
            >
              <Columns size={16} />
              <span className="view-text">Split</span>
            </button>

            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'list' ? '#ffffff' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary)' : 'var(--slate-600)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none'
              }}
              title="List view only"
            >
              <List size={16} />
              <span className="view-text">List</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: viewMode === 'map' ? '#ffffff' : 'transparent',
                color: viewMode === 'map' ? 'var(--primary)' : 'var(--slate-600)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none'
              }}
              title="Full map view"
            >
              <Map size={16} />
              <span className="view-text">Map</span>
            </button>
          </div>
        </div>

        {/* Search Layout Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: '24px',
          alignItems: 'start'
        }}
        className="search-layout-grid"
        >
          {/* Left Column: Filter Sidebar */}
          <FilterBar
            filters={filters}
            onChange={setFilters}
            onReset={handleResetFilters}
            sortBy={sortBy}
            onSortChange={handleSortChange}
            totalCount={hotels.length}
          />

          {/* Right Column: Hotel Results / Map */}
          <div>
            {loading ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 20px',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)',
                gap: '12px'
              }}>
                <Loader2 size={36} className="animate-spin" color="var(--primary)" />
                <div style={{ fontWeight: 600, color: 'var(--slate-700)' }}>
                  Loading real-time room availability...
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--slate-400)' }}>
                  Calculating upfront pricing with zero hidden fees
                </div>
              </div>
            ) : error ? (
              <div style={{
                padding: '24px',
                backgroundColor: '#fef2f2',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#991b1b'
              }}>
                <AlertCircle size={24} />
                <div>{error}</div>
              </div>
            ) : hotels.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                backgroundColor: '#ffffff',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🏨</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-900)', marginBottom: '8px' }}>
                  No available hotel rooms match your filters
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', maxWidth: '440px', margin: '0 auto 20px auto' }}>
                  Try widening your price range, relaxing specific amenities, or searching for a larger neighboring city.
                </p>
                <button onClick={handleResetFilters} className="btn btn-primary btn-sm">
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div>
                {/* Mode: Split (List on Left, Map on Right) */}
                {viewMode === 'split' && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.1fr 1fr',
                    gap: '20px',
                    alignItems: 'start'
                  }}
                  className="split-results-grid"
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {hotels.map((hotel) => (
                        <HotelCard
                          key={hotel.id}
                          hotel={hotel}
                          checkIn={checkIn}
                          checkOut={checkOut}
                          guests={guests}
                          adults={adults}
                          children={children}
                          childrenAges={childrenAges}
                          rooms={rooms}
                        />
                      ))}
                    </div>

                    <div style={{ position: 'sticky', top: 'calc(var(--nav-height) + 20px)', height: '700px' }}>
                      <MapView
                        hotels={hotels}
                        userLocation={userLocation}
                        checkIn={checkIn}
                        checkOut={checkOut}
                        guests={guests}
                      />
                    </div>
                  </div>
                )}

                {/* Mode: List View Only */}
                {viewMode === 'list' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {hotels.map((hotel) => (
                      <HotelCard
                        key={hotel.id}
                        hotel={hotel}
                        checkIn={checkIn}
                        checkOut={checkOut}
                        guests={guests}
                        adults={adults}
                        children={children}
                        childrenAges={childrenAges}
                        rooms={rooms}
                      />
                    ))}
                  </div>
                )}

                {/* Mode: Map View Only */}
                {viewMode === 'map' && (
                  <div style={{ height: '750px' }}>
                    <MapView
                      hotels={hotels}
                      userLocation={userLocation}
                      checkIn={checkIn}
                      checkOut={checkOut}
                      guests={guests}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Nearby Tourist Spots / Temples Section */}
        <NearbyPlacesSection
          lat={lat || (hotels.length > 0 ? hotels[0].latitude : null)}
          lng={lng || (hotels.length > 0 ? hotels[0].longitude : null)}
          city={city}
          locationName={city || locationLabel || (hotels.length > 0 ? hotels[0].city : 'your location')}
          onLocationUpdate={(loc) => {
            handleSearch({
              city: loc.city,
              lat: loc.lat,
              lng: loc.lng,
              locationLabel: loc.city,
              checkIn,
              checkOut,
              guests,
              adults,
              children,
              childrenAges,
              rooms
            });
          }}
        />
      </div>

      <style>{`
        @media (max-width: 992px) {
          .search-layout-grid {
            grid-template-columns: 1fr !important;
          }
          .split-results-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
