import { ArrowRight, Search, Shield, Sparkles, Stethoscope } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MEDICAL_DISCLAIMER } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';

const quickActions = [
  {
    title: 'Search Medicines',
    description: 'Find medicine details, compositions, and brand-to-generic conversions.',
    href: '/app/medicines',
    icon: Search,
    color: 'bg-teal-50 text-teal-700',
  },
  {
    title: 'Check Interactions',
    description: 'Compare two or more medicines and surface structured severity guidance.',
    href: '/app/interactions',
    icon: Shield,
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    title: 'Symptom Checker',
    description: 'Enter symptoms and get conservative care recommendations.',
    href: '/app/symptoms',
    icon: Stethoscope,
    color: 'bg-cyan-50 text-cyan-700',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, delay: i * 0.06, ease: 'easeOut' as const },
  }),
};

export function OverviewPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="space-y-8">
      {/* ── Welcome Hero ────────────────────────────────────────────── */}
      <section>
        <Card className="overflow-hidden border-teal-100/80 bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-700 text-white">
          <CardContent className="p-8 lg:p-10">
            <Badge variant="soft" className="w-fit border-white/20 bg-white/10 text-white">
              <Sparkles className="h-4 w-4" />
              Secure dashboard
            </Badge>
            <h1 className="mt-5 font-sans text-3xl font-extrabold leading-tight sm:text-4xl">
              Welcome{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="mt-2 font-display text-xl italic text-teal-200 sm:text-2xl">
              Your medicine safety workspace is ready.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-teal-100">
              Search local medicines, compare interactions, and update your profile context without leaving the dashboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="soft" className="border-white/25 bg-white text-teal-800 shadow-soft hover:bg-teal-50">
                <Link to="/app/medicines">
                  Start medicine search
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="soft" className="border-white/25 bg-white/15 text-white hover:bg-white/25">
                <Link to="/app/history">View history</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Quick Actions Grid ───────────────────────────────────────── */}
      <section>
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-teal-700">Quick actions</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Get started with core workflows
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <motion.div key={action.title} custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Link to={action.href} className="block h-full">
                  <Card className="group h-full cursor-pointer border-border/60 bg-white transition hover:-translate-y-1 hover:shadow-card">
                    <CardHeader className="pb-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl transition group-hover:scale-110 ${action.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="mt-3 text-lg">{action.title}</CardTitle>
                      <CardDescription className="leading-6">{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-1 text-sm font-semibold text-teal-700 group-hover:text-teal-800">
                        Open
                        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Medical Disclaimer ───────────────────────────────────────── */}
      <section>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-6 py-4 text-sm leading-6 text-amber-900">
          <span className="font-semibold">Medical Disclaimer: </span>
          {MEDICAL_DISCLAIMER}
        </div>
      </section>
    </div>
  );
}