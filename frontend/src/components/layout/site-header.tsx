import { useState } from 'react';
import { Menu, Pill, X } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { APP_NAME, navigationLinks } from '@/lib/constants';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-white/80 shadow-sm backdrop-blur-xl transition">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 transition hover:opacity-90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white shadow-md">
            <Pill className="h-5 w-5" />
          </div>
          <span className="font-sans text-xl font-extrabold tracking-tight text-slate-900 hidden sm:inline">
            <span className="text-teal-700">Medi</span><span className="text-teal-600">Pulse</span>
          </span>
        </Link>

        {/* Desktop nav - only show on authenticated pages */}
        {!isHomePage && (
          <nav className="hidden items-center gap-6 lg:flex">
            {navigationLinks.slice(0, 4).map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/app'}
                className={({ isActive }) =>
                  `text-sm font-medium transition hover:text-teal-700 ${isActive ? 'text-teal-700 font-semibold' : 'text-slate-600'}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        )}

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 sm:flex">
          {isHomePage ? (
            <>
              <Button asChild variant="ghost" className="text-slate-600 hover:text-teal-700 font-medium">
                <Link to="/auth/login">Sign in</Link>
              </Button>
              <Button asChild className="gap-2 shadow-md hover:shadow-lg transition bg-teal-600 hover:bg-teal-700">
                <Link to="/auth/login">
                  Get Started
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" className="text-slate-700 hover:text-teal-700">
                <Link to="/auth/login">Sign in</Link>
              </Button>
              <Button asChild className="shadow-soft">
                <Link to="/auth/login">
                  Start Check
                  <span className="text-xs font-semibold opacity-80">→</span>
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="sm:hidden">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-1.5rem)] max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-teal-700">
                  <Pill className="h-4 w-4" />
                  {APP_NAME}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1.5 pt-1">
                {isHomePage ? (
                  <>
                    <Button asChild className="w-full mb-2">
                      <Link to="/auth/login" onClick={() => setMobileOpen(false)}>Get Started</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/auth/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    {navigationLinks.map((link) => (
                      <NavLink
                        key={link.href}
                        to={link.href}
                        end={link.href === '/app'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          `rounded-2xl px-4 py-3 text-sm font-medium transition ${
                            isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
                          }`
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link to="/auth/login">Sign in</Link>
                      </Button>
                      <Button asChild className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link to="/auth/login">Start Check</Link>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}