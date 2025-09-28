import React, { useState } from 'react';
import { ViewState, ServiceChoice, MultiDay, MakeupForm, HairForm } from './types';
import { useTheme } from './hooks/useTheme';
import { useLocalStorage } from './hooks/useLocalStorage';
import { ThemeToggle } from './components/ThemeToggle';
import { ProgressIndicator } from './components/ProgressIndicator';
import { MainForm } from './components/MainForm';
import { PriceConfirmationForm } from './components/PriceConfirmationForm';
import { QuoteResultForm } from './components/QuoteResultForm';
import { DebugPanel } from './components/DebugPanel';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>('form');
  const { theme, toggleTheme } = useTheme();
  const {
    appState,
    updateServiceChoice,
    updateMultiDay,
    updateMakeupForm,
    updateHairForm,
    updatePriceMode,
    updateCustomPrices,
    updateCalculations,
    updateGrandSummary,
    clearStorage,
    updateTrialSyncEnabled,
    updateBeautyVenueSyncEnabled
  } = useLocalStorage();

  const handleFormSubmit = () => {
    setCurrentView('confirmation');
  };

  const handleBackToForm = () => {
    setCurrentView('form');
  };

  const handlePriceConfirmation = () => {
    setCurrentView('result');
  };

  const handleStartOver = () => {
    setCurrentView('form');
  };

  const handleEditForm = () => {
    setCurrentView('form');
  };

  const handleClearAll = () => {
    clearStorage();
    setCurrentView('form');
  };

  const handleLoadScenario = (scenario: {
    serviceChoice: ServiceChoice;
    multiDay: MultiDay;
    makeupForm?: MakeupForm;
    hairForm?: HairForm;
    trialSyncEnabled?: boolean;
    beautyVenueSyncEnabled?: boolean[];
  }) => {
    // Load the scenario data into the app state
    updateServiceChoice(scenario.serviceChoice);
    updateMultiDay(scenario.multiDay);
    
    if (scenario.makeupForm) {
      updateMakeupForm(scenario.makeupForm);
    }
    
    if (scenario.hairForm) {
      updateHairForm(scenario.hairForm);
    }
    
    if (typeof scenario.trialSyncEnabled === 'boolean') {
      updateTrialSyncEnabled(scenario.trialSyncEnabled);
    }
    if (Array.isArray(scenario.beautyVenueSyncEnabled)) {
      scenario.beautyVenueSyncEnabled.forEach((v, idx) => updateBeautyVenueSyncEnabled(idx, v));
    }
    
    // Navigate to form view to see the loaded data
    setCurrentView('form');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'form':
        return (
          <MainForm 
            onSubmit={handleFormSubmit}
            serviceChoice={appState.serviceChoice}
            multiDay={appState.multiDay}
            makeupForm={appState.makeupForm}
            hairForm={appState.hairForm}
            onServiceChoiceChange={updateServiceChoice}
            onMultiDayChange={updateMultiDay}
            onMakeupFormChange={updateMakeupForm}
            onHairFormChange={updateHairForm}
            onClearAll={handleClearAll}
            trialSyncEnabled={appState.trialSyncEnabled ?? false}
            beautyVenueSyncEnabled={appState.beautyVenueSyncEnabled ?? []}
            onTrialSyncChange={updateTrialSyncEnabled}
            onBeautyVenueSyncToggle={updateBeautyVenueSyncEnabled}
          />
        );
      
      case 'confirmation':
        return (
          <PriceConfirmationForm
            serviceChoice={appState.serviceChoice}
            multiDay={appState.multiDay}
            makeupForm={appState.makeupForm}
            hairForm={appState.hairForm}
            priceMode={appState.priceMode}
            defaultPrices={appState.defaultPrices}
            customPrices={appState.customPrices}
            onPriceModeChange={updatePriceMode}
            onCustomPricesChange={updateCustomPrices}
            onCalculationsUpdate={(calculations, grandSummary) => {
              updateCalculations(calculations);
              updateGrandSummary(grandSummary);
            }}
            onConfirm={handlePriceConfirmation}
          />
        );
      
      case 'result':
        return (
          <QuoteResultForm
            calculations={appState.calculations}
            grandSummary={appState.grandSummary}
            brideName={appState.multiDay.brideName}
            onPaymentUpdate={(updatedCalculations) => {
              updateCalculations(updatedCalculations);
              // Recalculate grand summary with updated payments
              const totalPaid = updatedCalculations.reduce((sum, calc) => sum + calc.totalPaid, 0);
              const totalDue = updatedCalculations.reduce((sum, calc) => sum + calc.due, 0);
              updateGrandSummary({
                grandTotal: appState.grandSummary.grandTotal,
                totalPaid,
                totalDue
              });
            }}
            onStartOver={handleStartOver}
            onEditForm={handleEditForm}
            trialSyncEnabled={appState.trialSyncEnabled}
            makeupForm={appState.makeupForm}
            hairForm={appState.hairForm}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="container">
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
      <ProgressIndicator currentState={currentView} />
      {renderCurrentView()}
      <DebugPanel onLoadScenario={handleLoadScenario} />
    </div>
  );
}
