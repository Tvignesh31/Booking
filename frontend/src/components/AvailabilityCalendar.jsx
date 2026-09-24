import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/api';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Filter
} from 'lucide-react';

export default function AvailabilityCalendar({
  hotelId,
  initialCheckIn = '',
  initialCheckOut = '',
  selectedRoomId = null,
  onSelectDates,
  compact = false
}) {
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Month navigation: viewYear & viewMonth (0-indexed: 0 = Jan, 11 = Dec)
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11

  // Filter by room
  const [roomFilter, setRoomFilter] = useState(selectedRoomId ? String(selectedRoomId) : '');

  // Date selection state
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    if (initialCheckIn) setCheckIn(initialCheckIn);
    if (initialCheckOut) setCheckOut(initialCheckOut);
  }, [initialCheckIn, initialCheckOut]);

  useEffect(() => {
    if (selectedRoomId) setRoomFilter(String(selectedRoomId));
  }, [selectedRoomId]);

  // Load calendar availability
  useEffect(() => {
    let isMounted = true;
    async function loadAvailability() {
      if (!hotelId) return;
      setLoading(true);
      setError(null);
      try {
        // Fetch 90 days from beginning of current viewed month
        const startDt = new Date(currentYear, currentMonth, 1);
        const endDt = new Date(currentYear, currentMonth + 3, 0);
        const startStr = startDt.toISOString().split('T')[0];
        const endStr = endDt.toISOString().split('T')[0];

        const data = await api.getAvailabilityCalendar(
          hotelId,
          startStr,
          endStr,
          roomFilter ? Number(roomFilter) : null
        );
        if (isMounted) {
          setCalendarData(data);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Availability calendar load error:", err);
          setError("Failed to load room availability calendar.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAvailability();
    return () => { isMounted = false; };
  }, [hotelId, currentYear, currentMonth, roomFilter]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Map days by date key "YYYY-MM-DD"
  const daysMap = useMemo(() => {
    const map = {};
    if (calendarData && calendarData.days) {
      calendarData.days.forEach(d => {
        map[d.date] = d;
      });
    }
    return map;
  }, [calendarData]);

  // Generate day cells for currently displayed month
  const monthDays = useMemo(() => {
    const year = currentYear;
    const month = currentMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday = 0, Sunday = 6 in European/ISO standard
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const cells = [];
    // Padding before day 1
    for (let i = 0; i < startDayOfWeek; i++) {
      cells.push({ type: 'empty', id: `empty-${i}` });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Days 1..totalDays
    for (let day = 1; day <= totalDays; day++) {
      const dObj = new Date(year, month, day);
      // Format as local YYYY-MM-DD
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const dateKey = `${year}-${mStr}-${dStr}`;

      const inv = daysMap[dateKey] || {
        date: dateKey,
        day: day,
        available_units: 5,
        total_units: 5,
        min_price: 100,
        status: dObj < new Date(todayStr) ? 'past' : 'high',
        shade: dObj < new Date(todayStr) ? 'disabled' : 'green',
        badge_text: 'Available'
      };

      const isPast = dateKey < todayStr;
      const isSoldOut = inv.available_units === 0;

      cells.push({
        type: 'day',
        dateKey,
        dayNumber: day,
        isPast,
        isSoldOut,
        inventory: inv
      });
    }

    return cells;
  }, [currentYear, currentMonth, daysMap]);

  // Click on a date cell
  const handleDateClick = (dateKey, isPast, isSoldOut) => {
    if (isPast || isSoldOut) return;

    if (!checkIn || (checkIn && checkOut)) {
      // Start new selection
      setCheckIn(dateKey);
      setCheckOut('');
    } else if (checkIn && !checkOut) {
      if (dateKey <= checkIn) {
        // Reset check-in to this earlier date
        setCheckIn(dateKey);
      } else {
        // Set check-out
        setCheckOut(dateKey);
        if (onSelectDates) {
          onSelectDates(checkIn, dateKey);
        }
      }
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Helper to determine cell styling and visual shades
  const getCellShadeStyle = (cell) => {
    const { dateKey, isPast, isSoldOut, inventory } = cell;

    const isStart = checkIn === dateKey;
    const isEnd = checkOut === dateKey;
    const isInRange = checkIn && checkOut && dateKey > checkIn && dateKey < checkOut;
    const isHoverRange = checkIn && !checkOut && hoverDate && dateKey > checkIn && dateKey <= hoverDate;

    if (isStart || isEnd) {
      return {
        backgroundColor: 'var(--primary)',
        color: '#ffffff',
        border: '2px solid var(--primary)',
        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
        fontWeight: 700,
        transform: 'scale(1.04)',
        zIndex: 3
      };
    }

    if (isInRange || isHoverRange) {
      return {
        backgroundColor: '#dbeafe',
        color: 'var(--primary-dark)',
        border: '1px solid #bfdbfe',
        fontWeight: 600
      };
    }

    if (isPast) {
      return {
        backgroundColor: '#f8fafc',
        color: '#cbd5e1',
        border: '1px solid #f1f5f9',
        cursor: 'not-allowed',
        opacity: 0.5
      };
    }

    if (isSoldOut || inventory.status === 'sold_out') {
      return {
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        border: '1px dashed #fecaca',
        cursor: 'not-allowed',
        background: 'repeating-linear-gradient(45deg, #fef2f2, #fef2f2 6px, #fee2e2 6px, #fee2e2 12px)'
      };
    }

    // High availability: Emerald green shade
    if (inventory.status === 'high' || inventory.shade === 'green') {
      return {
        backgroundColor: '#f0fdf4',
        color: '#166534',
        border: '1px solid #bbf7d0'
      };
    }

    // Moderate availability: Teal / Cyan shade
    if (inventory.status === 'moderate' || inventory.shade === 'amber') {
      return {
        backgroundColor: '#fefce8',
        color: '#854d0e',
        border: '1px solid #fef08a'
      };
    }

    // Limited availability (1-2 left): Orange / Coral shade (urgency indicator)
    if (inventory.status === 'limited' || inventory.shade === 'orange') {
      return {
        backgroundColor: '#fff7ed',
        color: '#9a3412',
        border: '1px solid #fed7aa'
      };
    }

    return {
      backgroundColor: '#ffffff',
      color: 'var(--slate-800)',
      border: '1px solid var(--border-color)'
    };
  };

  const calculateSelectedNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diff = (new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(diff));
  };

  const selectedNights = calculateSelectedNights();

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: 'var(--radius-xl)',
      padding: compact ? '16px' : '24px',
      border: '1px solid var(--border-color)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {/* Header & Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#eff6ff',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CalendarIcon size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: compact ? '1rem' : '1.15rem', fontWeight: 800, color: 'var(--slate-900)' }}>
              Live Room Availability Calendar
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)' }}>
              Color shades reflect real-time room keys in property inventory
            </p>
          </div>
        </div>

        {/* Room Filter Selector if available */}
        {calendarData?.room_categories?.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} color="var(--slate-500)" />
            <select
              className="form-input"
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              style={{
                fontSize: '0.8125rem',
                padding: '4px 10px',
                height: '32px',
                minWidth: '160px'
              }}
            >
              <option value="">All Room Types</option>
              {calendarData.room_categories.map(r => (
                <option key={r.id} value={r.id}>
                  {r.room_type} (${r.base_price}/n)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Visual Legend with Color Shades */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: 'var(--slate-50)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.75rem',
        marginBottom: '16px',
        border: '1px solid var(--slate-200)'
      }}>
        <span style={{ fontWeight: 700, color: 'var(--slate-700)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Info size={13} color="var(--primary)" /> Inventory Shades:
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#166534', fontWeight: 600 }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#f0fdf4', border: '1px solid #86efac', borderRadius: '3px' }} />
          High Availability (5+ rooms)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#854d0e', fontWeight: 600 }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: '3px' }} />
          Moderate (3-4 rooms)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#c2410c', fontWeight: 600 }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '3px' }} />
          Few Rooms Left (1-2 rooms)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#991b1b', fontWeight: 600 }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '3px' }} />
          Sold Out
        </span>
      </div>

      {/* Month Navigation Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '14px'
      }}>
        <button
          type="button"
          onClick={handlePrevMonth}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', height: '32px' }}
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--slate-900)' }}>
          {monthNames[currentMonth]} {currentYear}
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 10px', height: '32px' }}
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Days of Week Header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        textAlign: 'center',
        marginBottom: '8px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color: 'var(--slate-500)'
      }}>
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
        <div>SUN</div>
      </div>

      {/* Calendar Days Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '6px',
        position: 'relative'
      }}>
        {monthDays.map((cell) => {
          if (cell.type === 'empty') {
            return <div key={cell.id} style={{ minHeight: '60px' }} />;
          }

          const { dateKey, dayNumber, isPast, isSoldOut, inventory } = cell;
          const style = getCellShadeStyle(cell);

          return (
            <div
              key={dateKey}
              onClick={() => handleDateClick(dateKey, isPast, isSoldOut)}
              onMouseEnter={() => !isPast && !isSoldOut && setHoverDate(dateKey)}
              onMouseLeave={() => setHoverDate(null)}
              title={`${dateKey}: ${inventory.badge_text} (from $${inventory.min_price || 0}/night)`}
              style={{
                minHeight: '62px',
                padding: '6px 4px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: (isPast || isSoldOut) ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                textAlign: 'center',
                ...style
              }}
            >
              {/* Day Number */}
              <div style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                lineHeight: 1
              }}>
                {dayNumber}
              </div>

              {/* Price or Sold Out indicator */}
              {!isPast && (
                <div style={{ marginTop: '2px' }}>
                  {isSoldOut ? (
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#dc2626' }}>
                      SOLD
                    </span>
                  ) : (
                    <div style={{ fontSize: '0.6875rem', fontWeight: 700 }}>
                      ${inventory.min_price}
                    </div>
                  )}

                  {/* Availability badge */}
                  {!isSoldOut && (
                    <div style={{
                      fontSize: '0.5625rem',
                      lineHeight: 1.1,
                      marginTop: '2px',
                      opacity: 0.9
                    }}>
                      {inventory.available_units} left
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Stay Summary & Action Banner */}
      <div style={{
        marginTop: '18px',
        padding: '14px 16px',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: checkIn && checkOut ? '#eff6ff' : 'var(--slate-50)',
        border: checkIn && checkOut ? '1px solid #bfdbfe' : '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600 }}>
            {checkIn && !checkOut ? "Now choose your Check-out date:" : "Selected Stay Dates:"}
          </div>
          <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--slate-900)', marginTop: '2px' }}>
            {checkIn ? (
              <span>
                <strong>{checkIn}</strong>
                {checkOut ? ` → ${checkOut} (${selectedNights} night${selectedNights > 1 ? 's' : ''})` : " (Select Check-out)"}
              </span>
            ) : (
              <span style={{ color: 'var(--slate-500)', fontWeight: 500 }}>
                Click a date to select your Check-In date
              </span>
            )}
          </div>
        </div>

        {checkIn && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => { setCheckIn(''); setCheckOut(''); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              Reset Dates
            </button>
            {checkIn && checkOut && onSelectDates && (
              <button
                type="button"
                onClick={() => onSelectDates(checkIn, checkOut)}
                className="btn btn-primary btn-sm"
                style={{ fontSize: '0.75rem' }}
              >
                Apply Stay Dates
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
