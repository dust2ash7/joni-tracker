import { useEffect, useRef, useState } from "react";
import {
  DIAPER_KINDS,
  DIAPER_TAGS,
  FEED_TYPES,
  MED_PRESETS,
  breastLabel,
  feedTitle,
  formatAgo,
  formatDuration,
  formatTimer,
  frequencyLabel,
  isBreast,
  lastBreast,
  latest,
  suggestNextBreast,
  type Diaper,
  type DiaperKind,
  type DiaperTag,
  type Dose,
  type Feed,
  type FeedType,
  type MedFrequency,
  type Medication,
  type MedWho,
  type Unit,
} from "@/lib/tracker/model";
import { useActiveLogs, useTracker } from "@/lib/tracker/store";
import {
  PrimaryButton,
  SecondaryButton,
  Sheet,
  Stepper,
  TimeField,
  choiceClass,
} from "@/components/joni/ui";
import type { Composer } from "@/components/joni/types";

function parseAmount(value: string) {
  const n = Number(value);
  return value.trim() === "" || Number.isNaN(n) ? undefined : n;
}

function stepAmount(value: string, direction: -1 | 1, unit: Unit) {
  const step = unit === "oz" ? 0.5 : 10;
  const current = value.trim() === "" ? 0 : Number(value);
  if (Number.isNaN(current)) return value;
  const next = Math.max(0, Math.round((current + direction * step) * 10) / 10);
  return next === 0 ? "" : String(next);
}

function stepMinutes(value: string, direction: -1 | 1) {
  const current = value.trim() === "" ? 0 : Number(value);
  if (Number.isNaN(current)) return value;
  const next = Math.min(180, Math.max(0, current + direction * 5));
  return next === 0 ? "" : String(next);
}

