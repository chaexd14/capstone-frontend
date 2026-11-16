"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Clock3, Database, HardDrive, RefreshCw, Server, ShieldCheck } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/feedback";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { MetricSummary } from "@/components/ui/metric-summary";
import { PageHeader, PageHeaderActions, PageHeaderDescription, PageHeaderTitle } from "@/components/ui/page-header";
import { Section, SectionDescription, SectionHeader, SectionTitle } from "@/components/ui/section";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type HealthStatus = "healthy" | "degraded" | "down" | "unavailable";
type ComponentHealth = { id: string; name: string; status: HealthStatus; detail: string };
type Overview = {
  generated_at: string;
  overall_status: HealthStatus;
  active_incidents: number;
  components: ComponentHealth[];
  host: {
    status: HealthStatus;
    last_reported_at: string | null;
    cpu_percent: number | null;
    memory_percent: number | null;
    disk_percent: number | null;
    uptime_seconds: number | null;
  };
  queue: { depth: number; failed: number; oldest_seconds: number; heartbeat_age_seconds: number | null };
  security_events_24h: { action: string; count: number }[];
  incidents: { component: string; severity: HealthStatus; summary: string }[];
};
type Point = {
  recorded_at: string;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  queue_depth: number;
  failed_work: number;
  database_latency_ms: number | null;
};

const statusCopy: Record<HealthStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  down: "Down",
  unavailable: "Telemetry unavailable",
};

