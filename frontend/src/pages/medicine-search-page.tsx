import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Search,
  ShieldCheck,
  AlertCircle,
  Heart,
  Pill,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  Thermometer,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Wine,
  Coffee,
  Moon,
  Utensils,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/services/api/client';
import { searchMedicines, getMedicine } from '@/services/api/medicines';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { addHistoryItem } from '@/lib/history';
import { stripHtml } from '@/lib/utils';
import { useProfileStore } from '@/store/profile-store';
import type { Medicine, HealthProfile } from '@/types/api';

/* ─────────────────── Schema ─────────────────── */
const searchSchema = z.object({ query: z.string().min(2, 'Enter at least 2 characters') });
type SearchValues = z.infer<typeof searchSchema>;

/* ─────────────────── Safety level ─────────────────── */
type SafetyLevel = 'safe' | 'caution' | 'high-risk' | 'unknown';

function getSafetyLevel(medicine: Medicine, profile: HealthProfile | null): SafetyLevel {
  if (!profile) return 'unknown';

  const rawText = [medicine.contraindications, medicine.precautions, medicine.side_effects]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const allergies = (profile.allergies ?? '')
    .toLowerCase()
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const conditions = (profile.medical_conditions ?? '')
    .toLowerCase()
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const genericLower = medicine.generic_name.toLowerCase();
  const compositionLower = (medicine.composition ?? '').toLowerCase();

  for (const allergy of allergies) {
    if (genericLower.includes(allergy) || compositionLower.includes(allergy)) {
      return 'high-risk';
    }
  }

  if (profile.is_pregnant && rawText.includes('pregnan')) return 'high-risk';

  for (const cond of conditions) {
    if (cond && (medicine.contraindications ?? '').toLowerCase().includes(cond)) return 'high-risk';
    if (cond && (medicine.precautions ?? '').toLowerCase().includes(cond)) return 'caution';
  }

  if (rawText.includes('severe') || rawText.includes('fatal') || rawText.includes('contraindicated')) {
    return 'caution';
  }

  return 'safe';
}

type SafetyConfig = {
  label: string;
  Icon: React.ElementType;
  badgeClass: string;
  bannerBg: string;
  barClass: string;
};

const SAFETY_CONFIG: Record<SafetyLevel, SafetyConfig> = {
  safe: {
    label: 'Generally Safe',
    Icon: CheckCircle2,
    badgeClass: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    bannerBg: 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200',
    barClass: 'bg-gradient-to-r from-emerald-400 to-teal-400',
  },
  caution: {
    label: 'Use with Caution',
    Icon: AlertTriangle,
    badgeClass: 'text-amber-700 border-amber-200 bg-amber-50',
    bannerBg: 'bg-gradient-to-br from-amber-50 to-white border-amber-200',
    barClass: 'bg-gradient-to-r from-amber-400 to-orange-400',
  },
  'high-risk': {
    label: 'High Risk',
    Icon: XCircle,
    badgeClass: 'text-rose-700 border-rose-200 bg-rose-50',
    bannerBg: 'bg-gradient-to-br from-rose-50 to-white border-rose-200',
    barClass: 'bg-gradient-to-r from-rose-500 to-red-400',
  },
  unknown: {
    label: 'Review Needed',
    Icon: Info,
    badgeClass: 'text-slate-600 border-slate-200 bg-slate-50',
    bannerBg: 'bg-gradient-to-br from-slate-50 to-white border-slate-200',
    barClass: 'bg-gradient-to-r from-slate-300 to-slate-400',
  },
};

/* ─────────────────── Dosage generator ─────────────────── */
interface DosageInfo {
  adultDose: string;
  pediatricDose: string;
  frequency: string;
  maxDailyDose: string;
  instructions: string;
  profileNote: string | null;
}

const DISCLAIMER =
  'Dosage information is for educational guidance only. Consult a healthcare professional before taking any medication.';

