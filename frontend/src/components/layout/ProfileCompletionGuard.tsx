import { ClipboardList, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore, checkProfileComplete } from '@/store/profile-store';

interface ProfileCompletionGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps medical analysis feature pages.
 * If the user's profile is incomplete, renders a polished prompt instead of the page.
 * If the profile is loaded and complete, renders children as-is.
 */
export function ProfileCompletionGuard({ children }: ProfileCompletionGuardProps) {
  const user = useAuthStore((state) => state.user);
  const { profile, profileLoaded } = useProfileStore();

  // Wait until the profile has been fetched before rendering anything
  if (!profileLoaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const isComplete = checkProfileComplete(profile, user?.full_name);

  if (!isComplete) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <Card className="w-full max-w-lg border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-card">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-400 text-white shadow-soft">
              <ClipboardList className="h-8 w-8" />
            </div>

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="font-sans text-2xl font-extrabold tracking-tight text-slate-900">
                Complete your dashboard first
              </h2>
              <p className="max-w-sm text-sm leading-7 text-muted-foreground">
                Please complete your health profile before using medical analysis features. This ensures
                all safety checks are personalised to you.
              </p>
            </div>

            {/* Required fields hint */}
            <div className="w-full rounded-2xl border border-border/70 bg-white px-5 py-4 text-left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                Required fields
              </p>
              <ul className="space-y-1.5 text-sm text-slate-700">
                {[
                  { label: 'Full name', done: Boolean(user?.full_name?.trim()) },
                  { label: 'Age', done: Boolean(profile?.age && profile.age > 0) },
                  { label: 'Gender', done: Boolean(profile?.gender?.trim()) },
                  { label: 'Allergies', done: Boolean(profile?.allergies?.trim()) },
                  { label: 'Medical conditions', done: Boolean(profile?.medical_conditions?.trim()) },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        item.done
                          ? 'bg-teal-100 text-teal-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {item.done ? '✓' : '–'}
                    </span>
                    <span className={item.done ? 'text-slate-500 line-through' : ''}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA */}
            <Button asChild className="w-full" size="lg">
              <Link to="/app/profile">
                Complete Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
