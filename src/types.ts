// Service Selection Types
export interface ServiceChoice {
  makeup: boolean;
  hair: boolean;
}

export interface MultiDay {
  hasMultipleDays: boolean;
  count?: 2 | 3 | 4;
  dates: string[];
  brideName: string;
}

// Artist Enums
export enum MakeupArtist {
  Lola = 'Lola',
  Inês = 'Inês',
  Teresa = 'Teresa',
  Miguel = 'Miguel',
  AnaRoma = 'Ana Roma',
  AnaNeves = 'Ana Neves',
  Rita = 'Rita',
  Sara = 'Sara',
  Sofia = 'Sofia',
  Filipa = 'Filipa'
}

export enum HairArtist {
  Agne = 'Agne',
  Lília = 'Lília',
  Andreia = 'Andreia',
  Eric = 'Eric',
  Oksana = 'Oksana',
  Joana = 'Joana',
  OlgaH = 'Olga H'
}

// Per-day detail types
export interface MakeupDayDetails {
  scheduledReturn: boolean;
  scheduledReturnBride: boolean;
  scheduledReturnGuests: number;
  guests: number;
  travelFee: number;
  numPeople: number; // total people including main artist
  numCars: number;
  exclusivity: boolean;
  touchupHours: number;
  beautyVenue?: string;
}

export interface HairDayDetails {
  scheduledReturn: boolean;
  scheduledReturnBride: boolean;
  scheduledReturnGuests: number;
  guests: number;
  travelFee: number;
  numPeople: number; // total people including main artist
  numCars: number;
  exclusivity: boolean;
  touchupHours: number;
  beautyVenue?: string;
}

// Form Types
export interface MakeupForm {
  // Per service (global) fields
  artist: MakeupArtist;
  trials: number;
  trialTravelEnabled: boolean;
  trialVenue: string;
  trialTravelFee: number;
  // Per-day fields
  perDay: MakeupDayDetails[];
}

export interface HairForm {
  // Per service (global) fields
  artist: HairArtist;
  trials: number;
  trialTravelEnabled: boolean;
  trialVenue: string;
  trialTravelFee: number;
  // Per-day fields
  perDay: HairDayDetails[];
}

// Pricing Types
export type PriceMode = "default" | "custom";

export interface ServicePricing {
  trialUnit: number;
  bridalUnit: number;
  guestUnit: number;
  scheduledReturnBride: number;
  scheduledReturnGuestUnit: number;
  touchupHourly: number;
  exclusivityFee: number;
}

export interface DefaultPrices {
  makeup: ServicePricing;
  hair: ServicePricing;
}

// Calculation Types
export interface CalculationLine {
  label: string;
  qty?: number;
  unit?: number;
  total: number;
  meta?: string;
}

export interface Payment {
  id: string;
  date: string;
  occasion: string;
  amount: number;
}

export interface DayBreakdown {
  date: string;
  lines: CalculationLine[];
  subtotal: number;
  venue?: string;
}

export interface CalculationResult {
  artistName: string;
  serviceType: 'makeup' | 'hair';
  // Sum across days for backward compatibility
  lines: CalculationLine[];
  subtotal: number;
  payments: Payment[];
  totalPaid: number;
  due: number;
  weddingDates: string[];
  venueNotes: string;
  // New: per-day breakdown
  dayBreakdowns: DayBreakdown[];
}

export interface GrandSummary {
  grandTotal: number;
  totalPaid: number;
  totalDue: number;
}

// App State Types
export interface AppState {
  version: string;
  serviceChoice: ServiceChoice;
  multiDay: MultiDay;
  makeupForm?: MakeupForm;
  hairForm?: HairForm;
  priceMode: PriceMode;
  defaultPrices: DefaultPrices;
  customPrices?: DefaultPrices;
  calculations: CalculationResult[];
  grandSummary: GrandSummary;
  lastUpdated: string;
  // Cross-fill sync flags
  trialSyncEnabled?: boolean; // when both services selected, mirrors trialVenue bi-directionally
  beautyVenueSyncEnabled?: boolean[]; // per-day flags, mirrors beautyVenue per day
}

// UI State
export type ViewState = 'service-selection' | 'form' | 'confirmation' | 'result';
