import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCircle2, Zap, Pill, Search, Shield, ShieldAlert, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export function HealthcareIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      {/* Ambient gradient blobs */}
      <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-gradient-to-br from-cyan-300/20 to-teal-300/20 blur-3xl" />
      <div className="absolute bottom-0 -left-10 h-48 w-48 rounded-full bg-teal-200/10 blur-3xl" />

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="relative space-y-4"
      >
        {/* Main Dashboard Card */}
        <Card className="overflow-hidden border-white/70 bg-white/95 backdrop-blur-lg shadow-xl">
          {/* Header */}
          <div className="border-b border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white shadow-md">
                <Pill className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Medicine Safety Check</p>
                <p className="text-sm font-bold text-slate-900">Interaction Analysis</p>
              </div>
              <Badge variant="soft" className="ml-auto gap-1.5">
                <Check className="h-3 w-3" />
                Safe
              </Badge>
            </div>
          </div>

          <CardContent className="space-y-4 p-5">
            {/* Medicines Section */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700 mb-3">Your Medicines</p>
              <div className="space-y-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center gap-3 rounded-lg border border-teal-100 bg-teal-50/50 px-3.5 py-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-600 flex-shrink-0">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Aspirin 500mg</p>
                    <p className="text-xs text-muted-foreground">Twice daily</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-3 rounded-lg border border-teal-100 bg-teal-50/50 px-3.5 py-2.5"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-teal-600 flex-shrink-0">
                    <Pill className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">Vitamin C 1000mg</p>
                    <p className="text-xs text-muted-foreground">Once daily</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                </motion.div>
              </div>
            </div>

            {/* Interaction Check */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-lg border border-green-200 bg-green-50/60 p-3.5"
            >
              <div className="flex items-start gap-3">
                <Shield className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">No Dangerous Interactions</p>
                  <p className="text-xs text-green-700 mt-1">These medicines can be taken safely together.</p>
                </div>
              </div>
            </motion.div>

            {/* Side Effects Section */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3.5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 mb-1.5">Common Side Effects</p>
                  <div className="space-y-1">
                    <p className="text-xs text-amber-900">• Mild dizziness possible</p>
                    <p className="text-xs text-amber-900">• Stay hydrated</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action button */}
            <div className="pt-2">
              <button className="w-full flex items-center justify-center gap-2 rounded-lg bg-teal-600 text-white text-xs font-semibold py-2.5 hover:bg-teal-700 transition">
                <Search className="h-3.5 w-3.5" />
                View Details
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Floating Feature Pills */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          className="absolute -left-8 top-20 hidden sm:block"
        >
          <Card className="border-white/70 bg-white/90 backdrop-blur-lg px-4 py-3 shadow-lg w-max">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Fast Check</p>
                <p className="text-xs text-muted-foreground">Instant results</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          className="absolute -right-8 bottom-24 hidden sm:block"
        >
          <Card className="border-white/70 bg-white/90 backdrop-blur-lg px-4 py-3 shadow-lg w-max">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <ShieldAlert className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">100% Safe</p>
                <p className="text-xs text-muted-foreground">Verified data</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Floating badge — bottom right */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 6.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-5 right-4 hidden sm:block"
        >
          <Card className="glass-panel w-54 border-white/70 px-4 py-3 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">Safe by design</p>
                <p className="text-xs text-muted-foreground">Profile-aware recommendations</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}