function statusTone(status: HealthStatus) {
  if (status === "healthy") return "success" as const;
  if (status === "degraded") return "warning" as const;
  if (status === "down") return "danger" as const;
  return "neutral" as const;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return "Unavailable";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function formatTime(value: string | null) {
  if (!value) return "No report received";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function ResourceMeter({ label, value }: { label: string; value: number | null }) {
  const tone = value === null ? "bg-slate-300" : value >= 90 ? "bg-rose-500" : value >= 80 ? "bg-amber-500" : "bg-primary";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">{value === null ? "Unavailable" : `${value.toFixed(1)}%`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted" role="meter" aria-label={`${label} utilization`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
        <div className={`h-full rounded-full transition-[width] duration-200 ${tone}`} style={{ width: `${Math.min(100, value ?? 0)}%` }} />
      </div>
    </div>
  );
}

function TrendChart({ points }: { points: Point[] }) {
  const path = useMemo(() => {
    if (points.length < 2) return "";
    return points.map((point, index) => {
      const x = (index / (points.length - 1)) * 100;
      const y = 100 - Math.max(0, Math.min(100, point.cpu_percent));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    }).join(" ");
  }, [points]);
  if (points.length < 2) {
    return <div className="grid min-h-44 place-items-center rounded-xl bg-muted/60 px-6 text-center text-sm text-muted-foreground">Trend data appears after the VM agent submits at least two reports.</div>;
  }
  const latest = points[points.length - 1];
  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-44 w-full" role="img" aria-label={`VM CPU trend. Latest value ${latest.cpu_percent.toFixed(1)} percent.`}>
        <line x1="0" y1="20" x2="100" y2="20" className="stroke-amber-400/50" strokeWidth="0.7" strokeDasharray="3 3" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-border" strokeWidth="0.5" />
        <line x1="0" y1="100" x2="100" y2="100" className="stroke-border" strokeWidth="0.5" />
        <path d={path} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="mt-2 flex justify-between text-sm text-muted-foreground"><span>Earlier</span><span>CPU latest: {latest.cpu_percent.toFixed(1)}%</span></div>
    </div>
  );
}

export function SystemMonitoring() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [range, setRange] = useState<"24h" | "7d">("24h");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    setError("");
    try {
      const [nextOverview, series] = await Promise.all([
        fetchApi<Overview>("/platform/monitoring/overview/"),
        fetchApi<{ points: Point[] }>(`/platform/monitoring/timeseries/?range=${range}`),
      ]);
      setOverview(nextOverview);
      setPoints(series.points);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "System monitoring could not be loaded.");
    } finally {
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(true);
    }, 60_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
    };
  }, [load]);

  if (!overview && refreshing) return <ContextualLoading label="Loading system monitoring" />;
  if (!overview && error) return <ErrorState title="System monitoring is unavailable" description={error} onAction={() => void load()} />;
  if (!overview) return null;

  return (
    <div className="space-y-7">
      <PageHeader>
        <div>
          <PageHeaderTitle>System monitoring</PageHeaderTitle>
          <PageHeaderDescription>Health and reliability across the production platform. This read-only view refreshes every minute.</PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <StatusBadge status={statusTone(overview.overall_status)} dot>{statusCopy[overview.overall_status]}</StatusBadge>
          <Button variant="outline" onClick={() => void load()} disabled={refreshing}>
            <RefreshCw className={refreshing ? "animate-spin" : ""} aria-hidden="true" />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
        </PageHeaderActions>
      </PageHeader>

      {error ? <p role="alert" className="text-sm text-rose-700">Latest refresh failed: {error}</p> : null}

      <Section aria-labelledby="operations-summary">
        <h2 id="operations-summary" className="sr-only">Operations summary</h2>
        <div className="grid gap-6 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          <MetricSummary label="Overall state" value={statusCopy[overview.overall_status]} description={`Updated ${formatTime(overview.generated_at)}`} tone={overview.overall_status === "healthy" ? "success" : "neutral"} />
          <MetricSummary className="pt-6 sm:pl-6 sm:pt-1" label="Active incidents" value={overview.active_incidents} description="Degraded or unavailable core services" />
          <MetricSummary className="pt-6 lg:pl-6 lg:pt-1" label="Queue depth" value={overview.queue.depth} description={`Oldest ready work: ${overview.queue.oldest_seconds}s`} />
          <MetricSummary className="pt-6 sm:pl-6 lg:pt-1" label="VM uptime" value={formatDuration(overview.host.uptime_seconds)} description={`Last agent report: ${formatTime(overview.host.last_reported_at)}`} />
        </div>
      </Section>

      <Section>
        <SectionHeader>
          <div><SectionTitle>Platform services</SectionTitle><SectionDescription>Each dependency reports independently so missing telemetry is never mistaken for a healthy service.</SectionDescription></div>
        </SectionHeader>
        <div className="divide-y divide-border">
          {overview.components.map((component) => (
            <div key={component.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(10rem,1fr)_auto_minmax(15rem,1.5fr)] sm:items-center sm:gap-5">
              <p className="font-semibold text-foreground">{component.name}</p>
              <StatusBadge status={statusTone(component.status)} dot>{statusCopy[component.status]}</StatusBadge>
              <p className="text-sm text-muted-foreground sm:text-right">{component.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <Section>
          <SectionHeader>
            <div><SectionTitle>VM utilization</SectionTitle><SectionDescription>CPU trend and current capacity for the host running the API and resume worker.</SectionDescription></div>
            <div className="flex rounded-xl bg-muted p-1" aria-label="Trend range">
              {(["24h", "7d"] as const).map((value) => <Button key={value} size="sm" variant={range === value ? "secondary" : "ghost"} aria-pressed={range === value} onClick={() => setRange(value)}>{value}</Button>)}
            </div>
          </SectionHeader>
          <TrendChart points={points} />
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <ResourceMeter label="CPU" value={overview.host.cpu_percent} />
            <ResourceMeter label="Memory" value={overview.host.memory_percent} />
            <ResourceMeter label="Disk" value={overview.host.disk_percent} />
          </div>
        </Section>

        <Section>
          <SectionHeader><div><SectionTitle>Processing reliability</SectionTitle><SectionDescription>Resume-worker heartbeat, backlog, and failed work.</SectionDescription></div></SectionHeader>
          <dl className="divide-y divide-border text-sm">
            <div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 font-semibold"><Activity className="size-4 text-primary" />Worker heartbeat</dt><dd className="tabular-nums text-muted-foreground">{overview.queue.heartbeat_age_seconds === null ? "Unavailable" : `${overview.queue.heartbeat_age_seconds}s ago`}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 font-semibold"><Clock3 className="size-4 text-primary" />Oldest queued work</dt><dd className="tabular-nums text-muted-foreground">{overview.queue.oldest_seconds}s</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 font-semibold"><Server className="size-4 text-primary" />Ready work</dt><dd className="tabular-nums text-muted-foreground">{overview.queue.depth}</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="flex items-center gap-2 font-semibold"><HardDrive className="size-4 text-primary" />Failed work</dt><dd className="tabular-nums text-muted-foreground">{overview.queue.failed}</dd></div>
          </dl>
        </Section>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-2">
        <Section>
          <SectionHeader><div><SectionTitle>Current incidents</SectionTitle><SectionDescription>Read-only operational findings that require investigation.</SectionDescription></div></SectionHeader>
          {overview.incidents.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No active incidents.</p> : (
            <Table density="compact">
              <TableHeader><TableRow><TableHead size="standard">Component</TableHead><TableHead size="fit">Severity</TableHead><TableHead size="fill">Finding</TableHead></TableRow></TableHeader>
              <TableBody>{overview.incidents.map((incident) => <TableRow key={`${incident.component}-${incident.summary}`}><TableCell className="font-semibold">{incident.component}</TableCell><TableCell overflow="nowrap"><StatusBadge status={statusTone(incident.severity)}>{statusCopy[incident.severity]}</StatusBadge></TableCell><TableCell>{incident.summary}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </Section>

        <Section>
          <SectionHeader><div><SectionTitle>Security activity</SectionTitle><SectionDescription>Aggregated, redacted events from the past 24 hours. Actor identities and candidate data are excluded.</SectionDescription></div><ShieldCheck className="size-5 text-primary" aria-hidden="true" /></SectionHeader>
          {overview.security_events_24h.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No security events recorded in the past 24 hours.</p> : (
            <Table density="compact">
              <TableHeader><TableRow><TableHead size="fill">Event category</TableHead><TableHead size="fit">Count</TableHead></TableRow></TableHeader>
              <TableBody>{overview.security_events_24h.map((event) => <TableRow key={event.action}><TableCell className="font-medium">{event.action.replaceAll(".", " ")}</TableCell><TableCell overflow="nowrap" className="tabular-nums">{event.count}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </Section>
      </div>
      <p className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="size-4" aria-hidden="true" />Monitoring data is visible only to server-verified Super Admin accounts.</p>
    </div>
  );
}
