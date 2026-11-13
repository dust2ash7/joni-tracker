export type Unit = "oz" | "ml";
export type ThemeChoice = "system" | "light" | "dark";

export type FeedType = "left" | "right" | "both" | "bottle" | "formula" | "pump";

export type Feed = {
  id: string;
  at: number;
  type: FeedType;
  amount?: number;
  unit?: Unit;
  durationMin?: number;
  durationSec?: number;
  notes?: string;
};

export type FeedInput = Omit<Feed, "id">;

export type DiaperKind = "wet" | "dirty" | "both";

export type DiaperTag =
  | "yellow"
  | "green"
  | "brown"
  | "black"
  | "seedy"
  | "loose"
  | "mucus"
  | "blood";

export type Diaper = {
  id: string;
  at: number;
  kind: DiaperKind;
  tags: DiaperTag[];
  notes?: string;
};

export type DiaperInput = Omit<Diaper, "id">;

export type MedFrequency =
  | { kind: "every"; hours: number }
  | { kind: "times"; times: string[] }
  | { kind: "asneeded" };

export type MedWho = "mom" | "baby";

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: MedFrequency;
  notes: string;
  active: boolean;
  who?: MedWho;
};

export type MedInput = Omit<Medication, "id">;

export type Dose = {
  id: string;
  medId: string;
  name: string;
  dose: string;
  at: number;
  who?: MedWho;
};

export function medWho(med: { who?: MedWho }): MedWho {
  return med.who === "baby" ? "baby" : "mom";
}

export type Mood = "rough" | "tender" | "steady" | "bright";

export type DayNote = {
  text: string;
  mood?: Mood;
};

export type Settings = {
  babyName: string;
  unit: Unit;
  theme: ThemeChoice;
};

export type DueStatus = "overdue" | "due" | "soon" | "later";

export type DueInfo = {
  dueAt: number;
  status: DueStatus;
  never: boolean;
  prn?: boolean;
};

export type TimelineItem = {
  id: string;
  at: number;
  kind: "feed" | "diaper" | "dose";
  title: string;
  detail: string;
  feed?: Feed;
  diaper?: Diaper;
  dose?: Dose;
};

export const FEED_TYPES: { id: FeedType; short: string; long: string }[] = [
  { id: "left", short: "Left", long: "Breast left" },
  { id: "right", short: "Right", long: "Breast right" },
  { id: "both", short: "Both", long: "Breast both" },
  { id: "bottle", short: "Bottle", long: "Bottle" },
  { id: "formula", short: "Formula", long: "Formula" },
  { id: "pump", short: "Pump", long: "Pump" },
];

export const DIAPER_KINDS: { id: DiaperKind; label: string }[] = [
  { id: "wet", label: "Wet" },
  { id: "dirty", label: "Dirty" },
  { id: "both", label: "Both" },
];

export const DIAPER_TAGS: { id: DiaperTag; label: string }[] = [
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "brown", label: "Brown" },
  { id: "black", label: "Black" },
  { id: "seedy", label: "Seedy" },
  { id: "loose", label: "Loose" },
  { id: "mucus", label: "Mucus" },
  { id: "blood", label: "Blood" },
];

export const MOODS: { id: Mood; label: string }[] = [
  { id: "rough", label: "Rough" },
  { id: "tender", label: "Tender" },
  { id: "steady", label: "Steady" },
  { id: "bright", label: "Bright" },
];

export const MED_PRESETS = [
  "Ibuprofen",
  "Acetaminophen",
  "Stool softener",
  "Prenatal",
  "Iron",
];

const OZ_IN_ML = 29.5735;

