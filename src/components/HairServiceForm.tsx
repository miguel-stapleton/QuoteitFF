import React, { useState, useRef } from 'react';
import { HairForm, HairArtist, HairDayDetails, MakeupForm } from '../types';
import { hairArtists } from '../data/services';

interface HairServiceFormProps {
  hairForm: HairForm;
  onHairFormChange: (hairForm: HairForm) => void;
  dates: string[];
  // Cross-fill props
  bothSelected?: boolean;
  trialSyncEnabled?: boolean;
  onTrialSyncChange?: (enabled: boolean) => void;
  beautyVenueSyncEnabled?: boolean[];
  onBeautyVenueSyncToggle?: (index: number, enabled: boolean) => void;
  // Counterpart for mirroring
  makeupForm?: MakeupForm;
  onMakeupFormChange?: (makeupForm: MakeupForm | undefined) => void;
}

export const HairServiceForm: React.FC<HairServiceFormProps> = ({
  hairForm,
  onHairFormChange,
  dates,
  bothSelected = false,
  trialSyncEnabled = false,
  onTrialSyncChange,
  beautyVenueSyncEnabled = [],
  onBeautyVenueSyncToggle,
  makeupForm,
  onMakeupFormChange
}) => {
  const [warnings, setWarnings] = useState<{ [key: string]: string }>({});
  const trialDebounceRef = useRef<number | undefined>(undefined);
  const bvDebounceRefs = useRef<Record<number, number>>({});

  const isAgneFlatRate = hairForm.artist === HairArtist.Agne;

  const defaultDay = (): HairDayDetails => ({
    scheduledReturn: false,
    scheduledReturnBride: false,
    scheduledReturnGuests: 0,
    guests: 0,
    travelFee: 0,
    numPeople: 1,
    numCars: 1,
    exclusivity: false,
    touchupHours: 0,
    beautyVenue: ''
  });

  const updatePerDay = (index: number, patch: Partial<HairDayDetails>) => {
    const perDay = hairForm.perDay ? [...hairForm.perDay] : [];
    perDay[index] = { ...(perDay[index] || defaultDay()), ...patch } as HairDayDetails;
    onHairFormChange({ ...hairForm, perDay });
  };

  const mirrorMakeupTrialVenue = (value: string) => {
    if (!bothSelected || !trialSyncEnabled || !makeupForm || !onMakeupFormChange) return;
    const next = { ...makeupForm, trialVenue: value };
    onMakeupFormChange(next);
  };

  const mirrorMakeupBeautyVenue = (index: number, value: string) => {
    if (!bothSelected || !beautyVenueSyncEnabled[index] || !makeupForm || !onMakeupFormChange) return;
    const perDay = makeupForm.perDay ? [...makeupForm.perDay] : [];
    const existing = perDay[index] || defaultMakeupDayFallback();
    perDay[index] = { ...existing, beautyVenue: value } as any;
    onMakeupFormChange({ ...makeupForm, perDay });
  };

  const defaultMakeupDayFallback = () => ({
    scheduledReturn: false,
    scheduledReturnBride: false,
    scheduledReturnGuests: 0,
    guests: 0,
    travelFee: 0,
    numPeople: 1,
    numCars: 1,
    exclusivity: false,
    touchupHours: 0,
    beautyVenue: ''
  });

  const handleGlobalFieldChange = (field: keyof HairForm, value: any) => {
    if (typeof value === 'number' && value < 0) value = 0;
    const next = { ...hairForm, [field]: value } as HairForm;
    onHairFormChange(next);

    // Trial venue mirroring with debounce
    if (field === 'trialVenue') {
      if (trialDebounceRef.current) window.clearTimeout(trialDebounceRef.current);
      trialDebounceRef.current = window.setTimeout(() => {
        mirrorMakeupTrialVenue(String(value || ''));
      }, 200);
    }

    if (warnings[field as string]) {
      setWarnings(prev => {
        const nextW = { ...prev };
        delete nextW[field as string];
        return nextW;
      });
    }
  };

  const handleNumberBlur = (field: keyof HairForm, inputValue: string) => {
    const numValue = parseFloat(inputValue) || 0;
    const finalValue = Math.max(0, numValue);
    handleGlobalFieldChange(field, finalValue);
    if (field === 'trials' && finalValue > 3) {
      setWarnings(prev => ({ ...prev, [field]: 'More than 3 trials is unusual. Are you sure?' }));
    }
    if (field === 'trialTravelFee' && finalValue > 200) {
      setWarnings(prev => ({ ...prev, [field]: 'Trial travel fee over €200 seems high. Please verify.' }));
    }
  };

  const renderWarning = (field: string) => {
    if (!warnings[field]) return null;
    return (
      <div style={{
        marginTop: '0.5rem',
        padding: '0.5rem',
        backgroundColor: '#fef3cd',
        color: '#856404',
        borderRadius: '0.375rem',
        fontSize: '0.875rem',
        border: '1px solid #ffeaa7'
      }}>
        ⚠️ {warnings[field]}
      </div>
    );
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>
          💇‍♀️ Hair Services
        </h3>
        <p>Configure your hair styling requirements</p>
      </div>

      {/* Global (per service) fields */}
      <div className="input-group">
        <label htmlFor="hairArtist" className="input-label">
          Which Hairstylist?
        </label>
        <select
          id="hairArtist"
          className="input-field select-field"
          value={hairForm.artist}
          onChange={(e) => handleGlobalFieldChange('artist', e.target.value as HairArtist)}
        >
          {hairArtists.map(artist => (
            <option key={artist} value={artist}>{artist}</option>
          ))}
        </select>
      </div>

      {/* Trials - global */}
      <div className="input-group">
        <label htmlFor="hairTrials" className="input-label">
          How many trials?
        </label>
        <input
          type="number"
          id="hairTrials"
          className="input-field"
          placeholder="0"
          value={hairForm.trials || ''}
          onChange={(e) => handleGlobalFieldChange('trials', Math.max(0, parseInt(e.target.value) || 0))}
          onBlur={(e) => handleNumberBlur('trials', e.target.value)}
          min="0"
        />
        {isAgneFlatRate && hairForm.trials > 0 && (
          <small className="form-help" style={{ color: '#059669', fontWeight: 600 }}>
            Agne's flat rate includes 1 trial. {hairForm.trials > 1 ? `${hairForm.trials - 1} extra trial(s) will be charged at €175 each.` : ''}
          </small>
        )}
        {renderWarning('trials')}
      </div>

      {/* Trial travel - global conditional */}
      {hairForm.trials > 0 && (
        <>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={hairForm.trialTravelEnabled}
                onChange={(e) => handleGlobalFieldChange('trialTravelEnabled', e.target.checked)}
                style={{ 
                  marginRight: '0.75rem', 
                  transform: 'scale(1.2)',
                  accentColor: 'var(--accent)'
                }}
              />
              <span className="input-label" style={{ margin: 0 }}>
                There was a travel fee for the trial
              </span>
            </label>
          </div>

          {hairForm.trialTravelEnabled && (
            <>
              <div className="input-group" style={{ marginLeft: '0' }}>
                <label htmlFor="hairTrialVenue" className="input-label">
                  Trial venue
                </label>
                <input
                  type="text"
                  id="hairTrialVenue"
                  className="input-field"
                  placeholder="Enter trial venue location"
                  value={hairForm.trialVenue}
                  onChange={(e) => handleGlobalFieldChange('trialVenue', e.target.value)}
                  disabled={!!(bothSelected && trialSyncEnabled)}
                  aria-disabled={bothSelected && trialSyncEnabled ? true : undefined}
                  title={bothSelected && trialSyncEnabled ? 'Mirrored from Make-up while "Hair and Make-up Trial was held simultaneously" is enabled' : undefined}
                  style={bothSelected && trialSyncEnabled ? { opacity: 0.65, pointerEvents: 'none' } : undefined}
                />
                {bothSelected && trialSyncEnabled && (
                  <small className="form-help" aria-live="polite">
                    Mirrored from Make-up: {makeupForm?.trialVenue && makeupForm.trialVenue.trim() ? (
                      <strong>{makeupForm.trialVenue}</strong>
                    ) : (
                      'not set yet in Make-up'
                    )}
                  </small>
                )}
                {bothSelected && (
                  <div style={{ marginTop: '0.25rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={!!trialSyncEnabled}
                        onChange={(e) => onTrialSyncChange && onTrialSyncChange(e.target.checked)}
                      />
                      <span>Hair and Make-up Trial was held simultaneously</span>
                    </label>
                    {trialSyncEnabled && (
                      <small className="form-help">Editing Trial Venue here will mirror to the other service.</small>
                    )}
                  </div>
                )}
              </div>

              <div className="input-group" style={{ marginLeft: '0' }}>
                <label htmlFor="hairTrialTravelFee" className="input-label">
                  Trial travel fee (€)
                </label>
                <input
                  type="number"
                  id="hairTrialTravelFee"
                  className="input-field"
                  placeholder="0"
                  value={hairForm.trialTravelFee || ''}
                  onChange={(e) => handleGlobalFieldChange('trialTravelFee', Math.max(0, parseFloat(e.target.value) || 0))}
                  onBlur={(e) => handleNumberBlur('trialTravelFee', e.target.value)}
                  min="0"
                  step="0.01"
                />
                {renderWarning('trialTravelFee')}
              </div>
            </>
          )}
        </>
      )}

      {/* Per-day sections */}
      {dates.map((date, idx) => {
        const day = hairForm.perDay[idx] || defaultDay();
        const dateLabel = idx === 0 ? 'Wedding Day' : `Day ${idx + 1}`;

        const onBeautyVenueChange = (val: string) => {
          updatePerDay(idx, { beautyVenue: val });
          if (bvDebounceRefs.current[idx]) window.clearTimeout(bvDebounceRefs.current[idx]);
          bvDebounceRefs.current[idx] = window.setTimeout(() => mirrorMakeupBeautyVenue(idx, val), 200) as unknown as number;
        };

        // Validation flags
        const srVsTravelError = day.scheduledReturn && (Number(day.travelFee) || 0) > 0;
        const guestsRequireBrideError = (Number(day.scheduledReturnGuests) || 0) > 0 && !day.scheduledReturnBride;
        const assistantsOneCarTouchupsError = (Number((day as any).numPeople) || 1) > 1 && Number(day.numCars) === 1 && (Number(day.touchupHours) || 0) > 0;
        const numPeopleInvalid = (Number((day as any).numPeople) || 0) < 1;
        const numCarsInvalid = (Number(day.numCars) || 0) < 1;
        const moreCarsThanPeopleWarn = (Number(day.numCars) || 0) > (Number((day as any).numPeople) || 0);

        const ErrorMsg: React.FC<{children: React.ReactNode}> = ({ children }) => (
          <div style={{
            marginTop: '6px',
            color: '#b91c1c',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '0.875rem'
          }}>{children}</div>
        );
        const WarnMsg: React.FC<{children: React.ReactNode}> = ({ children }) => (
          <div style={{
            marginTop: '6px',
            color: '#92400e',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: '0.875rem'
          }}>{children}</div>
        );

        return (
          <div className="card" key={idx} style={{ marginTop: '1rem' }}>
            <div className="header">
              <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{dateLabel}{date ? ` — ${new Date(date).toLocaleDateString('en-GB')}` : ''}</h4>
              <p>Provide details for this day</p>
            </div>

            {isAgneFlatRate && (
              <div style={{
                marginBottom: '1rem',
                padding: '12px',
                background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                border: '2px solid #059669',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <strong style={{ color: '#059669', display: 'block', marginBottom: '4px' }}>
                  ✨ Agne's €1400 Flat Rate {idx === 0 ? 'Includes' : '(Day 1 only)'}:
                </strong>
                {idx === 0 ? (
                  <ul style={{ margin: '4px 0', paddingLeft: '20px', color: '#065f46' }}>
                    <li>Bridal hairstyle + up to 3 guests</li>
                    <li>8 hours (touch-ups/2nd look included)</li>
                  </ul>
                ) : (
                  <p style={{ margin: '4px 0', color: '#065f46' }}>
                    Extra day: €250 for bride only. Guests charged separately at €100 each.
                  </p>
                )}
              </div>
            )}

            <div className="input-group">
              <label htmlFor={`hair-beauty-venue-${idx}`} className="input-label">
                Beauty Venue (location)
              </label>
              <input
                type="text"
                id={`hair-beauty-venue-${idx}`}
                className="input-field"
                placeholder="e.g., Hotel Cascais"
                value={day.beautyVenue || ''}
                onChange={(e) => onBeautyVenueChange(e.target.value)}
                disabled={!!(bothSelected && beautyVenueSyncEnabled[idx])}
                aria-disabled={bothSelected && beautyVenueSyncEnabled[idx] ? true : undefined}
                title={bothSelected && beautyVenueSyncEnabled[idx] ? 'Mirrored from Make-up while "Same location for both services" is enabled' : undefined}
                style={bothSelected && beautyVenueSyncEnabled[idx] ? { opacity: 0.65, pointerEvents: 'none' } : undefined}
              />
              {bothSelected && beautyVenueSyncEnabled[idx] && (
                <small className="form-help" aria-live="polite">
                  Mirrored from Make-up: {makeupForm?.perDay?.[idx]?.beautyVenue ? (
                    <strong>{makeupForm.perDay[idx].beautyVenue}</strong>
                  ) : (
                    'not set yet in Make-up'
                  )}
                </small>
              )}
              {bothSelected && (
                <div style={{ marginTop: '0.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={!!beautyVenueSyncEnabled[idx]}
                      onChange={(e) => onBeautyVenueSyncToggle && onBeautyVenueSyncToggle(idx, e.target.checked)}
                    />
                    <span>Same location for both services (Day {idx + 1})</span>
                  </label>
                  {beautyVenueSyncEnabled[idx] && (
                    <small className="form-help">Editing Beauty Venue for Day {idx + 1} will mirror to the other service.</small>
                  )}
                </div>
              )}
            </div>

            {!isAgneFlatRate && (
              <>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={day.scheduledReturn}
                      onChange={(e) => updatePerDay(idx, { scheduledReturn: e.target.checked })}
                      style={{ 
                        marginRight: '0.75rem', 
                        transform: 'scale(1.2)',
                        accentColor: 'var(--accent)'
                      }}
                    />
                    <span className="input-label" style={{ margin: 0 }}>
                      Scheduled return?
                    </span>
                  </label>
                  {srVsTravelError && (
                    <ErrorMsg>
                      Scheduled return is not allowed when a Travel fee is applied for Hair. Set Travel fee to 0 or turn off Scheduled return.
                    </ErrorMsg>
                  )}
                </div>

                {day.scheduledReturn && (
                  <>
                    <div className="input-group" style={{ marginLeft: '2rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={day.scheduledReturnBride}
                          onChange={(e) => updatePerDay(idx, { scheduledReturnBride: e.target.checked })}
                          style={{ 
                            marginRight: '0.75rem', 
                            transform: 'scale(1.2)',
                            accentColor: 'var(--accent)'
                          }}
                        />
                        <span className="input-label" style={{ margin: 0 }}>
                          Bride
                        </span>
                      </label>
                    </div>

                    <div className="input-group" style={{ marginLeft: '2rem' }}>
                      <label htmlFor={`hairScheduledReturnGuests-${idx}`} className="input-label">
                        Guests (scheduled return)
                      </label>
                      <input
                        type="number"
                        id={`hairScheduledReturnGuests-${idx}`}
                        className="input-field"
                        placeholder="0"
                        value={day.scheduledReturnGuests || ''}
                        onChange={(e) => updatePerDay(idx, { scheduledReturnGuests: Math.max(0, parseInt(e.target.value) || 0) })}
                        min="0"
                      />
                      {guestsRequireBrideError && (
                        <ErrorMsg>
                          Guests scheduled return requires a scheduled return for the bride (Hair).
                        </ErrorMsg>
                      )}
                      {renderWarning('scheduledReturnGuests')}
                    </div>
                  </>
                )}
              </>
            )}

            <div className="input-group">
              <label htmlFor={`hairGuests-${idx}`} className="input-label">
                How many guests for hairstyling?
              </label>
              <input
                type="number"
                id={`hairGuests-${idx}`}
                className="input-field"
                placeholder="0"
                value={day.guests || ''}
                onChange={(e) => updatePerDay(idx, { guests: Math.max(0, parseInt(e.target.value) || 0) })}
                min="0"
              />
              {isAgneFlatRate && idx === 0 && day.guests > 3 && (
                <small className="form-help" style={{ color: '#d97706', fontWeight: 600 }}>
                  Flat rate includes up to 3 guests. {day.guests - 3} extra guest(s) will be charged at €100 each.
                </small>
              )}
              {isAgneFlatRate && idx > 0 && day.guests > 0 && (
                <small className="form-help" style={{ color: '#d97706', fontWeight: 600 }}>
                  Extra day guests: {day.guests} guest(s) × €100 each = €{day.guests * 100}.
                </small>
              )}
              {renderWarning('guests')}
            </div>

            <div className="input-group">
              <label htmlFor={`hairTravelFee-${idx}`} className="input-label">
                Travel fee (€)
              </label>
              <input
                type="number"
                id={`hairTravelFee-${idx}`}
                className="input-field"
                placeholder="0"
                value={day.travelFee || ''}
                onChange={(e) => updatePerDay(idx, { travelFee: Math.max(0, parseFloat(e.target.value) || 0) })}
                min="0"
                step="0.01"
              />
              {!isAgneFlatRate && srVsTravelError && (
                <ErrorMsg>
                  Scheduled return is not allowed when a Travel fee is applied for Hair. Set Travel fee to 0 or turn off Scheduled return.
                </ErrorMsg>
              )}
              {renderWarning('travelFee')}
            </div>

            <div className="input-group">
              <label htmlFor={`hairNumPeople-${idx}`} className="input-label">
                How many people (including the main artist)?
              </label>
              <input
                type="number"
                id={`hairNumPeople-${idx}`}
                className="input-field"
                placeholder="1"
                value={(day as any).numPeople ?? ''}
                onChange={(e) => updatePerDay(idx, { numPeople: Math.max(1, parseInt(e.target.value) || 1) })}
                min="1"
              />
              <small className="form-help">Total people including the main artist.</small>
              {isAgneFlatRate && (day as any).numPeople > 1 && (
                <small className="form-help" style={{ color: '#d97706', fontWeight: 600 }}>
                  {(day as any).numPeople - 1} additional artist(s) require €100 deposit each.
                </small>
              )}
              {numPeopleInvalid && (
                <ErrorMsg>At least 1 person required for Hair.</ErrorMsg>
              )}
              {moreCarsThanPeopleWarn && (
                <WarnMsg>You have more cars than people — please check.</WarnMsg>
              )}
              {renderWarning('numArtists')}
            </div>

            <div className="input-group">
              <label htmlFor={`hairNumCars-${idx}`} className="input-label">
                How many cars are going on behalf of hairstyling?
              </label>
              <input
                type="number"
                id={`hairNumCars-${idx}`}
                className="input-field"
                placeholder="1"
                value={day.numCars ?? ''}
                onChange={(e) => updatePerDay(idx, { numCars: Math.max(1, parseInt(e.target.value) || 1) })}
                min="1"
              />
              {numCarsInvalid && (
                <ErrorMsg>At least 1 car required for Hair.</ErrorMsg>
              )}
              {!isAgneFlatRate && assistantsOneCarTouchupsError && (
                <ErrorMsg>
                  With assistants and only 1 car, add another car so assistants can return. Note: traveling fee is charged per car.
                </ErrorMsg>
              )}
              {renderWarning('numCars')}
            </div>

            {!isAgneFlatRate && (
              <div className="input-group">
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={day.exclusivity}
                    onChange={(e) => updatePerDay(idx, { exclusivity: e.target.checked })}
                    style={{ 
                      marginRight: '0.75rem', 
                      transform: 'scale(1.2)',
                      accentColor: 'var(--accent)'
                    }}
                  />
                  <span className="input-label" style={{ margin: 0 }}>
                    Client is paying an exclusivity fee
                  </span>
                </label>
              </div>
            )}

            <div className="input-group">
              <label htmlFor={`hairTouchupHours-${idx}`} className="input-label">
                {isAgneFlatRate && idx === 0 
                  ? 'Hours beyond the 8 included in the flat rate?' 
                  : 'How many hours of touch-ups? (default 0)'}
              </label>
              <input
                type="number"
                id={`hairTouchupHours-${idx}`}
                className="input-field"
                placeholder="0"
                value={day.touchupHours || ''}
                onChange={(e) => updatePerDay(idx, { touchupHours: Math.max(0, parseFloat(e.target.value) || 0) })}
                min="0"
                step="0.5"
              />
              {isAgneFlatRate && idx === 0 && day.touchupHours > 0 && (
                <small className="form-help" style={{ color: '#d97706', fontWeight: 600 }}>
                  Extra {day.touchupHours} hour(s) × €50/hour = €{(day.touchupHours * 50).toFixed(2)}.
                </small>
              )}
              {!isAgneFlatRate && assistantsOneCarTouchupsError && (
                <ErrorMsg>
                  With assistants and only 1 car, add another car so assistants can return. Note: traveling fee is charged per car.
                </ErrorMsg>
              )}
              {renderWarning('touchupHours')}
            </div>
          </div>
        );
      })}
    </div>
  );
};
