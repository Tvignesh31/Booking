import React from 'react';
import { SlidersHorizontal, RotateCcw, Check, Sparkles, Shield, Coffee } from 'lucide-react';

const COMMON_AMENITIES = [
  'WiFi',
  'Breakfast',
  'Pool',
  'Spa',
  'Fitness Center',
  'EV Charging',
  'Sea View',
  'Balcony'
];

export default function FilterBar({ filters, onChange, onReset, sortBy, onSortChange, totalCount }) {
  const handleAmenityToggle = (amenity) => {
    const current = filters.amenities ? filters.amenities.split(',').filter(Boolean) : [];
    const exists = current.includes(amenity);
    const updated = exists ? current.filter(a => a !== amenity) : [...current, amenity];
    onChange({ ...filters, amenities: updated.join(',') });
  };

  const selectedAmenities = filters.amenities ? filters.amenities.split(',').filter(Boolean) : [];

  return (
    <aside style={{
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Header & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--slate-100)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1rem', color: 'var(--slate-900)' }}>
          <SlidersHorizontal size={18} color="var(--primary)" />
          <span>Filters ({totalCount} stays)</span>
        </div>
        <button
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--slate-500)',
            fontSize: '0.8125rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer'
          }}
          title="Reset all filters"
        >
          <RotateCcw size={14} />
          <span>Reset</span>
        </button>
      </div>

      {/* Sort By Dropdown */}
      <div className="form-group">
        <label className="form-label">Sort Results By</label>
        <select
          className="form-select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value)}
        >
          <option value="popularity">Most Popular & Reviewed</option>
          <option value="distance_asc">Distance: Nearest First</option>
          <option value="price_asc">Price: Low to High (Upfront)</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Highest Guest Rating</option>
        </select>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Max Base Rate / Night</span>
          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>
            {filters.max_price ? `$${filters.max_price}` : 'Any Price'}
          </span>
        </label>
        <input
          type="range"
          min="100"
          max="500"
          step="25"
          value={filters.max_price || 500}
          onChange={(e) => onChange({ ...filters, max_price: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer', marginTop: '8px' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '4px' }}>
          <span>$100</span>
          <span>$300</span>
          <span>$500+</span>
        </div>
      </div>

      {/* Responsible Commitments Checkboxes */}
      <div>
        <div className="form-label" style={{ marginBottom: '10px' }}>Responsible Guarantees</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--slate-700)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.free_cancellation === true}
              onChange={(e) => onChange({ ...filters, free_cancellation: e.target.checked ? true : undefined })}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Shield size={14} color="var(--accent)" /> Free Cancellation
            </span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--slate-700)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={filters.breakfast_included === true}
              onChange={(e) => onChange({ ...filters, breakfast_included: e.target.checked ? true : undefined })}
              style={{ accentColor: 'var(--accent)' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Coffee size={14} color="var(--primary)" /> Breakfast Included
            </span>
          </label>
        </div>
      </div>

      {/* Star Rating Filter */}
      <div>
        <div className="form-label" style={{ marginBottom: '10px' }}>Hotel Star Rating</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[3, 4, 5].map((stars) => {
            const isSelected = filters.min_star === stars;
            return (
              <button
                key={stars}
                type="button"
                onClick={() => onChange({ ...filters, min_star: isSelected ? undefined : stars })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--primary)' : '1px solid var(--slate-200)',
                  backgroundColor: isSelected ? 'var(--primary-light)' : '#ffffff',
                  color: isSelected ? 'var(--primary)' : 'var(--slate-700)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {stars}★ & up
              </button>
            );
          })}
        </div>
      </div>

      {/* Guest Rating Filter */}
      <div>
        <div className="form-label" style={{ marginBottom: '10px' }}>Guest Rating</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { label: 'Any', value: undefined },
            { label: '4.5+', value: 4.5 },
            { label: '4.8+', value: 4.8 }
          ].map((item) => {
            const isSelected = filters.min_rating === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onChange({ ...filters, min_rating: item.value })}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: 'var(--radius-md)',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid var(--slate-200)',
                  backgroundColor: isSelected ? 'var(--accent-light)' : '#ffffff',
                  color: isSelected ? 'var(--accent-dark)' : 'var(--slate-700)',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amenities Tags */}
      <div>
        <div className="form-label" style={{ marginBottom: '10px' }}>Popular Amenities</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {COMMON_AMENITIES.map((amenity) => {
            const isSelected = selectedAmenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => handleAmenityToggle(amenity)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-full)',
                  border: isSelected ? '1px solid var(--primary)' : '1px solid var(--slate-200)',
                  backgroundColor: isSelected ? 'var(--primary)' : 'var(--slate-100)',
                  color: isSelected ? '#ffffff' : 'var(--slate-700)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s'
                }}
              >
                {isSelected && <Check size={12} />}
                <span>{amenity}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
