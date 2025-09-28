import React, { useState } from 'react';
import { ServiceChoice, MultiDay, MakeupForm, HairForm, MakeupArtist, HairArtist } from '../types';

interface DebugPanelProps {
  onLoadScenario: (scenario: {
    serviceChoice: ServiceChoice;
    multiDay: MultiDay;
    makeupForm?: MakeupForm;
    hairForm?: HairForm;
  }) => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ onLoadScenario }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const today = new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  const scenarios = {
    carsVsAssistantsMakeup: {
      name: 'Cars vs assistants example (Make-up)',
      description: 'People: 7, Cars: 2, Travel fee: 100 → Expect Travelling fee €200 and Assistant travel fee €175.',
      data: {
        serviceChoice: { makeup: true, hair: false },
        multiDay: {
          hasMultipleDays: false,
          dates: [toISO(today)],
          brideName: 'QA Bride'
        },
        makeupForm: {
          artist: MakeupArtist.Lola,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            {
              scheduledReturn: false,
              scheduledReturnBride: false,
              scheduledReturnGuests: 0,
              guests: 0,
              travelFee: 100,
              numPeople: 7,
              numCars: 2,
              exclusivity: false,
              touchupHours: 0,
              beautyVenue: 'Hotel Cascais'
            }
          ]
        } as MakeupForm
      }
    },

    srBlockedByTravelHair: {
      name: 'Scheduled return blocked by travel fee (Hair)',
      description: 'Travel fee: 50, Scheduled return bride = true → Expect red error and disabled submit.',
      data: {
        serviceChoice: { makeup: false, hair: true },
        multiDay: {
          hasMultipleDays: false,
          dates: [toISO(new Date(today.getTime() + 24 * 3600 * 1000))],
          brideName: 'QA Bride'
        },
        hairForm: {
          artist: HairArtist.Agne,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            {
              scheduledReturn: true,
              scheduledReturnBride: true,
              scheduledReturnGuests: 0,
              guests: 0,
              travelFee: 50,
              numPeople: 1,
              numCars: 1,
              exclusivity: false,
              touchupHours: 0,
              beautyVenue: 'Studio'
            }
          ]
        } as HairForm
      }
    },

    guestsSRWithoutBrideMakeup: {
      name: 'Guests SR without bride SR (Make-up)',
      description: 'SR Guests: 3, SR Bride: false → Expect red error and disabled submit.',
      data: {
        serviceChoice: { makeup: true, hair: false },
        multiDay: {
          hasMultipleDays: false,
          dates: [toISO(new Date(today.getTime() + 2 * 24 * 3600 * 1000))],
          brideName: 'QA Bride'
        },
        makeupForm: {
          artist: MakeupArtist.Teresa,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            {
              scheduledReturn: true,
              scheduledReturnBride: false,
              scheduledReturnGuests: 3,
              guests: 0,
              travelFee: 0,
              numPeople: 1,
              numCars: 1,
              exclusivity: false,
              touchupHours: 0,
              beautyVenue: 'Venue A'
            }
          ]
        } as MakeupForm
      }
    }
  } as const;

  const handleLoadScenario = (scenarioKey: keyof typeof scenarios) => {
    const scenario = scenarios[scenarioKey];
    onLoadScenario(scenario.data);
    setIsOpen(false);
  };

  return (
    <div className="debug-panel">
      <button 
        className="debug-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="Debug Panel (Dev Only)"
      >
        🐛 Debug
      </button>
      
      {isOpen && (
        <div className="debug-dropdown">
          <div className="debug-header">
            <h4>QA Test Scenarios</h4>
            <p>Load predefined data for testing calculations and validations</p>
          </div>
          
          <div className="debug-scenarios">
            {Object.entries(scenarios).map(([key, scenario]) => (
              <div key={key} className="debug-scenario">
                <div className="scenario-info">
                  <h5>{scenario.name}</h5>
                  <p>{scenario.description}</p>
                </div>
                <button 
                  className="btn btn-secondary scenario-btn"
                  onClick={() => handleLoadScenario(key as keyof typeof scenarios)}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
          
          <div className="debug-footer">
            <small>⚠️ This panel only appears in development mode</small>
          </div>
        </div>
      )}
    </div>
  );
};
