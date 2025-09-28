import React from 'react';
import { ServiceChoice } from '../types';

interface ServiceSelectionFormProps {
  serviceChoice: ServiceChoice;
  onServiceChoiceChange: (serviceChoice: ServiceChoice) => void;
}

export const ServiceSelectionForm: React.FC<ServiceSelectionFormProps> = ({
  serviceChoice,
  onServiceChoiceChange
}) => {
  const handleServiceToggle = (service: 'makeup' | 'hair', checked: boolean) => {
    onServiceChoiceChange({
      ...serviceChoice,
      [service]: checked
    });
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Which Services?</h2>
        <p>Select the services you need for your wedding</p>
      </div>

      <div className="input-group">
        <div style={{ display: 'grid', gap: '1rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.5rem',
              backgroundColor: serviceChoice.makeup ? 'var(--accent)' : 'var(--bg-secondary)',
              color: serviceChoice.makeup ? 'white' : 'var(--text-primary)',
              borderRadius: '1rem',
              border: `2px solid ${serviceChoice.makeup ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: serviceChoice.makeup ? 'scale(1.02)' : 'scale(1)',
              boxShadow: serviceChoice.makeup ? '0 4px 12px var(--shadow)' : 'none'
            }}
          >
            <input
              type="checkbox"
              checked={serviceChoice.makeup}
              onChange={(e) => handleServiceToggle('makeup', e.target.checked)}
              style={{ 
                marginRight: '1rem', 
                transform: 'scale(1.3)',
                accentColor: serviceChoice.makeup ? 'white' : 'var(--accent)'
              }}
            />
            <div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                marginBottom: '0.25rem' 
              }}>
                💄 Makeup Services
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                Professional makeup for bride and guests, including trials and touch-ups
              </div>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '1.5rem',
              backgroundColor: serviceChoice.hair ? 'var(--accent)' : 'var(--bg-secondary)',
              color: serviceChoice.hair ? 'white' : 'var(--text-primary)',
              borderRadius: '1rem',
              border: `2px solid ${serviceChoice.hair ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              transform: serviceChoice.hair ? 'scale(1.02)' : 'scale(1)',
              boxShadow: serviceChoice.hair ? '0 4px 12px var(--shadow)' : 'none'
            }}
          >
            <input
              type="checkbox"
              checked={serviceChoice.hair}
              onChange={(e) => handleServiceToggle('hair', e.target.checked)}
              style={{ 
                marginRight: '1rem', 
                transform: 'scale(1.3)',
                accentColor: serviceChoice.hair ? 'white' : 'var(--accent)'
              }}
            />
            <div>
              <div style={{ 
                fontSize: '1.25rem', 
                fontWeight: '700', 
                marginBottom: '0.25rem' 
              }}>
                💇‍♀️ Hair Services
              </div>
              <div style={{ 
                fontSize: '0.9rem', 
                opacity: 0.9,
                lineHeight: '1.4'
              }}>
                Professional hair styling for bride and guests, including trials and touch-ups
              </div>
            </div>
          </label>
        </div>
      </div>

      {!serviceChoice.makeup && !serviceChoice.hair && (
        <div style={{
          padding: '1rem',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '0.75rem',
          border: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Please select at least one service to continue
        </div>
      )}
    </div>
  );
};
