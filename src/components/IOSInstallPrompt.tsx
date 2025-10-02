import React, { useState, useEffect } from 'react';

export const IOSInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const dismissed = localStorage.getItem('ios-install-prompt-dismissed');
    if (dismissed) return;

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|OPiOS|mercury/.test(navigator.userAgent);
    
    // Show only on iOS Safari and not already installed
    if (isIOS && isSafari && !isInStandaloneMode) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('ios-install-prompt-dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#1f2937',
      color: 'white',
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
      zIndex: 9999,
      fontSize: '14px',
      lineHeight: '1.4'
    }}>
      <div style={{ flex: 1 }}>
        <span role="img" aria-label="info" style={{ marginRight: '8px' }}>📱</span>
        If you're on iPhone: open in Safari → Share → Add to Home Screen to install.
      </div>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss iOS install prompt"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          padding: '4px 8px',
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
};
