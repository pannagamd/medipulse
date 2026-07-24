import { useEffect, useRef, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';

import { getCurrentUser } from '@/services/api/auth';
import { getProfile } from '@/services/api/profile';
import { useAuthStore } from '@/store/auth-store';
import { useProfileStore } from '@/store/profile-store';
import { ProfileCompletionGuard } from '@/components/layout/ProfileCompletionGuard';

import { AuthPage } from './pages/auth-page';
import { DashboardLayout } from './pages/dashboard-layout';
import { HistoryPage } from './pages/history-page';
import { LandingPage } from './pages/landing-page';
import { InteractionsPage } from './pages/interactions-page';
import { MedicineSearchPage } from './pages/medicine-search-page';
import { OverviewPage } from './pages/overview-page';
import { ProfilePage } from './pages/profile-page';
import { SymptomsPage } from './pages/symptoms-page';
import { AdminPage } from './pages/admin-page';

// ── Session-alive marker key ─────────────────────────────────────────────────
// Written to sessionStorage when a session is active. sessionStorage survives
// tab refreshes but is cleared when the browser/tab is closed.
// clearSession() removes this key so a subsequent cold-start load sees no
// active session and skips restoration cleanly.
const SESSION_ALIVE_KEY = 'medipulse-session-alive';

// ── Status labels shown progressively during session restore ─────────────────
const STATUS_LABELS = [
  { after: 0,      text: 'Restoring your secure session\u2026' },
  { after: 4_000,  text: 'Connecting to server\u2026' },
  { after: 9_000,  text: 'Server is waking up, this may take a moment\u2026' },
  { after: 14_000, text: 'Still connecting \u2014 retrying once more\u2026' },
];

// ── Utility: sleep for N milliseconds ────────────────────────────────────────
function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

// ── fetchWithRetry ────────────────────────────────────────────────────────────
/**
 * Calls `fn` once. If it throws, waits `retryDelayMs` then calls it one more
 * time. If the second attempt also throws, the error propagates to the caller.
 * This shields against transient backend cold-start errors without silently
 * hiding genuine auth failures.
 */
async function fetchWithRetry<T>(fn: () => Promise<T>, retryDelayMs = 3_000): Promise<T> {
  try {
    return await fn();
  } catch {
    // Wait for the retry delay, then try once more.
    await sleep(retryDelayMs);
    // If this also throws, it propagates — caller decides what to do.
    return await fn();
  }
}

// ── AuthBootstrap ─────────────────────────────────────────────────────────────
/**
 * Runs ONCE per page load. Waits for Zustand-persist to finish reading
 * localStorage (via onFinishHydration), then validates the stored token
 * with the backend and restores the user session.
 *
 * Key design decisions
 * ────────────────────
 * 1. We use `useAuthStore.persist.hasHydrated()` (sync check) and
 *    `useAuthStore.persist.onFinishHydration()` (async fallback) to guarantee
 *    we read store state only AFTER localStorage has been loaded — eliminating
 *    the Zustand v5 race condition where `accessToken` appeared null on load.
 *
 * 2. If the backend is cold-starting (Render.com), the request is retried once
 *    after 3 s before treating a failure as a genuine expired-token error.
 */
function AuthBootstrap() {
  const { authReady, setUser, clearSession, setAuthReady } = useAuthStore();
  const { setProfile, setProfileLoaded } = useProfileStore();

  const [statusText, setStatusText] = useState(STATUS_LABELS[0].text);
  const [timedOut, setTimedOut] = useState(false);

  const timersRef = useRef<number[]>([]);
  // Track whether we have already started hydration in this component instance.
  // Using a ref (not module-level) is safe here because onFinishHydration
  // ensures we only enter the async path after the store is ready.
  const hydrationStarted = useRef(false);

  useEffect(() => {
    function clearAllTimers() {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
    }

    // ── Core restore logic (runs after localStorage is loaded) ────────────────
    function runRestore() {
      // Guard against double-invoke (React 18 Strict Mode)
      if (hydrationStarted.current) return;
      hydrationStarted.current = true;

      // ── Read state AFTER rehydration ─────────────────────────────────────
      const { accessToken, refreshToken } = useAuthStore.getState();

      // ── Fast-path A: No tokens at all ─────────────────────────────────────
      // Nothing to restore — unblock the UI immediately.
      if (!accessToken && !refreshToken) {
        setAuthReady(true);
        setProfileLoaded(true);
        return;
      }

      // Mark this tab alive in sessionStorage so clearSession knows whether
      // an active browsing session is in progress (used by clearSession cleanup).
      try { sessionStorage.setItem(SESSION_ALIVE_KEY, '1'); } catch { /* ignore */ }

      // ── Progressive status messages ───────────────────────────────────────
      STATUS_LABELS.slice(1).forEach(({ after, text }) => {
        const id = window.setTimeout(() => setStatusText(text), after);
        timersRef.current.push(id);
      });

      // ── Hard safety timeout ───────────────────────────────────────────────
      const safetyId = window.setTimeout(() => {
        const state = useAuthStore.getState();
        if (!state.authReady) {
          setTimedOut(true);
          setAuthReady(true);
          setProfileLoaded(true);
        }
      }, 25_000);
      timersRef.current.push(safetyId);

      // ── Hydration with retry ──────────────────────────────────────────────
      async function hydrate() {
        try {
          const user = await fetchWithRetry(() => getCurrentUser());
          setUser(user);
        } catch {
          // Both attempts failed → token is genuinely expired or invalid.
          clearSession();
          toast.info('Your session expired. Please sign in again.');
        } finally {
          clearAllTimers();
          setAuthReady(true);
        }

        // Step 2: Restore profile (non-blocking for auth-ready signal)
        try {
          const profile = await fetchWithRetry(() => getProfile());
          setProfile(profile);
        } catch {
          // Profile fetch failed — keep cached value, do NOT null it out.
        } finally {
          setProfileLoaded(true);
        }
      }

      hydrate();
    }

    // ── Zustand v5: handle both sync and async hydration ─────────────────────
    // If localStorage was already loaded by the time this effect runs (the
    // normal case), hasHydrated() is true and we call runRestore immediately.
    // Otherwise we subscribe to onFinishHydration for the async case.
    if (useAuthStore.persist.hasHydrated()) {
      runRestore();
      return clearAllTimers;
    }

    const unsub = useAuthStore.persist.onFinishHydration(runRestore);

    return () => {
      unsub();
      clearAllTimers();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  if (authReady) return null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-6 px-4">
      {timedOut ? (
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50">
            <WifiOff className="h-6 w-6 text-amber-500" />
          </div>
          <p className="text-sm font-medium text-slate-700">
            Server is taking longer than expected.
          </p>
          <p className="text-xs text-slate-500">
            Your session is preserved \u2014 reload the page to try again.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-teal-100" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-teal-500" />
            <ShieldCheck className="h-7 w-7 text-teal-600" />
          </div>

          {/* Status text — animates between messages */}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700 transition-all duration-500">
              {statusText}
            </p>
            <p className="text-xs text-slate-400">
              Validating your credentials securely
            </p>
          </div>

          {/* Slow-connection hint */}
          <div className="mt-2 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500 shadow-sm">
            <RefreshCw className="h-3 w-3 animate-spin" style={{ animationDuration: '3s' }} />
            Encrypted session handshake in progress
          </div>
        </div>
      )}
    </div>
  );
}

// ── ProtectedRoute ─────────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const authReady = useAuthStore((state) => state.authReady);

  // Still hydrating — render nothing (AuthBootstrap shows the spinner)
  if (!authReady) return null;

  // Auth done but no valid token → redirect to login
  if (!accessToken) return <Navigate to="/auth/login" replace />;

  return <>{children}</>;
}

// ── AdminOnlyRoute ─────────────────────────────────────────────────────────────
function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const authReady = useAuthStore((state) => state.authReady);

  if (!authReady) return null;
  if (!user?.is_admin) return <Navigate to="/app" replace />;

  return <>{children}</>;
}

// ── Page transition config ─────────────────────────────────────────────────────
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};
const pageTransition = { duration: 0.22, ease: 'easeOut' as const };

// ── RouteTransitions ───────────────────────────────────────────────────────────
function RouteTransitions() {
  const location = useLocation();
  const pageKey = useMemo(() => location.pathname, [location.pathname]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pageKey}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{ minHeight: '100dvh' }}
      >
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/:mode?" element={<AuthPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route
              path="medicines"
              element={
                <ProfileCompletionGuard>
                  <MedicineSearchPage />
                </ProfileCompletionGuard>
              }
            />
            <Route
              path="symptoms"
              element={
                <ProfileCompletionGuard>
                  <SymptomsPage />
                </ProfileCompletionGuard>
              }
            />
            <Route
              path="interactions"
              element={
                <ProfileCompletionGuard>
                  <InteractionsPage />
                </ProfileCompletionGuard>
              }
            />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route
              path="admin"
              element={
                <AdminOnlyRoute>
                  <AdminPage />
                </AdminOnlyRoute>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

// ── App root ───────────────────────────────────────────────────────────────────
export function App() {
  return (
    <>
      <AuthBootstrap />
      <RouteTransitions />
    </>
  );
}