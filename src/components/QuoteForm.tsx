import React, { useState } from 'react';
import { QuoteFormData } from '../types';
import { serviceOptions } from '../data/services';

interface QuoteFormProps {
  onSubmit: (data: QuoteFormData) => void;
}

export const QuoteForm: React.FC<QuoteFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<QuoteFormData>({
    eventType: '',
    guestCount: 0,
    venue: '',
    date: '',
    services: [],
    budget: '',
    contactInfo: {
      name: '',
      email: '',
      phone: ''
    }
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      contactInfo: {
        ...prev.contactInfo,
        [field]: value
      }
    }));
  };

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId)
        ? prev.services.filter(id => id !== serviceId)
        : [...prev.services, serviceId]
    }));
  };

  const isFormValid = () => {
    return formData.eventType &&
           formData.guestCount > 0 &&
           formData.venue &&
           formData.date &&
           formData.services.length > 0 &&
           formData.budget &&
           formData.contactInfo.name &&
           formData.contactInfo.email;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFormValid()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h1>Fresh Faced Quoter</h1>
        <p>Get your personalized wedding quote in minutes</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="eventType" className="input-label">
            Event Type
          </label>
          <select
            id="eventType"
            className="input-field select-field"
            value={formData.eventType}
            onChange={(e) => handleInputChange('eventType', e.target.value)}
            required
          >
            <option value="">Select event type</option>
            <option value="wedding">Wedding</option>
            <option value="engagement">Engagement Party</option>
            <option value="anniversary">Anniversary</option>
            <option value="reception">Reception Only</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="guestCount" className="input-label">
            Number of Guests
          </label>
          <input
            type="number"
            id="guestCount"
            className="input-field"
            placeholder="Enter guest count"
            value={formData.guestCount || ''}
            onChange={(e) => handleInputChange('guestCount', parseInt(e.target.value) || 0)}
            min="1"
            max="500"
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="venue" className="input-label">
            Venue Type
          </label>
          <select
            id="venue"
            className="input-field select-field"
            value={formData.venue}
            onChange={(e) => handleInputChange('venue', e.target.value)}
            required
          >
            <option value="">Select venue type</option>
            <option value="indoor">Indoor Venue</option>
            <option value="outdoor">Outdoor Venue</option>
            <option value="destination">Destination Wedding</option>
            <option value="luxury">Luxury Venue</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="date" className="input-label">
            Event Date
          </label>
          <input
            type="date"
            id="date"
            className="input-field"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="input-group">
          <label className="input-label">
            Services Needed
          </label>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {serviceOptions.map(service => (
              <label
                key={service.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: '0.75rem',
                  border: formData.services.includes(service.id) 
                    ? '2px solid var(--accent)' 
                    : '2px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <input
                  type="checkbox"
                  checked={formData.services.includes(service.id)}
                  onChange={() => handleServiceToggle(service.id)}
                  style={{ marginRight: '0.75rem', transform: 'scale(1.2)' }}
                />
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {service.name}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {service.description}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: '600' }}>
                    From ${service.basePrice.toLocaleString()}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label htmlFor="budget" className="input-label">
            Budget Range
          </label>
          <select
            id="budget"
            className="input-field select-field"
            value={formData.budget}
            onChange={(e) => handleInputChange('budget', e.target.value)}
            required
          >
            <option value="">Select budget range</option>
            <option value="5000-10000">$5,000 - $10,000</option>
            <option value="10000-20000">$10,000 - $20,000</option>
            <option value="20000-35000">$20,000 - $35,000</option>
            <option value="35000-50000">$35,000 - $50,000</option>
            <option value="50000+">$50,000+</option>
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="name" className="input-label">
            Your Name
          </label>
          <input
            type="text"
            id="name"
            className="input-field"
            placeholder="Enter your full name"
            value={formData.contactInfo.name}
            onChange={(e) => handleContactChange('name', e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="email" className="input-label">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="input-field"
            placeholder="Enter your email"
            value={formData.contactInfo.email}
            onChange={(e) => handleContactChange('email', e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label htmlFor="phone" className="input-label">
            Phone Number (Optional)
          </label>
          <input
            type="tel"
            id="phone"
            className="input-field"
            placeholder="Enter your phone number"
            value={formData.contactInfo.phone}
            onChange={(e) => handleContactChange('phone', e.target.value)}
          />
        </div>

        <div style={{ height: '6rem' }} />
      </form>

      <div className="sticky-cta">
        <button
          type="submit"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!isFormValid()}
        >
          Get My Quote
        </button>
      </div>
    </div>
  );
};
