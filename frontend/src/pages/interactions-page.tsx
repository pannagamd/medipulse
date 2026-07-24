import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowRight, ShieldAlert, ShieldCheck, CheckCircle2, AlertCircle, Pill, Activity, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { analyzeInteractions } from '@/services/api/interactions';
import { getApiErrorMessage } from '@/services/api/client';
import { addHistoryItem } from '@/lib/history';
import { parseListInput } from '@/lib/parsers';
import { severityBadgeVariant, severityDescription, severityLabel, severityTone } from '@/lib/severity';
import type { InteractionAnalyzeResponse, Severity } from '@/types/api';

const interactionSchema = z.object({ medicines: z.string().min(3, 'Add at least two medicines') });
type InteractionValues = z.infer<typeof interactionSchema>;

const COMMON_MEDICINES = ['Aspirin', 'Paracetamol', 'Metformin', 'Warfarin', 'Ibuprofen', 'Amoxicillin', 'Lisinopril', 'Atorvastatin'];

export function InteractionsPage() {
  const form = useForm<InteractionValues>({ resolver: zodResolver(interactionSchema), defaultValues: { medicines: 'Aspirin, Warfarin' } });
  const [result, setResult] = useState<InteractionAnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const medicines = form.watch('medicines');
  const medicineCount = useMemo(() => parseListInput(medicines).length, [medicines]);

  function addMedicineChip(medicine: string) {
    const current = form.getValues('medicines').trim();
    const updated = current ? `${current}, ${medicine}` : medicine;
    form.setValue('medicines', updated);
  }

  async function handleCheck(values: InteractionValues) {
    const medicines = parseListInput(values.medicines);
    if (medicines.length < 2) {
      toast.error('Enter at least two medicines separated by commas or new lines.');
      return;
    }

    setLoading(true);
    try {
      const data = await analyzeInteractions(medicines, true);
      setResult(data);
      addHistoryItem({ kind: 'interaction', title: `Interaction check: ${medicines.join(' + ')}`, detail: `Overall severity: ${data.overall_severity}` });
      toast.success('Interaction analysis complete.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const bannerTone = result ? severityTone(result.overall_severity) : 'text-slate-700 bg-slate-50 border-slate-200';

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-[0_8px_24px_rgba(20,184,166,0.08)]">
          <CardHeader>
            <Badge variant="soft" className="w-fit gap-2 px-3 py-2 text-sm">
              <ShieldAlert className="h-4 w-4" />
              Safe medicine combinations
            </Badge>
            <CardTitle className="mt-4 text-4xl font-bold leading-tight">
              Check medicine interactions and get safety guidance
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 mt-3">
              Enter your medicines to identify potentially unsafe combinations, review interactions, and get evidence-backed safety recommendations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Quick Medicine Chips */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">Quick add medicines</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_MEDICINES.map((medicine) => (
                  <button
                    key={medicine}
                    type="button"
                    onClick={() => addMedicineChip(medicine)}
                    className="rounded-full border border-teal-200 bg-white px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300 focus:ring-offset-1"
                  >
                    + {medicine}
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form className="space-y-4" onSubmit={form.handleSubmit(handleCheck)}>
              {/* Textarea with guidance */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 mb-2 block">
                  Enter your medicines
                </label>
                <Textarea
                  rows={5}
                  placeholder="Enter medicine names separated by commas. Example: Aspirin, Warfarin, Metformin"
                  className="border-teal-200/60 bg-white/80 placeholder:text-slate-500 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 py-4 text-base shadow-sm focus:shadow-md transition-shadow"
                  {...form.register('medicines')}
                />
                {form.formState.errors.medicines ? (
                  <p className="text-sm text-rose-600 mt-2 font-medium">{form.formState.errors.medicines.message}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Separate multiple medicines with commas or new lines • At least 2 medicines required</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-teal-700">{medicineCount} medicine(s) detected</p>
                <Button
                  type="submit"
                  disabled={loading}
                  className="sm:min-w-44 bg-teal-600 hover:bg-teal-700 text-white py-5 text-base font-semibold rounded-lg shadow-sm hover:shadow-md transition-all"
                >
                  {loading ? 'Analyzing...' : 'Check Interactions'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </div>

              {/* Medical Disclaimer */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-semibold text-slate-700">Medical Disclaimer:</span> Drug interaction guidance is informational and should not replace professional medical advice. Always consult a pharmacist or doctor before starting new medicines.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* What This Checks Section */}
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-teal-600" />
              What we analyze
            </CardTitle>
            <CardDescription>How this checker helps you stay safe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Unsafe combinations</p>
                <p className="text-slate-600 text-xs mt-1">Detects risky medicine pairs</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <TrendingUp className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Evidence-backed info</p>
                <p className="text-slate-600 text-xs mt-1">Based on clinical research</p>
              </div>
            </div>

            <div className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-teal-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-slate-900">Profile warnings</p>
                <p className="text-slate-600 text-xs mt-1">Applies allergies & conditions</p>
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
          {/* Overall Severity Banner */}
          <Card className={`border ${bannerTone} shadow-sm`}>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">Overall Risk Level</p>
                <p className="mt-1.5 text-3xl font-bold text-slate-950">{severityLabel(result.overall_severity)}</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                  {severityDescription(result.overall_severity)}
                </p>
              </div>
              <Badge variant={severityBadgeVariant(result.overall_severity)} className="w-fit px-4 py-2 text-sm shrink-0">
                <ShieldAlert className="h-4 w-4" />
                {severityLabel(result.overall_severity)}
              </Badge>
            </CardContent>
          </Card>

          {/* Profile Warnings */}
          {result.profile_warnings.length ? (
            <Card className="border-l-4 border-l-amber-500 border-amber-200/60 bg-gradient-to-br from-amber-50 to-amber-50/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <CardTitle className="text-lg text-amber-950">Your Profile Alerts</CardTitle>
                    <CardDescription className="text-amber-800 text-xs mt-0.5">
                      Based on your allergies, conditions, and medications
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3">
                {result.profile_warnings.map((warning, index) => (
                  <div key={`${warning.message}-${index}`} className="rounded-lg border border-amber-200/60 bg-white p-4 text-sm">
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

          {/* Interaction Results */}
          <div className="space-y-3 mb-5">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">Medicine Pair Interactions ({result.results.length})</p>
            <p className="text-sm text-slate-600">Review each medicine combination for safety</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.results.map((item, index) => {
              const hasMechanism = item.mechanism && item.mechanism.trim() !== '';
              const hasRecommendations = item.recommendations.length > 0;

              return (
                <Card
                  key={`${item.drug_a}-${item.drug_b}-${index}`}
                  className="group h-full border-slate-200/60 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant={severityBadgeVariant(item.severity)} className="text-xs shrink-0">
                        {item.severity}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-950 group-hover:text-teal-600 transition-colors leading-snug">
                      {item.drug_a} + {item.drug_b}
                    </CardTitle>
                    {item.explanation && (
                      <CardDescription className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                        {item.explanation}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3 text-sm flex-1 pb-3">
                    {/* How they interact */}
                    {hasMechanism && (
                      <div>
                        <p className="font-semibold text-slate-900 text-xs mb-1">How they interact</p>
                        <p className="text-xs text-slate-700">{item.mechanism}</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {hasRecommendations && (
                      <div>
                        <p className="font-semibold text-slate-900 text-xs mb-1.5">What to do</p>
                        <ul className="space-y-1">
                          {item.recommendations.map((recommendation) => (
                            <li key={recommendation} className="flex gap-2 text-slate-700 text-xs">
                              <span className="text-teal-600 font-bold shrink-0">&bull;</span>
                              <span>{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Resolved Medicines */}
          <Card className="border-slate-200/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-teal-600" />
                Verified medicines
              </CardTitle>
              <CardDescription>These are the matched records from your entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {result.resolved_medicines.map((medicine) => (
                  <div key={medicine.input} className="rounded-lg border border-teal-100/50 bg-teal-50/30 p-4 text-sm">
                    <p className="font-semibold text-slate-950">{medicine.input}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      <span className="font-medium">Matched as:</span> {medicine.resolved_name}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      {medicine.matched ? (
                        <>
                          <span className="text-emerald-600">✓</span>
                          <span className="text-xs text-emerald-700 font-medium">Exact match</span>
                        </>
                      ) : (
                        <>
                          <span className="text-amber-600">→</span>
                          <span className="text-xs text-amber-700 font-medium">Approximate match</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}