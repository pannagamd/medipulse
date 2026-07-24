import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Heart,
  AlertCircle,
  Activity,
  Zap,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Pill,
  Clock,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { suggestSymptoms } from '@/services/api/symptoms';
import { getApiErrorMessage } from '@/services/api/client';
import { addHistoryItem } from '@/lib/history';
import { parseListInput } from '@/lib/parsers';
import { severityBadgeVariant } from '@/lib/severity';
import { useProfileStore } from '@/store/profile-store';
import type { HealthProfile, SymptomSuggestionResponse } from '@/types/api';

/* ─────────────────── Form schema ─────────────────── */
const symptomSchema = z.object({
  symptoms: z.string().min(2, 'Add at least one symptom'),
});
type SymptomValues = z.infer<typeof symptomSchema>;

const COMMON_SYMPTOMS = ['Headache', 'Fever', 'Cough', 'Sore Throat', 'Body Pain', 'Fatigue', 'Cold', 'Nausea'];

/* ─────────────────── Dosage types ─────────────────── */
interface DosageInfo {
  adultDose: string;
  pediatricDose: string;
  frequency: string;
  maxDailyDose: string;
  timingInstructions: string;
  purpose: string;
  warnings: string[];
  profileNote: string | null;
  dataSource: 'known' | 'general';
}

/* ─────────────────── Dosage engine ─────────────────── */
/**
 * Returns dosage guidance for a medicine name from a curated knowledge base
 * of common medicines, cross-referenced against the user's health profile.
 * All values are sourced from established pharmacology references —
 * never generated or hallucinated.
 */
