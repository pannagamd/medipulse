import { ArrowRight, BadgeCheck, CheckCircle2, Zap, Shield, Sparkles, AlertTriangle, Search, Pill, Database, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { HealthcareIllustration } from '@/components/sections/healthcare-illustration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { APP_NAME, MEDICAL_DISCLAIMER, featureHighlights } from '@/lib/constants';

const trustBadges = [
  { icon: Zap, label: 'Instant Results' },
  { icon: Lock, label: 'Your Data Secure' },
  { icon: Database, label: 'Verified Data' },
];

const whyChoose = [
  { icon: CheckCircle2, text: 'No Ads, No Tracking' },
  { icon: Shield, text: 'HIPAA-Compliant' },
  { icon: Sparkles, text: '100% Free Forever' },
];

const featureIcons = [Pill, AlertTriangle, Search];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.07, ease: 'easeOut' as const } }),
};

export function LandingPage() {
  return (
    <div id="top" className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Medical disclaimer bar */}
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-center text-xs text-amber-900 sm:text-sm">
        <span className="font-semibold">⚠ Medical Disclaimer:</span>{' '}
        {MEDICAL_DISCLAIMER}
      </div>

      <main className="flex-1">
        {/* ── Hero Section ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50/40 to-cyan-50/30 pt-12 pb-16 sm:pt-20 sm:pb-24 lg:pt-28 lg:pb-32">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl -mr-40 -mt-40" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-200/10 rounded-full blur-3xl -ml-40 -mb-40" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:items-center">
              {/* Left — Hero copy */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="space-y-8"
              >
                <div className="space-y-1">
                  <Badge variant="soft" className="gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm">
                    <Sparkles className="h-3.5 w-3.5" />
                    Smart Medicine Safety
                  </Badge>
                </div>

                <div className="space-y-3">
                  <h1 className="font-sans text-5xl sm:text-6xl lg:text-[3.75rem] font-extrabold leading-[1.1] tracking-tight text-slate-950">
                    Check Medicines Instantly.
                  </h1>
                  <p className="text-3xl sm:text-4xl lg:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Stay Safe Before You Take Them.
                  </p>
                </div>

                <p className="max-w-xl text-base sm:text-lg leading-7 text-slate-600">
                  MediPulse instantly detects dangerous drug interactions, explains side effects, and provides safe dosage guidance. Trusted by healthcare professionals and patients who demand clarity.
                </p>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-2.5">
                  {trustBadges.map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-1.5 rounded-full border border-teal-200 bg-white/60 backdrop-blur px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:shadow-md transition"
                    >
                      <Icon className="h-4 w-4 text-teal-600" />
                      {label}
                    </div>
                  ))}
                </div>

                {/* CTA buttons */}
                <div className="flex flex-col gap-3 sm:flex-row pt-2">
                  <Button asChild size="lg" className="gap-2 shadow-lg hover:shadow-xl transition">
                    <Link to="/auth/login">
                      Check Medicines Now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link to="/app/medicines">Explore Interactions</Link>
                  </Button>
                </div>

                <p className="text-xs text-muted-foreground pt-2">
                  No sign-up required to get started. Completely free, always.
                </p>
              </motion.div>

              {/* Right — Illustration */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="flex justify-center lg:justify-end"
              >
                <HealthcareIllustration />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Why Choose MediPulse Section ─────────────────────────────────── */}
        <section className="border-b border-border/40 bg-white/50 py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
              className="text-center mb-16"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 leading-tight">
                Why Trust MediPulse?
              </h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                Built for patients and healthcare professionals who demand accuracy and trust.
              </p>
            </motion.div>

            <div className="grid gap-4 sm:grid-cols-3">
              {whyChoose.map(({ icon: Icon, text }, i) => (
                <motion.div
                  key={text}
                  custom={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                >
                  <div className="flex items-center gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 px-5 py-4 hover:shadow-md transition">
                    <Icon className="h-5 w-5 text-teal-600 flex-shrink-0" />
                    <p className="font-semibold text-slate-900">{text}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Highlights Section ─────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white/80 to-teal-50/30 py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
              className="mb-16 text-center"
            >
              <Badge variant="soft" className="gap-2 rounded-full px-4 py-1.5 justify-center mx-auto mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Core Features
              </Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 leading-tight">
                Complete Medicine Safety in One Place
              </h2>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {featureHighlights.map((feature, index) => {
                const Icon = featureIcons[index] ?? BadgeCheck;
                return (
                  <motion.div
                    key={feature.title}
                    custom={index}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    <Card className="group h-full border-border/60 bg-white/80 backdrop-blur transition hover:-translate-y-1 hover:shadow-lg hover:border-teal-200">
                      <CardHeader className="pb-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-700 transition group-hover:shadow-md">
                          <Icon className="h-6 w-6" />
                        </div>
                        <CardTitle className="mt-4 text-xl text-slate-950">{feature.title}</CardTitle>
                        <CardDescription className="text-base leading-7 text-slate-600 mt-2">{feature.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── How It Works Section ──────────────────────────────────────── */}
        <section className="py-16 sm:py-20 lg:py-28 bg-white/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.4 }}
              className="mb-16 text-center"
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-950 leading-tight">
                Three Simple Steps to Safety
              </h2>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: '1',
                  title: 'Enter Your Medicines',
                  desc: 'Search and add all medicines you\'re currently taking or considering.',
                  icon: Pill,
                },
                {
                  step: '2',
                  title: 'Check for Interactions',
                  desc: 'MediPulse instantly analyzes combinations and flags any dangerous reactions.',
                  icon: AlertTriangle,
                },
                {
                  step: '3',
                  title: 'Get Safe Guidance',
                  desc: 'Understand dosage, side effects, precautions, and when to consult a doctor.',
                  icon: CheckCircle2,
                },
              ].map(({ step, title, desc, icon: Icon }, i) => (
                <motion.div
                  key={step}
                  custom={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.1 }}
                  className="relative"
                >
                  <div className="rounded-2xl border border-teal-100/60 bg-gradient-to-br from-white to-teal-50/30 p-6 sm:p-8 hover:shadow-lg transition">
                    <div className="absolute -top-5 -left-5 h-10 w-10 rounded-full bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center text-white font-bold text-lg">
                      {step}
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-700 mb-4">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-950 mb-2">{title}</h3>
                    <p className="text-slate-600">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Section ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 py-16 sm:py-20 lg:py-28">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
          </div>

          <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4">
                Start Checking Medicines Today
              </h2>
              <p className="text-lg text-cyan-100 mb-8 max-w-2xl mx-auto">
                Take control of your medicine safety. Get instant interaction checks, side effect information, and clear dosage guidance — completely free.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" variant="soft" className="gap-2 bg-white text-teal-700 hover:bg-cyan-50 font-semibold">
                  <Link to="/auth/login">
                    Get Started Free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                  <Link to="/app/medicines">Browse Medicines</Link>
                </Button>
              </div>

              <p className="mt-6 text-sm text-cyan-100">
                Join thousands of users who trust MediPulse for medicine safety information.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Footer CTA ────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white to-slate-50/50 py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-teal-700 mb-2">Medical Safety Simplified</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-950">
                Your medicines, made simple and safe.
              </p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}