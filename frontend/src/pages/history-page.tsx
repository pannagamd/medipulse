import { useMemo, useState } from 'react';
import { Pill, AlertTriangle, Stethoscope, User, FileClock, Trash2, Clock, ChevronRight, Heart } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { clearHistory, readHistory } from '@/lib/history';
import { formatRelativeDate } from '@/lib/utils';
import type { PagedHistoryItem } from '@/types/api';

const filters: Array<'all' | PagedHistoryItem['kind']> = ['all', 'medicine', 'interaction', 'symptom', 'profile', 'pregnancy'];

// Icons for each history kind
const kindIcons: Record<PagedHistoryItem['kind'], React.ComponentType<{ className?: string }>> = {
  medicine: Pill,
  interaction: AlertTriangle,
  symptom: Stethoscope,
  profile: User,
  pregnancy: Heart,
};

// Labels for each history kind
const kindLabels: Record<PagedHistoryItem['kind'], string> = {
  medicine: 'Medicine Search',
  interaction: 'Interaction Check',
  symptom: 'Symptom Analysis',
  profile: 'Profile Update',
  pregnancy: 'Pregnancy Status',
};

// Helper to group items by date
function groupByDate(items: PagedHistoryItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: PagedHistoryItem[] }[] = [];
  const todayItems: PagedHistoryItem[] = [];
  const yesterdayItems: PagedHistoryItem[] = [];
  const earlierItems: PagedHistoryItem[] = [];

  items.forEach((item) => {
    const itemDate = new Date(item.createdAt);
    const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());

    if (itemDateOnly.getTime() === today.getTime()) {
      todayItems.push(item);
    } else if (itemDateOnly.getTime() === yesterday.getTime()) {
      yesterdayItems.push(item);
    } else {
      earlierItems.push(item);
    }
  });

  if (todayItems.length) groups.push({ label: 'Today', items: todayItems });
  if (yesterdayItems.length) groups.push({ label: 'Yesterday', items: yesterdayItems });
  if (earlierItems.length) groups.push({ label: 'Earlier', items: earlierItems });

  return groups;
}

// Helper to get severity info for interactions
function getInteractionSeverity(item: PagedHistoryItem): { level: string; color: string } {
  if (item.kind === 'interaction' && item.detail) {
    const detail = item.detail.toLowerCase();
    if (detail.includes('dangerous') || detail.includes('high')) return { level: 'High Risk', color: 'rose' };
    if (detail.includes('moderate')) return { level: 'Moderate Risk', color: 'amber' };
    return { level: 'Low Risk', color: 'emerald' };
  }
  return { level: '', color: '' };
}

export function HistoryPage() {
  const [items, setItems] = useState(() => readHistory());
  const [filter, setFilter] = useState<(typeof filters)[number]>('all');

  const filteredItems = useMemo(() => {
    const filtered = filter === 'all' ? items : items.filter((item) => item.kind === filter);
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [filter, items]);

  const groupedItems = useMemo(() => groupByDate(filteredItems), [filteredItems]);

  function handleClear() {
    clearHistory();
    setItems([]);
    toast.success('History cleared.');
  }

  return (
    <div className="space-y-8">
      {/* Compact Header with Inline Filters */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileClock className="h-5 w-5 text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-950">Activity Timeline</h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">Your recent medicine and health checks</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-1">Clear</span>
          </Button>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                filter === option
                  ? 'bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:border-teal-200 hover:text-teal-600'
              }`}
            >
              {option === 'all' ? 'All Activity' : kindLabels[option as PagedHistoryItem['kind']]}
            </button>
          ))}
        </div>
      </section>

      {/* Timeline Section */}
      <section>
        {groupedItems.length ? (
          <div className="space-y-8">
            {groupedItems.map((group) => (
              <div key={group.label} className="space-y-3">
                {/* Time Group Header */}
                <div className="sticky top-0 z-10 flex items-center gap-3 px-1 py-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <h3 className="text-xs font-bold uppercase tracking-[0.28em] text-slate-600">{group.label}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
                </div>

                {/* Activity Cards for this group */}
                <div className="space-y-2">
                  {group.items.map((item) => {
                    const IconComponent = kindIcons[item.kind];
                    const severity = getInteractionSeverity(item);
                    const severityColors = {
                      rose: 'border-l-rose-500 bg-rose-50/30',
                      amber: 'border-l-amber-500 bg-amber-50/30',
                      emerald: 'border-l-emerald-500 bg-emerald-50/30',
                      teal: 'border-l-teal-500 bg-teal-50/30',
                    };

                    const accentColor =
                      item.kind === 'interaction'
                        ? severity.color as keyof typeof severityColors
                        : item.kind === 'medicine'
                          ? 'teal'
                          : item.kind === 'symptom'
                            ? 'amber'
                            : 'emerald';

                    return (
                      <Card
                        key={item.id}
                        className={`group border-l-4 border-r border-t border-b border-r-slate-200/60 border-t-slate-200/60 border-b-slate-200/60 ${severityColors[accentColor]} shadow-sm hover:shadow-md transition-all duration-200`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className={`mt-1 rounded-lg p-2 ${accentColor === 'rose' ? 'bg-rose-100' : accentColor === 'amber' ? 'bg-amber-100' : accentColor === 'emerald' ? 'bg-emerald-100' : 'bg-teal-100'}`}>
                              <IconComponent
                                className={`h-5 w-5 ${
                                  accentColor === 'rose'
                                    ? 'text-rose-600'
                                    : accentColor === 'amber'
                                      ? 'text-amber-600'
                                      : accentColor === 'emerald'
                                        ? 'text-emerald-600'
                                        : 'text-teal-600'
                                }`}
                              />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-slate-950 group-hover:text-teal-600 transition-colors">
                                    {item.title}
                                  </h4>
                                  <p className="mt-1 text-sm text-slate-600 leading-relaxed">{item.detail}</p>
                                </div>

                                {/* Severity Badge or Kind Badge */}
                                {severity.level ? (
                                  <Badge
                                    className={`shrink-0 text-xs font-semibold ${
                                      accentColor === 'rose'
                                        ? 'bg-rose-100 text-rose-700'
                                        : accentColor === 'amber'
                                          ? 'bg-amber-100 text-amber-700'
                                          : 'bg-emerald-100 text-emerald-700'
                                    }`}
                                    variant="outline"
                                  >
                                    {severity.level}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="shrink-0 text-xs">
                                    {kindLabels[item.kind]}
                                  </Badge>
                                )}
                              </div>

                              {/* Metadata Footer */}
                              <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-slate-200/60">
                                <p className="text-xs text-slate-500 font-medium">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {formatRelativeDate(item.createdAt)}
                                </p>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-600 hover:text-teal-700">
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className="border-slate-200/60 bg-gradient-to-br from-slate-50 to-slate-50/50">
            <CardContent className="p-12 text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-lg bg-slate-100 p-3">
                  <FileClock className="h-6 w-6 text-slate-400" />
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-950">No activity yet</p>
              <p className="mt-2 text-sm text-slate-600">
                Run a medicine search, check interactions, or analyze symptoms to see your health activity appear here.
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}