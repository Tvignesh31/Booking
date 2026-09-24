import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import NearbyPlacesSection from '../components/NearbyPlacesSection';
import { api } from '../api/api';
import { Sparkles, ShieldCheck, DollarSign, EyeOff, MapPin, Star, ArrowRight, CheckCircle2, Trees } from 'lucide-react';

const FEATURED_CITIES = [
  { name: 'New York', country: 'United States', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=600&q=80' },
  { name: 'London', country: 'United Kingdom', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80' },
  { name: 'Paris', country: 'France', image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80' },
  { name: 'Tokyo', country: 'Japan', image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80' },
  { name: 'Singapore', country: 'Singapore', image: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=600&q=80' },
  { name: 'Mumbai', country: 'India', image: 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=600&q=80' },
];

export default function HomePage({ onOpenPrivacyModal }) {
  const [featuredHotels, setFeaturedHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadHotels() {
      try {
        const res = await api.searchHotels();
        setFeaturedHotels(res.slice(0, 3));
      } catch (e) {
        console.error("Failed to load featured hotels:", e);
      } finally {
        setLoading(false);
      }
    }
    loadHotels();

    // Check if location permission is already available or use fallback
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          try {
            const geo = await api.reverseGeocode(latitude, longitude);
            setUserCoords({ lat: latitude, lng: longitude, city: geo?.city || 'Your Area' });
          } catch (err) {
            setUserCoords({ lat: latitude, lng: longitude, city: 'Nearby' });
          }
        },
        () => {
          // Fallback
          setUserCoords({ lat: 10.990356, lng: 79.439087, city: 'Kumbakonam & Thiruvidaimaruthur' });
        },
        { timeout: 5000 }
      );
    } else {
      setUserCoords({ lat: 10.990356, lng: 79.439087, city: 'Kumbakonam' });
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '64px', paddingBottom: '80px' }}>
      {/* Hero Section */}
      <section style={{
        position: 'relative',
        background: 'radial-gradient(circle at 50% 0%, #ccfbf1 0%, #f8fafc 70%)',
        paddingTop: '64px',
        paddingBottom: '80px',
        borderBottom: '1px solid var(--slate-200)'
      }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 40px auto' }}>
            {/* Responsible Design Badge */}
            <div
              onClick={onOpenPrivacyModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--trust-green-bg)',
                border: '1px solid var(--trust-green-border)',
                padding: '6px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                color: 'var(--accent-dark)',
                fontWeight: 700,
                marginBottom: '20px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.1)'
              }}
            >
              <ShieldCheck size={16} color="var(--accent)" />
              <span>Responsible By Design • 100% Upfront Pricing • No Dark Patterns</span>
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: 'var(--slate-900)',
              letterSpacing: '-1px',
              lineHeight: 1.15,
              marginBottom: '20px'
            }}>
              Find peaceful hotel rooms with <span style={{ color: 'var(--primary)', textDecoration: 'underline', textDecorationColor: 'var(--accent)' }}>honest pricing</span>
            </h1>

            <p style={{
              fontSize: 'clamp(1rem, 2vw, 1.2rem)',
              color: 'var(--slate-600)',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto'
            }}>
              Discover vetted hotels with zero fake urgency, no surprise resort fees at check-in, and opt-in GPS privacy. Just authentic comfort.
            </p>
          </div>

          {/* Search Box */}
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <SearchBar />
          </div>

          {/* Trust Guarantees Bar */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '28px',
            marginTop: '36px',
            fontSize: '0.875rem',
            color: 'var(--slate-600)',
            fontWeight: 600
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--accent)" />
              <span>All mandatory taxes included upfront</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--accent)" />
              <span>Real database room inventory only</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--accent)" />
              <span>Easy 1-click self-service cancellation</span>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Tourist Spots & Local Surroundings (Directly below Location Access) */}
      <section className="container">
        <NearbyPlacesSection
          lat={userCoords?.lat || (featuredHotels.length > 0 ? featuredHotels[0].latitude : 10.990356)}
          lng={userCoords?.lng || (featuredHotels.length > 0 ? featuredHotels[0].longitude : 79.439087)}
          locationName={userCoords?.city || (featuredHotels.length > 0 ? featuredHotels[0].city : 'Your Area')}
          onLocationUpdate={(newCoords) => setUserCoords(newCoords)}
        />
      </section>

      {/* Featured Cities Grid */}
      <section className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px' }}>
          <div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--primary)', marginBottom: '4px' }}>
              Destinations
            </div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Explore Stays Around the World
            </h2>
          </div>
          <Link to="/search" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 700, fontSize: '0.9375rem' }}>
            <span>View All Destinations</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px'
        }}>
          {FEATURED_CITIES.map((c) => (
            <div
              key={c.name}
              onClick={() => navigate(`/search?city=${encodeURIComponent(c.name)}`)}
              style={{
                position: 'relative',
                height: '220px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xl)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
            >
              <img
                src={c.image}
                alt={c.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.1) 60%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '16px',
                color: '#ffffff'
              }}>
                <h3 style={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 700 }}>{c.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--slate-300)' }}>{c.country}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Eco & Responsible Stays */}
      <section className="container">
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8125rem', marginBottom: '4px' }}>
                <Trees size={16} />
                <span>SUSTAINABILITY & TRANQUILITY</span>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                Featured Eco-Certified Retreats
              </h2>
            </div>
            <Link to="/search?amenities=Eco%20Certified" className="btn btn-outline-primary btn-sm">
              <span>View All Eco Stays</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {featuredHotels.map((h) => (
              <div key={h.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '200px' }}>
                  <img
                    src={h.featured_image || (h.images && h.images[0])}
                    alt={h.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {h.eco_certified && (
                    <div className="badge badge-eco" style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <Sparkles size={12} />
                      <span>Eco-Certified</span>
                    </div>
                  )}
                  <div className="badge-rating" style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                    ★ {h.guest_rating?.toFixed(1)}
                  </div>
                </div>

                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '6px' }}>{h.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--slate-500)', marginBottom: '10px' }}>
                      <MapPin size={14} color="var(--primary)" />
                      <span>{h.city}, {h.country}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.4, marginBottom: '16px' }}>
                      {h.description.slice(0, 110)}...
                    </p>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--slate-100)',
                    paddingTop: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Upfront Rate</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--slate-900)' }}>
                        ${h.starting_price} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--slate-500)' }}>/ night</span>
                      </div>
                    </div>
                    <Link to={`/hotel/${h.id}`} className="btn btn-primary btn-sm">
                      <span>Reserve</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why HavenStay Responsible Grid */}
      <section className="container">
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 40px auto' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--slate-900)', marginBottom: '10px' }}>
            Why We Choose Responsible Booking
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--slate-600)' }}>
            Mainstream travel portals frequently employ deceptive urgency and hidden checkout fees. HavenStay was built from the ground up to respect travelers.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(15, 118, 110, 0.1)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <DollarSign size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Honest All-Inclusive Totals</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
              No sudden $45/night "facility fees" or surprise taxes revealed on the final payment page. Every hotel displays complete, payable numbers.
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(5, 150, 105, 0.1)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <EyeOff size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>No Artificial Pressure</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
              We don't manufacture anxiety. You will never see fake countdown clocks or fabricated scarcity prompts designed to manipulate your decision.
            </p>
          </div>

          <div style={{
            backgroundColor: '#ffffff',
            padding: '28px',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>Opt-In Location & GDPR Control</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--slate-600)', lineHeight: 1.5 }}>
              Geolocation is client-only with OpenStreetMap reverse geocoding. Download or delete your personal data at any time in a single click.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
