"use client";

import { type MouseEvent, useMemo, useState } from "react";
import type { RecommendationScoreHistoryPoint } from "@/domain/recommendations/types";
import { CHARACTERISTICS_SCORE_BANDS, assessmentLabel, assessmentTone } from "@/application/services/recommendations/recommendationPresentation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const WIDTH = 360;
const HEIGHT = 110;
const PADDING_X = 16;
const PADDING_Y = 12;
const ACCENT = "#0f766e";
const BAND_LINES = [
  { score: CHARACTERISTICS_SCORE_BANDS.excellent, label: "Excellent", lineClassName: "text-emerald-600 dark:text-emerald-400", labelClassName: "text-emerald-700 dark:text-emerald-300" },
  { score: CHARACTERISTICS_SCORE_BANDS.good, label: "Good", lineClassName: "text-emerald-600 dark:text-emerald-400", labelClassName: "text-emerald-700 dark:text-emerald-300" },
  { score: CHARACTERISTICS_SCORE_BANDS.neutral, label: "Neutral", lineClassName: "text-blue-600 dark:text-blue-400", labelClassName: "text-blue-700 dark:text-blue-300" }
];

type ChartPoint = RecommendationScoreHistoryPoint & {
  score: number;
  x: number;
  y: number;
};

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

function toneClassName(tone: string) {
  if (tone === "positive") return "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100";
  if (tone === "info") return "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100";
  if (tone === "warning") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100";
  if (tone === "danger") return "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100";
  return "border-border bg-muted text-muted-foreground";
}