export function uid() {
  return crypto.randomUUID();
}

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function addDays(ts: number, days: number) {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function isSameDay(a: number, b: number) {
  return startOfDay(a) === startOfDay(b);
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatClockTime(hhmm: string) {
  const [hs, ms] = hhmm.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLongDay(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatWeekday(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { weekday: "short" });
}

export function formatDay(ts: number, now: number) {
  if (isSameDay(ts, now)) return "Today";
  if (isSameDay(ts, addDays(startOfDay(now), -1))) return "Yesterday";
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function greeting(now: number) {
  const h = new Date(now).getHours();
  if (h < 5) return "Still night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export function formatAgo(ts: number, now: number) {
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const days = Math.round(h / 24);
  if (days <= 1) return "Yesterday";
  return `${days}d ago`;
}

export function toDateTimeLocal(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!match) return Date.now();
  const t = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    0,
    0,
  ).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

export function clampPast(ts: number, now = Date.now()) {
  if (Number.isNaN(ts)) return now;
  return Math.min(ts, now);
}

export function feedTitle(type: FeedType) {
  return FEED_TYPES.find((item) => item.id === type)?.long ?? "Feed";
}

export type BreastSide = "left" | "right" | "both";

export function isBreast(type: FeedType): type is BreastSide {
  return type === "left" || type === "right" || type === "both";
}

export function breastLabel(side: BreastSide) {
  if (side === "left") return "Left";
  if (side === "right") return "Right";
  return "Both";
}

export function feedListTitle(type: FeedType) {
  return isBreast(type) ? breastLabel(type) : feedTitle(type);
}

export function lastBreast(feeds: Feed[]) {
  let best: Feed | undefined;
  for (const feed of feeds) {
    if (!isBreast(feed.type)) continue;
    if (!best || feed.at > best.at) best = feed;
  }
  return best;
}

export function suggestNextBreast(side?: BreastSide | null): BreastSide | null {
  if (side === "left") return "right";
  if (side === "right") return "left";
  return null;
}

export function suggestFeedType(last?: Feed): FeedType | null {
  if (!last) return null;
  if (last.type === "left") return "right";
  if (last.type === "right") return "left";
  if (last.type === "both") return null;
  return last.type;
}

export function formatAmount(amount: number, unit: Unit) {
  if (unit === "oz") {
    const n = Math.round(amount * 10) / 10;
    return `${Number.isInteger(n) ? String(n) : n.toFixed(1)} oz`;
  }
  return `${Math.round(amount)} ml`;
}

export function amountTo(amount: number, from: Unit, to: Unit) {
  if (from === to) return amount;
  if (from === "oz") return amount * OZ_IN_ML;
  return amount / OZ_IN_ML;
}

export function formatTotal(amount: number, unit: Unit) {
  if (amount <= 0) return "—";
  return formatAmount(amount, unit);
}

export function feedSeconds(feed: { durationMin?: number; durationSec?: number }) {
  if (typeof feed.durationSec === "number" && feed.durationSec > 0) return Math.round(feed.durationSec);
  if (feed.durationMin && feed.durationMin > 0) return Math.round(feed.durationMin * 60);
  return 0;
}

export function formatDuration(feed: { durationMin?: number; durationSec?: number }) {
  const sec = feedSeconds(feed);
  if (!sec) return "";
  const minutes = Math.floor(sec / 60);
  const rest = sec % 60;
  if (minutes <= 0) return `${rest}s`;
  if (!rest) return `${minutes} min`;
  return `${minutes}m ${rest}s`;
}

export function formatTimer(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function feedMeta(feed: Feed) {
  const bits: string[] = [];
  const duration = formatDuration(feed);
  if (duration) bits.push(duration);
  if (feed.amount && feed.unit) bits.push(formatAmount(feed.amount, feed.unit));
  return bits.join(" · ");
}

export type TimeWindow = { start: number; end: number };

export const DAY_MS = 24 * 60 * 60 * 1000;

export function inWindow<T extends { at: number }>(items: T[], start: number, end: number) {
  return items.filter((item) => item.at >= start && item.at <= end);
}

export function rollingWindow(now: number, ms = DAY_MS): TimeWindow {
  return { start: now - ms, end: now };
}

export function feedTotals(feeds: Feed[], unit: Unit, window?: TimeWindow) {
  const list = window ? inWindow(feeds, window.start, window.end) : feeds;
  let volume = 0;
  let seconds = 0;
  for (const feed of list) {
    if (
      feed.amount &&
      feed.unit &&
      (feed.type === "bottle" || feed.type === "formula" || feed.type === "pump")
    ) {
      volume += amountTo(feed.amount, feed.unit, unit);
    }
    seconds += feedSeconds(feed);
  }
  return { count: list.length, volume, minutes: Math.round(seconds / 60), seconds, unit };
}

export function diaperTitle(kind: DiaperKind) {
  if (kind === "wet") return "Wet";
  if (kind === "dirty") return "Dirty";
  return "Wet and dirty";
}

export function diaperMeta(diaper: Diaper) {
  return diaper.tags
    .map((tag) => DIAPER_TAGS.find((item) => item.id === tag)?.label ?? tag)
    .join(", ");
}

export function diaperCounts(diapers: Diaper[], window?: TimeWindow) {
  const list = window ? inWindow(diapers, window.start, window.end) : diapers;
  let wetOnly = 0;
  let dirtyOnly = 0;
  let both = 0;
  for (const diaper of list) {
    if (diaper.kind === "wet") wetOnly += 1;
    else if (diaper.kind === "dirty") dirtyOnly += 1;
    else both += 1;
  }
  return {
    total: list.length,
    wet: wetOnly + both,
    dirty: dirtyOnly + both,
    both,
  };
}

export function onDay<T extends { at: number }>(items: T[], day: number) {
  return inWindow(items, startOfDay(day), endOfDay(day));
}

export function latest<T extends { at: number }>(items: T[]) {
  let best: T | undefined;
  for (const item of items) {
    if (!best || item.at > best.at) best = item;
  }
  return best;
}

export function groupByDay<T extends { at: number }>(items: T[], now: number, limit = 80) {
  const sorted = [...items].sort((a, b) => b.at - a.at).slice(0, limit);
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of sorted) {
    const key = String(startOfDay(item.at));
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: formatDay(item.at, now), items: [item] });
    } else {
      last.items.push(item);
    }
  }
  return { groups, truncated: items.length > limit };
}

