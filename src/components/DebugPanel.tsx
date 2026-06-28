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

  // Only show in development (Vite)
  if (!import.meta.env.DEV) {
    return null;
  }

  const today = new Date();
  const toISO = (d: Date) => d.toISOString().split('T')[0];

  type Scenario = {
    name: string;
    description: string;
    data: {
      serviceChoice: ServiceChoice;
      multiDay: MultiDay;
      makeupForm?: MakeupForm;
      hairForm?: HairForm;
    };
  };

  const scenarios: Record<string, Scenario> = {
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
    },

    overnightAdjacentMakeup: {
      name: 'Overnight rule — 3 adjacent days @ €490 (Make-up)',
      description: 'Days 1/2/3 all consecutive, travel €490 → expect Day 1 = €490, Days 2 & 3 = €200 each (overnight rate).',
      data: {
        serviceChoice: { makeup: true, hair: false },
        multiDay: {
          hasMultipleDays: true,
          count: 3,
          dates: [
            toISO(new Date(today.getTime() + 0 * 86_400_000)),
            toISO(new Date(today.getTime() + 1 * 86_400_000)),
            toISO(new Date(today.getTime() + 2 * 86_400_000))
          ],
          brideName: 'QA Bride'
        },
        makeupForm: {
          artist: MakeupArtist.Lola,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' }
          ]
        } as MakeupForm
      }
    },

    overnightNonAdjacentMakeup: {
      name: 'Overnight rule — 3 non-adjacent days @ €490 (Make-up)',
      description: 'Days 1, 3, 5 (gaps between each), travel €490 → expect all 3 days at full €490 (no overnight discount).',
      data: {
        serviceChoice: { makeup: true, hair: false },
        multiDay: {
          hasMultipleDays: true,
          count: 3,
          dates: [
            toISO(new Date(today.getTime() + 0 * 86_400_000)),
            toISO(new Date(today.getTime() + 2 * 86_400_000)),
            toISO(new Date(today.getTime() + 4 * 86_400_000))
          ],
          brideName: 'QA Bride'
        },
        makeupForm: {
          artist: MakeupArtist.Lola,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 490, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Évora' }
          ]
        } as MakeupForm
      }
    },

    overnightBelowThresholdMakeup: {
      name: 'Overnight rule — 3 adjacent days @ €120 (Make-up)',
      description: 'Travel fee €120 is below the €150 threshold → no overnight rule, all 3 days stay at €120.',
      data: {
        serviceChoice: { makeup: true, hair: false },
        multiDay: {
          hasMultipleDays: true,
          count: 3,
          dates: [
            toISO(new Date(today.getTime() + 0 * 86_400_000)),
            toISO(new Date(today.getTime() + 1 * 86_400_000)),
            toISO(new Date(today.getTime() + 2 * 86_400_000))
          ],
          brideName: 'QA Bride'
        },
        makeupForm: {
          artist: MakeupArtist.Lola,
          trials: 0,
          trialTravelEnabled: false,
          trialVenue: '',
          trialTravelFee: 0,
          perDay: [
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 120, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Setúbal' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 120, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Setúbal' },
            { scheduledReturn: false, scheduledReturnBride: false, scheduledReturnGuests: 0, guests: 0, travelFee: 120, numPeople: 1, numCars: 1, exclusivity: false, touchupHours: 0, beautyVenue: 'Setúbal' }
          ]
        } as MakeupForm
      }
    }
  };

  const handleLoadScenario = (scenarioKey: keyof typeof scenarios) => {
    const scenario = scenarios[scenarioKey];
    // Ensure arrays are mutable when passing
    const data = {
      ...scenario.data,
      multiDay: { ...scenario.data.multiDay, dates: [...scenario.data.multiDay.dates] }
    };
    onLoadScenario(data);
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