export function FeedForm({
  initial,
  heading,
  onDone,
}: {
  initial?: Feed;
  heading?: string;
  onDone?: () => void;
}) {
  const addFeed = useTracker((state) => state.addFeed);
  const updateFeed = useTracker((state) => state.updateFeed);
  const deleteFeed = useTracker((state) => state.deleteFeed);
  const startTimer = useTracker((state) => state.startTimer);
  const setTimerType = useTracker((state) => state.setTimerType);
  const stopTimer = useTracker((state) => state.stopTimer);
  const clearPending = useTracker((state) => state.clearPending);
  const timer = useTracker((state) => state.timer);
  const pending = useTracker((state) => state.pending);
  const defaultUnit = useTracker((state) => state.settings.unit);
  const { child, name, feeds } = useActiveLogs();
  const last = latest(feeds.filter((feed) => feed.id !== initial?.id));
  const breast = lastBreast(feeds.filter((feed) => feed.id !== initial?.id));
  const nextSide = breast && isBreast(breast.type) ? suggestNextBreast(breast.type) : null;
  const lock = useRef(0);
  const [at, setAt] = useState(initial?.at ?? Date.now());
  const [type, setType] = useState<FeedType | null>(
    initial?.type ?? (last && !isBreast(last.type) ? last.type : nextSide),
  );
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? defaultUnit);
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : "");
  const [duration, setDuration] = useState(initial?.durationMin ? String(initial.durationMin) : "");
  const [durationSec, setDurationSec] = useState(initial?.durationSec);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [more, setMore] = useState(Boolean(initial?.amount || initial?.notes));
  const [needType, setNeedType] = useState(false);
  const [armed, setArmed] = useState(false);
  const [tick, setTick] = useState(Date.now());
  const running = !initial && timer?.child === child;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (initial || !pending || pending.child !== child) return;
    setAt(pending.at);
    setDurationSec(pending.durationSec);
    setDuration(String(Math.max(1, Math.round(pending.durationSec / 60))));
    if (pending.type) setType(pending.type);
    setMore(true);
  }, [pending, child, initial]);

  function save() {
    const now = Date.now();
    if (now - lock.current < 600) return;
    if (!type) {
      setNeedType(true);
      return;
    }
    lock.current = now;
    const input = {
      at,
      type,
      unit,
      amount: parseAmount(amount),
      durationMin: parseAmount(duration),
      durationSec,
      notes,
    };
    if (initial) updateFeed(initial.id, input);
    else {
      addFeed(input);
      clearPending();
      setAt(Date.now());
      setType(isBreast(type) ? suggestNextBreast(type) : type);
      setAmount("");
      setDuration("");
      setDurationSec(undefined);
      setNotes("");
      setMore(false);
    }
    setNeedType(false);
    onDone?.();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className={heading ? "rounded-3xl bg-paper p-4 ring-1 ring-line" : "grid gap-4"}
    >
      {heading ? <h2 className="font-serif text-xl font-medium">{heading}</h2> : null}
      <div className={heading ? "mt-4 grid gap-4" : "grid gap-4"}>
        {!initial && last ? (
          <p className="text-sm text-muted">
            Last feed · {feedTitle(last.type)} · {formatAgo(last.at, Date.now())}
          </p>
        ) : null}
        <TimeField value={at} onChange={setAt} />
        <div>
          <p className="text-base font-medium">
            {breast && isBreast(breast.type) ? `Last breast: ${breastLabel(breast.type)}` : "Last breast: none yet"}
          </p>
          {nextSide ? <p className="text-sm text-muted">Suggested next: {breastLabel(nextSide)}</p> : null}
          <p className="mb-2 mt-3 text-sm text-muted">Side</p>
          <div role="radiogroup" aria-label="Breast side" className="grid grid-cols-3 gap-2">
            {FEED_TYPES.filter((item) => isBreast(item.id)).map((item) => {
              const suggested = nextSide === item.id && type !== item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={type === item.id}
                  onClick={() => {
                    setType(item.id);
                    setNeedType(false);
                    if (running) setTimerType(item.id);
                  }}
                  className={`min-h-16 rounded-2xl text-base font-medium ${
                    type === item.id
                      ? "bg-sage text-on-sage"
                      : suggested
                        ? "bg-paper text-ink ring-2 ring-sage"
                        : "bg-sage-soft text-ink"
                  }`}
                >
                  {item.short}
                  {suggested ? <span className="mt-0.5 block text-xs font-medium text-sage">Next</span> : null}
                </button>
              );
            })}
          </div>
          <p className="mb-2 mt-3 text-sm text-muted">Or</p>
          <div role="radiogroup" aria-label="Other feed type" className="grid grid-cols-3 gap-2">
            {FEED_TYPES.filter((item) => !isBreast(item.id)).map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={type === item.id}
                onClick={() => {
                  setType(item.id);
                  setNeedType(false);
                  if (running) setTimerType(item.id);
                }}
                className={`min-h-12 rounded-2xl text-sm font-medium ${type === item.id ? "bg-sage text-on-sage" : "bg-sage-soft text-ink"}`}
              >
                {item.short}
              </button>
            ))}
          </div>
          {needType ? <p className="mt-2 text-sm text-clay">Choose left, right, or both.</p> : null}
        </div>
        {!initial ? (
          <button
            type="button"
            onClick={() => {
              if (running) {
                const sec = Math.max(1, Math.round((Date.now() - (timer?.startedAt ?? Date.now())) / 1000));
                setDurationSec(sec);
                setDuration(String(Math.max(1, Math.round(sec / 60))));
                if (timer?.type) setType(timer.type);
                stopTimer();
                return;
              }
              startTimer(type);
            }}
            className={`flex min-h-20 w-full flex-col items-center justify-center rounded-3xl text-on-sage ${running ? "bg-clay text-on-clay" : "bg-sage"}`}
          >
            <span className="font-serif text-4xl tabular-nums">
              {running ? formatTimer(Math.floor((tick - (timer?.startedAt ?? tick)) / 1000)) : duration ? `${duration} min` : "0:00"}
            </span>
            <span className="text-sm font-medium">{running ? `Stop ${name}` : `Start timer · ${name}`}</span>
          </button>
        ) : null}
        <label className="grid gap-2 text-sm text-muted">
          Minutes
          <input
            className="field text-ink"
            inputMode="numeric"
            value={duration}
            placeholder="Or type minutes"
            onChange={(event) => {
              setDuration(event.target.value.replace(/[^\d]/g, ""));
              setDurationSec(undefined);
            }}
          />
        </label>
        {durationSec ? <p className="text-sm text-muted">{formatDuration({ durationSec })}</p> : null}
        {more ? (
          <>
            <Stepper
              label="Amount"
              value={amount}
              inputMode="decimal"
              onChange={setAmount}
              onStep={(direction) => setAmount((current) => stepAmount(current, direction, unit))}
              aside={
                <div className="flex rounded-full bg-sage-soft p-1">
                  {(["oz", "ml"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={unit === option}
                      onClick={() => setUnit(option)}
                      className={`min-h-11 rounded-full px-3 text-sm font-medium ${unit === option ? "bg-sage text-on-sage" : "text-ink"}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              }
            />
            <Stepper
              label="Duration (minutes)"
              value={duration}
              inputMode="numeric"
              onChange={setDuration}
              onStep={(direction) => setDuration((current) => stepMinutes(current, direction))}
            />
            <label className="grid gap-2 text-sm text-muted">
              Note
              <textarea
                className="field text-ink"
                value={notes}
                maxLength={400}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="min-h-11 text-left text-sm font-medium text-sage">
            Add amount, minutes, or a note
          </button>
        )}
        <PrimaryButton type="submit">{initial ? "Save changes" : "Save feed"}</PrimaryButton>
        {initial ? (
          <button
            type="button"
            className="min-h-12 text-sm font-medium text-clay"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              deleteFeed(initial.id);
              onDone?.();
            }}
          >
            {armed ? "Tap again to delete" : "Delete feed"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function DiaperForm({
  initial,
  heading,
  onDone,
}: {
  initial?: Diaper;
  heading?: string;
  onDone?: () => void;
}) {
  const addDiaper = useTracker((state) => state.addDiaper);
  const updateDiaper = useTracker((state) => state.updateDiaper);
  const deleteDiaper = useTracker((state) => state.deleteDiaper);
  const { diapers } = useActiveLogs();
  const last = latest(diapers.filter((diaper) => diaper.id !== initial?.id));
  const lock = useRef(0);
  const [at, setAt] = useState(initial?.at ?? Date.now());
  const [kind, setKind] = useState<DiaperKind | null>(initial?.kind ?? last?.kind ?? null);
  const [tags, setTags] = useState<DiaperTag[]>(initial?.tags ?? []);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [more, setMore] = useState(Boolean(initial?.tags.length || initial?.notes));
  const [needKind, setNeedKind] = useState(false);
  const [armed, setArmed] = useState(false);

  function toggle(tag: DiaperTag) {
    setTags((current) => (current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]));
  }

  function save() {
    const now = Date.now();
    if (now - lock.current < 600) return;
    if (!kind) {
      setNeedKind(true);
      return;
    }
    lock.current = now;
    const input = { at, kind, tags, notes };
    if (initial) updateDiaper(initial.id, input);
    else {
      addDiaper(input);
      setAt(Date.now());
      setKind(kind);
      setTags([]);
      setNotes("");
      setMore(false);
    }
    onDone?.();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className={heading ? "rounded-3xl bg-paper p-4 ring-1 ring-line" : undefined}
    >
      {heading ? <h2 className="mb-4 font-serif text-xl font-medium">{heading}</h2> : null}
      <div className="grid gap-4">
        <TimeField value={at} onChange={setAt} />
        <div>
          <p className="mb-2 text-sm text-muted">Type</p>
          <div role="radiogroup" aria-label="Diaper type" className="grid grid-cols-3 gap-2">
            {DIAPER_KINDS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={kind === item.id}
                onClick={() => {
                  setKind(item.id);
                  setNeedKind(false);
                }}
                className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(kind === item.id, item.id === "wet" ? "sage" : "clay")}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {needKind ? <p className="mt-2 text-sm text-clay">Choose wet, dirty, or both.</p> : null}
        </div>
        {more ? (
          <>
            <div>
              <p className="mb-2 text-sm text-muted">Color and texture</p>
              <div className="flex flex-wrap gap-2">
                {DIAPER_TAGS.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={tags.includes(tag.id)}
                    onClick={() => toggle(tag.id)}
                    className={`min-h-11 rounded-full px-3 text-sm font-medium ${choiceClass(tags.includes(tag.id), tag.id === "blood" ? "clay" : "sage")}`}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
              {tags.includes("blood") ? (
                <p className="mt-2 text-sm text-clay">Blood in a diaper is worth a call to your baby’s clinician.</p>
              ) : null}
            </div>
            <label className="grid gap-2 text-sm text-muted">
              Note
              <textarea
                className="field text-ink"
                value={notes}
                maxLength={400}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </>
        ) : (
          <button type="button" onClick={() => setMore(true)} className="min-h-11 text-left text-sm font-medium text-sage">
            Add color, texture, or a note
          </button>
        )}
        <PrimaryButton type="submit">{initial ? "Save changes" : "Save diaper"}</PrimaryButton>
        {initial ? (
          <button
            type="button"
            className="min-h-12 text-sm font-medium text-clay"
            onClick={() => {
              if (!armed) {
                setArmed(true);
                return;
              }
              deleteDiaper(initial.id);
              onDone?.();
            }}
          >
            {armed ? "Tap again to delete" : "Delete diaper"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function MedForm({ initial, onDone }: { initial?: Medication; onDone: () => void }) {
  const addMed = useTracker((state) => state.addMed);
  const updateMed = useTracker((state) => state.updateMed);
  const deleteMed = useTracker((state) => state.deleteMed);
  const [name, setName] = useState(initial?.name ?? "");
  const [dose, setDose] = useState(initial?.dose ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [active, setActive] = useState(initial?.active ?? true);
  const who: MedWho = initial?.who === "baby" ? "baby" : "mom";
  const [mode, setMode] = useState<MedFrequency["kind"]>(initial?.frequency.kind ?? "every");
  const [hours, setHours] = useState(initial?.frequency.kind === "every" ? initial.frequency.hours : 6);
  const [times, setTimes] = useState<string[]>(
    initial?.frequency.kind === "times" ? initial.frequency.times : ["08:00", "20:00"],
  );
  const [draft, setDraft] = useState("08:00");
  const [error, setError] = useState("");
  const [armed, setArmed] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  function save() {
    if (!name.trim()) {
      setError("Add a name.");
      nameRef.current?.focus();
      return;
    }
    if (mode === "times" && times.length === 0) {
      setError("Add at least one time.");
      return;
    }
    const input = {
      name,
      dose,
      notes,
      active,
      who,
      frequency:
        mode === "every"
          ? ({ kind: "every", hours } as const)
          : mode === "times"
            ? ({ kind: "times", times } as const)
            : ({ kind: "asneeded" } as const),
    };
    if (initial) updateMed(initial.id, input);
    else addMed(input);
    onDone();
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {!initial ? (
        <div className="flex flex-wrap gap-2">
          {MED_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setName(preset);
                setError("");
              }}
              className="min-h-11 rounded-full bg-sage-soft px-3 text-sm font-medium text-ink"
            >
              {preset}
            </button>
          ))}
        </div>
      ) : null}
      <label className="grid gap-2 text-sm text-muted">
        Name
        <input
          ref={nameRef}
          className="field text-ink"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Medication name"
          autoComplete="off"
        />
      </label>
      <label className="grid gap-2 text-sm text-muted">
        Dose
        <input
          className="field text-ink"
          value={dose}
          onChange={(event) => setDose(event.target.value)}
          placeholder="600 mg"
          autoComplete="off"
        />
      </label>
      <div>
        <p className="mb-2 text-sm text-muted">Schedule</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={mode === "every"}
            onClick={() => setMode("every")}
            className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(mode === "every")}`}
          >
            Every few hours
          </button>
          <button
            type="button"
            aria-pressed={mode === "times"}
            onClick={() => setMode("times")}
            className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(mode === "times")}`}
          >
            Set times
          </button>
          <button
            type="button"
            aria-pressed={mode === "asneeded"}
            onClick={() => setMode("asneeded")}
            className={`col-span-2 min-h-12 rounded-2xl text-sm font-medium ${choiceClass(mode === "asneeded")}`}
          >
            As needed
          </button>
        </div>
      </div>
      {mode === "every" ? (
        <div>
          <p className="mb-2 text-sm text-muted">Every {hours === 1 ? "hour" : `${hours} hours`}</p>
          <div className="grid grid-cols-4 gap-2">
            {[4, 6, 8, 12].map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={hours === option}
                onClick={() => setHours(option)}
                className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(hours === option)}`}
              >
                {option}h
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              aria-label="Fewer hours"
              onClick={() => setHours((current) => Math.max(1, current - 1))}
              className="flex size-12 items-center justify-center rounded-2xl bg-sage-soft text-xl"
            >
              −
            </button>
            <button
              type="button"
              aria-label="More hours"
              onClick={() => setHours((current) => Math.min(24, current + 1))}
              className="flex size-12 items-center justify-center rounded-2xl bg-sage-soft text-xl"
            >
              +
            </button>
          </div>
        </div>
      ) : mode === "times" ? (
        <div>
          <div className="flex flex-wrap gap-2">
            {times.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => setTimes((current) => current.filter((item) => item !== time))}
                className="min-h-11 rounded-full bg-sage px-3 text-sm font-medium text-on-sage"
              >
                {formatTimeLabel(time)} ×
              </button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="time"
              className="field"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Time to add"
            />
            <button
              type="button"
              onClick={() => {
                if (!draft) return;
                setTimes((current) => [...new Set([...current, draft])].sort());
              }}
              className="min-h-12 shrink-0 rounded-2xl bg-sage-soft px-4 text-sm font-medium"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTimes(["08:00", "20:00"])}
              className="min-h-11 rounded-full bg-sage-soft px-3 text-sm"
            >
              Morning and night
            </button>
            <button
              type="button"
              onClick={() => setTimes(["08:00", "14:00", "20:00"])}
              className="min-h-11 rounded-full bg-sage-soft px-3 text-sm"
            >
              Three times
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">No countdown. Mark it when you take one.</p>
      )}
      <label className="grid gap-2 text-sm text-muted">
        Note
        <textarea
          className="field text-ink"
          value={notes}
          maxLength={400}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="With food, after pumping…"
        />
      </label>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => setActive((current) => !current)}
        className="flex min-h-14 items-center justify-between rounded-2xl bg-sage-soft px-4 text-left"
      >
        <span>
          <span className="block font-medium">Active reminder</span>
          <span className="text-sm text-muted">{active ? "Shows on Today" : "Paused, still saved"}</span>
        </span>
        <span className={`h-8 w-14 rounded-full p-1 ${active ? "bg-sage" : "bg-line"}`}>
          <span className={`block size-6 rounded-full bg-paper ${active ? "ml-auto" : ""}`} />
        </span>
      </button>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <PrimaryButton type="submit">{initial ? "Save medication" : "Add medication"}</PrimaryButton>
      {initial ? (
        <button
          type="button"
          className="min-h-12 text-sm font-medium text-clay"
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            deleteMed(initial.id);
            onDone();
          }}
        >
          {armed ? "Tap again to remove" : "Remove medication"}
        </button>
      ) : null}
      {initial && armed ? <p className="text-center text-sm text-muted">Past doses stay in the log.</p> : null}
    </form>
  );
}