function labelChip(label: string) {
  const tone = assessmentTone(label);
  return (
    <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${toneClassName(tone)}`}>
      {assessmentLabel(label)}
    </span>
  );
}

function deltaText(history: RecommendationScoreHistoryPoint[]) {
  const scored = history.filter((point) => point.overallScore != null);
  const latest = scored.at(-1)?.overallScore;
  const previous = scored.at(-2)?.overallScore;
  if (latest == null || previous == null) return "Trend builds over successive runs";
  const delta = Math.round(latest) - Math.round(previous);
  if (delta === 0) return "Score unchanged from previous run";
  return `${delta > 0 ? "+" : "-"}${Math.abs(delta)} from previous run`;
}

function footerSummary(history: RecommendationScoreHistoryPoint[]) {
  const scored = history.filter((point) => point.overallScore != null);
  const latest = scored.at(-1)?.overallScore;
  const previous = scored.at(-2)?.overallScore;
  if (latest == null || previous == null) return "Latest: - | Previous: - | \u0394 -";
  const latestRounded = Math.round(latest);
  const previousRounded = Math.round(previous);
  const delta = latestRounded - previousRounded;
  return `Latest: ${latestRounded} | Previous: ${previousRounded} | \u0394 ${delta >= 0 ? "+" : ""}${delta} from previous run`;
}

function chartGeometry(history: RecommendationScoreHistoryPoint[]) {
  const scored = history
    .filter((point): point is RecommendationScoreHistoryPoint & { overallScore: number } => point.overallScore != null && Number.isFinite(point.overallScore))
    .map((point) => ({ ...point, score: Math.round(point.overallScore) }));
  if (scored.length === 0) return { points: [], linePath: "" };
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_Y * 2;
  const points: ChartPoint[] = scored.map((point, index) => ({
    ...point,
    x: PADDING_X + (index / Math.max(1, scored.length - 1)) * plotWidth,
    y: PADDING_Y + ((100 - point.score) / 100) * plotHeight
  }));
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  return { points, linePath };
}

function scoreToY(score: number) {
  return PADDING_Y + ((100 - score) / 100) * (HEIGHT - PADDING_Y * 2);
}

function scoreToTopPercent(score: number) {
  return `${(scoreToY(score) / HEIGHT) * 100}%`;
}

export function ScoreTrendPanel({ history }: { history: RecommendationScoreHistoryPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const scoredHistory = useMemo(() => history.filter((point) => point.overallScore != null), [history]);
  const latestScored = scoredHistory.at(-1);
  const latestScore = latestScored?.overallScore == null ? null : Math.round(latestScored.overallScore);
  const geometry = useMemo(() => chartGeometry(history), [history]);
  const hoverPoint = hoverIndex == null ? null : geometry.points[hoverIndex] ?? null;

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (geometry.points.length < 2) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * Math.max(0, geometry.points.length - 1)));
  }

  if (scoredHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Characteristics score trend</CardTitle>
          <CardDescription>No insight history yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/40 text-sm font-medium text-muted-foreground">
            No insight history yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Characteristics score trend</CardTitle>
            <CardDescription>Observed across stored insight runs.</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-foreground">{latestScore == null ? "-" : `${latestScore}/100`}</p>
            {latestScored ? labelChip(latestScored.recommendationLabel) : null}
          </div>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{deltaText(history)}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {scoredHistory.length < 2 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border bg-muted/40 px-4 text-center text-sm text-muted-foreground">
            The trend builds over successive insight runs.
          </div>
        ) : (
          <div className="relative" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverIndex(null)}>
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10">
              {[100, 75, 50, 25, 0].map((value) => (
                <span
                  key={value}
                  className="absolute left-0 -translate-y-1/2 rounded bg-background/80 px-1 text-[11px] tabular-nums text-muted-foreground"
                  style={{ top: `${(PADDING_Y / HEIGHT) * 100 + ((100 - value) / 100) * (((HEIGHT - PADDING_Y * 2) / HEIGHT) * 100)}%` }}
                >
                  {value}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20">
              {BAND_LINES.map((band) => (
                <span
                  key={band.score}
                  className={`absolute right-0 -translate-y-1/2 rounded bg-background/80 px-1 text-[11px] font-medium tabular-nums ${band.labelClassName}`}
                  style={{ top: scoreToTopPercent(band.score) }}
                >
                  {band.label}
                </span>
              ))}
            </div>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="h-32 w-full overflow-visible" role="img" aria-label="Characteristics score trend sparkline">
              {[0, 0.25, 0.5, 0.75, 1].map((line) => (
                <line
                  key={line}
                  x1={PADDING_X}
                  x2={WIDTH - PADDING_X}
                  y1={PADDING_Y + (HEIGHT - PADDING_Y * 2) * line}
                  y2={PADDING_Y + (HEIGHT - PADDING_Y * 2) * line}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="1"
                />
              ))}
              {BAND_LINES.map((band) => (
                <line
                  key={band.score}
                  x1={PADDING_X}
                  x2={WIDTH - PADDING_X}
                  y1={scoreToY(band.score)}
                  y2={scoreToY(band.score)}
                  className={band.lineClassName}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  strokeOpacity="0.22"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              <path d={geometry.linePath} fill="none" stroke={ACCENT} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              {geometry.points.map((point) => (
                <circle key={`${point.runDate}-${point.score}`} cx={point.x} cy={point.y} r="3.5" fill={ACCENT} />
              ))}
              {hoverPoint ? (
                <line x1={hoverPoint.x} x2={hoverPoint.x} y1={PADDING_Y} y2={HEIGHT - PADDING_Y} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              ) : null}
            </svg>
            {hoverPoint ? (
              <div
                className="pointer-events-none absolute top-2 z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-lg"
                style={{
                  left: `${(hoverPoint.x / WIDTH) * 100}%`,
                  transform: hoverPoint.x > WIDTH * 0.75 ? "translateX(-105%)" : "translateX(8px)"
                }}
              >
                <p className="font-semibold text-popover-foreground">{formatDate(hoverPoint.runDate)}</p>
                <p className="text-muted-foreground">{hoverPoint.score}/100</p>
              </div>
            ) : null}
          </div>
        )}
        <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
          {footerSummary(history)}
        </div>
        <p className="text-xs text-muted-foreground">
          Updated each insight run {"\u00b7"} since {formatDate(history[0].runDate)}
        </p>
        <p className="text-xs text-muted-foreground">
          Score-band guides show raw score thresholds; displayed assessment labels can be capped below the score band when guardrails apply.
        </p>
      </CardContent>
    </Card>
  );
}
