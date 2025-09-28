import React, { useState } from 'react';
import { ServiceChoice, MultiDay, MakeupForm, HairForm } from '../types';
import { WeddingBasicsForm } from './WeddingBasicsForm';
import { ServiceSelectionForm } from './ServiceSelectionForm';
import { MakeupServiceForm } from './MakeupServiceForm';
import { HairServiceForm } from './HairServiceForm';

interface MainFormProps {
  onSubmit: () => void;
  serviceChoice: ServiceChoice;
  multiDay: MultiDay;
  makeupForm?: MakeupForm;
  hairForm?: HairForm;
  onServiceChoiceChange: (serviceChoice: ServiceChoice) => void;
  onMultiDayChange: (multiDay: MultiDay) => void;
  onMakeupFormChange: (makeupForm: MakeupForm | undefined) => void;
  onHairFormChange: (hairForm: HairForm | undefined) => void;
  onClearAll?: () => void;
  trialSyncEnabled: boolean;
  beautyVenueSyncEnabled: boolean[];
  onTrialSyncChange: (enabled: boolean) => void;
  onBeautyVenueSyncToggle: (index: number, enabled: boolean) => void;
}

export const MainForm: React.FC<MainFormProps> = ({ 
  onSubmit, 
  serviceChoice, 
  multiDay, 
  makeupForm, 
  hairForm,
  onServiceChoiceChange,
  onMultiDayChange,
  onMakeupFormChange,
  onHairFormChange,
  onClearAll,
  trialSyncEnabled,
  beautyVenueSyncEnabled,
  onTrialSyncChange,
  onBeautyVenueSyncToggle
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const violatesSRRules = (form: { perDay: any[] } | undefined) => {
    if (!form || !form.perDay) return false;
    return form.perDay.some((day) => {
      if (!day) return false;
      const travelFee = Number(day.travelFee) || 0;
      const scheduledReturn = !!day.scheduledReturn;
      const bride = !!day.scheduledReturnBride;
      const guests = Number(day.scheduledReturnGuests) || 0;
      // 1) No scheduled returns if travel fee > 0
      if (travelFee > 0 && scheduledReturn) return true;
      // 2) Guest SR requires bride SR
      if (guests > 0 && !bride) return true;
      return false;
    });
  };

  const violatesAssistantsOneCarTouchups = (form: { perDay: any[] } | undefined) => {
    if (!form?.perDay) return false;
    return form.perDay.some((day) => {
      if (!day) return false;
      const numPeople = Math.max(0, Number((day as any).numPeople) || 0);
      const numCars = Math.max(0, Number(day.numCars) || 0);
      const touchupHours = Math.max(0, Number(day.touchupHours) || 0);
      return numPeople > 1 && numCars === 1 && touchupHours > 0;
    });
  };

  const basicInvalid = (form: { perDay: any[] } | undefined) => {
    if (!form?.perDay) return false;
    return form.perDay.some((day) => {
      if (!day) return false;
      const numPeople = Math.max(0, Number((day as any).numPeople) || 0);
      const numCars = Math.max(0, Number(day.numCars) || 0);
      return numPeople < 1 || numCars < 1;
    });
  };

  const isFormValid = () => {
    // Must have at least one wedding date
    if (!multiDay.dates[0]) return false;
    
    // Must have at least one service selected
    if (!serviceChoice.makeup && !serviceChoice.hair) return false;
    
    // If makeup is selected, must have artist chosen
    if (serviceChoice.makeup && (!makeupForm || !makeupForm.artist)) return false;
    
    // If hair is selected, must have artist chosen
    if (serviceChoice.hair && (!hairForm || !hairForm.artist)) return false;
    
    // If multi-day is enabled, all selected dates must be filled
    if (multiDay.hasMultipleDays && multiDay.count) {
      for (let i = 0; i < multiDay.count; i++) {
        if (!multiDay.dates[i]) return false;
      }
    }

    // Block on scheduled-return constraints
    if (serviceChoice.makeup && violatesSRRules(makeupForm as any)) return false;
    if (serviceChoice.hair && violatesSRRules(hairForm as any)) return false;

    // Block on assistants + only 1 car + touch-ups
    if (serviceChoice.makeup && violatesAssistantsOneCarTouchups(makeupForm as any)) return false;
    if (serviceChoice.hair && violatesAssistantsOneCarTouchups(hairForm as any)) return false;

    // Block on basic invalids
    if (serviceChoice.makeup && basicInvalid(makeupForm as any)) return false;
    if (serviceChoice.hair && basicInvalid(hairForm as any)) return false;

    return true;
  };

  const getSelectedServicesText = () => {
    const services = [];
    if (serviceChoice.makeup && makeupForm?.artist) {
      services.push(`Makeup (${makeupForm.artist})`);
    }
    if (serviceChoice.hair && hairForm?.artist) {
      services.push(`Hair (${hairForm.artist})`);
    }
    return services.join(' + ');
  };

  const handleClearAll = () => {
    if (onClearAll) {
      onClearAll();
      setShowClearConfirm(false);
      setShowSettings(false);
    }
  };

  const activeDates = multiDay.hasMultipleDays && multiDay.count
    ? multiDay.dates.slice(0, multiDay.count)
    : multiDay.dates.slice(0, 1);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!multiDay.dates[0]) errors.push('Please select a wedding date');
    if (multiDay.dates[0] && !serviceChoice.makeup && !serviceChoice.hair) errors.push('Please select at least one service');
    if (serviceChoice.makeup && (!makeupForm || !makeupForm.artist)) errors.push('Please choose a makeup artist');
    if (serviceChoice.hair && (!hairForm || !hairForm.artist)) errors.push('Please choose a hair artist');
    if (multiDay.hasMultipleDays && multiDay.count && multiDay.dates.slice(0, multiDay.count).some(d => !d)) errors.push('Please fill in all celebration dates');

    const srErrorsFor = (label: string, form?: { perDay?: any[] }) => {
      if (!form?.perDay) return;
      form.perDay.forEach((day, idx) => {
        if (!day) return;
        const travelFee = Number(day.travelFee) || 0;
        const scheduledReturn = !!day.scheduledReturn;
        const bride = !!day.scheduledReturnBride;
        const guests = Number(day.scheduledReturnGuests) || 0;
        const numPeople = Math.max(0, Number((day as any).numPeople) || 0);
        const numCars = Math.max(0, Number(day.numCars) || 0);
        const touchupHours = Math.max(0, Number(day.touchupHours) || 0);
        const dateTag = multiDay.dates[idx] ? new Date(multiDay.dates[idx]).toLocaleDateString('en-GB') : `Day ${idx + 1}`;
        if (travelFee > 0 && scheduledReturn) {
          errors.push(`${label} — Scheduled returns are not allowed when travel fee > 0 (${dateTag})`);
        }
        if (guests > 0 && !bride) {
          errors.push(`${label} — Guest scheduled return requires bride scheduled return (${dateTag})`);
        }
        if (numPeople > 1 && numCars === 1 && touchupHours > 0) {
          errors.push(`${label} — With assistants and only 1 car, add another car so assistants can return. Note: traveling fee is charged per car. (${dateTag})`);
        }
        if (numPeople < 1) {
          errors.push(`${label} — At least 1 person is required (${dateTag})`);
        }
        if (numCars < 1) {
          errors.push(`${label} — At least 1 car is required (${dateTag})`);
        }
        if (numCars > numPeople) {
          errors.push(`${label} — You have more cars than people — please check. (${dateTag})`);
        }
      });
    };
    if (serviceChoice.makeup) srErrorsFor('Make-up', makeupForm as any);
    if (serviceChoice.hair) srErrorsFor('Hairstyling', hairForm as any);
    return errors;
  };

  const focusFirstInvalidField = () => {
    // Try to find a specific field ID to focus, based on priority
    const tryFocus = (id: string) => {
      const el = document.getElementById(id);
      if (el) {
        (el as HTMLElement).focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return true;
      }
      return false;
    };

    const scanForm = (label: 'makeup' | 'hair', form?: { perDay?: any[] }) => {
      if (!form?.perDay) return false;
      for (let idx = 0; idx < form.perDay.length; idx++) {
        const day = form.perDay[idx];
        if (!day) continue;
        const travelFee = Number(day.travelFee) || 0;
        const scheduledReturn = !!day.scheduledReturn;
        const bride = !!day.scheduledReturnBride;
        const guests = Number(day.scheduledReturnGuests) || 0;
        const numPeople = Math.max(0, Number((day as any).numPeople) || 0);
        const numCars = Math.max(0, Number(day.numCars) || 0);
        const touchupHours = Math.max(0, Number(day.touchupHours) || 0);
        // SR vs travel -> focus travel fee input
        if (travelFee > 0 && scheduledReturn) return tryFocus(`${label}-travel-fee-${idx}`);
        // Guests require bride -> focus bride SR checkbox
        if (guests > 0 && !bride) return tryFocus(`${label}-scheduled-return-bride-${idx}`);
        // Assistants + 1 car + touch-ups -> focus cars first
        if (numPeople > 1 && numCars === 1 && touchupHours > 0) return tryFocus(`${label}-num-cars-${idx}`) || tryFocus(`${label}-touchup-hours-${idx}`);
        // Basic sanity
        if (numPeople < 1) return tryFocus(`${label}-num-people-${idx}`);
        if (numCars < 1) return tryFocus(`${label}-num-cars-${idx}`);
      }
      return false;
    };

    if (serviceChoice.makeup && scanForm('makeup', makeupForm as any)) return;
    if (serviceChoice.hair && scanForm('hair', hairForm as any)) return;
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      focusFirstInvalidField();
      return;
    }
    onSubmit();
  };

  return (
    <div className="slide-in">
      <div className="header">
        <div className="header-content">
          <div className="header-text">
            <h1>Fresh Faced Quoter</h1>
            <p>Professional makeup and hair services for your special day</p>
          </div>
          <div className="header-actions">
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
          </div>
        </div>
        
        {/* Settings Dropdown */}
        {showSettings && (
          <div className="settings-dropdown">
            <button 
              className="settings-item danger"
              onClick={() => setShowClearConfirm(true)}
            >
              🗑️ Clear All Data
            </button>
          </div>
        )}
        
        {/* Clear Confirmation Modal */}
        {showClearConfirm && (
          <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Clear All Data?</h3>
              <p>This will permanently delete all your form data, custom prices, and saved quotes. This action cannot be undone.</p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowClearConfirm(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={handleClearAll}
                >
                  Clear All Data
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Summary Chip */}
      {(serviceChoice.makeup || serviceChoice.hair) && (
        <div className="services-summary-chip">
          <div className="chip-content">
            <span className="chip-label">Selected Services:</span>
            <span className="chip-services">
              {getSelectedServicesText() || 'Choose your artists'}
            </span>
          </div>
        </div>
      )}

      {/* Wedding Basics Section */}
      <WeddingBasicsForm
        multiDay={multiDay}
        onMultiDayChange={onMultiDayChange}
      />

      {/* Service Selection Section */}
      <ServiceSelectionForm
        serviceChoice={serviceChoice}
        onServiceChoiceChange={onServiceChoiceChange}
      />

      {/* Conditional Service Forms */}
      {serviceChoice.makeup && makeupForm && (
        <MakeupServiceForm
          makeupForm={makeupForm}
          onMakeupFormChange={onMakeupFormChange}
          dates={activeDates}
          bothSelected={serviceChoice.makeup && serviceChoice.hair}
          trialSyncEnabled={trialSyncEnabled}
          onTrialSyncChange={onTrialSyncChange}
          beautyVenueSyncEnabled={beautyVenueSyncEnabled}
          onBeautyVenueSyncToggle={onBeautyVenueSyncToggle}
          hairForm={hairForm}
          onHairFormChange={onHairFormChange}
        />
      )}

      {serviceChoice.hair && hairForm && (
        <HairServiceForm
          hairForm={hairForm}
          onHairFormChange={onHairFormChange}
          dates={activeDates}
          bothSelected={serviceChoice.makeup && serviceChoice.hair}
          trialSyncEnabled={trialSyncEnabled}
          onTrialSyncChange={onTrialSyncChange}
          beautyVenueSyncEnabled={beautyVenueSyncEnabled}
          onBeautyVenueSyncToggle={onBeautyVenueSyncToggle}
          makeupForm={makeupForm}
          onMakeupFormChange={onMakeupFormChange}
        />
      )}

      {/* Spacer for sticky button */}
      <div style={{ height: '6rem' }} />

      {/* Sticky Quote It! Button */}
      <div className="sticky-cta">
        <button
          type="button"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!isFormValid()}
        >
          Quote it! 💫
        </button>
        
        {!isFormValid() && (
          <div style={{ marginTop: '0.75rem' }}>
            {getValidationErrors().map((msg, i) => (
              <div key={i} style={{
                color: '#b91c1c', // red-700
                background: '#fee2e2', // red-100
                border: '1px solid #fecaca', // red-200
                borderRadius: '6px',
                padding: '8px 12px',
                marginBottom: '6px',
                fontSize: '0.9rem'
              }}>
                {msg}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
