import { useState } from 'react';
import { Activity, FileClock, LogOut, Menu, Pill, Search, Sparkles, UserRound, Stethoscope, WandSparkles, Home } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { APP_NAME, routeTitles } from '@/lib/constants';
import { logout } from '@/services/api/auth';
import { useAuthStore } from '@/store/auth-store';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const dashboardLinks = [
  { label: 'Home', href: '/app', icon: Home },
  { label: 'Profile', href: '/app/profile', icon: UserRound },
  { label: 'Interactions', href: '/app/interactions', icon: Activity },
  { label: 'Symptoms', href: '/app/symptoms', icon: Stethoscope },
  { label: 'Medicines', href: '/app/medicines', icon: Search },
  { label: 'History', href: '/app/history', icon: FileClock },
];

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isAdmin = useAuthStore((state) => state.user?.is_admin);
  const clearSession = useAuthStore((state) => state.clearSession);
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    if (!refreshToken) {
      clearSession();
      navigate('/');
      return;
    }

    setLoggingOut(true);
    try {
      await logout(refreshToken);
    } catch {
      // Falling through to local logout keeps the session consistent even if the backend is unavailable.
    } finally {
      clearSession();
      setLoggingOut(false);
      toast.success('Logged out successfully.');
      navigate('/');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.12),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.95),rgba(236,253,245,0.52))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 flex-col border-r border-border/70 bg-white/75 px-5 py-6 backdrop-blur-xl lg:flex">
          <Link to="/app" className="flex items-center gap-3 px-2 pb-8 transition hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white shadow-soft">
              <Pill className="h-5 w-5" />
            </div>
            <span className="font-sans text-xl font-extrabold tracking-tight text-teal-800">
              Medi<span className="text-teal-600">Pulse</span>
            </span>
          </Link>

          <nav className="flex-1 space-y-2">
            {dashboardLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/app'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-teal-50 text-teal-800 shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              );
            })}

            {isAdmin ? (
              <NavLink
                to="/app/admin"
                className={({ isActive }) =>
                  `mt-2 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-emerald-50 text-emerald-800 shadow-sm' : 'text-slate-700 hover:bg-slate-50'}`
                }
              >
                <WandSparkles className="h-4 w-4" />
                Admin workspace
              </NavLink>
            ) : null}
          </nav>

          <div className="space-y-3 border-t border-border/50 pt-6">
            {user && (
              <div className="rounded-2xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
                <p className="font-semibold text-slate-900 truncate">{user.full_name || 'Account'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.phone_number}</p>
              </div>
            )}
            <Button className="w-full" variant="outline" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="h-4 w-4" />
              {loggingOut ? 'Signing out...' : 'Sign out'}
            </Button>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/70 bg-white/80 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                {/* MediPulse logo — only visible on mobile (sidebar hidden on lg) */}
                <Link
                  to="/app"
                  className="flex items-center gap-2 transition hover:opacity-90 lg:hidden"
                  aria-label="Go to dashboard"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white shadow-soft">
                    <Pill className="h-4 w-4" />
                  </div>
                  <span className="font-sans text-lg font-extrabold tracking-tight text-teal-800">
                    Medi<span className="text-teal-600">Pulse</span>
                  </span>
                </Link>
                {/* Page title — hidden on mobile to avoid crowding with logo, shown on lg+ */}
                <h1 className="hidden font-display text-2xl font-bold text-slate-900 lg:block">{routeTitles[location.pathname] ?? 'Home'}</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-border/70 bg-white px-4 py-2 text-sm text-muted-foreground md:block">
                  {user?.phone_number ?? 'Secure session'}
                </div>
                <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open dashboard navigation">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>{APP_NAME}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 pt-2">
                      {dashboardLinks.map((link) => (
                        <NavLink
                          key={link.href}
                          to={link.href}
                          end={link.href === '/app'}
                          onClick={() => setMobileNavOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'}`
                          }
                        >
                          <link.icon className="h-4 w-4" />
                          {link.label}
                        </NavLink>
                      ))}
                      {isAdmin ? (
                        <NavLink
                          to="/app/admin"
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-slate-700 hover:bg-slate-50'}`
                          }
                        >
                          <WandSparkles className="h-4 w-4" />
                          Admin workspace
                        </NavLink>
                      ) : null}
                      <div className="grid gap-3 pt-3">
                        <Button variant="outline" onClick={handleLogout} disabled={loggingOut}>
                          <LogOut className="h-4 w-4" />
                          {loggingOut ? 'Signing out...' : 'Sign out'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}