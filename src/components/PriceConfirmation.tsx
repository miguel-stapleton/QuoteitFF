import React from 'react';
import { QuoteFormData, QuoteBreakdown } from '../types';
import { serviceOptions } from '../data/services';

interface PriceConfirmationProps {
  formData: QuoteFormData;
  quoteBreakdown: QuoteBreakdown;
  onConfirm: () => void;
  onBack: () => void;
}

export const PriceConfirmation: React.FC<PriceConfirmationProps> = ({
  formData,
  quoteBreakdown,
  onConfirm,
  onBack
}) => {
  const getServiceName = (serviceId: string) => {
    return serviceOptions.find(s => s.id === serviceId)?.name || serviceId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h1>Confirm Your Details</h1>
        <p>Please review your information before generating the quote</p>
      </div>

      <div className="quote-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Event Summary
        </h3>
        
        <div className="quote-item">
          <span>Event Type:</span>
          <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
            {formData.eventType}
          </span>
        </div>
        
        <div className="quote-item">
          <span>Date:</span>
          <span style={{ fontWeight: '600' }}>
            {formatDate(formData.date)}
          </span>
        </div>
        
        <div className="quote-item">
          <span>Guests:</span>
          <span style={{ fontWeight: '600' }}>
            {formData.guestCount} people
          </span>
        </div>
        
        <div className="quote-item">
          <span>Venue Type:</span>
          <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>
            {formData.venue.replace('-', ' ')}
          </span>
        </div>
        
        <div className="quote-item">
          <span>Budget Range:</span>
          <span style={{ fontWeight: '600' }}>
            ${formData.budget.replace('-', ' - $').replace('+', '+')}
          </span>
        </div>
      </div>

      <div className="quote-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Selected Services
        </h3>
        
        {formData.services.map(serviceId => (
          <div key={serviceId} className="quote-item">
            <span>{getServiceName(serviceId)}</span>
            <span style={{ fontWeight: '600', color: 'var(--accent)' }}>
              ${quoteBreakdown.serviceCharges[serviceId]?.toLocaleString() || '0'}
            </span>
          </div>
        ))}
      </div>

      <div className="quote-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Contact Information
        </h3>
        
        <div className="quote-item">
          <span>Name:</span>
          <span style={{ fontWeight: '600' }}>
            {formData.contactInfo.name}
          </span>
        </div>
        
        <div className="quote-item">
          <span>Email:</span>
          <span style={{ fontWeight: '600' }}>
            {formData.contactInfo.email}
          </span>
        </div>
        
        {formData.contactInfo.phone && (
          <div className="quote-item">
            <span>Phone:</span>
            <span style={{ fontWeight: '600' }}>
              {formData.contactInfo.phone}
            </span>
          </div>
        )}
      </div>

      <div className="quote-card" style={{ textAlign: 'center' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Estimated Total
        </h3>
        <div className="quote-total">
          ${quoteBreakdown.total.toLocaleString()}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          *Final pricing may vary based on specific requirements
        </p>
      </div>

      <div style={{ height: '8rem' }} />

      <div className="sticky-cta">
        <button
          type="button"
          className="btn-secondary"
          onClick={onBack}
        >
          ← Back to Edit
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={onConfirm}
        >
          Generate Final Quote
        </button>
      </div>
    </div>
  );
};
