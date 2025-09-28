import { useState, useEffect } from 'react';
import { AppState, ServiceChoice, MultiDay, DefaultPrices, GrandSummary } from '../types';
import { defaultPrices, defaultMakeupForm, defaultHairForm, seedMakeupDays, seedHairDays } from '../data/services';

const STORAGE_KEY = 'fresh-faced-quoter-state';
const CURRENT_VERSION = '1.0.0';

const createDefaultAppState = (): AppState => ({
  version: CURRENT_VERSION,
  serviceChoice: { makeup: false, hair: false },
  multiDay: { hasMultipleDays: false, dates: [], brideName: '' },
  makeupForm: undefined,
  hairForm: undefined,
  priceMode: 'default',
  defaultPrices,
  customPrices: undefined,
  calculations: [],
  grandSummary: { grandTotal: 0, totalPaid: 0, totalDue: 0 },
  lastUpdated: new Date().toISOString(),
  trialSyncEnabled: false,
  beautyVenueSyncEnabled: []
});

export const useLocalStorage = () => {
  const [appState, setAppState] = useState<AppState>(createDefaultAppState());

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedState = JSON.parse(stored) as AppState;
        // Merge defaults for new fields
        const merged: AppState = {
          ...createDefaultAppState(),
          ...parsedState,
          trialSyncEnabled: parsedState.trialSyncEnabled ?? false,
          beautyVenueSyncEnabled: parsedState.beautyVenueSyncEnabled ?? []
        };
        // Version migration logic
        if (merged.version !== CURRENT_VERSION) {
          console.log(`Migrating from version ${merged.version} to ${CURRENT_VERSION}`);
          setAppState({ ...merged, version: CURRENT_VERSION });
        } else {
          setAppState(merged);
        }
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
      setAppState(createDefaultAppState());
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      const stateToSave = {
        ...appState,
        lastUpdated: new Date().toISOString()
      } as AppState;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  }, [appState]);

  const ensurePerDayLengths = (state: AppState, nextMultiDay: MultiDay) => {
    const daysCount = Math.max(1, nextMultiDay.hasMultipleDays && nextMultiDay.count ? nextMultiDay.count : (nextMultiDay.dates.length || 1));

    const nextMakeup = state.makeupForm
      ? {
          ...state.makeupForm,
          perDay: (() => {
            const current = state.makeupForm!.perDay || [];
            if (current.length === daysCount) return current;
            if (current.length < daysCount) {
              return [...current, ...seedMakeupDays(daysCount - current.length)];
            }
            return current.slice(0, daysCount);
          })()
        }
      : state.makeupForm;

    const nextHair = state.hairForm
      ? {
          ...state.hairForm,
          perDay: (() => {
            const current = state.hairForm!.perDay || [];
            if (current.length === daysCount) return current;
            if (current.length < daysCount) {
              return [...current, ...seedHairDays(daysCount - current.length)];
            }
            return current.slice(0, daysCount);
          })()
        }
      : state.hairForm;

    // Ensure beautyVenueSyncEnabled is sized
    const nextBvSync = (() => {
      const current = state.beautyVenueSyncEnabled || [];
      if (current.length === daysCount) return current;
      if (current.length < daysCount) {
        return [...current, ...Array.from({ length: daysCount - current.length }, () => false)];
      }
      return current.slice(0, daysCount);
    })();

    return { nextMakeup, nextHair, nextBvSync };
  };

  const updateServiceChoice = (serviceChoice: ServiceChoice) => {
    setAppState(prev => {
      const makeupForm = serviceChoice.makeup ? (prev.makeupForm || defaultMakeupForm) : undefined;
      const hairForm = serviceChoice.hair ? (prev.hairForm || defaultHairForm) : undefined;

      const { nextMakeup, nextHair, nextBvSync } = ensurePerDayLengths({ ...prev, makeupForm, hairForm }, prev.multiDay);

      // If switching to single service, disable sync flags
      const bothSelected = serviceChoice.makeup && serviceChoice.hair;
      const trialSyncEnabled = bothSelected ? (prev.trialSyncEnabled ?? false) : false;
      const beautyVenueSyncEnabled = bothSelected ? nextBvSync : Array(nextBvSync.length).fill(false);

      return {
        ...prev,
        serviceChoice,
        makeupForm: nextMakeup,
        hairForm: nextHair,
        trialSyncEnabled,
        beautyVenueSyncEnabled
      };
    });
  };

  const updateMultiDay = (multiDay: MultiDay) => {
    setAppState(prev => {
      const { nextMakeup, nextHair, nextBvSync } = ensurePerDayLengths(prev, multiDay);
      return { ...prev, multiDay, makeupForm: nextMakeup, hairForm: nextHair, beautyVenueSyncEnabled: nextBvSync };
    });
  };

  const updateMakeupForm = (makeupForm: AppState['makeupForm']) => {
    setAppState(prev => ({ ...prev, makeupForm }));
  };

  const updateHairForm = (hairForm: AppState['hairForm']) => {
    setAppState(prev => ({ ...prev, hairForm }));
  };

  const updatePriceMode = (priceMode: AppState['priceMode']) => {
    setAppState(prev => ({ ...prev, priceMode }));
  };

  const updateCustomPrices = (customPrices: DefaultPrices) => {
    setAppState(prev => ({ ...prev, customPrices }));
  };

  const updateCalculations = (calculations: AppState['calculations']) => {
    setAppState(prev => ({ ...prev, calculations }));
  };

  const updateGrandSummary = (grandSummary: GrandSummary) => {
    setAppState(prev => ({ ...prev, grandSummary }));
  };

  const updateTrialSyncEnabled = (enabled: boolean) => {
    setAppState(prev => ({ ...prev, trialSyncEnabled: enabled }));
  };

  const updateBeautyVenueSyncEnabled = (index: number, enabled: boolean) => {
    setAppState(prev => {
      const arr = [...(prev.beautyVenueSyncEnabled || [])];
      if (index >= arr.length) {
        arr.length = index + 1;
      }
      arr[index] = enabled;
      return { ...prev, beautyVenueSyncEnabled: arr };
    });
  };

  const resetAppState = () => {
    setAppState(createDefaultAppState());
  };

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAppState(createDefaultAppState());
  };

  return {
    appState,
    updateServiceChoice,
    updateMultiDay,
    updateMakeupForm,
    updateHairForm,
    updatePriceMode,
    updateCustomPrices,
    updateCalculations,
    updateGrandSummary,
    updateTrialSyncEnabled,
    updateBeautyVenueSyncEnabled,
    resetAppState,
    clearStorage
  };
};
