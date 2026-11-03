import { useState } from "react";
import { Copy, Download } from "lucide-react";
import {
  adherenceRows,
  diaperKindCounts,
  dueCardClass,
  dueLabel,
  dueLabelClass,
  dueNameClass,
  feedTotals,
  formatAmount,
  formatDay,
  formatTime,
  formatWeekday,
  onDay,
  rangeDays,
  reportCsv,
  reportRows,
  reportText,
  type ReportFilter,
} from "@/lib/tracker/model";
import { useTracker } from "@/lib/tracker/store";
import type { Composer } from "@/components/joni/types";
import { EmptyState, TopBar, choiceClass } from "@/components/joni/ui";

const RANGES = [
  { id: 1, label: "Today" },
  { id: 7, label: "7 days" },
  { id: 14, label: "14 days" },
] as const;

const FILTERS: { id: ReportFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "feed", label: "Feeds" },
  { id: "diaper", label: "Diapers" },
  { id: "dose", label: "Meds" },
];

function Bars({
  title,
  values,
  color,
}: {
  title: string;
  values: { key: number; label: string; value: number }[];
  color: string;
}) {
  const peak = Math.max(1, ...values.map((item) => item.value));
  return (
    <section className="rounded-3xl bg-paper p-4 ring-1 ring-line">
      <h2 className="font-serif text-xl font-medium">{title}</h2>
      <div className="mt-3 flex h-32 items-end gap-1">
        {values.map((item) => (
          <div key={item.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span className="text-[11px] tabular-nums text-muted">{item.value || ""}</span>
            <div className="flex h-16 w-full items-end justify-center">
              <div
                className={`w-full max-w-8 rounded-t-md ${color}`}
                style={{ height: item.value ? `${Math.max(8, (item.value / peak) * 100)}%` : "0%" }}
              />
            </div>
            <span className="text-[10px] text-muted">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function OverviewScreen({ now, open }: { now: number; open: (composer: Composer) => void }) {
  const [span, setSpan] = useState<(typeof RANGES)[number]["id"]>(7);
  const [filter, setFilter] = useState<ReportFilter>("all");
  const [copied, setCopied] = useState(false);
  const [copyText, setCopyText] = useState("");
  const feeds = useTracker((state) => state.feeds);
  const diapers = useTracker((state) => state.diapers);
  const doses = useTracker((state) => state.doses);
  const meds = useTracker((state) => state.meds);
  const unit = useTracker((state) => state.settings.unit);
  const babyName = useTracker((state) => state.settings.babyName.trim() || "Joni");
  const days = rangeDays(now, span);
  const start = days[0] ?? now;
  const end = now;
  const rows = reportRows({ feeds, diapers, doses, meds, start, end, filter, babyName });
  const adherence = adherenceRows(meds, doses, days, now, babyName);
  const feedBars = days.map((day) => ({
    key: day,
    label: formatWeekday(day).slice(0, 1),
    value: onDay(feeds, day).length,
  }));
  const diaperBars = days.map((day) => ({
    key: day,
    label: formatWeekday(day).slice(0, 1),
    value: onDay(diapers, day).length,
  }));

  function openRow(row: (typeof rows)[number]) {
    if (row.feed) open({ kind: "feed", feed: row.feed });
    else if (row.diaper) open({ kind: "diaper", diaper: row.diaper });
    else if (row.dose) open({ kind: "dose", dose: row.dose });
  }

  function text() {
    return reportText({ babyName, days, unit, feeds, diapers, rows, adherence });
  }

  async function copyView() {
    const body = text();
    try {
      await navigator.clipboard.writeText(body);
      setCopyText("");
      setCopied(true);
    } catch {
      setCopyText(body);
      setCopied(false);
    }
  }

  function downloadCsv() {
    const blob = new Blob([reportCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "joni-overview.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <TopBar
        title="Overview"
        sub="The last stretch, in one place."
        onSettings={() => open({ kind: "settings" })}
      />

      <div className="mt-4 grid grid-cols-3 gap-2">
        {RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={span === item.id}
            onClick={() => setSpan(item.id)}
            className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(span === item.id)}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(filter === item.id)}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <Bars title="Feeds" values={feedBars} color="bg-sage" />
        <Bars title="Diapers" values={diaperBars} color="bg-clay" />
      </div>

      <h2 className="mt-8 font-serif text-xl font-medium">Meds right now</h2>
      <p className="mt-1 text-sm text-muted">Red is due. Gold is within two hours. Sage is on schedule.</p>
      {adherence.filter((row) => row.active).length === 0 ? (
        <p className="mt-3 text-sm text-muted">No active medications.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {adherence
            .filter((row) => row.active)
            .map((row) => (
              <div key={row.id} className={`rounded-2xl px-3 py-3 ${dueCardClass(row.due)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`truncate ${dueNameClass(row.due)}`}>{row.name}</p>
                    <p className="text-sm text-muted">{row.who}</p>
                  </div>
                  <p className={`shrink-0 text-sm tabular-nums ${dueLabelClass(row.due)}`}>{dueLabel(row.due, now)}</p>
                </div>
              </div>
            ))}
        </div>
      )}

      <h2 className="mt-8 font-serif text-xl font-medium">Feeding totals</h2>
      <div className="mt-3 overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
        <table className="w-full min-w-[18rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Day</th>
              <th className="px-3 py-3 font-medium">Feeds</th>
              <th className="px-3 py-3 font-medium">Volume</th>
              <th className="px-3 py-3 font-medium">Minutes</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((day) => {
              const totals = feedTotals(onDay(feeds, day), unit);
              return (
                <tr key={day} className="border-t border-line">
                  <td className="px-3 py-3">{formatDay(day, now)}</td>
                  <td className="px-3 py-3 tabular-nums">{totals.count}</td>
                  <td className="px-3 py-3 tabular-nums">
                    {totals.volume > 0 ? formatAmount(totals.volume, unit) : "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums">{totals.minutes > 0 ? totals.minutes : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-serif text-xl font-medium">Diaper counts</h2>
      <div className="mt-3 overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
        <table className="w-full min-w-[20rem] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-3 py-3 font-medium">Day</th>
              <th className="px-3 py-3 font-medium">Wet</th>
              <th className="px-3 py-3 font-medium">Dirty</th>
              <th className="px-3 py-3 font-medium">Both</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((day) => {
              const counts = diaperKindCounts(onDay(diapers, day));
              return (
                <tr key={day} className="border-t border-line">
                  <td className="px-3 py-3">{formatDay(day, now)}</td>
                  <td className="px-3 py-3 tabular-nums">{counts.wet}</td>
                  <td className="px-3 py-3 tabular-nums">{counts.dirty}</td>
                  <td className="px-3 py-3 tabular-nums">{counts.both}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-serif text-xl font-medium">Medication adherence</h2>
      <p className="mt-1 text-sm text-muted">Taken compared with the schedule saved now. As-needed meds have no expected count.</p>
      {adherence.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No doses in this range.</p>
      ) : (
        <div className="mt-3 grid gap-3">
          {adherence.map((row) => (
            <article key={row.id} className="rounded-3xl bg-paper p-4 ring-1 ring-line">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{row.name}</h3>
                  <p className="text-sm text-muted">
                    {row.who}
                    {row.active ? "" : " · Paused"}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {row.expected == null ? `${row.taken} taken` : `${row.taken} / ${row.expected}`}
                </p>
              </div>
              <div className="mt-3 flex gap-1">
                {row.byDay.map((day) => {
                  const met = day.expected != null && day.taken >= day.expected && day.expected > 0;
                  const some = day.taken > 0;
                  return (
                    <div key={day.day} className="min-w-0 flex-1 text-center">
                      <div
                        className={`mx-auto h-8 w-full max-w-8 rounded-md ${
                          met ? "bg-sage" : some ? "bg-warn" : "bg-sage-soft"
                        }`}
                        title={`${formatDay(day.day, now)} ${day.taken}${day.expected == null ? "" : ` of ${day.expected}`}`}
                      />
                      <span className="mt-1 block text-[10px] text-muted">{formatWeekday(day.day).slice(0, 1)}</span>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      )}

      <h2 className="mt-8 font-serif text-xl font-medium">Everything</h2>
      <p className="mt-1 text-sm text-muted">Newest first. Tap a row to edit it.</p>
      {rows.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="Nothing in this view" body="Feeds, diapers, and doses you log will collect here." />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-3xl bg-paper ring-1 ring-line">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">Type</th>
                <th className="px-3 py-3 font-medium">Details</th>
                <th className="px-3 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  className="cursor-pointer border-t border-line"
                  onClick={() => openRow(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openRow(row);
                    }
                  }}
                >
                  <td className="px-3 py-3 align-top whitespace-nowrap">
                    <span className="block tabular-nums">{formatTime(row.at)}</span>
                    <span className="block text-xs text-muted">{formatDay(row.at, now)}</span>
                  </td>
                  <td className="px-3 py-3 align-top">{row.typeLabel}</td>
                  <td className="px-3 py-3 align-top">{row.details || "—"}</td>
                  <td className="px-3 py-3 align-top text-muted">{row.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          onClick={() => void copyView()}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sage-soft text-base font-medium text-ink"
        >
          <Copy className="size-5" />
          {copied ? "Copied" : "Copy this view"}
        </button>
        <button
          type="button"
          onClick={downloadCsv}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-paper text-base font-medium text-ink ring-1 ring-line"
        >
          <Download className="size-5" />
          Download CSV
        </button>
      </div>
      {copyText ? (
        <textarea className="field mt-3 text-ink" readOnly value={copyText} aria-label="Overview to copy" />
      ) : null}
    </div>
  );
}
