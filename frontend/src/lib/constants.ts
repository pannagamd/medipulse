export const APP_NAME = 'MediPulse';
export const APP_TAGLINE = 'Medicine safety for modern care workflows.';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';
export const MEDICAL_DISCLAIMER =
  'This tool is for informational purposes only and does not replace professional medical advice. Always consult a licensed clinician before taking any medication.';

export const navigationLinks = [
  { label: 'Home', href: '/app' },
  { label: 'Profile', href: '/app/profile' },
  { label: 'Interactions', href: '/app/interactions' },
  { label: 'Symptoms', href: '/app/symptoms' },
  { label: 'Medicines', href: '/app/medicines' },
];

// Centralized route-to-page-title mapping
export const routeTitles: Record<string, string> = {
  '/app': 'Home',
  '/app/medicines': 'Medicine Search',
  '/app/interactions': 'Drug Interactions',
  '/app/symptoms': 'Symptom Checker',
  '/app/profile': 'Profile',
  '/app/history': 'Activity Timeline',
  '/app/admin': 'Admin Workspace',
};

export const featureHighlights = [
  {
    title: 'Drug Interaction Detection',
    description: 'Instantly identify dangerous medicine combinations. Know which drugs should never be taken together and understand why.',
  },
  {
    title: 'Side Effect Insights',
    description: 'Learn about possible reactions, precautions, and warnings before taking any medication. Stay prepared and informed.',
  },
  {
    title: 'Smart Medicine Search',
    description: 'Find detailed dosage, usage, and safety information for any medicine quickly. Get clear, actionable guidance.',
  },
];