function formatTimeLabel(hhmm: string) {
  const [hs, ms] = hhmm.split(":");
  const h = Number(hs);
  const m = Number(ms);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useTracker((state) => state.settings);
  const setSettings = useTracker((state) => state.setSettings);
  const eraseAll = useTracker((state) => state.eraseAll);
  const [armed, setArmed] = useState(false);

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm text-muted">Alex and Joni each keep their own feeds and diapers. Mom meds stay shared.</p>
        <div>
          <p className="mb-2 text-sm text-muted">Volume unit</p>
          <div className="grid grid-cols-2 gap-2">
            {(["oz", "ml"] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                aria-pressed={settings.unit === unit}
                onClick={() => setSettings({ unit })}
                className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(settings.unit === unit)}`}
              >
                {unit === "oz" ? "Ounces" : "Milliliters"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted">Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["system", "System"],
                ["light", "Light"],
                ["dark", "Dark"],
              ] as const
            ).map(([theme, label]) => (
              <button
                key={theme}
                type="button"
                aria-pressed={settings.theme === theme}
                onClick={() => setSettings({ theme })}
                className={`min-h-12 rounded-2xl text-sm font-medium ${choiceClass(settings.theme === theme)}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-3">
          <img
            src={`${import.meta.env.BASE_URL}icon-180.png`}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-[14px]"
          />
          <p className="text-sm text-pretty text-muted">
            On iPhone, open{" "}
            <a
              className="font-medium text-ink underline"
              href="https://dust2ash7.github.io/joni-tracker/"
            >
              the live link
            </a>{" "}
            in Safari, tap Share, then Add to Home Screen. The icon is this leaf.
          </p>
        </div>
        <p className="text-sm text-pretty text-muted">
          Everything stays on this phone. Nothing is uploaded, and there is no account.
        </p>
        <button
          type="button"
          className="min-h-12 text-sm font-medium text-clay"
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            eraseAll();
            setArmed(false);
            onClose();
          }}
        >
          {armed ? "Tap again to erase everything" : "Erase all logs"}
        </button>
        {armed ? (
          <SecondaryButton
            onClick={() => {
              setArmed(false);
            }}
          >
            Keep logs
          </SecondaryButton>
        ) : null}
      </div>
    </Sheet>
  );
}