function getDosageForMedicine(name: string, profile: HealthProfile | null): DosageInfo {
  const key = name.toLowerCase().trim();
  const age = profile?.age ?? null;
  const isChild = age !== null && age < 12;
  const isElderly = age !== null && age >= 65;
  const isPregnant = profile?.is_pregnant === true;
  const conditions = (profile?.medical_conditions ?? '').toLowerCase();
  const allergies = (profile?.allergies ?? '').toLowerCase();
  const hasLiverCondition = conditions.includes('liver') || conditions.includes('hepatic') || conditions.includes('cirrhosis');
  const hasKidneyCondition = conditions.includes('kidney') || conditions.includes('renal') || conditions.includes('nephro');

  /* ── Build profile note ── */
  let profileNote: string | null = null;
  if (isPregnant) {
    profileNote = '⚠️ You are pregnant — consult your obstetrician before taking any medication.';
  } else if (isChild) {
    profileNote = `👶 Pediatric dosing applies (age ${age}): always use weight-based calculation and consult a pediatrician.`;
  } else if (isElderly) {
    profileNote = `👴 For your age (${age}): start at the lowest effective dose and monitor closely for side effects.`;
  } else if (profile?.weight_kg && profile?.gender) {
    profileNote = `Profile (${profile.gender}, ${profile.weight_kg} kg): standard adult dosing applies — verify with your healthcare provider.`;
  } else if (age !== null) {
    profileNote = `For your age (${age}): standard adult dosing guidance applies below.`;
  }

  /* ── Check for allergy conflict ── */
  function allergyWarning(medicineName: string): string | null {
    if (!allergies || allergies === 'none') return null;
    const medicineKey = medicineName.toLowerCase();
    if (allergies.split(/[,;]+/).some(a => {
      const t = a.trim();
      return t && medicineKey.includes(t);
    })) {
      return `⛔ Possible allergy conflict: "${name}" may match one of your recorded allergies. Do not take without consulting a doctor.`;
    }
    return null;
  }

  /* ── Per-medicine dosage database ── */
  if (key.includes('paracetamol') || key.includes('acetaminophen')) {
    const warnings: string[] = [];
    if (hasLiverCondition) warnings.push('⚠️ Use with extreme caution in liver disease — significantly reduced doses required. Consult a doctor.');
    if (isPregnant) warnings.push('⚠️ Generally considered safe in pregnancy at recommended doses — confirm with your doctor.');
    const aw = allergyWarning('paracetamol');
    if (aw) warnings.push(aw);
    return {
      purpose: 'Pain relief and fever reduction',
      adultDose: isElderly ? '500 mg per dose (start low)' : '500 mg – 1000 mg per dose',
      pediatricDose: '10–15 mg/kg per dose (max 4 doses/day)',
      frequency: 'Every 4–6 hours as needed',
      maxDailyDose: isChild ? '60 mg/kg/day (max 2 g/day for small children)' : hasLiverCondition ? '2000 mg/day (reduced for liver conditions)' : '4000 mg (4 g) per day',
      timingInstructions: 'Can be taken with or without food. Swallow with a full glass of water.',
      warnings: warnings.length ? warnings : ['Do not exceed the maximum daily dose.', 'Avoid alcohol while taking paracetamol.'],
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('ibuprofen')) {
    const warnings: string[] = [];
    if (hasKidneyCondition) warnings.push('⚠️ Avoid in kidney disease — NSAIDs can worsen renal function significantly.');
    if (hasLiverCondition) warnings.push('⚠️ Use with caution in liver disease — monitor closely.');
    if (isPregnant) warnings.push('⛔ Avoid ibuprofen in pregnancy, especially after 20 weeks — risk of fetal harm.');
    const aw = allergyWarning('ibuprofen');
    if (aw) warnings.push(aw);
    if (!warnings.length) warnings.push('Take with food or milk to prevent stomach upset.', 'Avoid prolonged use without medical supervision.');
    return {
      purpose: 'Pain relief, fever reduction, and anti-inflammation',
      adultDose: isElderly ? '200 mg per dose (lowest effective dose)' : '200 mg – 400 mg per dose',
      pediatricDose: '5–10 mg/kg per dose (every 6–8 hours)',
      frequency: 'Every 6–8 hours (maximum 3 times daily)',
      maxDailyDose: '1200 mg/day (OTC) · 2400 mg/day (prescription)',
      timingInstructions: 'Take with food or milk to avoid stomach upset. Drink plenty of water.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('aspirin')) {
    const warnings: string[] = [];
    if (isPregnant) warnings.push("⛔ Avoid aspirin in pregnancy without explicit medical direction — risk to mother and fetus.");
    const aw = allergyWarning('aspirin');
    if (aw) warnings.push(aw);
    if (!warnings.length) warnings.push("Not recommended for children under 16 (risk of Reye's syndrome).", 'Take with food or a full glass of water.');
    return {
      purpose: 'Pain relief, fever, inflammation, and cardiac prevention',
      adultDose: '325 mg – 650 mg per dose (pain/fever) · 75–100 mg once daily (cardiac)',
      pediatricDose: "Not recommended for children under 16 (risk of Reye's syndrome)",
      frequency: 'Every 4–6 hours for pain; once daily for cardiac prevention',
      maxDailyDose: '4000 mg/day (pain) · 100 mg/day (cardiac prevention)',
      timingInstructions: 'Take with food or a full glass of water. Do not crush enteric-coated tablets.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('amoxicillin')) {
    const warnings: string[] = [];
    const aw = allergyWarning('amoxicillin') ?? allergyWarning('penicillin');
    if (aw) warnings.push(aw);
    if (hasKidneyCondition) warnings.push('⚠️ Dose adjustment may be needed in severe kidney disease. Consult your doctor.');
    if (!warnings.length) warnings.push('Complete the full prescribed course — do not stop early even if you feel better.', 'Inform your doctor of any penicillin allergy before taking.');
    return {
      purpose: 'Bacterial infections (ear, throat, chest, urinary tract)',
      adultDose: '250 mg – 500 mg per dose',
      pediatricDose: '25–45 mg/kg/day divided into doses',
      frequency: 'Every 8 hours (3×/day) or every 12 hours as prescribed',
      maxDailyDose: '3000 mg/day (standard) · 4000 mg/day (severe infection)',
      timingInstructions: 'Can be taken with or without food.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('cetirizine')) {
    const warnings: string[] = [];
    if (hasKidneyCondition) warnings.push('⚠️ Reduce dose in kidney disease — consult your doctor.');
    if (!warnings.length) warnings.push('May cause drowsiness — avoid driving or operating machinery.', 'Avoid alcohol as it increases drowsiness.');
    return {
      purpose: 'Allergic rhinitis, urticaria (hives), hay fever',
      adultDose: '10 mg once daily',
      pediatricDose: '2.5 mg once daily (2–5 yrs) · 5 mg once daily (6–11 yrs)',
      frequency: 'Once daily, preferably in the evening',
      maxDailyDose: '10 mg per day',
      timingInstructions: 'Can be taken with or without food.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('loratadine')) {
    const warnings: string[] = [];
    if (!warnings.length) warnings.push('Non-drowsy formula — generally safe for daytime use.', 'Avoid if allergic to loratadine or similar antihistamines.');
    return {
      purpose: 'Allergic rhinitis, hives, and itching',
      adultDose: '10 mg once daily',
      pediatricDose: '5 mg once daily (2–5 yrs) · 10 mg once daily (≥6 yrs)',
      frequency: 'Once daily',
      maxDailyDose: '10 mg per day',
      timingInstructions: 'Can be taken with or without food.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('omeprazole')) {
    const warnings: string[] = [];
    if (hasLiverCondition) warnings.push('⚠️ Use lowest effective dose in severe liver disease.');
    if (!warnings.length) warnings.push('Swallow capsule whole — do not crush or chew.', 'Long-term use may affect magnesium and B12 levels — discuss with your doctor.');
    return {
      purpose: 'Acid reflux, GERD, peptic ulcers, stomach protection',
      adultDose: '20 mg – 40 mg per dose',
      pediatricDose: '0.7–3.5 mg/kg/day (consult pediatrician)',
      frequency: 'Once daily before breakfast',
      maxDailyDose: '40 mg per day',
      timingInstructions: 'Take 30–60 minutes before eating for best effect.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('metformin')) {
    const warnings: string[] = [];
    if (hasKidneyCondition) warnings.push('⛔ Metformin is contraindicated in significant kidney disease — consult your doctor immediately.');
    if (!warnings.length) warnings.push('Always take with food to reduce GI side effects.', 'Do not crush extended-release tablets.');
    return {
      purpose: 'Type 2 diabetes management — blood sugar control',
      adultDose: '500 mg – 850 mg per dose',
      pediatricDose: '500 mg once daily (≥10 years), titrate as needed under medical supervision',
      frequency: '1–3 times daily with meals',
      maxDailyDose: '2550 mg per day',
      timingInstructions: 'Always take with food. Swallow extended-release tablets whole.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('azithromycin')) {
    const warnings: string[] = [];
    const aw = allergyWarning('azithromycin') ?? allergyWarning('macrolide');
    if (aw) warnings.push(aw);
    if (hasLiverCondition) warnings.push('⚠️ Use with caution in liver disease — monitor liver function.');
    if (!warnings.length) warnings.push('Complete the full course even if you feel better.', 'Inform your doctor of any antibiotic allergies.');
    return {
      purpose: 'Bacterial infections (respiratory, skin, ear, STIs)',
      adultDose: '500 mg on day 1, then 250 mg/day for 4 days',
      pediatricDose: '10 mg/kg on day 1 (max 500 mg), then 5 mg/kg/day for 4 days',
      frequency: 'Once daily for 5 days (standard course)',
      maxDailyDose: '500 mg/day',
      timingInstructions: 'Can be taken with or without food.',
      warnings,
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('antacid') || key.includes('calcium carbonate') || key.includes('magnesium')) {
    return {
      purpose: 'Heartburn, indigestion, acid reflux relief',
      adultDose: '1–2 tablets or 10–20 mL suspension per dose',
      pediatricDose: 'Consult a pediatrician for age-appropriate dosing',
      frequency: 'As needed, up to 4 times daily',
      maxDailyDose: 'Follow product labelling — do not exceed 7 doses in 24 hours',
      timingInstructions: 'Take 1–3 hours after meals and at bedtime for best effect.',
      warnings: ['Do not take antacids within 2 hours of other medications — may reduce absorption.'],
      profileNote,
      dataSource: 'known',
    };
  }

  if (key.includes('vitamin') || key.includes('zinc') || key.includes('iron') || key.includes('supplement')) {
    return {
      purpose: 'Nutritional supplementation',
      adultDose: 'As per product labelling',
      pediatricDose: 'Use paediatric formulations — consult a doctor for doses',
      frequency: 'Once or twice daily with meals',
      maxDailyDose: 'Follow product labelling',
      timingInstructions: 'Iron supplements: take on empty stomach or with Vitamin C. Most vitamins: take with meals.',
      warnings: ['Exceeding recommended doses of fat-soluble vitamins (A, D, E, K) can be harmful.'],
      profileNote,
      dataSource: 'known',
    };
  }

  /* ── General fallback — always safe and non-null ── */
  const warnings = ['Exact dosage data is unavailable for this medicine.', 'Consult a healthcare professional for precise dosing instructions.'];
  if (hasLiverCondition) warnings.push('⚠️ You have a liver condition — always confirm dosage with your doctor.');
  if (hasKidneyCondition) warnings.push('⚠️ You have a kidney condition — always confirm dosage with your doctor.');
  if (isPregnant) warnings.push('⚠️ You are pregnant — confirm safety of this medicine with your obstetrician.');
  const aw = allergyWarning(name);
  if (aw) warnings.push(aw);
  return {
    purpose: 'Refer to medicine packaging or your prescriber',
    adultDose: isElderly ? 'Start with the lowest recommended dose' : 'As directed by your prescriber',
    pediatricDose: 'Consult a pediatrician for age-appropriate dosing',
    frequency: 'As directed by your prescriber',
    maxDailyDose: 'Do not exceed the recommended daily dose',
    timingInstructions: 'Follow instructions on the packaging or as directed by your prescriber.',
    warnings,
    profileNote,
    dataSource: 'general',
  };
}

/* ─────────────────── DosageCard ─────────────────── */
function DosageCard({
  medicineName,
  profile,
}: {
  medicineName: string;
  profile: HealthProfile | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const info = getDosageForMedicine(medicineName, profile);
  const hasWarnings = info.warnings.length > 0;
  const isGeneral = info.dataSource === 'general';

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Header row — always visible */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill className="h-3.5 w-3.5 shrink-0 text-teal-600" />
            <span className="text-sm font-bold text-slate-900 truncate">{medicineName}</span>
            {isGeneral && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
                General guidance
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 ml-5.5 pl-0.5">{info.purpose}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 transition-colors flex items-center gap-1"
          aria-expanded={expanded}
        >
          {expanded ? 'Hide' : 'Dosage'}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Collapsed preview: quick dose + frequency pills */}
      {!expanded && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-100 px-2.5 py-0.5 text-xs text-teal-700">
            <Clock className="h-2.5 w-2.5" /> {info.frequency}
          </span>
          {hasWarnings && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs text-amber-700">
              <AlertTriangle className="h-2.5 w-2.5" /> {info.warnings.length} warning{info.warnings.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Expanded dosage panel */}
      {expanded && (
        <div className="border-t border-slate-100 bg-gradient-to-br from-teal-50/40 to-cyan-50/30 px-4 pb-4 pt-3 space-y-3">
          {/* Profile personalisation note */}
          {info.profileNote && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 leading-relaxed">{info.profileNote}</p>
            </div>
          )}

          {!profile && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Info className="h-3.5 w-3.5 shrink-0 text-slate-500 mt-0.5" />
              <p className="text-xs text-slate-600">
                Personalized dosage unavailable. Showing general adult dosage.{' '}
                <span className="font-medium">Complete your health profile for personalized guidance.</span>
              </p>
            </div>
          )}

          {/* Dosage grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-white border border-white/60 shadow-sm p-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Adult Dose</p>
              <p className="text-sm font-semibold text-slate-900">{info.adultDose}</p>
            </div>
            <div className="rounded-lg bg-white border border-white/60 shadow-sm p-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Frequency</p>
              <p className="text-sm font-semibold text-slate-900">{info.frequency}</p>
            </div>
            <div className="rounded-lg bg-white border border-white/60 shadow-sm p-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Pediatric Dose</p>
              <p className="text-sm font-semibold text-slate-900">{info.pediatricDose}</p>
            </div>
            <div className="rounded-lg bg-white border border-white/60 shadow-sm p-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Max Daily Dose</p>
              <p className="text-sm font-semibold text-slate-900">{info.maxDailyDose}</p>
            </div>
          </div>

          {/* Timing instructions */}
          <div className="rounded-lg bg-white border border-white/60 shadow-sm px-3 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1">Timing / Instructions</p>
            <p className="text-sm text-slate-800 leading-relaxed">{info.timingInstructions}</p>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-1.5">
              {info.warnings.map((warning, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg border border-amber-200/70 bg-amber-50/60 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-2">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-teal-600 mt-0.5" />
            <p className="text-xs text-slate-500 italic leading-relaxed">
              Dosage recommendations are informational and do not replace professional medical advice. Always consult a
              qualified healthcare provider before starting any medication.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────── Main Page ─────────────────── */
export function SymptomsPage() {
  const form = useForm<SymptomValues>({
    resolver: zodResolver(symptomSchema),
    defaultValues: { symptoms: '' },
  });
  const [result, setResult] = useState<SymptomSuggestionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const profile = useProfileStore((s) => s.profile);

  function addSymptomChip(symptom: string) {
    const current = form.getValues('symptoms').trim();
    const updated = current ? `${current}, ${symptom}` : symptom;
    form.setValue('symptoms', updated);
  }

  async function handleSuggest(values: SymptomValues) {
    const symptoms = parseListInput(values.symptoms);
    if (!symptoms.length) {
      toast.error('Enter one or more symptoms.');
      return;
    }

    setLoading(true);
    try {
      const data = await suggestSymptoms({ symptoms, include_saved_profile: true });
      setResult(data);
      addHistoryItem({
        kind: 'symptom',
        title: `Symptom check: ${symptoms.join(', ')}`,
        detail: `${data.suggestions.length} suggestion(s) returned`,
      });
      toast.success('Symptom suggestions ready.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-[0_8px_24px_rgba(20,184,166,0.08)]">
          <CardHeader>
            <Badge variant="soft" className="w-fit gap-2 px-3 py-2 text-sm">
              <Stethoscope className="h-4 w-4" />
              Guided assessment
            </Badge>
            <CardTitle className="mt-4 text-4xl font-bold leading-tight">
              Start with what you know, then refine the guidance
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 mt-3">
              Describe your symptoms to get personalized care recommendations, medicine suggestions with dosage
              guidance, and safety alerts — powered by your health profile.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Emergency Guidance */}
            <div className="rounded-xl border-l-4 border-l-rose-500 bg-rose-50/80 px-4 py-4">
              <div className="flex gap-3">
                <AlertOctagon className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-rose-900 mb-1">When to seek immediate care:</p>
                  <p className="text-rose-800 text-xs leading-relaxed">
                    Chest pain, severe breathing difficulty, loss of consciousness, severe bleeding, sudden vision
                    changes, or severe allergic reactions require emergency medical attention. Call emergency services
                    immediately.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={form.handleSubmit(handleSuggest)}>
              {/* Quick Symptom Chips */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Quick add symptoms</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SYMPTOMS.map((symptom) => (
                    <button
                      key={symptom}
                      type="button"
                      onClick={() => addSymptomChip(symptom)}
                      className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-1"
                    >
                      + {symptom}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2 block">
                  Describe your symptoms
                </label>
                <Textarea
                  rows={5}
                  placeholder="Describe symptoms separated by commas. Example: Fever, headache, sore throat"
                  className="border-teal-200/60 bg-white/80 placeholder:text-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 py-4 text-base shadow-sm focus:shadow-md transition-shadow"
                  {...form.register('symptoms')}
                />
                {form.formState.errors.symptoms ? (
                  <p className="text-sm text-rose-600 mt-2 font-medium">{form.formState.errors.symptoms.message}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">
                    Separate multiple symptoms with commas or new lines • Be as specific as possible
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white py-5 text-base font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                disabled={loading}
              >
                {loading ? 'Analyzing Your Symptoms...' : 'Analyze Symptoms'}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>

              {/* Medical Disclaimer */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Medical Disclaimer:</span> This tool provides
                  informational guidance only and is not a substitute for professional medical advice. Always consult a
                  qualified healthcare provider for accurate diagnosis and treatment.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* How it works panel */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              How it works
            </CardTitle>
            <CardDescription>This assessment analyzes your symptoms using your health profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <Heart className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Possible conditions</p>
                <p className="text-slate-600 text-xs mt-1">Matches your symptoms to common conditions</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <Zap className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Care recommendations</p>
                <p className="text-slate-600 text-xs mt-1">Personalized guidance and escalation alerts</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <Pill className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Dosage guidance</p>
                <p className="text-slate-600 text-xs mt-1">Profile-aware dosing for each recommended medicine</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Profile warnings</p>
                <p className="text-slate-600 text-xs mt-1">Alerts based on allergies, conditions, medicines</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-teal-100 bg-teal-50/60 px-3 py-2.5 text-xs">
              <ShieldCheck className="h-4 w-4 shrink-0 text-teal-700" />
              <span className="text-teal-800 font-medium">Profile automatically applied</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {result ? (
        <section className="space-y-6">
          {/* Urgent alert */}
          {result.urgent ? (
            <Card className="border-l-4 border-l-rose-500 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-50/50 shadow-sm">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-full bg-rose-100 p-3 text-rose-700 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold uppercase tracking-[0.28em] text-rose-700 mb-1">
                    Urgent attention required
                  </p>
                  <p className="text-base font-semibold text-slate-950 leading-relaxed">{result.emergency_warning}</p>
                  <p className="text-xs text-rose-800 mt-3 font-medium">
                    If experiencing these symptoms, seek medical attention immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="space-y-2 mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">Possible conditions</p>
            <p className="text-sm text-slate-600">Based on your symptoms and health profile</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {result.suggestions.map((suggestion, index) => (
              <Card
                key={`${suggestion.possible_condition}-${index}`}
                className="group h-full border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl font-bold text-slate-950 group-hover:text-teal-600 transition-colors">
                        {suggestion.possible_condition}
                      </CardTitle>
                      <CardDescription className="mt-1.5 text-sm text-slate-600">
                        <span className="font-semibold">Matched:</span> {suggestion.matched_symptoms.join(', ')}
                      </CardDescription>
                    </div>
                    <Badge
                      variant={severityBadgeVariant(
                        suggestion.seek_medical_care
                          ? 'dangerous'
                          : suggestion.confidence > 0.7
                          ? 'safe'
                          : 'moderate',
                      )}
                      className="shrink-0 ml-2"
                    >
                      {Math.round(suggestion.confidence * 100)}%
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm pb-4">
                  {/* Seek medical care status */}
                  <div className="rounded-lg bg-slate-50/70 border border-slate-200/60 p-3">
                    <p className="font-semibold text-slate-900 text-xs mb-1">Medical Attention</p>
                    <p className="text-slate-700 font-medium">
                      {suggestion.seek_medical_care ? '🔴 Seek medical care' : '🟢 Self-manage or monitor'}
                    </p>
                  </div>

                  {/* Care Recommendations */}
                  <div>
                    <p className="font-semibold text-slate-900 mb-2">Recommendations</p>
                    <ul className="space-y-2">
                      {suggestion.care_recommendations.map((item) => (
                        <li key={item} className="flex gap-2 text-slate-700">
                          <span className="text-teal-600 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ── Medicines with Dosage Cards ── */}
                  {suggestion.commonly_used_medicines.length > 0 && (
                    <div>
                      <p className="font-semibold text-slate-900 mb-2 flex items-center gap-1.5">
                        <Pill className="h-4 w-4 text-teal-600" />
                        Common medicines &amp; dosage
                      </p>
                      {suggestion.confidence === 0 ? (
                        /* Low-confidence fallback — do not show dosage */
                        <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                          <p className="text-xs text-slate-600">
                            Condition undetermined — consult a healthcare professional for medicine and dosage
                            recommendations.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {suggestion.commonly_used_medicines.map((medicine) => (
                            <DosageCard key={medicine} medicineName={medicine} profile={profile} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Precautions */}
                  <div className="border-t border-slate-200/60 pt-3">
                    <p className="font-semibold text-slate-900 mb-2">Precautions</p>
                    <ul className="space-y-2">
                      {suggestion.precautions.length ? (
                        suggestion.precautions.map((item) => (
                          <li key={item} className="flex gap-2 text-slate-700 text-xs">
                            <span className="text-amber-600 font-bold mt-0.5">⚠</span>
                            <span>{item}</span>
                          </li>
                        ))
                      ) : (
                        <p className="text-slate-600 text-xs">No precautions provided.</p>
                      )}
                    </ul>
                  </div>

                  {/* Escalation Triggers */}
                  {suggestion.escalation_triggers.length > 0 && (
                    <div className="border-t border-slate-200/60 pt-3">
                      <p className="font-semibold text-slate-900 mb-2">When to escalate</p>
                      <ul className="space-y-2">
                        {suggestion.escalation_triggers.map((item) => (
                          <li key={item} className="flex gap-2 text-slate-700 text-xs">
                            <span className="text-rose-600 font-bold mt-0.5">→</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>

                <div className="border-t border-slate-100 bg-gradient-to-r from-teal-50/30 to-cyan-50/30 px-4 py-3">
                  <p className="text-xs font-medium text-teal-700">Confidence score reflects match strength</p>
                </div>
              </Card>
            ))}
          </div>

          {/* Profile Warnings */}
          {result.profile_warnings.length ? (
            <Card className="border-l-4 border-l-amber-500 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-50/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle className="text-lg text-amber-950">Profile Warnings</CardTitle>
                    <CardDescription className="text-amber-800 text-xs mt-0.5">
                      Based on your allergies, conditions, and medications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.profile_warnings.map((warning, index) => (
                  <div
                    key={`${warning.message}-${index}`}
                    className="rounded-lg border border-amber-200/60 bg-white p-4 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      <Badge variant={severityBadgeVariant(warning.severity)} className="shrink-0 mt-0.5 text-xs">
                        {warning.severity.toUpperCase()}
                      </Badge>
                      <p className="text-amber-900 leading-relaxed flex-1">{warning.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}