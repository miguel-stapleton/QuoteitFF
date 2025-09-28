import { ViewState } from '../types';

interface ProgressIndicatorProps {
  currentState: ViewState;
}

export const ProgressIndicator = ({ currentState }: ProgressIndicatorProps) => {
  const steps = [
    { id: 'form', label: '1', name: 'Details' },
    { id: 'confirmation', label: '2', name: 'Confirm' },
    { id: 'result', label: '3', name: 'Quote' }
  ];

  const getStepClass = (stepId: string) => {
    const currentIndex = steps.findIndex(step => step.id === currentState);
    const stepIndex = steps.findIndex(step => step.id === stepId);
    
    if (stepIndex < currentIndex) return 'progress-step completed';
    if (stepIndex === currentIndex) return 'progress-step active';
    return 'progress-step inactive';
  };

  return (
    <div className="progress-indicator">
      {steps.map((step) => (
        <div key={step.id} className={getStepClass(step.id)}>
          {step.label}
        </div>
      ))}
    </div>
  );
};
