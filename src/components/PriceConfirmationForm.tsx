import React, { useState } from 'react';
import { ServiceChoice, PriceMode, DefaultPrices, MultiDay, MakeupForm, HairForm, HairArtist } from '../types';
import { calculateQuote } from '../utils/quoteCalculator';
import { makeupArtistPrices, hairArtistPrices, agneFlatRate } from '../data/services';
import { useMemo } from 'react';

interface PriceConfirmationFormProps {
  serviceChoice: ServiceChoice;
  multiDay: MultiDay;
  makeupForm: MakeupForm | undefined;
  hairForm: HairForm | undefined;
  priceMode: PriceMode;
  defaultPrices: DefaultPrices;
  customPrices: DefaultPrices | undefined;
  onPriceModeChange: (mode: PriceMode) => void;
  onCustomPricesChange: (prices: DefaultPrices) => void;
  onCalculationsUpdate: (calculations: any, grandSummary: any) => void;
  onConfirm: () => void;
  existingCalculations?: any[] // Add existing calculations to preserve payments
}

export const PriceConfirmationForm: React.FC<PriceConfirmationFormProps> = ({
  serviceChoice,
  multiDay,
  makeupForm,
  hairForm,
  priceMode,
  defaultPrices,
  customPrices,
  onPriceModeChange,
  onCustomPricesChange,
  onCalculationsUpdate,
  onConfirm,
  existingCalculations
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [agneFlatRateCustom, setAgneFlatRateCustom] = useState({
    baseRate: agneFlatRate.baseRate,
    extraTrial: agneFlatRate.addOns.extraTrial,
    extraDay: agneFlatRate.addOns.extraDay,
    extraGuest: agneFlatRate.addOns.extraGuest,
    extraHourRate: agneFlatRate.addOns.extraHourRate,
    depositMain: agneFlatRate.deposits.main,
    depositAssistant: agneFlatRate.deposits.assistant
  });

  const isAgneFlatRate = serviceChoice.hair && hairForm?.artist === HairArtist.Agne;

  // Derive artist-specific default prices for makeup/hair when available
  const derivedDefaultPrices: DefaultPrices = useMemo(() => {
    let result = { ...defaultPrices };
    if (serviceChoice.makeup && makeupForm?.artist) {
      const artistDefault = makeupArtistPrices[makeupForm.artist];
      if (artistDefault) {
        result = { ...result, makeup: artistDefault };
      }
    }
    if (serviceChoice.hair && hairForm?.artist) {
      const artistDefaultH = hairArtistPrices[hairForm.artist];
      if (artistDefaultH) {
        result = { ...result, hair: artistDefaultH };
      }
    }
    return result;
  }, [serviceChoice.makeup, serviceChoice.hair, makeupForm?.artist, hairForm?.artist, defaultPrices]);

  const [editingPrices, setEditingPrices] = useState<DefaultPrices>(
    customPrices || derivedDefaultPrices
  );

  const currentPrices = priceMode === 'custom' && customPrices ? customPrices : derivedDefaultPrices;

  const handleEditPrices = () => {
    setIsEditing(true);
    onPriceModeChange('custom');
    setEditingPrices(customPrices || derivedDefaultPrices);
    updateCalculations('custom', customPrices || derivedDefaultPrices);
  };

  const handleSaveCustomPrices = () => {
    onCustomPricesChange(editingPrices);
    setIsEditing(false);
    updateCalculations('custom', editingPrices);
  };

  const handleResetToDefault = () => {
    setEditingPrices(derivedDefaultPrices);
    onCustomPricesChange(derivedDefaultPrices);
    onPriceModeChange('default');
    setIsEditing(false);
    updateCalculations('default', derivedDefaultPrices);
  };

  const updateCalculations = (_mode: PriceMode, prices: DefaultPrices) => {
    const weddingDates = multiDay.dates.filter(date => date !== '').slice(0, multiDay.count || 1);
    
    const calculationResult = calculateQuote({
      serviceChoice,
      makeupForm,
      hairForm,
      prices,
      weddingDates,
      existingCalculations // Add existing calculations to preserve payments
    });

    onCalculationsUpdate(calculationResult.calculations, calculationResult.grandSummary);
  };

  const handleConfirm = () => {
    // Calculate quotes with current pricing
    const weddingDates = multiDay.dates.filter(date => date !== '').slice(0, multiDay.count || 1);
    
    const calculationResult = calculateQuote({
      serviceChoice,
      makeupForm,
      hairForm,
      prices: currentPrices,
      weddingDates,
      existingCalculations // Add existing calculations to preserve payments
    });

    // Update calculations in app state
    onCalculationsUpdate(calculationResult.calculations, calculationResult.grandSummary);
    
    // Proceed to result screen
    onConfirm();
  };

  const handlePriceChange = (service: 'makeup' | 'hair', field: string, value: string) => {
    const numValue = Math.max(0, parseFloat(value) || 0);
    setEditingPrices(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        [field]: numValue
      }
    }));
  };

  return (
    <div className="price-confirmation-form">
      <div className="form-header">
        <h2>Price Confirmation</h2>
        <p className="subtitle">Review and confirm your pricing</p>
      </div>

      <div className="price-summary-card">
        <div className="price-mode-indicator">
          <span className={`price-mode-badge ${priceMode}`}>
            {priceMode === 'default' ? 'Default Pricing' : 'Custom Pricing'}
          </span>
        </div>

        {serviceChoice.makeup && (
          <div className="service-pricing-section">
            <h3>Makeup Services</h3>
            {isEditing ? (
              <div className="price-editor" role="group" aria-labelledby="makeup-price-editor-heading">
                <h4 id="makeup-price-editor-heading" className="sr-only">Edit Makeup Service Prices</h4>
                <div className="price-field">
                  <label htmlFor="makeup-trial-unit-price" className="price-label">
                    Trial Unit Price
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-trial-unit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.trialUnit}
                      onChange={(e) => handlePriceChange('makeup', 'trialUnit', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-trial-unit-help"
                    />
                  </div>
                  <small id="makeup-trial-unit-help" className="price-help">
                    Price per makeup trial session
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-bridal-unit-price" className="price-label">
                    Bridal Unit Price
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-bridal-unit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.bridalUnit}
                      onChange={(e) => handlePriceChange('makeup', 'bridalUnit', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-bridal-unit-help"
                    />
                  </div>
                  <small id="makeup-bridal-unit-help" className="price-help">
                    Price for bridal makeup service
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-guest-unit-price" className="price-label">
                    Guest Unit Price
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-guest-unit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.guestUnit}
                      onChange={(e) => handlePriceChange('makeup', 'guestUnit', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-guest-unit-help"
                    />
                  </div>
                  <small id="makeup-guest-unit-help" className="price-help">
                    Price per guest makeup service
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-scheduled-return-bride-price" className="price-label">
                    Scheduled Return Bride
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-scheduled-return-bride-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.scheduledReturnBride}
                      onChange={(e) => handlePriceChange('makeup', 'scheduledReturnBride', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-scheduled-return-bride-help"
                    />
                  </div>
                  <small id="makeup-scheduled-return-bride-help" className="price-help">
                    Price for bride's scheduled return service
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-scheduled-return-guest-price" className="price-label">
                    Scheduled Return Guest Unit
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-scheduled-return-guest-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.scheduledReturnGuestUnit}
                      onChange={(e) => handlePriceChange('makeup', 'scheduledReturnGuestUnit', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-scheduled-return-guest-help"
                    />
                  </div>
                  <small id="makeup-scheduled-return-guest-help" className="price-help">
                    Price per guest for scheduled return service
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-touchup-hourly-price" className="price-label">
                    Touch-up Hourly Rate
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-touchup-hourly-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.touchupHourly}
                      onChange={(e) => handlePriceChange('makeup', 'touchupHourly', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-touchup-hourly-help"
                    />
                  </div>
                  <small id="makeup-touchup-hourly-help" className="price-help">
                    Hourly rate for touch-up services
                  </small>
                </div>
                
                <div className="price-field">
                  <label htmlFor="makeup-exclusivity-fee-price" className="price-label">
                    Exclusivity Fee
                  </label>
                  <div className="price-input-wrapper">
                    <span className="currency" aria-hidden="true">€</span>
                    <input
                      id="makeup-exclusivity-fee-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editingPrices.makeup.exclusivityFee}
                      onChange={(e) => handlePriceChange('makeup', 'exclusivityFee', e.target.value)}
                      className="price-input"
                      aria-describedby="makeup-exclusivity-fee-help"
                    />
                  </div>
                  <small id="makeup-exclusivity-fee-help" className="price-help">
                    Fee for exclusive service arrangement
                  </small>
                </div>
              </div>
            ) : (
              <div className="price-summary" role="group" aria-labelledby="makeup-price-summary-heading">
                <h4 id="makeup-price-summary-heading" className="sr-only">Makeup Service Price Summary</h4>
                <div className="price-item">
                  <span className="price-item-label">Trial Unit:</span>
                  <span className="price-item-value">€{currentPrices.makeup.trialUnit.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Bridal Unit:</span>
                  <span className="price-item-value">€{currentPrices.makeup.bridalUnit.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Guest Unit:</span>
                  <span className="price-item-value">€{currentPrices.makeup.guestUnit.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Scheduled Return Bride:</span>
                  <span className="price-item-value">€{currentPrices.makeup.scheduledReturnBride.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Scheduled Return Guest Unit:</span>
                  <span className="price-item-value">€{currentPrices.makeup.scheduledReturnGuestUnit.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Touch-up Hourly:</span>
                  <span className="price-item-value">€{currentPrices.makeup.touchupHourly.toFixed(2)}</span>
                </div>
                <div className="price-item">
                  <span className="price-item-label">Exclusivity Fee:</span>
                  <span className="price-item-value">€{currentPrices.makeup.exclusivityFee.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {serviceChoice.hair && (
          <div className="service-pricing-section">
            <h3>Hair Services {isAgneFlatRate && '(Agne - Flat Rate)'}</h3>
            {isAgneFlatRate ? (
              isEditing ? (
                <div className="price-editor" role="group" aria-labelledby="agne-flat-rate-editor-heading">
                  <h4 id="agne-flat-rate-editor-heading" className="sr-only">Edit Agne Flat Rate Prices</h4>
                  <div className="price-field">
                    <label htmlFor="agne-base-rate" className="price-label">
                      Base Flat Rate
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-base-rate"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.baseRate}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, baseRate: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-base-rate-help"
                      />
                    </div>
                    <small id="agne-base-rate-help" className="price-help">
                      Includes: 1 trial, bridal hairstyle + up to 3 guests, 8 hours on Day 1
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-extra-trial" className="price-label">
                      Extra Trial (per session)
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-extra-trial"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.extraTrial}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, extraTrial: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-extra-trial-help"
                      />
                    </div>
                    <small id="agne-extra-trial-help" className="price-help">
                      Price per additional trial beyond the 1st included
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-extra-day" className="price-label">
                      Extra Day (bride only)
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-extra-day"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.extraDay}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, extraDay: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-extra-day-help"
                      />
                    </div>
                    <small id="agne-extra-day-help" className="price-help">
                      Price for bride styling on additional wedding days
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-extra-guest" className="price-label">
                      Extra Guest (per person)
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-extra-guest"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.extraGuest}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, extraGuest: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-extra-guest-help"
                      />
                    </div>
                    <small id="agne-extra-guest-help" className="price-help">
                      Price per guest beyond 3 on Day 1, or per guest on extra days
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-extra-hour" className="price-label">
                      Extra Hour (per hour)
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-extra-hour"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.extraHourRate}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, extraHourRate: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-extra-hour-help"
                      />
                    </div>
                    <small id="agne-extra-hour-help" className="price-help">
                      Hourly rate for touch-ups beyond the 8 hours included
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-deposit-main" className="price-label">
                      Main Artist Deposit
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-deposit-main"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.depositMain}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, depositMain: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-deposit-main-help"
                      />
                    </div>
                    <small id="agne-deposit-main-help" className="price-help">
                      Required deposit to secure Agne (used for priority warnings only)
                    </small>
                  </div>

                  <div className="price-field">
                    <label htmlFor="agne-deposit-assistant" className="price-label">
                      Assistant Deposit
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="agne-deposit-assistant"
                        type="number"
                        min="0"
                        step="1"
                        value={agneFlatRateCustom.depositAssistant}
                        onChange={(e) => setAgneFlatRateCustom(prev => ({ ...prev, depositAssistant: parseFloat(e.target.value) || 0 }))}
                        className="price-input"
                        aria-describedby="agne-deposit-assistant-help"
                      />
                    </div>
                    <small id="agne-deposit-assistant-help" className="price-help">
                      Required deposit per assistant (used for priority warnings only)
                    </small>
                  </div>
                </div>
              ) : (
                <div className="price-summary" role="group" aria-labelledby="agne-flat-rate-summary-heading">
                  <h4 id="agne-flat-rate-summary-heading" className="sr-only">Agne Flat Rate Price Summary</h4>
                  <div className="price-item">
                    <span className="price-item-label">Base Flat Rate:</span>
                    <span className="price-item-value">€{agneFlatRateCustom.baseRate.toFixed(2)}</span>
                  </div>
                  <div className="price-item" style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '1rem' }}>
                    <span>Includes: 1 trial, bride + 3 guests, 8 hours</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Extra Trial:</span>
                    <span className="price-item-value">€{agneFlatRateCustom.extraTrial.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Extra Day (bride):</span>
                    <span className="price-item-value">€{agneFlatRateCustom.extraDay.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Extra Guest:</span>
                    <span className="price-item-value">€{agneFlatRateCustom.extraGuest.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Extra Hour:</span>
                    <span className="price-item-value">€{agneFlatRateCustom.extraHourRate.toFixed(2)}</span>
                  </div>
                  <div className="price-item" style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
                    <span>Deposit amounts (Main: €{agneFlatRateCustom.depositMain.toFixed(2)}, Assistant: €{agneFlatRateCustom.depositAssistant.toFixed(2)}) are used for priority warnings only</span>
                  </div>
                </div>
              )
            ) : (
              isEditing ? (
                <div className="price-editor" role="group" aria-labelledby="hair-price-editor-heading">
                  <h4 id="hair-price-editor-heading" className="sr-only">Edit Hair Service Prices</h4>
                  <div className="price-field">
                    <label htmlFor="hair-trial-unit-price" className="price-label">
                      Trial Unit Price
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-trial-unit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.trialUnit}
                        onChange={(e) => handlePriceChange('hair', 'trialUnit', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-trial-unit-help"
                      />
                    </div>
                    <small id="hair-trial-unit-help" className="price-help">
                      Price per hair trial session
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-bridal-unit-price" className="price-label">
                      Bridal Unit Price
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-bridal-unit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.bridalUnit}
                        onChange={(e) => handlePriceChange('hair', 'bridalUnit', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-bridal-unit-help"
                      />
                    </div>
                    <small id="hair-bridal-unit-help" className="price-help">
                      Price for bridal hair service
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-guest-unit-price" className="price-label">
                      Guest Unit Price
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-guest-unit-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.guestUnit}
                        onChange={(e) => handlePriceChange('hair', 'guestUnit', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-guest-unit-help"
                      />
                    </div>
                    <small id="hair-guest-unit-help" className="price-help">
                      Price per guest hair service
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-scheduled-return-bride-price" className="price-label">
                      Scheduled Return Bride
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-scheduled-return-bride-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.scheduledReturnBride}
                        onChange={(e) => handlePriceChange('hair', 'scheduledReturnBride', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-scheduled-return-bride-help"
                      />
                    </div>
                    <small id="hair-scheduled-return-bride-help" className="price-help">
                      Price for bride's scheduled return service
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-scheduled-return-guest-price" className="price-label">
                      Scheduled Return Guest Unit
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-scheduled-return-guest-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.scheduledReturnGuestUnit}
                        onChange={(e) => handlePriceChange('hair', 'scheduledReturnGuestUnit', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-scheduled-return-guest-help"
                      />
                    </div>
                    <small id="hair-scheduled-return-guest-help" className="price-help">
                      Price per guest for scheduled return service
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-touchup-hourly-price" className="price-label">
                      Touch-up Hourly Rate
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-touchup-hourly-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.touchupHourly}
                        onChange={(e) => handlePriceChange('hair', 'touchupHourly', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-touchup-hourly-help"
                      />
                    </div>
                    <small id="hair-touchup-hourly-help" className="price-help">
                      Hourly rate for touch-up services
                    </small>
                  </div>
                  
                  <div className="price-field">
                    <label htmlFor="hair-exclusivity-fee-price" className="price-label">
                      Exclusivity Fee
                    </label>
                    <div className="price-input-wrapper">
                      <span className="currency" aria-hidden="true">€</span>
                      <input
                        id="hair-exclusivity-fee-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editingPrices.hair.exclusivityFee}
                        onChange={(e) => handlePriceChange('hair', 'exclusivityFee', e.target.value)}
                        className="price-input"
                        aria-describedby="hair-exclusivity-fee-help"
                      />
                    </div>
                    <small id="hair-exclusivity-fee-help" className="price-help">
                      Fee for exclusive service arrangement
                    </small>
                  </div>
                </div>
              ) : (
                <div className="price-summary" role="group" aria-labelledby="hair-price-summary-heading">
                  <h4 id="hair-price-summary-heading" className="sr-only">Hair Service Price Summary</h4>
                  <div className="price-item">
                    <span className="price-item-label">Trial Unit:</span>
                    <span className="price-item-value">€{currentPrices.hair.trialUnit.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Bridal Unit:</span>
                    <span className="price-item-value">€{currentPrices.hair.bridalUnit.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Guest Unit:</span>
                    <span className="price-item-value">€{currentPrices.hair.guestUnit.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Scheduled Return Bride:</span>
                    <span className="price-item-value">€{currentPrices.hair.scheduledReturnBride.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Scheduled Return Guest Unit:</span>
                    <span className="price-item-value">€{currentPrices.hair.scheduledReturnGuestUnit.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Touch-up Hourly:</span>
                    <span className="price-item-value">€{currentPrices.hair.touchupHourly.toFixed(2)}</span>
                  </div>
                  <div className="price-item">
                    <span className="price-item-label">Exclusivity Fee:</span>
                    <span className="price-item-value">€{currentPrices.hair.exclusivityFee.toFixed(2)}</span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      <div className="action-buttons">
        {isEditing ? (
          <div className="editing-buttons">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleResetToDefault}
            >
              Reset to Default
            </button>
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleSaveCustomPrices}
            >
              Save Custom Prices
            </button>
          </div>
        ) : (
          <div className="confirmation-buttons">
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleEditPrices}
            >
              Edit prices
            </button>
            <button 
              type="button" 
              className="btn btn-primary btn-large"
              onClick={handleConfirm}
            >
              Yes, this is it!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
