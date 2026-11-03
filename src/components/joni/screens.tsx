import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChartColumn,
  Copy,
  Droplets,
  House,
  Milk,
  Pill,
} from "lucide-react";
import {
  MOODS,
  addDays,
  buildTimeline,
  daySummary,
  diaperCounts,
  diaperMeta,
  diaperTitle,
  dueCardClass,
  dueLabel,
  dueLabelClass,
  dueNameClass,
  endOfDay,
  feedMeta,
  feedTitle,
  feedTotals,
  formatAgo,
  formatDay,
  formatDuration,
  formatLongDay,
  formatTime,
  formatTotal,
  formatWeekday,
  frequencyLabel,
  greeting,
  groupByDay,
  isHot,
  isSameDay,
  lastDose,
  latest,
  medWho,
  onDay,
  scheduledMeds,
  startOfDay,
  type Diaper,
  type Dose,
  type DueInfo,
  type Feed,
  type Medication,
} from "@/lib/tracker/model";
import { useActiveLogs, useTracker } from "@/lib/tracker/store";
import type { Composer, TabId } from "@/components/joni/types";
import { DiaperForm, FeedForm } from "@/components/joni/forms";
import { EmptyState, EventButton, PrimaryButton, Stat, TopBar, choiceClass } from "@/components/joni/ui";

function QuickButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Milk;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-3xl bg-sage text-on-sage"
    >
      <Icon className="size-6" strokeWidth={1.75} />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function DueCard({
  label,
  item,
  doses,
  now,
  open,
}: {
  label: string;
  item: { med: Medication; due: DueInfo };
  doses: Dose[];
  now: number;
  open: (composer: Composer) => void;
}) {
  const last = lastDose(item.med.id, doses);
  return (
    <article className={`mt-3 rounded-3xl p-4 ${dueCardClass(item.due)}`}>
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate font-serif text-2xl ${dueNameClass(item.due)}`}>{item.med.name}</p>
          <p className="mt-1 text-sm text-muted">
            {[item.med.dose, frequencyLabel(item.med.frequency)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <p className={`shrink-0 text-right text-sm tabular-nums ${dueLabelClass(item.due)}`}>
          {dueLabel(item.due, now)}
        </p>
      </div>
      <p className="mt-2 text-sm text-muted">{last ? `Last given ${formatTime(last.at)}` : "Not given yet"}</p>
      <div className="mt-3 grid gap-2">
        <PrimaryButton tone={isHot(item.due.status) ? "clay" : "sage"} onClick={() => useTracker.getState().markDose(item.med.id)}>
          Mark given
        </PrimaryButton>
        <button
          type="button"
          onClick={() => open({ kind: "dose-time", medId: item.med.id })}
          className="min-h-11 text-sm font-medium text-sage"
        >
          Different time
        </button>
      </div>
    </article>
  );
}

export function TodayScreen({
  now,
  open,
  go,
}: {
  now: number;
  open: (composer: Composer) => void;
  go: (tab: TabId) => void;
}) {
  const { child, name, feeds, diapers } = useActiveLogs();
  const meds = useTracker((state) => state.meds);
  const doses = useTracker((state) => state.doses);
  const lastFeed = latest(feeds);
  const lastDiaper = latest(diapers);
  const ranked = scheduledMeds(meds, doses, now);
  const upcoming = ranked.find((item) => medWho(item.med) === "mom");
  const babyNext = ranked.find((item) => medWho(item.med) === "baby");
  const events = buildTimeline(feeds, diapers, doses, startOfDay(now), endOfDay(now), name);

  function quickMed() {
    const active = useTracker.getState().meds.filter((med) => med.active);
    if (active.length === 0) open({ kind: "med" });
    else if (active.length === 1) useTracker.getState().markDose(active[0]?.id ?? "");
    else open({ kind: "pick-med" });
  }

  return (
    <div>
      <TopBar
        title={name}
        sub={`${greeting(now)} · ${formatLongDay(now)}`}
        onSettings={() => open({ kind: "settings" })}
      />
      <div className="mt-4 grid grid-cols-3 gap-3">
        <QuickButton label="Feed" icon={Milk} onClick={() => open({ kind: "feed" })} />
        <QuickButton label="Diaper" icon={Droplets} onClick={() => open({ kind: "diaper" })} />
        <QuickButton label="Med" icon={Pill} onClick={quickMed} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <article className="rounded-3xl bg-paper p-4 ring-1 ring-line">
          <p className="text-sm text-muted">Last feed</p>
          {lastFeed ? (
            <>
              <p className="mt-2 font-serif text-2xl font-medium tabular-nums">{formatAgo(lastFeed.at, now)}</p>
              <p className="mt-1 text-sm text-pretty text-muted">
                {[feedTitle(lastFeed.type), formatDuration(lastFeed), formatTime(lastFeed.at)].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-serif text-2xl font-medium">None yet</p>
              <p className="mt-1 text-sm text-muted">Tap Feed when you’re ready.</p>
            </>
          )}
        </article>
        <article className="rounded-3xl bg-paper p-4 ring-1 ring-line">
          <p className="text-sm text-muted">Last diaper</p>
          {lastDiaper ? (
            <>
              <p className="mt-2 font-serif text-2xl font-medium tabular-nums">{formatAgo(lastDiaper.at, now)}</p>
              <p className="mt-1 text-sm text-pretty text-muted">
                {diaperTitle(lastDiaper.kind)} · {formatTime(lastDiaper.at)}
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 font-serif text-2xl font-medium">None yet</p>
              <p className="mt-1 text-sm text-muted">A wet one counts too.</p>
            </>
          )}
        </article>
      </div>

      <article
        className={`mt-3 rounded-3xl p-4 ${upcoming ? dueCardClass(upcoming.due) : "bg-paper ring-1 ring-line"}`}
      >
        <p className="text-sm text-muted">Next mom med</p>
        {upcoming ? (
          <>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className={`truncate font-serif text-2xl ${dueNameClass(upcoming.due)}`}>{upcoming.med.name}</p>
                <p className="mt-1 text-sm text-muted">
                  {[upcoming.med.dose, frequencyLabel(upcoming.med.frequency)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <p className={`shrink-0 text-right text-sm tabular-nums ${dueLabelClass(upcoming.due)}`}>
                {dueLabel(upcoming.due, now)}
              </p>
            </div>
            <p className="mt-2 text-sm text-muted">
              {lastDose(upcoming.med.id, doses)
                ? `Last taken ${formatTime(lastDose(upcoming.med.id, doses)?.at ?? now)}`
                : "Not taken yet"}
            </p>
            <div className="mt-3 grid gap-2">
              <PrimaryButton tone={isHot(upcoming.due.status) ? "clay" : "sage"} onClick={() => useTracker.getState().markDose(upcoming.med.id)}>
                Mark taken
              </PrimaryButton>
              <button
                type="button"
                onClick={() => open({ kind: "dose-time", medId: upcoming.med.id })}
                className="min-h-11 text-sm font-medium text-sage"
              >
                Different time
              </button>
            </div>
            {ranked.filter((item) => medWho(item.med) === "mom").length > 1 ? (
              <button type="button" onClick={() => go("meds")} className="mt-1 min-h-11 text-sm text-muted">
                See all meds
              </button>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-2 font-serif text-2xl font-medium">No meds yet</p>
            <p className="mt-1 text-sm text-muted">Add one when you want a reminder.</p>
            <div className="mt-3">
              <PrimaryButton onClick={() => open({ kind: "med" })}>Add a med</PrimaryButton>
            </div>
          </>
        )}
      </article>

      {child === "joni" && babyNext ? (
        <DueCard
          label="For Joni"
          item={babyNext}
          doses={doses}
          now={now}
          open={open}
        />
      ) : null}

      <h2 className="mt-8 font-serif text-xl font-medium">Today</h2>
      {events.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="A quiet day so far"
            body="Nothing logged yet today. A feed, a diaper, or a dose — one tap when you’re ready."
          />
        </div>
      ) : (
        <div className="mt-1 divide-y divide-line">
          {events.map((event) => (
            <EventButton
              key={event.id}
              icon={event.kind === "feed" ? Milk : event.kind === "diaper" ? Droplets : Pill}
              title={event.title}
              detail={event.detail}
              time={formatTime(event.at)}
              iconClass={event.kind === "diaper" && event.diaper?.kind !== "wet" ? "text-clay" : "text-sage"}
              onClick={() => openEvent(event, open)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function openEvent(
  event: { feed?: Feed; diaper?: Diaper; dose?: Dose },
  open: (composer: Composer) => void,
) {
  if (event.feed) open({ kind: "feed", feed: event.feed });
  else if (event.diaper) open({ kind: "diaper", diaper: event.diaper });
  else if (event.dose) open({ kind: "dose", dose: event.dose });
}

export function FeedsScreen({ now, open }: { now: number; open: (composer: Composer) => void }) {
  const { name, feeds } = useActiveLogs();
  const unit = useTracker((state) => state.settings.unit);
  const today = onDay(feeds, now);
  const totals = feedTotals(today, unit);
  const last = latest(feeds);
  const { groups, truncated } = groupByDay(feeds, now);

  return (
    <div>
      <TopBar
        title="Feedings"
        sub={last ? `${name} · last feed ${formatAgo(last.at, now)}` : `${name} · nothing logged yet`}
        onSettings={() => open({ kind: "settings" })}
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Today" value={String(totals.count)} />
        <Stat label="Volume" value={formatTotal(totals.volume, unit)} />
        <Stat label="Time" value={totals.minutes ? `${totals.minutes}m` : "—"} />
      </div>
      <div className="mt-4">
        <FeedForm heading="Log a feed" />
      </div>
      <h2 className="mt-8 font-serif text-xl font-medium">Recent</h2>
      {groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No feeds yet" body="Log the first one whenever you can. Time is already set to now." />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-4">
            <h3 className="text-sm text-muted">{group.label}</h3>
            <div className="divide-y divide-line">
              {group.items.map((feed) => (
                <EventButton
                  key={feed.id}
                  icon={Milk}
                  title={feedTitle(feed.type)}
                  detail={[feedMeta(feed), feed.notes].filter(Boolean).join(" · ")}
                  time={formatTime(feed.at)}
                  onClick={() => open({ kind: "feed", feed })}
                />
              ))}
            </div>
          </section>
        ))
      )}
      {truncated ? <p className="mt-3 text-sm text-muted">Showing the latest 80.</p> : null}
    </div>
  );
}

export function DiapersScreen({ now, open }: { now: number; open: (composer: Composer) => void }) {
  const { name, diapers } = useActiveLogs();
  const today = onDay(diapers, now);
  const counts = diaperCounts(today);
  const { groups, truncated } = groupByDay(diapers, now);

  return (
    <div>
      <TopBar
        title="Diapers"
        sub={`${name} · wet, dirty, or both.`}
        onSettings={() => open({ kind: "settings" })}
      />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Today" value={String(counts.total)} />
        <Stat label="Wet" value={String(counts.wet)} />
        <Stat label="Dirty" value={String(counts.dirty)} />
      </div>
      <div className="mt-4">
        <DiaperForm heading="Log a diaper" />
      </div>
      <h2 className="mt-8 font-serif text-xl font-medium">Recent</h2>
      {groups.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No diapers yet" body="Wet, dirty, or both. Color and texture can wait." />
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="mt-4">
            <h3 className="text-sm text-muted">{group.label}</h3>
            <div className="divide-y divide-line">
              {group.items.map((diaper) => (
                <EventButton
                  key={diaper.id}
                  icon={Droplets}
                  iconClass={diaper.kind === "wet" ? "text-sage" : "text-clay"}
                  title={diaperTitle(diaper.kind)}
                  detail={[diaperMeta(diaper), diaper.notes].filter(Boolean).join(" · ")}
                  time={formatTime(diaper.at)}
                  onClick={() => open({ kind: "diaper", diaper })}
                />
              ))}
            </div>
          </section>
        ))
      )}
      {truncated ? <p className="mt-3 text-sm text-muted">Showing the latest 80.</p> : null}
    </div>
  );
}

export function MedsScreen({ now, open }: { now: number; open: (composer: Composer) => void }) {
  const meds = useTracker((state) => state.meds);
  const doses = useTracker((state) => state.doses);
  const active = scheduledMeds(meds, doses, now);
  const paused = meds.filter((med) => !med.active);
  const groups = [
    { label: "Mom", items: active.filter((item) => medWho(item.med) !== "baby") },
    { label: "Joni", items: active.filter((item) => medWho(item.med) === "baby") },
  ];

  return (
    <div>
      <TopBar
        title="Meds"
        sub="Shared by both babies. Red is due. Gold is within two hours."
        onSettings={() => open({ kind: "settings" })}
      />
      <div className="mt-4">
        <PrimaryButton onClick={() => open({ kind: "med" })}>Add medication</PrimaryButton>
      </div>
      {active.length === 0 && paused.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No medications yet"
            body="Add a name, a dose, and either every few hours or set times. One tap marks it taken."
          />
        </div>
      ) : null}
      {groups.map((group) =>
        group.items.length ? (
          <section key={group.label} className="mt-6">
            <h2 className="font-serif text-xl font-medium">{group.label}</h2>
            <div className="mt-3 grid gap-3">
              {group.items.map(({ med, due }) => {
                const last = lastDose(med.id, doses);
                const baby = medWho(med) === "baby";
                const hot = isHot(due.status);
                return (
                  <article key={med.id} className={`rounded-3xl p-4 ${dueCardClass(due)}`}>
                    <button type="button" onClick={() => open({ kind: "med", med })} className="w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className={`font-serif text-2xl ${dueNameClass(due)}`}>{med.name}</h3>
                        <span className={`shrink-0 text-sm tabular-nums ${dueLabelClass(due)}`}>
                          {dueLabel(due, now)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {[med.dose, frequencyLabel(med.frequency)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-2 text-sm text-muted">
                        {last
                          ? `${baby ? "Last given" : "Last taken"} ${formatAgo(last.at, now)} · ${formatTime(last.at)}`
                          : baby
                            ? "Not given yet"
                            : "Not taken yet"}
                      </p>
                      {med.notes ? <p className="mt-2 text-sm text-pretty text-muted">{med.notes}</p> : null}
                    </button>
                    <div className="mt-3 grid gap-2">
                      <PrimaryButton tone={hot ? "clay" : "sage"} onClick={() => useTracker.getState().markDose(med.id)}>
                        {baby ? "Mark given" : "Mark taken"}
                      </PrimaryButton>
                      <button
                        type="button"
                        onClick={() => open({ kind: "dose-time", medId: med.id })}
                        className="min-h-11 text-sm font-medium text-sage"
                      >
                        Different time
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null,
      )}
      {paused.length > 0 ? (
        <>
          <h2 className="mt-8 font-serif text-xl font-medium">Paused</h2>
          <div className="mt-2 divide-y divide-line">
            {paused.map((med) => (
              <button
                key={med.id}
                type="button"
                onClick={() => open({ kind: "med", med })}
                className="flex min-h-14 w-full items-center justify-between gap-3 py-3 text-left"
              >
                <span>
                  <span className="block font-medium">{med.name}</span>
                  <span className="text-sm text-muted">
                    {[medWho(med) === "baby" ? "Joni" : "Mom", med.dose || "No dose written"].join(" · ")}
                  </span>
                </span>
                <span className="text-sm text-muted">Paused</span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export function LogScreen({ now, open }: { now: number; open: (composer: Composer) => void }) {
  const [day, setDay] = useState(() => startOfDay(Date.now()));
  const [filter, setFilter] = useState<"all" | "feed" | "diaper" | "dose">("all");
  const [copied, setCopied] = useState(false);
  const [copyText, setCopyText] = useState("");
  const { name, feeds, diapers } = useActiveLogs();
  const doses = useTracker((state) => state.doses);
  const notes = useTracker((state) => state.notes);
  const settings = useTracker((state) => state.settings);
  const setDayNote = useTracker((state) => state.setDayNote);
  const dayKey = String(startOfDay(day));
  const note = notes[dayKey];
  const dayFeeds = onDay(feeds, day);
  const dayDiapers = onDay(diapers, day);
  const dayDoses = onDay(doses, day);
  const events = buildTimeline(feeds, diapers, doses, startOfDay(day), endOfDay(day), name).filter((event) =>
    filter === "all" ? true : event.kind === filter,
  );
  const counts = diaperCounts(dayDiapers);
  const totals = feedTotals(dayFeeds, settings.unit);
  const atToday = isSameDay(day, now);
  const weekEnd = startOfDay(day);
  const week = [6, 5, 4, 3, 2, 1, 0].map((offset) => addDays(weekEnd, -offset));

  async function copyDay() {
    const text = daySummary({
      babyName: name,
      day,
      feeds: dayFeeds,
      diapers: dayDiapers,
      doses: dayDoses,
      note,
      unit: settings.unit,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopyText("");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyText(text);
      setCopied(false);
    }
  }

  return (
    <div>
      <TopBar title="Log" sub="A day you can hand to a partner or a pediatrician." onSettings={() => open({ kind: "settings" })} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => setDay((current) => addDays(startOfDay(current), -1))}
          className="flex size-12 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <p className="font-serif text-2xl font-medium">{formatDay(day, now)}</p>
          <p className="text-sm text-muted">{formatLongDay(day)}</p>
        </div>
        <button
          type="button"
          aria-label="Next day"
          disabled={atToday}
          onClick={() => setDay((current) => addDays(startOfDay(current), 1))}
          className="flex size-12 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line disabled:opacity-40"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Feeds" value={String(dayFeeds.length)} />
        <Stat label="Wet" value={String(counts.wet)} />
        <Stat label="Doses" value={String(dayDoses.length)} />
      </div>
      <p className="mt-2 text-center text-sm text-muted">
        {totals.volume > 0 ? `${formatTotal(totals.volume, settings.unit)} logged · ` : ""}
        {counts.total} diaper {counts.total === 1 ? "change" : "changes"}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {(
          [
            ["all", "All"],
            ["feed", "Feeds"],
            ["diaper", "Diapers"],
            ["dose", "Meds"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`min-h-11 rounded-full text-sm font-medium ${choiceClass(filter === id)}`}
          >
            {label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nothing in this view" body="Try another filter, or another day. Empty is allowed." />
        </div>
      ) : (
        <div className="mt-2 divide-y divide-line">
          {events.map((event) => (
            <EventButton
              key={event.id}
              icon={event.kind === "feed" ? Milk : event.kind === "diaper" ? Droplets : Pill}
              title={event.title}
              detail={event.detail}
              time={formatTime(event.at)}
              iconClass={event.kind === "diaper" && event.diaper?.kind !== "wet" ? "text-clay" : "text-sage"}
              onClick={() => openEvent(event, open)}
            />
          ))}
        </div>
      )}

      <h2 className="mt-8 font-serif text-xl font-medium">How was the day</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            type="button"
            aria-pressed={note?.mood === mood.id}
            onClick={() =>
              setDayNote(dayKey, {
                text: note?.text ?? "",
                mood: note?.mood === mood.id ? undefined : mood.id,
              })
            }
            className={`min-h-11 rounded-full px-3 text-sm font-medium ${choiceClass(note?.mood === mood.id)}`}
          >
            {mood.label}
          </button>
        ))}
      </div>
      <textarea
        className="field mt-3 text-ink"
        value={note?.text ?? ""}
        maxLength={800}
        placeholder="Sleep, pain, a small win — only if you want."
        onChange={(event) => setDayNote(dayKey, { text: event.target.value, mood: note?.mood })}
      />
      <button
        type="button"
        onClick={() => void copyDay()}
        className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sage-soft text-base font-medium text-ink"
      >
        <Copy className="size-5" />
        {copied ? "Copied" : "Copy this day"}
      </button>
      {copyText ? (
        <textarea className="field mt-3 text-ink" readOnly value={copyText} aria-label="Day summary to copy" />
      ) : null}

      <h2 className="mt-8 font-serif text-xl font-medium">Seven days</h2>
      <p className="mt-1 text-sm text-muted">Feeds on top, wet diapers under.</p>
      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.map((stamp) => {
          const feedCount = onDay(feeds, stamp).length;
          const wet = diaperCounts(onDay(diapers, stamp)).wet;
          const selected = isSameDay(stamp, day);
          return (
            <button
              key={stamp}
              type="button"
              onClick={() => setDay(startOfDay(stamp))}
              className={`rounded-2xl py-2 text-center ${selected ? "bg-sage-soft" : ""}`}
            >
              <span className="block text-xs text-muted">{formatWeekday(stamp)}</span>
              <span className="mt-1 block text-sm font-medium tabular-nums">{feedCount}</span>
              <span className="block text-xs tabular-nums text-muted">{wet}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TABS: { id: TabId; label: string; icon: typeof House }[] = [
  { id: "today", label: "Today", icon: House },
  { id: "feeds", label: "Feeds", icon: Milk },
  { id: "diapers", label: "Diapers", icon: Droplets },
  { id: "meds", label: "Meds", icon: Pill },
  { id: "overview", label: "Overview", icon: ChartColumn },
];

export function Dock({
  tab,
  setTab,
  due,
}: {
  tab: TabId;
  setTab: (tab: TabId) => void;
  due: boolean;
}) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t border-line bg-paper pb-safe"
    >
      <div className="grid grid-cols-5 px-1 py-1">
        {TABS.map((item) => {
          const active = tab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={active ? "page" : undefined}
              aria-label={item.id === "meds" && due ? "Meds, something is due" : item.label}
              onClick={() => setTab(item.id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium ${
                active ? "bg-sage-soft text-sage" : "text-muted"
              }`}
            >
              <Icon className="size-5" strokeWidth={1.75} />
              {item.label}
              {item.id === "meds" && due ? (
                <span className="absolute top-1 right-1 size-2 rounded-full bg-alert" />
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