export function DoseSheet({ dose, onClose }: { dose: Dose; onClose: () => void }) {
  const updateDose = useTracker((state) => state.updateDose);
  const deleteDose = useTracker((state) => state.deleteDose);
  const [at, setAt] = useState(dose.at);
  const [armed, setArmed] = useState(false);

  return (
    <Sheet title={dose.name} onClose={onClose}>
      <div className="grid gap-4">
        {dose.dose ? <p className="text-sm text-muted">{dose.dose}</p> : null}
        <TimeField value={at} onChange={setAt} />
        <PrimaryButton
          onClick={() => {
            updateDose(dose.id, at);
            onClose();
          }}
        >
          Save time
        </PrimaryButton>
        <button
          type="button"
          className="min-h-12 text-sm font-medium text-clay"
          onClick={() => {
            if (!armed) {
              setArmed(true);
              return;
            }
            deleteDose(dose.id);
            onClose();
          }}
        >
          {armed ? "Tap again to remove" : "Remove this dose"}
        </button>
      </div>
    </Sheet>
  );
}

export function DoseTimeSheet({ medId, onClose }: { medId: string; onClose: () => void }) {
  const med = useTracker((state) => state.meds.find((item) => item.id === medId));
  const setLastTaken = useTracker((state) => state.setLastTaken);
  const [at, setAt] = useState(Date.now());
  if (!med) return null;
  return (
    <Sheet title={`Taken · ${med.name}`} onClose={onClose}>
      <div className="grid gap-4">
        <p className="text-sm text-muted">{[med.dose, frequencyLabel(med.frequency)].filter(Boolean).join(" · ")}</p>
        <TimeField value={at} onChange={setAt} />
        <PrimaryButton
          onClick={() => {
            setLastTaken(med.id, at);
            onClose();
          }}
        >
          Save dose
        </PrimaryButton>
      </div>
    </Sheet>
  );
}

