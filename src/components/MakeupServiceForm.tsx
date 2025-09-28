import React, { useRef, useState } from 'react';
import { MakeupForm, MakeupArtist, MakeupDayDetails, HairForm } from '../types';
import { makeupArtists } from '../data/services';

interface MakeupServiceFormProps {
  makeupForm: MakeupForm;
  onMakeupFormChange: (makeupForm: MakeupForm) => void;
  dates: string[];
  // Cross-fill props
  bothSelected?: boolean;
  trialSyncEnabled?: boolean;
  onTrialSyncChange?: (enabled: boolean) => void;
  beautyVenueSyncEnabled?: boolean[];
  onBeautyVenueSyncToggle?: (index: number, enabled: boolean) => void;
  // Counterpart for mirroring
  hairForm?: HairForm;
  onHairFormChange?: (hairForm: HairForm | undefined) => void;
}

export const MakeupServiceForm: React.FC<MakeupServiceFormProps> = ({
  makeupForm,
  onMakeupFormChange,
  dates,
  bothSelected = false,
  trialSyncEnabled = false,
  onTrialSyncChange,
  beautyVenueSyncEnabled = [],
  onBeautyVenueSyncToggle,
  hairForm,
  onHairFormChange
}) => {
  const [warnings, setWarnings] = useState<{ [key: string]: string }>({});
  const trialDebounceRef = useRef<number | undefined>(undefined);
  const bvDebounceRefs = useRef<Record<number, number>>({});

  const updatePerDay = (index: number, patch: Partial<MakeupDayDetails>) => {
    const perDay = makeupForm.perDay ? [...makeupForm.perDay] : [];
    perDay[index] = { ...(perDay[index] || defaultDay()), ...patch } as MakeupDayDetails;
    onMakeupFormChange({ ...makeupForm, perDay });
  };

  const mirrorHairTrialVenue = (value: string) => {
    if (!bothSelected || !trialSyncEnabled || !hairForm || !onHairFormChange) return;
    const next = { ...hairForm, trialVenue: value };
    onHairFormChange(next);
  };

  const mirrorHairBeautyVenue = (index: number, value: string) => {
    if (!bothSelected || !beautyVenueSyncEnabled[index] || !hairForm || !onHairFormChange) return;
    const perDay = hairForm.perDay ? [...hairForm.perDay] : [];
    const existing = perDay[index] || defaultHairDayFallback();
    perDay[index] = { ...existing, beautyVenue: value } as any;
    onHairFormChange({ ...hairForm, perDay });
  };

  const defaultHairDayFallback = () => ({
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

  const defaultDay = (): MakeupDayDetails => ({
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

  const handleGlobalFieldChange = (field: keyof MakeupForm, value: any) => {
    if (typeof value === 'number' && value < 0) value = 0;
    const next = { ...makeupForm, [field]: value } as MakeupForm;
    onMakeupFormChange(next);

    // Trial venue mirroring with debounce
    if (field === 'trialVenue') {
      if (trialDebounceRef.current) window.clearTimeout(trialDebounceRef.current);
      trialDebounceRef.current = window.setTimeout(() => {
        mirrorHairTrialVenue(String(value || ''));
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

  const handleNumberBlur = (field: keyof MakeupForm, inputValue: string) => {
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
      <div className="warning-message" role="alert" aria-live="polite">
        ⚠️ {warnings[field]}
      </div>
    );
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--accent)' }}>
          💄 Makeup Services
        </h3>
        <p>Configure your makeup requirements</p>
      </div>

      {/* Global (per service) fields */}
      <div className="form-group">
        <label htmlFor="makeup-artist" className="form-label">
          Which Make-up Artist? *
        </label>
        <select
          id="makeup-artist"
          value={makeupForm.artist}
          onChange={(e) => handleGlobalFieldChange('artist', e.target.value as MakeupArtist)}
          className="input-field"
          required
          aria-describedby="makeup-artist-help"
        >
          <option value="">Select an artist</option>
          {makeupArtists.map(artist => (
            <option key={artist} value={artist}>{artist}</option>
          ))}
        </select>
        <small id="makeup-artist-help" className="form-help">
          Choose your preferred makeup artist
        </small>
      </div>

      {/* Trials - global */}
      <div className="form-group">
        <label htmlFor="makeup-trials" className="form-label">
          How many trials?
        </label>
        <input
          id="makeup-trials"
          type="number"
          min="0"
          step="1"
          value={makeupForm.trials || ''}
          onChange={(e) => handleGlobalFieldChange('trials', parseInt(e.target.value) || 0)}
          onBlur={(e) => handleNumberBlur('trials', e.target.value)}
          className="input-field number-input"
          placeholder="0"
          aria-describedby="makeup-trials-help"
        />
        <small id="makeup-trials-help" className="form-help">
          Number of makeup trials before the wedding
        </small>
        {renderWarning('trials')}
      </div>

      {/* Trial travel - global conditional */}
      {makeupForm.trials > 0 && (
        <>
          <div className="form-group">
            <div className="checkbox-group">
              <input
                id="makeup-trial-travel"
                type="checkbox"
                checked={makeupForm.trialTravelEnabled}
                onChange={(e) => handleGlobalFieldChange('trialTravelEnabled', e.target.checked)}
                className="checkbox-input"
                aria-describedby="makeup-trial-travel-help"
              />
              <label htmlFor="makeup-trial-travel" className="checkbox-label">
                There was a travel fee for the trial
              </label>
            </div>
            <small id="makeup-trial-travel-help" className="form-help">
              Check if travel fee applies to trials
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="makeup-trial-venue" className="form-label">
              Trial venue
            </label>
            <input
              id="makeup-trial-venue"
              type="text"
              value={makeupForm.trialVenue}
              onChange={(e) => handleGlobalFieldChange('trialVenue', e.target.value)}
              className="input-field"
              placeholder="e.g., Hotel name or address"
              aria-describedby="makeup-trial-venue-help"
            />
            <small id="makeup-trial-venue-help" className="form-help">
              Location where trials will take place
            </small>
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

          <div className="form-group">
            <label htmlFor="makeup-trial-fee" className="form-label">
              Trial travel fee (€)
            </label>
            <input
              id="makeup-trial-fee"
              type="number"
              min="0"
              step="0.01"
              value={makeupForm.trialTravelFee || ''}
              onChange={(e) => handleGlobalFieldChange('trialTravelFee', parseFloat(e.target.value) || 0)}
              onBlur={(e) => handleNumberBlur('trialTravelFee', e.target.value)}
              className="input-field number-input"
              placeholder="0.00"
              aria-describedby="makeup-trial-fee-help"
            />
            <small id="makeup-trial-fee-help" className="form-help">
              Additional fee for traveling to trial location
            </small>
            {renderWarning('trialTravelFee')}
          </div>
        </>
      )}

      {/* Per-day sections */}
      {dates.map((date, idx) => {
        const day = makeupForm.perDay[idx] || defaultDay();
        const dateLabel = idx === 0 ? 'Wedding Day' : `Day ${idx + 1}`;

        // Debounced beauty venue mirroring
        const onBeautyVenueChange = (val: string) => {
          updatePerDay(idx, { beautyVenue: val });
          if (bvDebounceRefs.current[idx]) window.clearTimeout(bvDebounceRefs.current[idx]);
          bvDebounceRefs.current[idx] = window.setTimeout(() => mirrorHairBeautyVenue(idx, val), 200) as unknown as number;
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

            <div className="form-group">
              <label htmlFor={`makeup-beauty-venue-${idx}`} className="form-label">
                Beauty Venue (location)
              </label>
              <input
                id={`makeup-beauty-venue-${idx}`}
                type="text"
                value={day.beautyVenue || ''}
                onChange={(e) => onBeautyVenueChange(e.target.value)}
                className="input-field"
                placeholder="e.g., Hotel Cascais"
              />
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

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  id={`makeup-scheduled-return-${idx}`}
                  type="checkbox"
                  checked={day.scheduledReturn}
                  onChange={(e) => updatePerDay(idx, { scheduledReturn: e.target.checked })}
                  className="checkbox-input"
                />
                <label htmlFor={`makeup-scheduled-return-${idx}`} className="checkbox-label">
                  Scheduled return
                </label>
              </div>
              {srVsTravelError && (
                <ErrorMsg>
                  Scheduled return is not allowed when a Travel fee is applied for Make-up. Set Travel fee to 0 or turn off Scheduled return.
                </ErrorMsg>
              )}
            </div>

            {day.scheduledReturn && (
              <>
                <div className="form-group">
                  <div className="checkbox-group">
                    <input
                      id={`makeup-scheduled-return-bride-${idx}`}
                      type="checkbox"
                      checked={day.scheduledReturnBride}
                      onChange={(e) => updatePerDay(idx, { scheduledReturnBride: e.target.checked })}
                      className="checkbox-input"
                    />
                    <label htmlFor={`makeup-scheduled-return-bride-${idx}`} className="checkbox-label">
                      Bride
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor={`makeup-scheduled-return-guests-${idx}`} className="form-label">
                    Guests (scheduled return)
                  </label>
                  <input
                    id={`makeup-scheduled-return-guests-${idx}`}
                    type="number"
                    min="0"
                    step="1"
                    value={day.scheduledReturnGuests || ''}
                    onChange={(e) => updatePerDay(idx, { scheduledReturnGuests: parseInt(e.target.value) || 0 })}
                    className="input-field number-input"
                    placeholder="0"
                  />
                  {guestsRequireBrideError && (
                    <ErrorMsg>
                      Guests scheduled return requires a scheduled return for the bride (Make-up).
                    </ErrorMsg>
                  )}
                </div>
              </>
            )}

            <div className="form-group">
              <label htmlFor={`makeup-guests-${idx}`} className="form-label">
                How many guests for make-up?
              </label>
              <input
                id={`makeup-guests-${idx}`}
                type="number"
                min="0"
                step="1"
                value={day.guests || ''}
                onChange={(e) => updatePerDay(idx, { guests: parseInt(e.target.value) || 0 })}
                className="input-field number-input"
                placeholder="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor={`makeup-travel-fee-${idx}`} className="form-label">
                Travel fee (€)
              </label>
              <input
                id={`makeup-travel-fee-${idx}`}
                type="number"
                min="0"
                step="0.01"
                value={day.travelFee || ''}
                onChange={(e) => updatePerDay(idx, { travelFee: parseFloat(e.target.value) || 0 })}
                className="input-field number-input"
                placeholder="0.00"
              />
              {srVsTravelError && (
                <ErrorMsg>
                  Scheduled return is not allowed when a Travel fee is applied for Make-up. Set Travel fee to 0 or turn off Scheduled return.
                </ErrorMsg>
              )}
            </div>

            <div className="form-group">
              <label htmlFor={`makeup-num-people-${idx}`} className="form-label">
                How many people (including the main artist)?
              </label>
              <input
                id={`makeup-num-people-${idx}`}
                type="number"
                min="1"
                step="1"
                value={(day as any).numPeople ?? ''}
                onChange={(e) => updatePerDay(idx, { numPeople: Math.max(1, parseInt(e.target.value) || 1) } as any)}
                className="input-field number-input"
                placeholder="1"
              />
              {numPeopleInvalid && (
                <ErrorMsg>At least 1 person required for Make-up.</ErrorMsg>
              )}
              {moreCarsThanPeopleWarn && (
                <WarnMsg>You have more cars than people — please check.</WarnMsg>
              )}
            </div>

            <div className="form-group">
              <label htmlFor={`makeup-num-cars-${idx}`} className="form-label">
                How many cars are going on behalf of make-up?
              </label>
              <input
                id={`makeup-num-cars-${idx}`}
                type="number"
                min="1"
                step="1"
                value={day.numCars ?? ''}
                onChange={(e) => updatePerDay(idx, { numCars: Math.max(1, parseInt(e.target.value) || 1) })}
                className="input-field number-input"
                placeholder="1"
              />
              {numCarsInvalid && (
                <ErrorMsg>At least 1 car required for Make-up.</ErrorMsg>
              )}
              {assistantsOneCarTouchupsError && (
                <ErrorMsg>
                  With assistants and only 1 car, add another car so assistants can return. Note: traveling fee is charged per car.
                </ErrorMsg>
              )}
            </div>

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  id={`makeup-exclusivity-${idx}`}
                  type="checkbox"
                  checked={day.exclusivity}
                  onChange={(e) => updatePerDay(idx, { exclusivity: e.target.checked })}
                  className="checkbox-input"
                />
                <label htmlFor={`makeup-exclusivity-${idx}`} className="checkbox-label">
                  Client is paying an exclusivity fee
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor={`makeup-touchup-hours-${idx}`} className="form-label">
                How many hours of touch-ups?
              </label>
              <input
                id={`makeup-touchup-hours-${idx}`}
                type="number"
                min="0"
                step="0.5"
                value={day.touchupHours || ''}
                onChange={(e) => updatePerDay(idx, { touchupHours: Math.max(0, parseFloat(e.target.value) || 0) })}
                className="input-field number-input"
                placeholder="0"
              />
              {assistantsOneCarTouchupsError && (
                <ErrorMsg>
                  With assistants and only 1 car, add another car so assistants can return. Note: traveling fee is charged per car.
                </ErrorMsg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
