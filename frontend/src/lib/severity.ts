import type { Severity } from '@/types/api';

/**
 * Human-readable label for each severity level used in the overall risk banner.
 * The backend can return: 'safe' | 'moderate' | 'high' | 'dangerous' | 'unknown'
 * All five cases are handled explicitly — no implicit fallthrough.
 */
export function severityLabel(severity: Severity): string {
  switch (severity) {
    case 'safe':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'dangerous':
      return 'High';
    case 'unknown':
      return 'Unknown';
  }
}

/**
 * Badge variant that drives the coloured pill in every severity display.
 * Must always stay in sync with severityLabel and severityTone.
 */
export function severityBadgeVariant(severity: Severity): 'success' | 'warning' | 'danger' | 'outline' {
  switch (severity) {
    case 'safe':
      return 'success';
    case 'moderate':
      return 'warning';
    case 'high':
      return 'danger';
    case 'dangerous':
      return 'danger';
    case 'unknown':
      return 'outline';
  }
}

/**
 * Tailwind class string for the overall risk banner background + border + text.
 * Must stay in sync with severityBadgeVariant.
 */
export function severityTone(severity: Severity): string {
  switch (severity) {
    case 'safe':
      return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'moderate':
      return 'text-amber-700 bg-amber-50 border-amber-200';
    case 'high':
      return 'text-rose-700 bg-rose-50 border-rose-200';
    case 'dangerous':
      return 'text-rose-700 bg-rose-50 border-rose-200';
    case 'unknown':
      return 'text-slate-700 bg-slate-50 border-slate-200';
  }
}

/**
 * One-line description shown in the overall risk summary banner.
 * Derived solely from severity — never hardcoded elsewhere.
 */
export function severityDescription(severity: Severity): string {
  switch (severity) {
    case 'safe':
      return 'Only minor or no interactions detected. Still review individual recommendations and confirm with your profile.';
    case 'moderate':
      return 'Moderate interactions detected. Review recommendations and discuss with your pharmacist or doctor before combining these medicines.';
    case 'high':
      return 'Potentially serious interactions detected. Review all recommendations carefully and consult a healthcare provider before use.';
    case 'dangerous':
      return 'High-risk interactions detected. Review all recommendations and consult a healthcare provider before taking these medicines together.';
    case 'unknown':
      return 'Interaction information unavailable. Consult a pharmacist or doctor before combining these medicines.';
  }
}