export function frequencyLabel(frequency: MedFrequency) {
  if (frequency.kind === "asneeded") return "As needed";
  if (frequency.kind === "every") {
    return frequency.hours === 1 ? "Every hour" : `Every ${frequency.hours} hours`;
  }
  if (!frequency.times.length) return "No times yet";
  return frequency.times.map(formatClockTime).join(" · ");
}

export function lastDose(medId: string, doses: Dose[]) {
  let best: Dose | undefined;
  for (const dose of doses) {
    if (dose.medId === medId && (!best || dose.at > best.at)) best = dose;
  }
  return best;
}

function statusFor(dueAt: number, now: number): DueStatus {
  const diff = dueAt - now;
  if (diff <= -60_000) return "overdue";
  if (diff <= 60_000) return "due";
  if (diff <= 2 * 60 * 60_000) return "soon";
  return "later";
}

function slotsAround(now: number, times: string[]) {
  const slots: number[] = [];
  for (let offset = -1; offset <= 3; offset += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    for (const time of times) {
      const [hs, ms] = time.split(":");
      const h = Number(hs);
      const m = Number(ms);
      if (Number.isNaN(h) || Number.isNaN(m)) continue;
      const slot = new Date(day);
      slot.setHours(h, m, 0, 0);
      slots.push(slot.getTime());
    }
  }
  slots.sort((a, b) => a - b);
  return slots;
}

export function nextDue(med: Medication, doses: Dose[], now: number): DueInfo {
  const last = lastDose(med.id, doses);
  if (med.frequency.kind === "asneeded") {
    return { dueAt: Number.MAX_SAFE_INTEGER, status: "later", never: !last, prn: true };
  }
  if (med.frequency.kind === "every") {
    const hours = Math.min(24, Math.max(1, Number(med.frequency.hours) || 1));
    if (!last) return { dueAt: now, status: "due", never: true };
    const dueAt = last.at + hours * 3_600_000;
    return { dueAt, status: statusFor(dueAt, now), never: false };
  }

  const times = [...med.frequency.times].filter(Boolean).sort();
  if (!times.length) return { dueAt: now, status: "due", never: !last };
  const slots = slotsAround(now, times);
  if (!last) {
    const start = startOfDay(now);
    const end = endOfDay(now);
    const missed = slots.filter((slot) => slot >= start && slot <= end && slot <= now).at(-1);
    if (missed != null) return { dueAt: missed, status: statusFor(missed, now), never: true };
    const upcoming = slots.find((slot) => slot > now) ?? now;
    return { dueAt: upcoming, status: statusFor(upcoming, now), never: true };
  }
  const next = slots.find((slot) => slot >= last.at + 45 * 60_000) ?? last.at + 24 * 3_600_000;
  return { dueAt: next, status: statusFor(next, now), never: false };
}

