import { DefaultPrices, MakeupArtist, HairArtist, MakeupDayDetails, HairDayDetails } from '../types';

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
