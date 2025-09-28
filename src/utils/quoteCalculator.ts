import { 
  ServiceChoice, 
  MakeupForm, 
  HairForm, 
  DefaultPrices, 
  CalculationResult, 
  CalculationLine,
  GrandSummary,
  DayBreakdown 
} from '../types';

interface CalculationInput {
  serviceChoice: ServiceChoice;
  makeupForm?: MakeupForm;
  hairForm?: HairForm;
  prices: DefaultPrices;
  weddingDates: string[];
}

export function calculateQuote(input: CalculationInput): {
  calculations: CalculationResult[];
  grandSummary: GrandSummary;
} {
  const calculations: CalculationResult[] = [];

  // Calculate makeup if selected
  if (input.serviceChoice.makeup && input.makeupForm) {
    const makeupResult = calculateMakeupService(input.makeupForm, input.prices, input.weddingDates);
    calculations.push(makeupResult);
  }

  // Calculate hair if selected
  if (input.serviceChoice.hair && input.hairForm) {
    const hairResult = calculateHairService(input.hairForm, input.prices, input.weddingDates);
    calculations.push(hairResult);
  }

  // Calculate grand summary
  const grandSummary = calculateGrandSummary(calculations);

  return { calculations, grandSummary };
}

function calculateMakeupService(
  form: MakeupForm, 
  prices: DefaultPrices, 
  weddingDates: string[]
): CalculationResult {
  const makeupPrices = prices.makeup;

  // Global (service-level) lines
  const globalLines: CalculationLine[] = [];
  if (form.trials > 0) {
    globalLines.push({
      label: 'Trials',
      qty: form.trials,
      unit: makeupPrices.trialUnit,
      total: form.trials * makeupPrices.trialUnit
    });
  }
  if (form.trialTravelEnabled && form.trialTravelFee > 0) {
    globalLines.push({
      label: 'Trial travel fee',
      meta: form.trialVenue,
      total: form.trialTravelFee
    });
  }

  // Per-day breakdowns
  const dayBreakdowns: DayBreakdown[] = weddingDates.map((date, idx) => {
    const day = form.perDay?.[idx] || {
      scheduledReturn: false,
      scheduledReturnBride: false,
      scheduledReturnGuests: 0,
      guests: 0,
      travelFee: 0,
      numPeople: 1,
      numCars: 1,
      exclusivity: false,
      touchupHours: 0,
      beautyVenue: ''
    };

    const lines: CalculationLine[] = [];

    // Assistants (informational only)
    const assistants = Math.max(0, (day as any).numPeople - 1);

    // Guests
    if (day.guests > 0) {
      lines.push({
        label: 'Guests',
        qty: day.guests,
        unit: makeupPrices.guestUnit,
        total: day.guests * makeupPrices.guestUnit
      });
    }

    // Bridal MU (1 per day)
    lines.push({
      label: 'Bridal MU',
      qty: 1,
      unit: makeupPrices.bridalUnit,
      total: makeupPrices.bridalUnit
    });

    // Scheduled return (guarded)
    const scheduledReturnAllowed = day.travelFee === 0 && day.scheduledReturn;
    const brideSR = scheduledReturnAllowed && day.scheduledReturnBride;
    const guestsSR = scheduledReturnAllowed && day.scheduledReturnGuests > 0 && day.scheduledReturnBride; // guests require bride SR
    if (brideSR) {
      lines.push({
        label: 'scheduled return (bride)',
        qty: 1,
        unit: makeupPrices.scheduledReturnBride,
        total: makeupPrices.scheduledReturnBride
      });
    }
    if (guestsSR) {
      lines.push({
        label: 'scheduled return (guests)',
        qty: day.scheduledReturnGuests,
        unit: makeupPrices.scheduledReturnGuestUnit,
        total: day.scheduledReturnGuests * makeupPrices.scheduledReturnGuestUnit
      });
    }

    // Travel fees (car-based model) per day
    if (day.travelFee > 0) {
      const numPeople = Math.max(1, (day as any).numPeople || 1);
      const numCars = Math.max(0, day.numCars || 0);
      const carCount = Math.min(numCars, numPeople);
      const assistantsCount = Math.max(0, numPeople - numCars);

      // 1) Travelling fee (cars)
      const travellingCarsTotal = day.travelFee * carCount;
      if (travellingCarsTotal > 0) {
        lines.push({
          label: 'Travelling fee (cars)',
          qty: carCount,
          unit: day.travelFee,
          total: travellingCarsTotal
        });
      }

      // 2) Assistant travel fee = 35% × travelFee × assistants
      const assistantUnit = 0.35 * day.travelFee;
      const assistantTravelTotal = assistantUnit * assistantsCount;
      if (assistantTravelTotal > 0) {
        lines.push({
          label: 'Assistant travel fee',
          meta: '35% × (people − cars)',
          qty: assistantsCount,
          unit: +assistantUnit.toFixed(2),
          total: +assistantTravelTotal.toFixed(2)
        });
      }
    }

    // Exclusivity (per day toggle)
    if (day.exclusivity) {
      lines.push({ label: 'Exclusivity fee', total: makeupPrices.exclusivityFee });
    }

    // Touch-ups (per day)
    if (day.touchupHours > 0) {
      lines.push({
        label: 'Touch-ups',
        meta: `${day.touchupHours}h`,
        qty: day.touchupHours,
        unit: makeupPrices.touchupHourly,
        total: day.touchupHours * makeupPrices.touchupHourly
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    return { date, lines, subtotal, venue: day.beautyVenue || undefined };
  });

  // Aggregate totals
  const perDayTotal = dayBreakdowns.reduce((s, d) => s + d.subtotal, 0);
  const globalTotal = globalLines.reduce((s, l) => s + l.total, 0);
  const subtotal = perDayTotal + globalTotal;

  // Flatten lines with date meta for backward-compatible display/exports
  const lines: CalculationLine[] = [
    ...globalLines,
    ...dayBreakdowns.flatMap((d) => d.lines.map(line => ({
      ...line,
      meta: line.meta ? `${d.date ? new Date(d.date).toLocaleDateString('en-GB') : 'Day'} • ${line.meta}` : (d.date ? new Date(d.date).toLocaleDateString('en-GB') : undefined)
    })))
  ];

  return {
    artistName: form.artist,
    serviceType: 'makeup',
    lines,
    subtotal,
    payments: [],
    totalPaid: 0,
    due: subtotal,
    weddingDates,
    venueNotes: form.trialVenue || '',
    dayBreakdowns
  };
}

function calculateHairService(
  form: HairForm, 
  prices: DefaultPrices, 
  weddingDates: string[]
): CalculationResult {
  const hairPrices = prices.hair;

  // Global (service-level) lines
  const globalLines: CalculationLine[] = [];
  if (form.trials > 0) {
    globalLines.push({
      label: 'Trials',
      qty: form.trials,
      unit: hairPrices.trialUnit,
      total: form.trials * hairPrices.trialUnit
    });
  }
  if (form.trialTravelEnabled && form.trialTravelFee > 0) {
    globalLines.push({
      label: 'Trial travel fee',
      meta: form.trialVenue,
      total: form.trialTravelFee
    });
  }

  // Per-day breakdowns
  const dayBreakdowns: DayBreakdown[] = weddingDates.map((date, idx) => {
    const day = form.perDay?.[idx] || {
      scheduledReturn: false,
      scheduledReturnBride: false,
      scheduledReturnGuests: 0,
      guests: 0,
      travelFee: 0,
      numPeople: 1,
      numCars: 1,
      exclusivity: false,
      touchupHours: 0,
      beautyVenue: ''
    };

    const lines: CalculationLine[] = [];

    // Assistants (informational only)
    const assistants = Math.max(0, (day as any).numPeople - 1);

    // Guests
    if (day.guests > 0) {
      lines.push({
        label: 'Guests',
        qty: day.guests,
        unit: hairPrices.guestUnit,
        total: day.guests * hairPrices.guestUnit
      });
    }

    // Bridal H (1 per day)
    lines.push({
      label: 'Bridal H',
      qty: 1,
      unit: hairPrices.bridalUnit,
      total: hairPrices.bridalUnit
    });

    // Scheduled return (guarded)
    const scheduledReturnAllowed = day.travelFee === 0 && day.scheduledReturn;
    const brideSR = scheduledReturnAllowed && day.scheduledReturnBride;
    const guestsSR = scheduledReturnAllowed && day.scheduledReturnGuests > 0 && day.scheduledReturnBride; // guests require bride SR
    if (brideSR) {
      lines.push({
        label: 'scheduled return (bride)',
        qty: 1,
        unit: hairPrices.scheduledReturnBride,
        total: hairPrices.scheduledReturnBride
      });
    }
    if (guestsSR) {
      lines.push({
        label: 'scheduled return (guests)',
        qty: day.scheduledReturnGuests,
        unit: hairPrices.scheduledReturnGuestUnit,
        total: day.scheduledReturnGuests * hairPrices.scheduledReturnGuestUnit
      });
    }

    // Travel fees (car-based model) per day
    if (day.travelFee > 0) {
      const numPeople = Math.max(1, (day as any).numPeople || 1);
      const numCars = Math.max(0, day.numCars || 0);
      const carCount = Math.min(numCars, numPeople);
      const assistantsCount = Math.max(0, numPeople - numCars);

      // 1) Travelling fee (cars)
      const travellingCarsTotal = day.travelFee * carCount;
      if (travellingCarsTotal > 0) {
        lines.push({
          label: 'Travelling fee (cars)',
          qty: carCount,
          unit: day.travelFee,
          total: travellingCarsTotal
        });
      }

      // 2) Assistant travel fee = 35% × travelFee × assistants
      const assistantUnit = 0.35 * day.travelFee;
      const assistantTravelTotal = assistantUnit * assistantsCount;
      if (assistantTravelTotal > 0) {
        lines.push({
          label: 'Assistant travel fee',
          meta: '35% × (people − cars)',
          qty: assistantsCount,
          unit: +assistantUnit.toFixed(2),
          total: +assistantTravelTotal.toFixed(2)
        });
      }
    }

    // Exclusivity (per day toggle)
    if (day.exclusivity) {
      lines.push({ label: 'Exclusivity fee', total: hairPrices.exclusivityFee });
    }

    // Touch-ups (per day)
    if (day.touchupHours > 0) {
      lines.push({
        label: 'Touch-ups',
        meta: `${day.touchupHours}h`,
        qty: day.touchupHours,
        unit: hairPrices.touchupHourly,
        total: day.touchupHours * hairPrices.touchupHourly
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.total, 0);
    return { date, lines, subtotal, venue: day.beautyVenue || undefined };
  });

  // Aggregate totals
  const perDayTotal = dayBreakdowns.reduce((s, d) => s + d.subtotal, 0);
  const globalTotal = globalLines.reduce((s, l) => s + l.total, 0);
  const subtotal = perDayTotal + globalTotal;

  // Flatten lines with date meta for backward-compatible display/exports
  const lines: CalculationLine[] = [
    ...globalLines,
    ...dayBreakdowns.flatMap((d) => d.lines.map(line => ({
      ...line,
      meta: line.meta ? `${d.date ? new Date(d.date).toLocaleDateString('en-GB') : 'Day'} • ${line.meta}` : (d.date ? new Date(d.date).toLocaleDateString('en-GB') : undefined)
    })))
  ];

  return {
    artistName: form.artist,
    serviceType: 'hair',
    lines,
    subtotal,
    payments: [],
    totalPaid: 0,
    due: subtotal,
    weddingDates,
    venueNotes: form.trialVenue || '',
    dayBreakdowns
  };
}

function calculateGrandSummary(calculations: CalculationResult[]): GrandSummary {
  const grandTotal = calculations.reduce((sum, calc) => sum + calc.subtotal, 0);
  const totalPaid = calculations.reduce((sum, calc) => sum + calc.totalPaid, 0);
  const totalDue = grandTotal - totalPaid;
  
  return {
    grandTotal,
    totalPaid,
    totalDue: Math.max(0, totalDue)
  };
}
