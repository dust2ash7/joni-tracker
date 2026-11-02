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
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? Date.now() : t;
}

export function clampPast(ts: number, now = Date.now()) {
  if (Number.isNaN(ts)) return now;
  return Math.min(ts, now);
}

export function feedTitle(type: FeedType) {
  return FEED_TYPES.find((item) => item.id === type)?.long ?? "Feed";
}

export function suggestFeedType(last?: Feed): FeedType | null {
  if (!last) return null;
  if (last.type === "left") return "right";
  if (last.type === "right") return "left";
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

export function feedMeta(feed: Feed) {
  const bits: string[] = [];
  if (feed.durationMin) bits.push(`${feed.durationMin} min`);
  if (feed.amount && feed.unit) bits.push(formatAmount(feed.amount, feed.unit));
  return bits.join(" · ");
}

export function feedTotals(feeds: Feed[], unit: Unit) {
  let volume = 0;
  let minutes = 0;
  for (const feed of feeds) {
    if (
      feed.amount &&
      feed.unit &&
      (feed.type === "bottle" || feed.type === "formula" || feed.type === "pump")
    ) {
      volume += amountTo(feed.amount, feed.unit, unit);
    }
    if (
      feed.durationMin &&
      (feed.type === "left" ||
        feed.type === "right" ||
        feed.type === "both" ||
        feed.type === "pump")
    ) {
      minutes += feed.durationMin;
    }
  }
  return { count: feeds.length, volume, minutes, unit };
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

export function diaperCounts(diapers: Diaper[]) {
  let wetOnly = 0;
  let dirtyOnly = 0;
  let both = 0;
  for (const diaper of diapers) {
    if (diaper.kind === "wet") wetOnly += 1;
    else if (diaper.kind === "dirty") dirtyOnly += 1;
    else both += 1;
  }
  return {
    total: diapers.length,
    wet: wetOnly + both,
    dirty: dirtyOnly + both,
    both,
  };
}

export function onDay<T extends { at: number }>(items: T[], day: number) {
  const start = startOfDay(day);
  const end = endOfDay(day);
  return items.filter((item) => item.at >= start && item.at <= end);
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
  if (diff <= 30 * 60_000) return "soon";
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
    const hours = Math.min(24, Math.max(1, med.frequency.hours));
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
    return body.includes("overdue") ? body : `${body} overdue`;
  }
  return `in ${pretty("")}`;
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
      title: feedTitle(feed.type),
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
      detail: [dose.who === "baby" ? babyName : "Alex", dose.dose].filter(Boolean).join(" · "),
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
    const person = dose.who === "baby" ? input.babyName : "Alex";
    lines.push(`• ${formatTime(dose.at)}  ${person} · ${dose.name}${dose.dose ? ` · ${dose.dose}` : ""}`);
  }
  if (input.note?.mood || input.note?.text.trim()) {
    lines.push("", "Note");
    if (input.note.mood) lines.push(MOODS.find((mood) => mood.id === input.note?.mood)?.label ?? "");
    if (input.note.text.trim()) lines.push(input.note.text.trim());
  }
  lines.push("", "From Joni Tracker");
  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}
