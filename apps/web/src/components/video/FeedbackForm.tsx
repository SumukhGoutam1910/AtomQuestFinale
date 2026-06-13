"use client";

import { useState } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { KPI_METRICS, KPI_METRIC_LABELS, type KpiMetric, type Ratings } from "@supportvision/types";

interface Props {
  agentName: string;
  onSubmit: (ratings: Ratings, comment: string) => Promise<boolean>;
}

export function FeedbackForm({ agentName, onSubmit }: Props) {
  const [ratings, setRatings] = useState<Record<KpiMetric, number>>({
    handling: 0,
    courteousness: 0,
    promptness: 0,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const complete = KPI_METRICS.every((m) => ratings[m] > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complete || submitting) return;
    setSubmitting(true);
    const ok = await onSubmit(ratings as Ratings, comment.trim());
    if (!ok) setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-scale-in rounded-xl border border-border bg-surface p-6 elevation-3 sm:p-7">
        <Logo size="sm" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
          How was your support call?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your feedback helps us improve. Rate {agentName} before you go.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {KPI_METRICS.map((metric) => (
            <div key={metric} className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">{KPI_METRIC_LABELS[metric]}</span>
              <StarRow
                value={ratings[metric]}
                onChange={(v) => setRatings((r) => ({ ...r, [metric]: v }))}
              />
            </div>
          ))}

          <div className="pt-1">
            <label htmlFor="fb-comment" className="mb-1.5 block text-sm font-medium text-foreground">
              Anything else? <span className="font-normal text-subtle">(optional)</span>
            </label>
            <textarea
              id="fb-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Tell us about your experience…"
              className="w-full resize-none rounded border border-input bg-surface px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/12"
            />
          </div>

          <Button type="submit" size="lg" loading={submitting} disabled={!complete} className="w-full">
            {!submitting && <Send className="h-4 w-4" />}
            Submit feedback
          </Button>
          {!complete && (
            <p className="text-center text-xs text-subtle">Please rate all three to continue.</p>
          )}
        </form>
      </div>
    </div>
  );
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              className={cn(
                "h-6 w-6 transition-colors",
                active ? "fill-[hsl(38_92%_50%)] text-[hsl(38_92%_50%)]" : "text-border-strong"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
