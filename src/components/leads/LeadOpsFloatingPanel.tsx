import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { runLeadfinderSearch } from "@/lib/leadfinderClient";
import {
  completeLeadSearchJob,
  createLeadSearchJob,
  failLeadSearchJob,
  getLatestLeadSearchSnapshot,
} from "@/lib/leadfinderPersistence";

type LeadRow = {
  id: string;
  name: string;
  kind: string;
  segment: string;
  fitScore: number;
  phone: string;
  email: string;
  address: string;
  website: string;
  source: string;
};

type JobMeta = {
  id: string;
  query_text: string;
  region_text: string;
  status: string;
  result_count: number;
  created_at: string;
} | null;

export default function LeadOpsFloatingPanel() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState("colegios");
  const [region, setRegion] = useState("Valledupar, Cesar");
  const [resultLimit, setResultLimit] = useState<10 | 20>(10);
  const [useGoogleMaps, setUseGoogleMaps] = useState(false);
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [job, setJob] = useState<JobMeta>(null);

  const resultCount = rows.length;
  const canSearch = term.trim().length >= 3 && region.trim().length >= 3;

  const title = useMemo(() => {
    if (!resultCount) return "Sin resultados";
    return `${resultCount} resultado${resultCount === 1 ? "" : "s"}`;
  }, [resultCount]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snapshot = await getLatestLeadSearchSnapshot();
        if (cancelled) return;
        setJob(snapshot.job);
        setRows(
          snapshot.rows.map((item) => ({
            id: item.id,
            name: item.name,
            kind: item.entity_type,
            segment: "n/a",
            fitScore: 0,
            phone: item.phone ?? "-",
            email: item.email ?? "-",
            address: item.address ?? "-",
            website: item.website ?? "-",
            source: item.source_kind,
          })),
        );
      } catch {
        // silencioso en fase prototipo
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSearch = async () => {
    if (!canSearch) {
      toast.error("Escribe una busqueda y una zona validas.");
      return;
    }
    let currentJobId: string | null = null;
    try {
      setLoading(true);
      const jobRow = await createLeadSearchJob({
        query: term.trim(),
        region: region.trim(),
        requestedLimit: resultLimit,
      });
      currentJobId = jobRow.id;
      setJob(jobRow);

      const response = await runLeadfinderSearch({
        query: term.trim(),
        region: region.trim(),
        limit: resultLimit,
        useGoogleMaps,
      });
      await completeLeadSearchJob(jobRow.id, response);

      setRows(
        response.results.map((item) => ({
          id: crypto.randomUUID(),
          name: item.name,
          kind: item.entity_type,
          segment: item.school_segment,
          fitScore: item.buyer_fit_score,
          phone: item.phone ?? "-",
          email: item.email ?? "-",
          address: item.address ?? "-",
          website: item.website ?? "-",
          source: `${response.provider}`,
        })),
      );
      toast.success(`Busqueda completada: ${response.count} resultados.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo completar la busqueda.";
      if (currentJobId) {
        void failLeadSearchJob(currentJobId, message);
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed bottom-4 right-4 z-[95] w-[min(96vw,960px)] rounded-2xl border border-cyan-300/30 bg-slate-950/90 shadow-[0_0_45px_-18px_rgba(34,211,238,0.75)] backdrop-blur-xl">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-cyan-100">LeadFinder Control</h2>
          <p className="text-xs text-slate-300">
            {title}
            {job ? ` · job ${job.id.slice(0, 8)} (${job.status})` : ""}
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </Button>
      </header>

      {open && (
        <div className="space-y-4 p-4">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto_auto_auto]">
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Que buscar (ej: colegios, alcaldias)"
            />
            <Input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Zona (ej: Valledupar, Cesar)"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={resultLimit === 10 ? "secondary" : "outline"}
                onClick={() => setResultLimit(10)}
                disabled={loading}
              >
                10
              </Button>
              <Button
                type="button"
                variant={resultLimit === 20 ? "secondary" : "outline"}
                onClick={() => setResultLimit(20)}
                disabled={loading}
              >
                20
              </Button>
            </div>
            <Button
              type="button"
              variant={useGoogleMaps ? "secondary" : "outline"}
              onClick={() => setUseGoogleMaps((v) => !v)}
              disabled={loading}
            >
              Maps: {useGoogleMaps ? "ON" : "OFF"}
            </Button>
            <Button type="button" variant="hero" onClick={() => void onSearch()} disabled={!canSearch || loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
          </div>

          <div className="max-h-64 overflow-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead>Telefono</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Direccion</TableHead>
                  <TableHead>Sitio</TableHead>
                  <TableHead>Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-xs text-slate-400">
                      Aun no hay resultados. Ejecuta una busqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.kind}</TableCell>
                      <TableCell>{row.segment}</TableCell>
                      <TableCell>{row.fitScore}</TableCell>
                      <TableCell>{row.phone}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.address}</TableCell>
                      <TableCell>{row.website}</TableCell>
                      <TableCell>{row.source}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => toast.message("ExcelTool: fase siguiente.")}>
              Exportar Excel
            </Button>
            <Button type="button" variant="outline" onClick={() => toast.message("EmailTool: fase siguiente.")}>
              Generar borradores
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
