import React, { useState } from 'react';
import { ServiceChoice, PriceMode, DefaultPrices, MultiDay, MakeupForm, HairForm } from '../types';
import { calculateQuote } from '../utils/quoteCalculator';

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
  onConfirm
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingPrices, setEditingPrices] = useState<DefaultPrices>(
    customPrices || defaultPrices
  );

  const currentPrices = priceMode === 'custom' && customPrices ? customPrices : defaultPrices;

  const handleEditPrices = () => {
    setIsEditing(true);
    onPriceModeChange('custom');
    setEditingPrices(customPrices || defaultPrices);
    updateCalculations('custom', customPrices || defaultPrices);
  };

  const handleSaveCustomPrices = () => {
    onCustomPricesChange(editingPrices);
    setIsEditing(false);
    updateCalculations('custom', editingPrices);
  };

  const handleResetToDefault = () => {
    setEditingPrices(defaultPrices);
    onCustomPricesChange(defaultPrices);
    onPriceModeChange('default');
    setIsEditing(false);
    updateCalculations('default', defaultPrices);
  };

  const updateCalculations = (_mode: PriceMode, prices: DefaultPrices) => {
    const weddingDates = multiDay.dates.filter(date => date !== '').slice(0, multiDay.count || 1);
    
    const calculationResult = calculateQuote({
      serviceChoice,
      makeupForm,
      hairForm,
      prices,
      weddingDates
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
      weddingDates
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
            <h3>Hair Services</h3>
            {isEditing ? (
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
