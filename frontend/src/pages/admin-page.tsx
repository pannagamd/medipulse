import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Archive, FileUp, RefreshCw, ShieldCheck, Sparkles, UploadCloud, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/services/api/client';
import {
  enrichMedicineOpenfdaLabel,
  enrichMedicineRxnorm,
  importDdinter,
  importMedicines,
  listAuditLogs,
  listImportBatches,
} from '@/services/api/admin';
import type { AuditLog, ImportBatch } from '@/types/api';

const medicineImportSchema = z.object({ source_name: z.string().min(1) });
const ddinterImportSchema = z.object({ source_name: z.string().min(1) });
const enrichmentSchema = z.object({ medicine_id: z.string().min(1) });
const auditSchema = z.object({ action: z.string().optional(), actor_user_id: z.string().optional() });

type MedicineImportValues = z.infer<typeof medicineImportSchema>;
type DdinterImportValues = z.infer<typeof ddinterImportSchema>;
type EnrichmentValues = z.infer<typeof enrichmentSchema>;
type AuditValues = z.infer<typeof auditSchema>;

export function AdminPage() {
  const medicineImportForm = useForm<MedicineImportValues>({ resolver: zodResolver(medicineImportSchema), defaultValues: { source_name: 'local' } });
  const ddinterImportForm = useForm<DdinterImportValues>({ resolver: zodResolver(ddinterImportSchema), defaultValues: { source_name: 'DDInter' } });
  const enrichmentForm = useForm<EnrichmentValues>({ resolver: zodResolver(enrichmentSchema), defaultValues: { medicine_id: '' } });
  const auditForm = useForm<AuditValues>({ resolver: zodResolver(auditSchema), defaultValues: { action: '', actor_user_id: '' } });

  const [importFile, setImportFile] = useState<File | null>(null);
  const [ddinterFile, setDdinterFile] = useState<File | null>(null);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [enrichmentDetail, setEnrichmentDetail] = useState<string | null>(null);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);

  const batchSummary = useMemo(
    () => ({
      total: batches.reduce((sum, batch) => sum + batch.records_total, 0),
      imported: batches.reduce((sum, batch) => sum + batch.records_imported, 0),
    }),
    [batches],
  );

  async function refreshBatches() {
    setLoadingBatches(true);
    try {
      const response = await listImportBatches();
      setBatches(response.items);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingBatches(false);
    }
  }

  async function refreshAudit(values?: AuditValues) {
    setLoadingAudit(true);
    try {
      const response = await listAuditLogs(50, 0, values?.action || undefined, values?.actor_user_id || undefined);
      setAuditLogs(response);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    refreshBatches();
    refreshAudit(auditForm.getValues());
    // The forms are intentionally loaded once for a lightweight admin dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleMedicineImport(values: MedicineImportValues) {
    if (!importFile) {
      toast.error('Select a CSV, JSON, or XLSX file.');
      return;
    }

    try {
      await importMedicines(importFile, values.source_name);
      toast.success('Medicine import started.');
      await refreshBatches();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleDdinterImport(values: DdinterImportValues) {
    if (!ddinterFile) {
      toast.error('Select a DDInter file.');
      return;
    }

    try {
      await importDdinter(ddinterFile, values.source_name);
      toast.success('DDInter import completed.');
      await refreshBatches();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  async function handleEnrich(values: EnrichmentValues) {
    try {
      const rxnorm = await enrichMedicineRxnorm(values.medicine_id);
      const openfda = await enrichMedicineOpenfdaLabel(values.medicine_id);
      setEnrichmentDetail(`${rxnorm.message} | ${openfda.message}`);
      setEnrichmentOpen(true);
      toast.success('Enrichment requested.');
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50">
          <CardHeader>
            <Badge variant="soft" className="w-fit gap-2 px-3 py-2 text-sm">
              <WandSparkles className="h-4 w-4" />
              Admin workspace
            </Badge>
            <CardTitle className="mt-3 text-4xl">Operate imports, enrichment, and audit reviews from one place.</CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7">
              This section stays hidden for regular users and exposes the operational backend surfaces for admin staff.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live summary</CardTitle>
            <CardDescription>Import batch totals and recent audit activity.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-border/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Imported rows</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{batchSummary.imported}</p>
            </div>
            <div className="rounded-3xl border border-border/70 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Total rows</p>
              <p className="mt-2 text-2xl font-semibold text-slate-950">{batchSummary.total}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="imports">
        <TabsList className="flex w-full overflow-x-auto sm:w-fit">
          <TabsTrigger value="imports" className="flex-shrink-0">Imports</TabsTrigger>
          <TabsTrigger value="enrichment" className="flex-shrink-0">Enrichment</TabsTrigger>
          <TabsTrigger value="audit" className="flex-shrink-0">Audit logs</TabsTrigger>
        </TabsList>

        <TabsContent value="imports">
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UploadCloud className="h-5 w-5" />Medicine import</CardTitle>
                <CardDescription>Upload CSV, JSON, or XLSX files for local medicine ingestion.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={medicineImportForm.handleSubmit(handleMedicineImport)}>
                  <div className="space-y-2">
                    <Label htmlFor="medicine-file">Source file</Label>
                    <Input id="medicine-file" type="file" accept=".csv,.json,.xlsx" onChange={(event) => setImportFile(event.target.files?.[0] ?? null)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medicine-source">Source name</Label>
                    <Input id="medicine-source" {...medicineImportForm.register('source_name')} />
                  </div>
                  <Button type="submit" className="w-full">
                    <FileUp className="h-4 w-4" />
                    Import medicines
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Archive className="h-5 w-5" />DDInter import</CardTitle>
                <CardDescription>Import interaction records and normalise drug pairs.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={ddinterImportForm.handleSubmit(handleDdinterImport)}>
                  <div className="space-y-2">
                    <Label htmlFor="ddinter-file">DDInter file</Label>
                    <Input id="ddinter-file" type="file" accept=".csv,.json,.xlsx" onChange={(event) => setDdinterFile(event.target.files?.[0] ?? null)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ddinter-source">Source name</Label>
                    <Input id="ddinter-source" {...ddinterImportForm.register('source_name')} />
                  </div>
                  <Button type="submit" className="w-full" variant="outline">
                    <RefreshCw className="h-4 w-4" />
                    Import DDInter
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Import batches</CardTitle>
                <CardDescription>Most recent batches returned by the backend.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={refreshBatches} disabled={loadingBatches}>
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingBatches ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-3xl" />)}
                </div>
              ) : batches.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="rounded-3xl border border-border/70 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">{batch.source_type}</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">{batch.source_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{batch.filename ?? 'No filename recorded'}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-semibold text-slate-950">{batch.records_total}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Imported</p>
                          <p className="font-semibold text-slate-950">{batch.records_imported}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-muted/30 p-8 text-center text-sm text-muted-foreground">No import batches available.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="enrichment">
          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Medicine enrichment</CardTitle>
                <CardDescription>Trigger RxNorm and openFDA label enrichment for a medicine record.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={enrichmentForm.handleSubmit(handleEnrich)}>
                  <div className="space-y-2">
                    <Label htmlFor="medicine-id">Medicine ID</Label>
                    <Input id="medicine-id" placeholder="uuid-or-id" {...enrichmentForm.register('medicine_id')} />
                  </div>
                  <Button type="submit" className="w-full">
                    Run enrichment
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
                <CardDescription>Results are conservative and preserve local dataset values.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground">
                <p>RxNorm enrichment updates only an empty `rx_cui` value.</p>
                <p>openFDA label enrichment fills blank label fields without overwriting existing local data.</p>
                <p>After enrichment, review the affected medicine page to confirm the new source metadata.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Audit log search</CardTitle>
              <CardDescription>Filter by action or actor user ID.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4 md:grid-cols-[1fr_1fr_auto]" onSubmit={auditForm.handleSubmit(refreshAudit)}>
                <div className="space-y-2">
                  <Label htmlFor="audit-action">Action</Label>
                  <Input id="audit-action" placeholder="profile.upsert" {...auditForm.register('action')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-actor">Actor user ID</Label>
                  <Input id="audit-actor" placeholder="user uuid" {...auditForm.register('actor_user_id')} />
                </div>
                <Button type="submit" disabled={loadingAudit}>
                  Search
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                {loadingAudit ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 rounded-3xl" />)}
                  </div>
                ) : auditLogs.length ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-3xl border border-border/70 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="soft">{log.action}</Badge>
                        <Badge variant="outline">{log.entity_type ?? 'general'}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{log.details ?? 'No structured details stored.'}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border/80 bg-muted/30 p-8 text-center text-sm text-muted-foreground">No audit logs returned.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={enrichmentOpen} onOpenChange={setEnrichmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enrichment result</DialogTitle>
            <DialogDescription>Backend enrichment messages for the selected medicine.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm leading-7 text-muted-foreground">
            <p>{enrichmentDetail ?? 'No enrichment result available.'}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}