import { Pill } from 'lucide-react';
import { Link } from 'react-router-dom';

import { APP_NAME, MEDICAL_DISCLAIMER } from '@/lib/constants';

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border/40 bg-gradient-to-b from-white/50 to-slate-50/80">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="sm:col-span-2 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500 text-white">
                <Pill className="h-4 w-4" />
              </div>
              <span className="font-sans text-lg font-extrabold tracking-tight text-slate-900">
                <span className="text-teal-700">Medi</span><span className="text-teal-600">Pulse</span>
              </span>
            </div>
            <p className="text-sm leading-6 text-slate-600 max-w-sm">
              Smart medicine safety for everyone. Check interactions, understand side effects, and get safe dosage guidance instantly.
            </p>
            <p className="text-xs text-slate-500">© {currentYear} MediPulse. All rights reserved.</p>
          </div>

          {/* Platform column */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-900 mb-4">Platform</h3>
            <div className="space-y-2.5 text-sm">
              <Link to="/app" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Dashboard
              </Link>
              <Link to="/app/medicines" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Medicine Search
              </Link>
              <Link to="/app/interactions" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Interactions
              </Link>
              <Link to="/app/symptoms" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Symptom Checker
              </Link>
            </div>
          </div>

          {/* Account column */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-900 mb-4">Account</h3>
            <div className="space-y-2.5 text-sm">
              <Link to="/auth/login" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Sign In
              </Link>
              <Link to="/auth/login" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Create Account
              </Link>
              <a href="#top" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Back to Top
              </a>
            </div>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-slate-900 mb-4">Legal</h3>
            <div className="space-y-2.5 text-sm">
              <a href="#privacy" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Privacy Policy
              </a>
              <a href="#terms" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Terms of Service
              </a>
              <a href="#contact" className="block text-slate-600 hover:text-teal-700 transition font-medium">
                Contact
              </a>
            </div>
          </div>
        </div>

        {/* Medical disclaimer */}
        <div className="mt-12 pt-8 border-t border-border/40">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-900 uppercase tracking-[0.2em] mb-1.5">Medical Disclaimer</p>
            <p className="text-xs text-amber-900 leading-6">{MEDICAL_DISCLAIMER}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}