function generateDosageInfo(medicine: Medicine, profile: HealthProfile | null): DosageInfo {
  const usageText = stripHtml(medicine.usage_guidelines ?? '');
  const compositionLower = (medicine.composition ?? '').toLowerCase();
  const nameLower = medicine.generic_name.toLowerCase();
  const strength = (medicine.strength ?? '').trim();
  const form = (medicine.dosage_form ?? 'tablet').toLowerCase();

  const doseMatch = usageText.match(/(\d+\s*(?:mg|ml|mcg|g)[^,.\n]*)/i);
  const freqMatch = usageText.match(/(once|twice|three times|every \d+ hours?|daily|bid|tid|qid)/i);

  // Profile-aware note
  let profileNote: string | null = null;
  if (profile) {
    const { age, weight_kg: weight, gender, is_pregnant } = profile;
    if (is_pregnant) {
      profileNote = '⚠️ You are pregnant — consult your obstetrician before taking any medication.';
    } else if (age != null && age >= 65) {
      profileNote = '👴 Adults over 65 should start with the lowest effective dose and monitor closely.';
    } else if (age != null && age < 12) {
      profileNote = '👶 Pediatric dosing: always use weight-based calculation — consult a pediatrician.';
    } else if (weight != null && gender) {
      profileNote = `Based on your profile (${gender}, ${weight} kg): standard adult dosing applies. Always verify with your healthcare provider.`;
    } else if (age != null) {
      profileNote = `For your age (${age} years): standard adult dosing guidance applies below.`;
    }
  }

  // Named-medicine lookup
  if (nameLower.includes('paracetamol') || nameLower.includes('acetaminophen') || compositionLower.includes('paracetamol')) {
    const isChild = profile?.age != null && profile.age < 12;
    return {
      adultDose: strength || '500 mg – 1000 mg per dose',
      pediatricDose: '10–15 mg/kg per dose (max 60 mg/kg/day)',
      frequency: 'Every 4–6 hours as needed',
      maxDailyDose: isChild ? '60 mg/kg/day (max 4 g/day)' : '4000 mg (4 g) per day',
      instructions: 'Can be taken with or without food. Swallow with water. Do not exceed the recommended dose.',
      profileNote,
    };
  }

  if (nameLower.includes('ibuprofen') || compositionLower.includes('ibuprofen')) {
    return {
      adultDose: strength || '200 mg – 400 mg per dose',
      pediatricDose: '5–10 mg/kg per dose (every 6–8 hours)',
      frequency: 'Every 6–8 hours (maximum 3 times daily)',
      maxDailyDose: '1200 mg/day (OTC) · 2400 mg/day (prescription)',
      instructions: 'Take with food or milk to avoid stomach upset. Drink plenty of water.',
      profileNote,
    };
  }

  if (nameLower.includes('aspirin') || compositionLower.includes('aspirin')) {
    return {
      adultDose: strength || '325 mg – 650 mg per dose (pain relief)',
      pediatricDose: "Not recommended for children under 16 (risk of Reye's syndrome)",
      frequency: 'Every 4–6 hours for pain; 75–100 mg once daily for cardiac use',
      maxDailyDose: '4000 mg/day (pain relief); 100 mg/day (cardiac prevention)',
      instructions: 'Take with food or a full glass of water. Do not crush enteric-coated tablets.',
      profileNote,
    };
  }

  if (nameLower.includes('metformin') || compositionLower.includes('metformin')) {
    return {
      adultDose: strength || '500 mg – 850 mg per dose',
      pediatricDose: '500 mg once daily (≥10 years), titrate as needed',
      frequency: '1–3 times daily with meals',
      maxDailyDose: '2550 mg per day',
      instructions: 'Always take with food to reduce GI side effects. Swallow whole — do not crush extended-release tablets.',
      profileNote,
    };
  }

  if (nameLower.includes('amoxicillin') || compositionLower.includes('amoxicillin')) {
    return {
      adultDose: strength || '250 mg – 500 mg per dose',
      pediatricDose: '25–45 mg/kg/day in divided doses',
      frequency: 'Every 8 hours (3×/day) or every 12 hours',
      maxDailyDose: '3000 mg/day (standard) · 4000 mg/day (severe infection)',
      instructions: 'Can be taken with or without food. Complete the full course even if you feel better.',
      profileNote,
    };
  }

  if (nameLower.includes('cetirizine') || compositionLower.includes('cetirizine')) {
    return {
      adultDose: strength || '10 mg once daily',
      pediatricDose: '2.5 mg once daily (2–5 yrs) · 5 mg once daily (6–11 yrs)',
      frequency: 'Once daily, preferably in the evening',
      maxDailyDose: '10 mg per day',
      instructions: 'Can be taken with or without food. May cause drowsiness — avoid driving.',
      profileNote,
    };
  }

  if (nameLower.includes('omeprazole') || compositionLower.includes('omeprazole')) {
    return {
      adultDose: strength || '20 mg – 40 mg per dose',
      pediatricDose: '0.7–3.5 mg/kg/day (consult pediatrician)',
      frequency: 'Once daily before a meal',
      maxDailyDose: '40 mg per day',
      instructions: 'Take 30–60 minutes before eating. Swallow capsule whole — do not crush.',
      profileNote,
    };
  }

  // Generic fallback — always produces non-empty values
  const fallbackDose = doseMatch ? doseMatch[1] : strength ? `As directed (${strength})` : 'As directed by your prescriber';
  const fallbackFreq = freqMatch ? freqMatch[0] : 'As directed by your prescriber';
  const fallbackInstructions = usageText || `Take ${form} exactly as directed. Follow all instructions on the packaging.`;

  return {
    adultDose: fallbackDose,
    pediatricDose: 'Consult a pediatrician for age-appropriate dosing',
    frequency: fallbackFreq,
    maxDailyDose: 'Do not exceed the recommended daily dose',
    instructions: fallbackInstructions,
    profileNote,
  };
}

