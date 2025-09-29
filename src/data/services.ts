import { DefaultPrices, MakeupArtist, HairArtist, MakeupDayDetails, HairDayDetails, ServicePricing } from '../types';

export const defaultPrices: DefaultPrices = {
  makeup: {
    trialUnit: 80,
    bridalUnit: 120,
    guestUnit: 60,
    scheduledReturnBride: 80,
    scheduledReturnGuestUnit: 40,
    touchupHourly: 50,
    exclusivityFee: 200
  },
  hair: {
    trialUnit: 70,
    bridalUnit: 100,
    guestUnit: 50,
    scheduledReturnBride: 70,
    scheduledReturnGuestUnit: 35,
    touchupHourly: 45,
    exclusivityFee: 150
  }
};

// New: Per-makeup-artist default pricing
export const makeupArtistPrices: Record<MakeupArtist, ServicePricing> = {
  [MakeupArtist.Lola]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Teresa]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Miguel]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Inês]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Sofia]: {
    trialUnit: 100,
    bridalUnit: 200,
    guestUnit: 75,
    scheduledReturnBride: 100,
    scheduledReturnGuestUnit: 50,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Rita]: {
    trialUnit: 100,
    bridalUnit: 200,
    guestUnit: 75,
    scheduledReturnBride: 100,
    scheduledReturnGuestUnit: 50,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Filipa]: {
    trialUnit: 100,
    bridalUnit: 200,
    guestUnit: 75,
    scheduledReturnBride: 100,
    scheduledReturnGuestUnit: 50,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.AnaNeves]: {
    trialUnit: 125,
    bridalUnit: 250,
    guestUnit: 75,
    scheduledReturnBride: 125,
    scheduledReturnGuestUnit: 55,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.AnaRoma]: {
    trialUnit: 125,
    bridalUnit: 250,
    guestUnit: 75,
    scheduledReturnBride: 125,
    scheduledReturnGuestUnit: 55,
    touchupHourly: 50,
    exclusivityFee: 100
  },
  [MakeupArtist.Sara]: {
    trialUnit: 125,
    bridalUnit: 250,
    guestUnit: 75,
    scheduledReturnBride: 125,
    scheduledReturnGuestUnit: 55,
    touchupHourly: 50,
    exclusivityFee: 100
  }
};

export const makeupArtists = Object.values(MakeupArtist);
export const hairArtists = Object.values(HairArtist);

// Default day details
const defaultMakeupDay: MakeupDayDetails = {
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

const defaultHairDay: HairDayDetails = {
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

// Default form values
export const defaultMakeupForm = {
  artist: MakeupArtist.Lola,
  trials: 0,
  trialTravelEnabled: false,
  trialVenue: '',
  trialTravelFee: 0,
  perDay: [] as MakeupDayDetails[]
};

export const defaultHairForm = {
  artist: HairArtist.Agne,
  trials: 0,
  trialTravelEnabled: false,
  trialVenue: '',
  trialTravelFee: 0,
  perDay: [] as HairDayDetails[]
};

// Helpers to seed per-day arrays for N days
export const seedMakeupDays = (count: number) => Array.from({ length: count }, () => ({ ...defaultMakeupDay }));
export const seedHairDays = (count: number) => Array.from({ length: count }, () => ({ ...defaultHairDay }));

// New: Per-hair-artist default pricing
export const hairArtistPrices: Record<HairArtist, ServicePricing> = {
  [HairArtist['Lília']]: {
    trialUnit: 150,
    bridalUnit: 320,
    guestUnit: 95,
    scheduledReturnBride: 250,
    scheduledReturnGuestUnit: 95,
    touchupHourly: 90,
    exclusivityFee: 100
  },
  [HairArtist.Andreia]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 90,
    scheduledReturnBride: 200,
    scheduledReturnGuestUnit: 70,
    touchupHourly: 70,
    exclusivityFee: 100
  },
  [HairArtist.Eric]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 60,
    exclusivityFee: 100
  },
  [HairArtist.Oksana]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 60,
    exclusivityFee: 100
  },
  [HairArtist.OlgaH]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 60,
    exclusivityFee: 100
  },
  [HairArtist.Joana]: {
    trialUnit: 150,
    bridalUnit: 300,
    guestUnit: 75,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 60,
    exclusivityFee: 100
  },
  [HairArtist.Agne]: {
    trialUnit: 175,
    bridalUnit: 1050,
    guestUnit: 100,
    scheduledReturnBride: 150,
    scheduledReturnGuestUnit: 60,
    touchupHourly: 60,
    exclusivityFee: 100
  }
};
