import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Lock, Phone, Pill, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { APP_NAME, MEDICAL_DISCLAIMER } from '@/lib/constants';
import { login, register, getCurrentUser } from '@/services/api/auth';
import { useAuthStore } from '@/store/auth-store';
import { getApiErrorMessage } from '@/services/api/client';

// ─── Shared helpers ────────────────────────────────────────────────────────────

/** Validates a raw 10-digit Indian mobile number (no prefix). */
const indianMobileDigits = z
  .string()
  .regex(/^\d{10}$/, 'Enter exactly 10 digits (Indian mobile number)')
  .refine((v) => /^[6-9]/.test(v), 'Indian mobile numbers must start with 6, 7, 8, or 9');

/** Converts the 10-digit raw value to E.164 (+91XXXXXXXXXX). */
function toE164(digits: string): string {
  return `+91${digits.replace(/\D/g, '')}`;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  phone_digits: indianMobileDigits,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Enter your full name').max(255),
    phone_digits: indianMobileDigits,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

// ─── IndianPhoneInput ──────────────────────────────────────────────────────────

/**
 * Renders a phone input with a fixed, non-editable "+91" prefix badge and a
 * 10-digit text input. Accepts only digit keypresses; ignores everything else.
 */
function IndianPhoneInput({
  id,
  value,
  onChange,
  onBlur,
  name,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  name: string;
  error?: string;
}) {
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything that isn't a digit, then cap at 10 chars
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(digits);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Allow: Backspace, Delete, Tab, arrows, digits, Ctrl+A/C/V/X
    const allowed = [
      'Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End',
    ];
    const isDigit = /^\d$/.test(e.key);
    const isCtrl = e.ctrlKey || e.metaKey;
    if (!isDigit && !allowed.includes(e.key) && !isCtrl) {
      e.preventDefault();
    }
  }

  return (
    <div className="space-y-1">
      <div
        className={`flex h-10 w-full overflow-hidden rounded-xl border bg-white ring-offset-background transition focus-within:ring-2 focus-within:ring-teal-400 focus-within:ring-offset-1 ${
          error ? 'border-rose-400' : 'border-input'
        }`}
      >
        {/* Fixed "+91" prefix — non-editable, visually separated */}
        <div className="flex shrink-0 items-center gap-1.5 border-r border-border/60 bg-teal-50 px-3">
          <Phone className="h-3.5 w-3.5 text-teal-600" />
          <span className="select-none font-semibold text-teal-700 text-sm">+91</span>
        </div>

        {/* 10-digit input */}
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel-national"
          placeholder="9876543211"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={onBlur}
          className="flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

// ─── AuthPage ─────────────────────────────────────────────────────────────────

export function AuthPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone_digits: '', password: '' },
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', phone_digits: '', password: '', confirm_password: '' },
  });

  async function handleLogin(values: LoginValues) {
    try {
      const phone = toE164(values.phone_digits);
      const session = await login({ username: phone, password: values.password });
      setSession(session, session.user);
      const user = await getCurrentUser();
      setUser(user);
      toast.success('Signed in successfully.');
      navigate('/app');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleRegister(values: RegisterValues) {
    try {
      const phone = toE164(values.phone_digits);
      const session = await register({
        full_name: values.full_name,
        phone_number: phone,
        password: values.password,
      });
      setSession(session, session.user);
      const user = await getCurrentUser();
      setUser(user);
      toast.success('Account created. Welcome!');
      navigate('/app');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hero-gradient px-4 py-10 sm:px-6">
      <Card className="w-full max-w-md border-white/70 bg-white/90 shadow-[0_30px_100px_-50px_rgba(15,118,110,0.4)] backdrop-blur-xl">
        <CardHeader className="pb-2">
          <div className="mb-2 flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">
              <Pill className="h-4 w-4" />
              {APP_NAME}
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Home</Link>
            </Button>
          </div>
          <CardTitle className="text-2xl">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {mode === 'login'
              ? 'Sign in with your Indian mobile number and password.'
              : 'Register with your Indian mobile number to get started.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              id="tab-login"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-teal-600 text-white'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-register"
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-teal-600 text-white'
                  : 'bg-transparent text-muted-foreground hover:bg-muted'
              }`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          {/* ── Login Form ── */}
          {mode === 'login' && (
            <form className="space-y-5" onSubmit={loginForm.handleSubmit(handleLogin)}>
              <div className="space-y-2">
                <Label htmlFor="login-phone">Mobile number (India)</Label>
                <IndianPhoneInput
                  id="login-phone"
                  name="phone_digits"
                  value={loginForm.watch('phone_digits')}
                  onChange={(v) => loginForm.setValue('phone_digits', v, { shouldValidate: true })}
                  onBlur={() => loginForm.trigger('phone_digits')}
                  error={loginForm.formState.errors.phone_digits?.message}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your 10-digit Indian mobile number. The +91 country code is fixed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    className="pl-10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...loginForm.register('password')}
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-rose-600">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
                disabled={loginForm.formState.isSubmitting}
              >
                {loginForm.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          {/* ── Register Form ── */}
          {mode === 'register' && (
            <form className="space-y-5" onSubmit={registerForm.handleSubmit(handleRegister)}>
              <div className="space-y-2">
                <Label htmlFor="reg-full-name">Full name</Label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-full-name"
                    placeholder="Alex Morgan"
                    className="pl-10"
                    autoComplete="name"
                    {...registerForm.register('full_name')}
                  />
                </div>
                {registerForm.formState.errors.full_name && (
                  <p className="text-sm text-rose-600">{registerForm.formState.errors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-phone">Mobile number (India)</Label>
                <IndianPhoneInput
                  id="reg-phone"
                  name="phone_digits"
                  value={registerForm.watch('phone_digits')}
                  onChange={(v) => registerForm.setValue('phone_digits', v, { shouldValidate: true })}
                  onBlur={() => registerForm.trigger('phone_digits')}
                  error={registerForm.formState.errors.phone_digits?.message}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your 10-digit Indian mobile number. The +91 country code is fixed.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    className="pl-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...registerForm.register('password')}
                  />
                </div>
                {registerForm.formState.errors.password && (
                  <p className="text-sm text-rose-600">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="reg-confirm-password"
                    type="password"
                    className="pl-10"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...registerForm.register('confirm_password')}
                  />
                </div>
                {registerForm.formState.errors.confirm_password && (
                  <p className="text-sm text-rose-600">{registerForm.formState.errors.confirm_password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                size="lg"
                disabled={registerForm.formState.isSubmitting}
              >
                {registerForm.formState.isSubmitting ? 'Creating account...' : 'Create account'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}

          <p className="text-center text-xs leading-5 text-muted-foreground">{MEDICAL_DISCLAIMER}</p>
        </CardContent>
      </Card>
    </div>
  );
}