export function dueLabel(due: DueInfo, now: number) {
  if (due.prn) return "As needed";
  if (due.never && (due.status === "due" || due.status === "overdue")) return "Due now";
  if (due.status === "due") return "Due now";
  const mins = Math.max(1, Math.round(Math.abs(due.dueAt - now) / 60000));
  const pretty = (prefix: string) => {
    if (mins < 60) return `${prefix}${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h >= 36) return prefix === "in " ? "Tomorrow" : `${Math.round(h / 24)}d overdue`;
    return m ? `${prefix}${h}h ${m}m` : `${prefix}${h}h`;
  };
  if (due.status === "overdue") {
    const body = pretty("");
    const text = body.includes("overdue") ? body : `${body} overdue`;
    return `${text} · ${formatTime(due.dueAt)}`;
  }
  return `in ${pretty("")} · ${formatTime(due.dueAt)}`;
}

export function scheduledMeds(meds: Medication[], doses: Dose[], now: number) {
  return meds
    .filter((med) => med.active)
    .map((med) => ({ med, due: nextDue(med, doses, now) }))
    .sort((a, b) => {
      if (Boolean(a.due.prn) !== Boolean(b.due.prn)) return a.due.prn ? 1 : -1;
      return a.due.dueAt - b.due.dueAt;
    });
}

export function isHot(status: DueStatus) {
  return status === "due" || status === "overdue";
}

export type DueTone = "alert" | "warn" | "ok" | "plain";

export function dueTone(due: DueInfo): DueTone {
  if (due.prn) return "plain";
  if (due.status === "due" || due.status === "overdue") return "alert";
  if (due.status === "soon") return "warn";
  return "ok";
}

export function dueCardClass(due: DueInfo) {
  const tone = dueTone(due);
  if (tone === "alert") return "bg-alert-soft shadow-[inset_6px_0_0_var(--c-alert)] ring-1 ring-alert";
  if (tone === "warn") return "bg-warn-soft shadow-[inset_6px_0_0_var(--c-warn)] ring-1 ring-warn";
  if (tone === "ok") return "bg-paper shadow-[inset_6px_0_0_var(--c-sage)] ring-1 ring-line";
  return "bg-paper ring-1 ring-line";
}

export function dueLabelClass(due: DueInfo) {
  const tone = dueTone(due);
  if (tone === "alert") return "font-bold text-alert";
  if (tone === "warn") return "font-semibold text-warn";
  return "font-medium text-sage";
}

export function dueNameClass(due: DueInfo) {
  return dueTone(due) === "alert" ? "font-bold" : "font-medium";
}

export type ReportFilter = "all" | "feed" | "diaper" | "dose";

export type ReportRow = {
  id: string;
  at: number;
  kind: "feed" | "diaper" | "dose";
  typeLabel: string;
  details: string;
  notes: string;
  feed?: Feed;
  diaper?: Diaper;
  dose?: Dose;
};

export function rangeDays(now: number, count: number) {
  const today = startOfDay(now);
  const days: number[] = [];
  for (let i = count - 1; i >= 0; i -= 1) days.push(startOfDay(addDays(today, -i)));
  return days;
}

export function formatStamp(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dosesExpectedPerDay(med: Medication) {
  if (med.frequency.kind === "asneeded") return null;
  if (med.frequency.kind === "every") {
    const hours = Math.min(24, Math.max(1, med.frequency.hours));
    return Math.max(1, Math.round(24 / hours));
  }
  return med.frequency.times.length || null;
}

function personLabel(who: MedWho | undefined) {
  return who === "baby" ? "Joni" : "Mom";
}

export function reportRows(input: {
  feeds: Feed[];
  diapers: Diaper[];
  doses: Dose[];
  meds: Medication[];
  start: number;
  end: number;
  filter: ReportFilter;
  babyName: string;
}) {
  const rows: ReportRow[] = [];
  if (input.filter === "all" || input.filter === "feed") {
    for (const feed of input.feeds) {
      if (feed.at < input.start || feed.at > input.end) continue;
      rows.push({
        id: feed.id,
        at: feed.at,
        kind: "feed",
        typeLabel: "Feed",
        details: [feedTitle(feed.type), feedMeta(feed)].filter(Boolean).join(" · "),
        notes: feed.notes ?? "",
        feed,
      });
    }
  }
  if (input.filter === "all" || input.filter === "diaper") {
    for (const diaper of input.diapers) {
      if (diaper.at < input.start || diaper.at > input.end) continue;
      rows.push({
        id: diaper.id,
        at: diaper.at,
        kind: "diaper",
        typeLabel: "Diaper",
        details: [diaperTitle(diaper.kind), diaperMeta(diaper)].filter(Boolean).join(" · "),
        notes: diaper.notes ?? "",
        diaper,
      });
    }
  }
  if (input.filter === "all" || input.filter === "dose") {
    for (const dose of input.doses) {
      if (dose.at < input.start || dose.at > input.end) continue;
      const med = input.meds.find((item) => item.id === dose.medId);
      const who = dose.who ?? med?.who;
      rows.push({
        id: dose.id,
        at: dose.at,
        kind: "dose",
        typeLabel: "Med",
        details: [personLabel(who), dose.name, dose.dose].filter(Boolean).join(" · "),
        notes: "",
        dose,
      });
    }
  }
  rows.sort((a, b) => b.at - a.at);
  return rows;
}

export function diaperKindCounts(diapers: Diaper[], window?: TimeWindow) {
  const list = window ? inWindow(diapers, window.start, window.end) : diapers;
  let wet = 0;
  let dirty = 0;
  let both = 0;
  for (const diaper of list) {
    if (diaper.kind === "wet") wet += 1;
    else if (diaper.kind === "dirty") dirty += 1;
    else both += 1;
  }
  return { wet, dirty, both, total: list.length };
}

export type AdherenceRow = {
  id: string;
  name: string;
  who: string;
  active: boolean;
  taken: number;
  expected: number | null;
  byDay: { day: number; taken: number; expected: number | null }[];
  due: DueInfo;
};

export function adherenceRows(
  meds: Medication[],
  doses: Dose[],
  days: number[],
  now: number,
  babyName: string,
) {
  const start = days[0] ?? startOfDay(now);
  const end = endOfDay(days[days.length - 1] ?? now);
  const rows: AdherenceRow[] = [];
  for (const med of meds) {
    const inRange = doses.some((dose) => dose.medId === med.id && dose.at >= start && dose.at <= end);
    if (!med.active && !inRange) continue;
    const perDay = med.active ? dosesExpectedPerDay(med) : null;
    const byDay = days.map((day) => ({
      day,
      taken: onDay(doses.filter((dose) => dose.medId === med.id), day).length,
      expected: perDay,
    }));
    rows.push({
      id: med.id,
      name: med.name,
      who: personLabel(med.who),
      active: med.active,
      taken: byDay.reduce((sum, day) => sum + day.taken, 0),
      expected: perDay == null ? null : perDay * days.length,
      byDay,
      due: nextDue(med, doses, now),
    });
  }
  rows.sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    if (Boolean(a.due.prn) !== Boolean(b.due.prn)) return a.due.prn ? 1 : -1;
    return a.due.dueAt - b.due.dueAt;
  });
  return rows;
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
  return value;
}

export function reportCsv(rows: ReportRow[]) {
  const lines = ["Date,Time,Type,Details,Notes"];
  for (const row of rows) {
    const date = new Date(row.at).toLocaleDateString();
    lines.push(
      [date, formatTime(row.at), row.typeLabel, row.details, row.notes].map(csvCell).join(","),
    );
  }
  return lines.join("\n");
}

export function reportText(input: {
  babyName: string;
  days: number[];
  unit: Unit;
  feeds: Feed[];
  diapers: Diaper[];
  rows: ReportRow[];
  adherence: AdherenceRow[];
  window?: TimeWindow;
  windowLabel?: string;
}) {
  const lines = [`${input.babyName} — ${input.windowLabel ?? "overview"}`, ""];
  lines.push("Feeds");
  if (input.window) {
    const totals = feedTotals(input.feeds, input.unit, input.window);
    const volume = totals.volume > 0 ? ` · ${formatAmount(totals.volume, input.unit)}` : "";
    const minutes = totals.minutes > 0 ? ` · ${totals.minutes} min` : "";
    lines.push(`• ${input.windowLabel ?? "Window"}  ${totals.count} feeds${volume}${minutes}`);
  } else {
    for (const day of input.days) {
      const totals = feedTotals(onDay(input.feeds, day), input.unit);
      const volume = totals.volume > 0 ? ` · ${formatAmount(totals.volume, input.unit)}` : "";
      lines.push(`• ${formatDay(day, input.days[input.days.length - 1] ?? day)}  ${totals.count} feeds${volume}`);
    }
  }
  lines.push("", "Diapers");
  if (input.window) {
    const counts = diaperKindCounts(input.diapers, input.window);
    lines.push(
      `• ${input.windowLabel ?? "Window"}  ${counts.wet} wet · ${counts.dirty} dirty · ${counts.both} both`,
    );
  } else {
    for (const day of input.days) {
      const counts = diaperKindCounts(onDay(input.diapers, day));
      lines.push(
        `• ${formatDay(day, input.days[input.days.length - 1] ?? day)}  ${counts.wet} wet · ${counts.dirty} dirty · ${counts.both} both`,
      );
    }
  }
  lines.push("", "Meds");
  if (!input.adherence.length) lines.push("None");
  for (const row of input.adherence) {
    const expected = row.expected == null ? "as needed" : `${row.taken} of ${row.expected}`;
    lines.push(`• ${row.who} · ${row.name}  ${row.expected == null ? `${row.taken} taken, ${expected}` : expected}`);
  }
  lines.push("", "Log");
  if (!input.rows.length) lines.push("None");
  for (const row of [...input.rows].sort((a, b) => a.at - b.at)) {
    const notes = row.notes ? ` · ${row.notes}` : "";
    lines.push(`• ${formatStamp(row.at)}  ${row.typeLabel}  ${row.details}${notes}`);
  }
  lines.push("", "From Nest");
  return lines.join("\n");
}

export function buildTimeline(
  feeds: Feed[],
  diapers: Diaper[],
  doses: Dose[],
  start: number,
  end: number,
  babyName = "Joni",
) {
  const items: TimelineItem[] = [];
  for (const feed of feeds) {
    if (feed.at < start || feed.at > end) continue;
    items.push({
      id: feed.id,
      at: feed.at,
      kind: "feed",
      title: feedListTitle(feed.type),
      detail: [feedMeta(feed), feed.notes].filter(Boolean).join(" · "),
      feed,
    });
  }
  for (const diaper of diapers) {
    if (diaper.at < start || diaper.at > end) continue;
    items.push({
      id: diaper.id,
      at: diaper.at,
      kind: "diaper",
      title: diaperTitle(diaper.kind),
      detail: [diaperMeta(diaper), diaper.notes].filter(Boolean).join(" · "),
      diaper,
    });
  }
  for (const dose of doses) {
    if (dose.at < start || dose.at > end) continue;
    items.push({
      id: dose.id,
      at: dose.at,
      kind: "dose",
      title: dose.name,
      detail: [dose.who === "baby" ? "Joni" : "Mom", dose.dose].filter(Boolean).join(" · "),
      dose,
    });
  }
  items.sort((a, b) => b.at - a.at);
  return items;
}

export function daySummary(input: {
  babyName: string;
  day: number;
  feeds: Feed[];
  diapers: Diaper[];
  doses: Dose[];
  note?: DayNote;
  unit: Unit;
}) {
  const feeds = [...input.feeds].sort((a, b) => a.at - b.at);
  const diapers = [...input.diapers].sort((a, b) => a.at - b.at);
  const doses = [...input.doses].sort((a, b) => a.at - b.at);
  const totals = feedTotals(feeds, input.unit);
  const counts = diaperCounts(diapers);
  const lines = [`${input.babyName} — ${formatLongDay(input.day)}`, ""];
  lines.push(`Feeds (${feeds.length})`);
  if (totals.volume > 0) lines.push(`Volume: ${formatAmount(totals.volume, input.unit)}`);
  if (totals.minutes > 0) lines.push(`Nursing / pump: ${totals.minutes} min`);
  if (!feeds.length) lines.push("None");
  for (const feed of feeds) {
    const extra = [feedMeta(feed), feed.notes].filter(Boolean).join(" · ");
    lines.push(`• ${formatTime(feed.at)}  ${feedTitle(feed.type)}${extra ? ` · ${extra}` : ""}`);
  }
  lines.push("", `Diapers (${counts.total})`);
  if (counts.total) lines.push(`${counts.wet} wet · ${counts.dirty} dirty`);
  if (!diapers.length) lines.push("None");
  for (const diaper of diapers) {
    const extra = [diaperMeta(diaper), diaper.notes].filter(Boolean).join(" · ");
    lines.push(`• ${formatTime(diaper.at)}  ${diaperTitle(diaper.kind)}${extra ? ` · ${extra}` : ""}`);
  }
  lines.push("", `Meds (${doses.length})`);
  if (!doses.length) lines.push("None");
  for (const dose of doses) {
    const person = dose.who === "baby" ? "Joni" : "Mom";
    lines.push(`• ${formatTime(dose.at)}  ${person} · ${dose.name}${dose.dose ? ` · ${dose.dose}` : ""}`);
  }
  if (input.note?.mood || input.note?.text.trim()) {
    lines.push("", "Note");
    if (input.note.mood) lines.push(MOODS.find((mood) => mood.id === input.note?.mood)?.label ?? "");
    if (input.note.text.trim()) lines.push(input.note.text.trim());
  }
  lines.push("", "From Nest");
  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
