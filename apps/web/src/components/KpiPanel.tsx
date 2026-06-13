import { Star, MessageSquareText } from "lucide-react";
import { KPI_METRICS, KPI_METRIC_LABELS, type AgentKpi } from "@supportvision/types";
import { cn } from "@/lib/utils";

function ratingTone(v: number): string {
  if (v >= 4.2) return "text-success";
  if (v >= 3) return "text-warning";
  if (v > 0) return "text-danger";
  return "text-subtle";
}
function barTone(v: number): string {
  if (v >= 4.2) return "bg-success";
  if (v >= 3) return "bg-warning";
  return "bg-danger";
}

/** Compact KPI panel — overall score + per-metric bars. */
export function KpiPanel({
  kpi,
  title = "Performance KPIs",
  subtitle,
  bare = false,
}: {
  kpi: AgentKpi;
  title?: string;
  subtitle?: string;
  bare?: boolean;
}) {
  const hasData = kpi.feedbackCount > 0;

  return (
    <div className={bare ? "" : "rounded-xl border border-border bg-surface p-5 elevation-1"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MessageSquareText className="h-3 w-3" />
            {kpi.feedbackCount} {kpi.feedbackCount === 1 ? "review" : "reviews"}
            {subtitle ? ` · ${subtitle}` : ""}
          </p>
        </div>
        <div className="text-right">
          <div className={cn("flex items-center gap-1 text-2xl font-semibold tabular-nums", ratingTone(kpi.overall))}>
            <Star className="h-5 w-5 fill-current" />
            {hasData ? kpi.overall.toFixed(1) : "—"}
          </div>
          <p className="text-[0.7rem] text-subtle">overall</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {KPI_METRICS.map((m) => {
          const v = kpi.averages[m];
          return (
            <div key={m} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{KPI_METRIC_LABELS[m]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", hasData ? barTone(v) : "bg-transparent")}
                  style={{ width: `${(v / 5) * 100}%` }}
                />
              </div>
              <span className={cn("w-8 shrink-0 text-right text-xs font-semibold tabular-nums", ratingTone(v))}>
                {hasData ? v.toFixed(1) : "—"}
              </span>
            </div>
          );
        })}
      </div>

      {!hasData && (
        <p className="mt-3 text-center text-xs text-subtle">No customer feedback yet.</p>
      )}
    </div>
  );
}
