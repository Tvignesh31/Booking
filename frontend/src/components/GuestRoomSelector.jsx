import React, { useState, useRef, useEffect } from 'react';
import { Users, Plus, Minus, ChevronDown, Check } from 'lucide-react';

export default function GuestRoomSelector({
  rooms = 1,
  adults = 2,
  children = 0,
  childrenAges = [],
  onChange,
  compact = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateRooms = (delta) => {
    const next = Math.max(1, Math.min(6, rooms + delta));
    onChange({ rooms: next, adults, children, childrenAges });
  };

  const updateAdults = (delta) => {
    const next = Math.max(1, Math.min(12, adults + delta));
    onChange({ rooms, adults: next, children, childrenAges });
  };

  const updateChildren = (delta) => {
    const next = Math.max(0, Math.min(6, children + delta));
    let nextAges = [...childrenAges];
    if (next > children) {
      // Add default age (7) for newly added children
      while (nextAges.length < next) {
        nextAges.push(7);
      }
    } else {
      nextAges = nextAges.slice(0, next);
    }
    onChange({ rooms, adults, children: next, childrenAges: nextAges });
  };

  const updateChildAge = (index, age) => {
    const nextAges = [...childrenAges];
    nextAges[index] = Number(age);
    onChange({ rooms, adults, children, childrenAges: nextAges });
  };

  const summaryText = `${rooms} Room${rooms > 1 ? 's' : ''} • ${adults} Adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}`;

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
      <label className="form-label">Rooms & Guests</label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="form-input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          cursor: 'pointer',
          paddingLeft: '38px',
          fontWeight: 600,
          color: 'var(--slate-800)',
          height: '42px'
        }}
      >
        <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)' }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {summaryText}
        </span>
        <ChevronDown size={16} color="var(--slate-400)" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '105%',
          left: 0,
          right: 0,
          minWidth: '300px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-color)',
          padding: '20px',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {/* Rooms Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--slate-100)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)' }}>Rooms</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Number of rooms needed</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => updateRooms(-1)}
                disabled={rooms <= 1}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: 700, width: '20px', textAlign: 'center' }}>{rooms}</span>
              <button
                type="button"
                onClick={() => updateRooms(1)}
                disabled={rooms >= 6}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Adults Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--slate-100)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)' }}>Adults</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Ages 18 or above</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => updateAdults(-1)}
                disabled={adults <= 1}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: 700, width: '20px', textAlign: 'center' }}>{adults}</span>
              <button
                type="button"
                onClick={() => updateAdults(1)}
                disabled={adults >= 12}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Children Stepper */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: children > 0 ? '14px' : '20px' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--slate-900)' }}>Children</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>Ages 0 to 17</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => updateChildren(-1)}
                disabled={children <= 0}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Minus size={14} />
              </button>
              <span style={{ fontWeight: 700, width: '20px', textAlign: 'center' }}>{children}</span>
              <button
                type="button"
                onClick={() => updateChildren(1)}
                disabled={children >= 6}
                className="btn btn-secondary btn-sm"
                style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Child Age Selectors if children > 0 */}
          {children > 0 && (
            <div style={{
              backgroundColor: 'var(--slate-50)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              marginBottom: '16px'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--slate-700)', marginBottom: '8px' }}>
                Age of children at check-out
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {Array.from({ length: children }).map((_, idx) => (
                  <div key={idx} className="form-group">
                    <label style={{ fontSize: '0.7rem', color: 'var(--slate-500)' }}>Child {idx + 1} Age</label>
                    <select
                      className="form-select"
                      style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                      value={childrenAges[idx] !== undefined ? childrenAges[idx] : 7}
                      onChange={(e) => updateChildAge(idx, e.target.value)}
                    >
                      <option value={0}>0 years old (Infant)</option>
                      {Array.from({ length: 17 }, (_, i) => i + 1).map((age) => (
                        <option key={age} value={age}>
                          {age} year{age > 1 ? 's' : ''} old
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done button */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-primary btn-sm"
            style={{ width: '100%' }}
          >
            <Check size={14} />
            <span>Apply Guests & Rooms</span>
          </button>
        </div>
      )}
    </div>
  );
}