export function PickMedSheet({ onClose }: { onClose: () => void }) {
  const allMeds = useTracker((state) => state.meds);
  const meds = allMeds.filter((med) => med.active);
  const markDose = useTracker((state) => state.markDose);
  return (
    <Sheet title="Which med?" onClose={onClose}>
      <div className="grid gap-2">
        {meds.map((med) => (
          <button
            key={med.id}
            type="button"
            onClick={() => {
              markDose(med.id, Date.now());
              onClose();
            }}
            className="min-h-14 rounded-2xl bg-sage-soft px-4 text-left"
          >
            <span className="block font-medium">{med.name}</span>
            <span className="text-sm text-muted">
              {[med.who === "baby" ? "Joni" : "Mom", med.dose, frequencyLabel(med.frequency)].filter(Boolean).join(" · ")}
            </span>
          </button>
        ))}
        {!meds.length ? <p className="text-sm text-muted">No active medications.</p> : null}
      </div>
    </Sheet>
  );
}

export function ComposerHost({ composer, close }: { composer: Composer | null; close: () => void }) {
  if (!composer) return null;
  if (composer.kind === "settings") return <SettingsSheet onClose={close} />;
  if (composer.kind === "pick-med") return <PickMedSheet onClose={close} />;
  if (composer.kind === "dose") return <DoseSheet dose={composer.dose} onClose={close} />;
  if (composer.kind === "dose-time") return <DoseTimeSheet medId={composer.medId} onClose={close} />;
  if (composer.kind === "feed") {
    return (
      <Sheet title={composer.feed ? "Edit feed" : "Log a feed"} onClose={close}>
        <FeedForm key={composer.feed?.id ?? "new-feed"} initial={composer.feed} onDone={close} />
      </Sheet>
    );
  }
  if (composer.kind === "diaper") {
    return (
      <Sheet title={composer.diaper ? "Edit diaper" : "Log a diaper"} onClose={close}>
        <DiaperForm key={composer.diaper?.id ?? "new-diaper"} initial={composer.diaper} onDone={close} />
      </Sheet>
    );
  }
  return (
    <Sheet title={composer.med ? "Edit medication" : "Add medication"} onClose={close}>
      <MedForm key={composer.med?.id ?? "new-med"} initial={composer.med} onDone={close} />
    </Sheet>
  );
}
