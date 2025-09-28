import React from 'react';
import { QuoteFormData, QuoteBreakdown } from '../types';
import { serviceOptions } from '../data/services';

interface QuoteResultProps {
  formData: QuoteFormData;
  quoteBreakdown: QuoteBreakdown;
  onStartOver: () => void;
}

export const QuoteResult: React.FC<QuoteResultProps> = ({
  formData,
  quoteBreakdown,
  onStartOver
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

  const handleDownloadQuote = () => {
    // Create a simple text version of the quote
    const quoteText = `
Fresh Faced Quoter - Wedding Quote

Event Details:
- Type: ${formData.eventType}
- Date: ${formatDate(formData.date)}
- Guests: ${formData.guestCount}
- Venue: ${formData.venue}

Services:
${formData.services.map(serviceId => 
  `- ${getServiceName(serviceId)}: $${quoteBreakdown.serviceCharges[serviceId]?.toLocaleString()}`
).join('\n')}

Total: $${quoteBreakdown.total.toLocaleString()}

Contact: ${formData.contactInfo.name}
Email: ${formData.contactInfo.email}
${formData.contactInfo.phone ? `Phone: ${formData.contactInfo.phone}` : ''}

Generated on: ${new Date().toLocaleDateString()}
    `;

    const blob = new Blob([quoteText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedding-quote-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEmailQuote = () => {
    const subject = encodeURIComponent('Wedding Quote from Fresh Faced Quoter');
    const body = encodeURIComponent(`
Hi ${formData.contactInfo.name},

Thank you for using Fresh Faced Quoter! Here's your personalized wedding quote:

Event: ${formData.eventType} on ${formatDate(formData.date)}
Guests: ${formData.guestCount}
Venue Type: ${formData.venue}

Total Estimate: $${quoteBreakdown.total.toLocaleString()}

We'll be in touch soon to discuss the details!

Best regards,
Fresh Faced Quoter Team
    `);
    
    window.location.href = `mailto:${formData.contactInfo.email}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="slide-in">
      <div className="header">
        <h1>🎉 Your Quote is Ready!</h1>
        <p>Here's your personalized wedding estimate</p>
      </div>

      <div className="quote-card" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="quote-total" style={{ marginBottom: '0.5rem' }}>
          ${quoteBreakdown.total.toLocaleString()}
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
          Estimated total for your {formData.eventType}
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
          {formatDate(formData.date)} • {formData.guestCount} guests
        </p>
      </div>

      <div className="quote-card">
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
          Service Breakdown
        </h3>
        
        {formData.services.map(serviceId => (
          <div key={serviceId} className="quote-item">
            <div>
              <div style={{ fontWeight: '600' }}>
                {getServiceName(serviceId)}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {serviceOptions.find(s => s.id === serviceId)?.description}
              </div>
            </div>
            <div style={{ fontWeight: '600', color: 'var(--accent)' }}>
              ${quoteBreakdown.serviceCharges[serviceId]?.toLocaleString() || '0'}
            </div>
          </div>
        ))}
      </div>

      <div className="quote-card" style={{ backgroundColor: 'var(--accent)', color: 'white' }}>
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>
          What's Next?
        </h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>We'll contact you within 24 hours to discuss details</li>
          <li>Schedule a consultation to refine your requirements</li>
          <li>Receive a detailed proposal with final pricing</li>
          <li>Book your services and start planning!</li>
        </ul>
      </div>

      <div className="quote-card">
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>
          Important Notes
        </h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8', color: 'var(--text-secondary)' }}>
          <li>This is an estimate based on your selections</li>
          <li>Final pricing may vary based on specific requirements</li>
          <li>All services are subject to availability</li>
          <li>A deposit will be required to secure your date</li>
        </ul>
      </div>

      <div style={{ height: '8rem' }} />

      <div className="sticky-cta">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleDownloadQuote}
            style={{ margin: 0, padding: '0.75rem' }}
          >
            📄 Download
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleEmailQuote}
            style={{ margin: 0, padding: '0.75rem' }}
          >
            ✉️ Email Quote
          </button>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={onStartOver}
        >
          Get Another Quote
        </button>
      </div>
    </div>
  );
};