/* ─────────────────── Quick chips ─────────────────── */
type ChipDef = { label: string; Icon: React.ElementType; colorClass: string };

function getQuickChips(medicine: Medicine): ChipDef[] {
  const text = [medicine.usage_guidelines, medicine.precautions, medicine.side_effects]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const chips: ChipDef[] = [];

  if (text.includes('food') || text.includes('meal') || text.includes('eat'))
    chips.push({ label: 'Take With Food', Icon: Utensils, colorClass: 'bg-teal-50 text-teal-700 border-teal-200' });
  if (text.includes('alcohol'))
    chips.push({ label: 'Avoid Alcohol', Icon: Wine, colorClass: 'bg-rose-50 text-rose-700 border-rose-200' });
  if (text.includes('drows') || text.includes('sedati') || text.includes('sleep'))
    chips.push({ label: 'May Cause Drowsiness', Icon: Moon, colorClass: 'bg-purple-50 text-purple-700 border-purple-200' });
  if (text.includes('caffein') || text.includes('coffee'))
    chips.push({ label: 'Avoid Caffeine', Icon: Coffee, colorClass: 'bg-amber-50 text-amber-700 border-amber-200' });
  if (text.includes('water') || text.includes('fluid'))
    chips.push({ label: 'Drink Plenty of Water', Icon: Activity, colorClass: 'bg-blue-50 text-blue-700 border-blue-200' });
  if (text.includes('empty stomach') || text.includes('before meal'))
    chips.push({ label: 'Before Meals', Icon: Clock, colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' });
  if (text.includes('fever') || text.includes('pain') || text.includes('analge'))
    chips.push({ label: 'For Pain & Fever', Icon: Thermometer, colorClass: 'bg-orange-50 text-orange-700 border-orange-200' });

  return chips.slice(0, 5);
}

/* ─────────────────── ExpandableSection ─────────────────── */
function ExpandableSection({
  title,
  Icon,
  children,
  defaultOpen = false,
  accentClass,
}: {
  title: string;
  Icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentClass?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={[
        'rounded-2xl border overflow-hidden transition-shadow duration-200',
        open ? 'shadow-sm' : '',
        accentClass ?? 'border-slate-200 bg-white',
      ].join(' ')}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between p-4 text-left hover:bg-white/60 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 font-semibold text-slate-900 text-sm">
          <Icon className="h-4 w-4 shrink-0" />
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-white/40 px-4 pb-4 pt-3 text-sm text-slate-700 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

/* ─────────────────── InfoTile ─────────────────── */
function InfoTile({ label, value, colorClass }: { label: string; value: string; colorClass: string }) {
  if (!value) return null;
  return (
    <div className={`rounded-2xl border p-3 ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{value}</p>
    </div>
  );
}

/* ─────────────────── DosageGrid ─────────────────── */
function DosageGrid({ info }: { info: DosageInfo }) {
  const cells = [
    { label: 'Adult Dose', value: info.adultDose },
    { label: 'Frequency', value: info.frequency },
    { label: 'Pediatric Dose', value: info.pediatricDose },
    { label: 'Max Daily Limit', value: info.maxDailyDose },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {cells.map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white/80 border border-white/50 shadow-sm p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-900">{value || '—'}</p>
          </div>
        ))}
      </div>

      {/* Instructions row — full width */}
      <div className="rounded-xl bg-white/80 border border-white/50 shadow-sm p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Usage Instructions</p>
        <p className="text-sm text-slate-800 leading-relaxed">{info.instructions || 'Follow your prescriber\'s instructions.'}</p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl bg-white/60 border border-slate-200/50 p-3">
        <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed italic">{DISCLAIMER}</p>
      </div>
    </div>
  );
}

/* ─────────────────── MedicineCard ─────────────────── */
function MedicineCard({
  medicine,
  profile,
  onClick,
}: {
  medicine: Medicine;
  profile: HealthProfile | null;
  onClick: () => void;
}) {
  const safety = getSafetyLevel(medicine, profile);
  const { label: safetyLabel, Icon: SafetyIcon, badgeClass, barClass } = SAFETY_CONFIG[safety];
  const chips = getQuickChips(medicine);
  const aliases = medicine.aliases ?? [];

  // Best description: composition > usage_guidelines > side_effects > fallback
  const description = stripHtml(
    medicine.composition ||
      medicine.usage_guidelines ||
      medicine.side_effects ||
      'Tap to view dosage guidance, safety warnings, and detailed information.',
  );

  return (
    <Card
      className="group h-full cursor-pointer border-slate-200/70 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden"
      onClick={onClick}
    >
      {/* Colour bar at top */}
      <div className={`h-1 w-full ${barClass}`} />

      <CardHeader className="pb-2 pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-bold text-slate-950 group-hover:text-teal-700 transition-colors leading-tight truncate">
              {medicine.generic_name}
            </CardTitle>
            {medicine.brand_name ? (
              <CardDescription className="mt-0.5 text-xs font-medium text-slate-500 truncate">
                Brand: <span className="text-slate-700">{medicine.brand_name}</span>
              </CardDescription>
            ) : (
              <CardDescription className="mt-0.5 text-xs text-slate-400">Generic medicine</CardDescription>
            )}
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs font-semibold border flex items-center gap-1 ${badgeClass}`}
          >
            <SafetyIcon className="h-3 w-3" />
            {safetyLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        {/* Form & Strength tags */}
        {(medicine.dosage_form || medicine.strength || aliases.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {medicine.dosage_form && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 border border-teal-100">
                <Pill className="h-3 w-3" />
                {medicine.dosage_form}
              </span>
            )}
            {medicine.strength && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-100">
                <Zap className="h-3 w-3" />
                {medicine.strength}
              </span>
            )}
            {aliases.slice(0, 1).map((alias) => (
              <span
                key={alias.id}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 border border-slate-200"
              >
                {alias.alias}
              </span>
            ))}
          </div>
        )}

        {/* Description */}
        <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{description}</p>

        {/* Quick chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.slice(0, 3).map((chip) => {
              const ChipIcon = chip.Icon;
              return (
                <span
                  key={chip.label}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${chip.colorClass}`}
                >
                  <ChipIcon className="h-2.5 w-2.5" />
                  {chip.label}
                </span>
              );
            })}
          </div>
        )}
      </CardContent>

      <div className="border-t border-slate-100 bg-gradient-to-r from-teal-50/40 to-cyan-50/40 px-4 py-2.5 flex items-center justify-between">
        <p className="text-xs font-medium text-teal-700">View dosage &amp; full details</p>
        <ArrowRight className="h-3.5 w-3.5 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
    </Card>
  );
}

/* ─────────────────── MedicineDetailDialog ─────────────────── */
function MedicineDetailDialog({
  medicine,
  detailLoading,
  profile,
  open,
  onClose,
}: {
  medicine: Medicine | null;
  detailLoading: boolean;
  profile: HealthProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  const safety = medicine ? getSafetyLevel(medicine, profile) : 'unknown';
  const { label: safetyLabel, Icon: SafetyIcon, badgeClass, bannerBg } = SAFETY_CONFIG[safety];

  const dosageInfo: DosageInfo | null = medicine ? generateDosageInfo(medicine, profile) : null;
  const chips: ChipDef[] = medicine ? getQuickChips(medicine) : [];
  const aliases = medicine?.aliases ?? [];

  // Key info tiles — only non-null ones render
  const infoTiles = medicine
    ? [
        { label: 'Dosage Form', value: medicine.dosage_form ?? '', colorClass: 'bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-100' },
        { label: 'Strength', value: medicine.strength ?? '', colorClass: 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100' },
        { label: 'Composition', value: medicine.composition ?? '', colorClass: 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-100' },
      ].filter((t) => t.value)
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-3xl w-[calc(100%-2rem)] overflow-y-auto p-0 gap-0 rounded-3xl border-0 shadow-2xl">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-white/96 backdrop-blur-md border-b border-slate-100 rounded-t-3xl px-6 pt-6 pb-4">
          <DialogHeader className="gap-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 shrink-0">
                <Pill className="h-4 w-4 text-teal-700" />
              </div>
              <div
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
              >
                <SafetyIcon className="h-3 w-3" />
                {safetyLabel}
              </div>
            </div>

            <DialogTitle className="text-2xl font-bold text-slate-950 leading-tight">
              {medicine?.generic_name ?? 'Loading…'}
            </DialogTitle>

            {medicine?.brand_name ? (
              <DialogDescription className="text-sm">
                Brand name:{' '}
                <span className="font-semibold text-slate-700">{medicine.brand_name}</span>
              </DialogDescription>
            ) : medicine ? (
              <DialogDescription className="text-sm text-slate-400">Generic medicine</DialogDescription>
            ) : null}
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        {detailLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-10 w-full rounded-2xl" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
              <Skeleton className="h-16 rounded-2xl" />
            </div>
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ) : medicine ? (
          <div className="px-6 pb-8 pt-4 space-y-4">

            {/* Quick chips */}
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => {
                  const ChipIcon = chip.Icon;
                  return (
                    <span
                      key={chip.label}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${chip.colorClass}`}
                    >
                      <ChipIcon className="h-3 w-3" />
                      {chip.label}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Key info tiles */}
            {infoTiles.length > 0 && (
              <div className={`grid gap-3 ${infoTiles.length === 1 ? 'grid-cols-1' : infoTiles.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {infoTiles.map((tile) => (
                  <InfoTile key={tile.label} label={tile.label} value={tile.value} colorClass={tile.colorClass} />
                ))}
              </div>
            )}

            {/* Profile note */}
            {dosageInfo?.profileNote && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
                <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">{dosageInfo.profileNote}</p>
              </div>
            )}

            {/* Dosage section */}
            <div className={`rounded-2xl border p-5 space-y-4 ${bannerBg}`}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-sm shrink-0">
                  <Clock className="h-4 w-4 text-teal-700" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Dosage Information</h3>
              </div>
              {dosageInfo && <DosageGrid info={dosageInfo} />}
            </div>

            {/* Expandable sections */}
            <div className="space-y-2">
              <ExpandableSection
                title="Side Effects"
                Icon={Thermometer}
                defaultOpen={false}
                accentClass="border-rose-100 bg-rose-50/40"
              >
                {medicine.side_effects ? (
                  <p>{stripHtml(medicine.side_effects)}</p>
                ) : (
                  <p className="text-slate-400 italic">No side effects information available for this medicine.</p>
                )}
              </ExpandableSection>

              <ExpandableSection
                title="Precautions & Warnings"
                Icon={AlertCircle}
                defaultOpen={false}
                accentClass="border-amber-100 bg-amber-50/40"
              >
                {medicine.precautions ? (
                  <p>{stripHtml(medicine.precautions)}</p>
                ) : (
                  <p className="text-slate-400 italic">No specific precautions listed.</p>
                )}
              </ExpandableSection>

              <ExpandableSection
                title="Contraindications"
                Icon={XCircle}
                defaultOpen={false}
                accentClass="border-rose-200 bg-rose-50/30"
              >
                {medicine.contraindications ? (
                  <p>{stripHtml(medicine.contraindications)}</p>
                ) : (
                  <p className="text-slate-400 italic">No contraindications listed.</p>
                )}
              </ExpandableSection>

              {medicine.storage_instructions && (
                <ExpandableSection
                  title="Storage Instructions"
                  Icon={Info}
                  defaultOpen={false}
                  accentClass="border-blue-100 bg-blue-50/30"
                >
                  <p>{stripHtml(medicine.storage_instructions)}</p>
                </ExpandableSection>
              )}

              {medicine.brand_name && (
                <ExpandableSection
                  title="Brand & Generic Information"
                  Icon={Pill}
                  defaultOpen={false}
                >
                  <div className="rounded-xl bg-teal-50 border border-teal-100 p-3 text-sm text-slate-800">
                    <span className="font-semibold text-teal-800">{medicine.brand_name}</span>
                    <span className="text-slate-600"> (brand) is the commercial name for </span>
                    <span className="font-semibold text-teal-800">{medicine.generic_name}</span>
                    <span className="text-slate-600">
                      {' '}(generic). Generic versions contain the same active ingredient and are typically more affordable.
                    </span>
                  </div>
                </ExpandableSection>
              )}

              {aliases.length > 0 && (
                <ExpandableSection
                  title={`Alternative Names (${aliases.length})`}
                  Icon={Activity}
                  defaultOpen={false}
                >
                  <div className="flex flex-wrap gap-2">
                    {aliases.map((alias) => (
                      <span
                        key={alias.id}
                        className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                      >
                        {alias.alias}
                      </span>
                    ))}
                  </div>
                </ExpandableSection>
              )}
            </div>

            {/* Footer disclaimer */}
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4">
              <Heart className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-0.5">Medical Disclaimer</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This information is provided for educational purposes only and does not constitute medical advice.
                  Always consult a qualified healthcare professional before starting, stopping, or changing any
                  medication.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export function MedicineSearchPage() {
  const form = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query: '' },
  });
  const query = form.watch('query');
  const debouncedQuery = useDebouncedValue(query, 350);

  const [items, setItems] = useState<Medicine[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const profile = useProfileStore((s) => s.profile);

  /* ── Search effect ── */
  useEffect(() => {
    const queryText = debouncedQuery.trim();

    async function runSearch() {
      if (queryText.length < 2) {
        setItems([]);
        setTotal(0);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await searchMedicines(queryText, 12, 0);
        // Guard: ensure items is always an array
        const safeItems = Array.isArray(response.items) ? response.items : [];
        setItems(safeItems);
        setTotal(typeof response.total === 'number' ? response.total : safeItems.length);
        addHistoryItem({
          kind: 'medicine',
          title: `Medicine search: ${queryText}`,
          detail: `${response.total} results for "${queryText}"`,
        });
      } catch (searchError) {
        setError(getApiErrorMessage(searchError));
        setItems([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    }

    runSearch();
  }, [debouncedQuery]);

  /* ── Open detail ── */
  async function openMedicine(medicine: Medicine) {
    // Show the card data immediately while loading full details
    setSelectedMedicine(medicine);
    setDetailLoading(true);

    try {
      const full = await getMedicine(medicine.id);
      // Merge: keep card data as fallback if any field is missing in full response
      setSelectedMedicine({
        ...medicine,
        ...full,
        aliases: full.aliases?.length ? full.aliases : (medicine.aliases ?? []),
        sources: full.sources ?? [],
      });
      addHistoryItem({
        kind: 'medicine',
        title: `Viewed: ${full.generic_name}`,
        detail: full.brand_name ? `Brand: ${full.brand_name}` : 'Opened medicine details',
      });
    } catch (medicineError) {
      // Keep showing card data even if detail fetch fails
      toast.error(`Could not load full details: ${getApiErrorMessage(medicineError)}`);
    } finally {
      setDetailLoading(false);
    }
  }

  /* ── Empty-state message ── */
  const emptyState = useMemo(() => {
    if (error) return 'Search failed. Please check your connection and try again.';
    if (query.trim().length < 2) return 'Enter a medicine name to view dosage, safety, and interaction details.';
    if (!items.length && !isLoading) return 'No medicines found. Try a different name or check the spelling.';
    return '';
  }, [error, isLoading, items.length, query]);

  const exampleMedicines = ['Paracetamol', 'Aspirin', 'Ibuprofen', 'Metformin', 'Amoxicillin', 'Cetirizine'];

  /* ── Render ── */
  return (
    <div className="space-y-6">

      {/* ── Search hero ── */}
      <section>
        <Card className="border-teal-100/80 bg-gradient-to-br from-teal-50 via-white to-cyan-50/60 shadow-[0_8px_32px_rgba(20,184,166,0.10)]">
          <CardHeader className="pb-4">
            <Badge variant="soft" className="w-fit gap-1.5 px-3 py-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Patient-Safe Medicine Information
            </Badge>

            <CardTitle className="mt-3 text-3xl font-bold leading-tight text-slate-950">
              Check dosage, safety &amp; interactions
            </CardTitle>

            <CardDescription className="max-w-2xl text-sm leading-6 mt-1.5 text-slate-600">
              Get personalised dosage guidance based on your health profile. View safety warnings, side effects,
              and usage instructions tailored to you.
            </CardDescription>

            {/* Trust pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { Icon: ShieldCheck, label: 'Interaction Safety' },
                { Icon: AlertCircle, label: 'Allergy Aware' },
                { Icon: Heart, label: 'Pregnancy Guidance' },
                { Icon: Pill, label: 'Dosage Insights' },
              ].map(({ Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 rounded-full bg-white/80 border border-teal-100/60 px-3 py-1 text-xs shadow-sm"
                >
                  <Icon className="h-3.5 w-3.5 text-teal-600" />
                  <span className="text-slate-700 font-medium">{label}</span>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <form className="space-y-3" onSubmit={form.handleSubmit(() => undefined)}>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-teal-500 transition-colors pointer-events-none" />
                <Input
                  placeholder="Search by medicine name, brand name, or ingredient…"
                  className="pl-11 border-teal-200/60 bg-white/90 placeholder:text-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 py-4 text-base shadow-sm group-focus-within:shadow-md transition-all"
                  autoComplete="off"
                  {...form.register('query')}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 sm:flex-initial sm:min-w-44 bg-teal-600 hover:bg-teal-700 text-white py-4 text-base font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2 shrink-0" />
                      Searching…
                    </>
                  ) : (
                    <>
                      Check Medicine
                      <ArrowRight className="h-5 w-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Type at least 2 characters for instant results &bull; Personalised to your health profile
              </p>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* ── Results ── */}
      <section>
        {/* Section header */}
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-700">Medicine Results</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">
              {total > 0
                ? total === 1
                  ? '1 medicine found'
                  : `${total} medicines found`
                : 'Search results appear here'}
            </h2>
            {total > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {profile
                  ? '✓ Results personalised to your health profile'
                  : 'Click any card to view detailed dosage information'}
              </p>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-1 w-full bg-slate-200 animate-pulse" />
                <CardContent className="space-y-3 p-5 pt-4">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-14 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length > 0 ? (
          /* Medicine cards */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((medicine) => (
              <MedicineCard
                key={medicine.id}
                medicine={medicine}
                profile={profile}
                onClick={() => openMedicine(medicine)}
              />
            ))}
          </div>
        ) : (
          /* Empty / initial state */
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-teal-100 shadow-sm">
              <Search className="h-7 w-7 text-teal-600" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{emptyState}</h3>

            {query.trim().length < 2 && (
              <div className="mt-5 space-y-3">
                <p className="text-xs font-medium text-slate-500">Quick search examples:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {exampleMedicines.map((med) => (
                    <button
                      key={med}
                      type="button"
                      onClick={() => form.setValue('query', med)}
                      className="rounded-full border border-teal-200 bg-white px-4 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-all shadow-sm"
                    >
                      {med}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.trim().length >= 2 && !error && (
              <p className="mt-3 text-xs text-slate-500">
                Try a different name, brand name, or active ingredient
              </p>
            )}
          </div>
        )}
      </section>

      {/* ── Detail dialog ── */}
      <MedicineDetailDialog
        medicine={selectedMedicine}
        detailLoading={detailLoading}
        profile={profile}
        open={Boolean(selectedMedicine)}
        onClose={() => setSelectedMedicine(null)}
      />
    </div>
  );
}