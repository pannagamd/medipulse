import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircle2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { addHistoryItem } from '@/lib/history';
import { getApiErrorMessage } from '@/services/api/client';
import { getProfile, updateProfile } from '@/services/api/profile';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';
import type { HealthProfile } from '@/types/api';

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { profile: storedProfile, setProfile } = useProfileStore();

  const form = useForm<HealthProfile>({
    defaultValues: {
      gender: '',
      is_pregnant: false,
    } as HealthProfile,
  });

  // Watch gender to conditionally show female-only fields
  const gender = form.watch('gender');
  const isFemale = gender?.toLowerCase() === 'female';

  useEffect(() => {
    // ── Step 1: Populate immediately from the global store (already fetched
    //   by AuthBootstrap after login / token restore). This prevents the
    //   blank-form flicker on every navigation to this page.
    if (storedProfile) {
      form.reset(storedProfile);
    }

    // ── Step 2: Sync with the backend to catch any changes made in another
    //   session or tab. This is non-blocking for the initial render.
    async function refreshFromApi() {
      try {
        const current = await getProfile();
        if (current) {
          form.reset(current);
          // Keep the store in sync too
          setProfile(current);
        }
      } catch {
        // Backend unreachable or profile doesn't exist yet — keep the
        // store-populated values already in the form.
      }
    }
    refreshFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount — storedProfile from Zustand is accessed inside via closure

  async function handleSave(values: HealthProfile) {
    // Clear pregnancy flag when gender is not female
    const payload = {
      ...values,
      is_pregnant: isFemale ? values.is_pregnant : false,
    };

    try {
      const saved = await updateProfile(payload);
      form.reset(saved);
      // Push to central profile store so the guard reflects the new state immediately
      setProfile(saved);
      addHistoryItem({
        kind: 'profile',
        title: 'Profile updated',
        detail: 'Saved health profile and demographic data.',
      });
      toast.success('Profile saved.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <section>
        {/* ── Profile Form ─────────────────────────────────────────── */}
        <Card className="border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50">
          <CardHeader className="pb-4">
            <Badge variant="soft" className="w-fit gap-2 px-3 py-2 text-sm">
              <UserRound className="h-4 w-4" />
              Profile settings
            </Badge>
            <CardTitle className="mt-3 text-3xl">
              Maintain your health profile for personalized safety checks.
            </CardTitle>
            <CardDescription className="max-w-3xl text-sm leading-6 mt-2">
              Complete required fields to unlock personalized medicine safety analysis, interaction checks, and tailored recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={form.handleSubmit(handleSave)}>
              {/* Name — read-only, sourced from auth user */}
              <div className="space-y-2">
                <Label>Full name</Label>
                <div className="flex h-10 w-full items-center rounded-xl border border-border/70 bg-white/80 px-3 text-sm text-slate-700">
                  {user?.full_name ?? (
                    <span className="text-muted-foreground">
                      Name is set during registration and cannot be changed here.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-age">
                    Age <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="profile-age"
                    type="number"
                    min={0}
                    max={130}
                    placeholder="e.g. 28"
                    {...form.register('age', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-gender">
                    Gender <span className="text-rose-500">*</span>
                  </Label>
                  <select
                    id="profile-gender"
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    {...form.register('gender')}
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other / Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Female-only fields */}
              {isFemale && (
                <div className="grid gap-2.5">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-2xl border border-border/70 bg-white p-2.5 text-xs text-slate-700 transition hover:bg-teal-50/40">
                    <Checkbox {...form.register('is_pregnant')} />
                    Pregnant
                  </label>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="profile-allergies">
                  Allergies <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="profile-allergies"
                  rows={2}
                  placeholder='e.g. Penicillin, peanuts — or type "None" if none'
                  {...form.register('allergies')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-conditions">
                  Medical conditions <span className="text-rose-500">*</span>
                </Label>
                <Textarea
                  id="profile-conditions"
                  rows={2}
                  placeholder='e.g. Hypertension, diabetes — or type "None" if none'
                  {...form.register('medical_conditions')}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-weight">Weight (kg)</Label>
                  <Input
                    id="profile-weight"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 65.5"
                    {...form.register('weight_kg', { valueAsNumber: true })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-medications">Current medications</Label>
                  <Input
                    id="profile-medications"
                    placeholder="e.g. Metformin, Vitamin D"
                    {...form.register('current_medications')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-notes">Notes</Label>
                <Textarea
                  id="profile-notes"
                  rows={2}
                  placeholder="Additional context or allergic reactions"
                  {...form.register('notes')}
                />
              </div>

              <p className="text-xs text-slate-600">
                Fields marked <span className="font-semibold text-rose-500">*</span> are required for full feature access.
              </p>

              <Button type="submit" className="w-full">
                <CheckCircle2 className="h-4 w-4" />
                Save profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}