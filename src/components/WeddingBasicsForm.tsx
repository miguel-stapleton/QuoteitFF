import React from 'react';
import { MultiDay } from '../types';

interface WeddingBasicsFormProps {
  multiDay: MultiDay;
  onMultiDayChange: (multiDay: MultiDay) => void;
}

export const WeddingBasicsForm: React.FC<WeddingBasicsFormProps> = ({
  multiDay,
  onMultiDayChange
}) => {
  const handleDateChange = (index: number, date: string) => {
    const newDates = [...(multiDay.dates || [])];
    newDates[index] = date;
    onMultiDayChange({
      ...multiDay,
      dates: newDates
    });
  };

  const handleMultiDayToggle = (checked: boolean) => {
    if (checked) {
      const nextCount: 2 | 3 | 4 = (multiDay.count as 2 | 3 | 4) || 2;
      const base = multiDay.dates && multiDay.dates.length > 0 ? [...multiDay.dates] : [''];
      while (base.length < nextCount) base.push('');
      onMultiDayChange({
        ...multiDay,
        hasMultipleDays: true,
        count: nextCount,
        dates: base
      });
    } else {
      onMultiDayChange({
        ...multiDay,
        hasMultipleDays: false,
        dates: multiDay.dates && multiDay.dates.length > 0 ? [multiDay.dates[0]] : ['']
      });
    }
  };

  const handleCountChange = (count: 2 | 3 | 4) => {
    const newDates = [...(multiDay.dates || [])];
    if (count > newDates.length) {
      while (newDates.length < count) newDates.push('');
    } else {
      newDates.splice(count);
    }

    onMultiDayChange({
      ...multiDay,
      count,
      dates: newDates
    });
  };

  const handleBrideNameChange = (brideName: string) => {
    onMultiDayChange({
      ...multiDay,
      brideName
    });
  };

  const getDateLabel = (index: number) => {
    if (index === 0) return 'Wedding Date';
    return `${index === 1 ? '2nd' : index === 2 ? '3rd' : '4th'} Date`;
  };

  const minDate = new Date().toISOString().split('T')[0];

  // Derive a robust dayCount even if count is temporarily undefined (e.g., after reload)
  const dayCount = multiDay.hasMultipleDays
    ? ((multiDay.count as 2 | 3 | 4) || (Math.min(4, Math.max(2, (multiDay.dates?.length || 1))) as 2 | 3 | 4))
    : 1;

  return (
    <div className="slide-in">
      <div className="header">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Wedding Basics</h2>
        <p>Tell us about your celebration details</p>
      </div>

      <div className="input-group">
        <label htmlFor="brideName" className="input-label">
          Bride's Name
        </label>
        <input
          type="text"
          id="brideName"
          className="input-field"
          value={multiDay.brideName || ''}
          onChange={(e) => handleBrideNameChange(e.target.value)}
          placeholder="Enter the bride's name"
          required
        />
      </div>

      <div className="input-group">
        <label htmlFor="weddingDate" className="input-label">
          Wedding Date
        </label>
        <input
          type="date"
          id="weddingDate"
          className="input-field"
          value={multiDay.dates?.[0] || ''}
          onChange={(e) => handleDateChange(0, e.target.value)}
          min={minDate}
          required
        />
      </div>

      <div className="input-group">
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={!!multiDay.hasMultipleDays}
            onChange={(e) => handleMultiDayToggle(e.target.checked)}
            style={{ 
              marginRight: '0.75rem', 
              transform: 'scale(1.2)',
              accentColor: 'var(--accent)'
            }}
          />
          <span className="input-label" style={{ margin: 0 }}>
            There is more than 1 day of celebration
          </span>
        </label>
      </div>

      {multiDay.hasMultipleDays && (
        <>
          <div className="input-group">
            <label htmlFor="dayCount" className="input-label">
              How many days?
            </label>
            <select
              id="dayCount"
              className="input-field select-field"
              value={dayCount}
              onChange={(e) => handleCountChange(parseInt(e.target.value) as 2 | 3 | 4)}
            >
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={4}>4 days</option>
            </select>
          </div>

          {/* Render exactly dayCount - 1 additional date inputs */}
          {Array.from({ length: Math.max(0, dayCount - 1) }).map((_, i) => {
            const index = i + 1; // start from 1
            return (
              <div key={index} className="input-group">
                <label htmlFor={`date-${index}`} className="input-label">
                  {getDateLabel(index)}
                </label>
                <input
                  type="date"
                  id={`date-${index}`}
                  className="input-field"
                  value={multiDay.dates?.[index] || ''}
                  onChange={(e) => handleDateChange(index, e.target.value)}
                  min={minDate}
                />
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
