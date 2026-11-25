import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  clampPast,
  type DayNote,
  type DiaperInput,
  type Dose,
  type FeedInput,
  type FeedType,
  type MedInput,
  type Settings,
  uid,
  type Diaper,
  type Feed,
  type Medication,
} from "@/lib/tracker/model";
import { medsFromStored, reconcileMeds } from "@/lib/tracker/med-persist";

export type ChildId = "alex" | "joni";

export type FeedTimer = {
  child: ChildId;
  startedAt: number;
  type: FeedType | null;
};

export type PendingFeed = {
  child: ChildId;
  at: number;
  durationSec: number;
  type: FeedType | null;
};

export type ChildLog = {
  feeds: Feed[];
  diapers: Diaper[];
};

export function childName(child: ChildId) {
  return child === "alex" ? "Alex" : "Joni";
}

export type Toast = {
  id: string;
  message: string;
  undoable: boolean;
};

type Data = {
  child: ChildId;
  logs: Record<ChildId, ChildLog>;
  meds: Medication[];
  doses: Dose[];
  notes: Record<string, DayNote>;
  settings: Settings;
  seeds: string[];
  /** Ids the user removed. Starter meds and old snapshots must not bring these back. */
  deletedMedIds: string[];
  timer: FeedTimer | null;
  pending: PendingFeed | null;
  migrated: boolean;
};

type Store = Data & {
  toast: Toast | null;
  setChild: (child: ChildId) => void;
  startTimer: (type: FeedType | null) => void;
  setTimerType: (type: FeedType | null) => void;
  stopTimer: () => void;
  clearPending: () => void;
  addFeed: (input: FeedInput) => void;
  updateFeed: (id: string, input: FeedInput) => void;
  deleteFeed: (id: string) => void;
  addDiaper: (input: DiaperInput) => void;
  updateDiaper: (id: string, input: DiaperInput) => void;
  deleteDiaper: (id: string) => void;
  addMed: (input: MedInput) => void;
  updateMed: (id: string, input: MedInput) => void;
  deleteMed: (id: string) => void;
  markDose: (medId: string, at?: number) => void;
  setLastTaken: (medId: string, at: number) => void;
  updateDose: (id: string, at: number) => void;
  deleteDose: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  setDayNote: (dayKey: string, note: DayNote) => void;
  eraseAll: () => void;
  dismissToast: () => void;
  undoToast: () => void;
};

const defaultSettings: Settings = {
  babyName: "Joni",
  unit: "oz",
  theme: "system",
};

const DELETED_MEDS_KEY = "nest_deleted_meds";

function withDischargeSeed(data: Partial<Data>) {
  return reconcileMeds({
    meds: data.meds ?? [],
    doses: data.doses ?? [],
    seeds: data.seeds ?? [],
    deletedMedIds: data.deletedMedIds ?? [],
  });
}

function emptyLogs(): Record<ChildId, ChildLog> {
  return {
    alex: { feeds: [], diapers: [] },
    joni: { feeds: [], diapers: [] },
  };
}

function withLog(
  state: { logs: Record<ChildId, ChildLog> },
  child: ChildId,
  log: ChildLog,
) {
  return { logs: { ...state.logs, [child]: log } };
}

function readJson(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function readDeletedMedIds() {
  const raw = readJson(DELETED_MEDS_KEY);
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
}

function writeDeletedMedIds(ids: string[]) {
  localStorage.setItem(DELETED_MEDS_KEY, JSON.stringify([...new Set(ids)]));
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mergeById<T extends { id: string }>(kept: T[], incoming: T[]) {
  const seen = new Set(kept.map((item) => item.id));
  return [...kept, ...incoming.filter((item) => item.id && !seen.has(item.id))];
}

function isChild(value: unknown): value is ChildId {
  return value === "alex" || value === "joni";
}

type LegacyState = Partial<Data> & { feeds?: Feed[]; diapers?: Diaper[] };

function assembleState(): Data {
  const meta = (readJson("nest_meta") ?? {}) as {
    child?: ChildId;
    notes?: Record<string, DayNote>;
    settings?: Partial<Settings>;
    seeds?: string[];
    deletedMedIds?: string[];
    timer?: FeedTimer | null;
    pending?: PendingFeed | null;
    migrated?: boolean;
  };
  const sharedRaw = localStorage.getItem("shared_meds");
  let shared: { meds?: Medication[]; doses?: Dose[] } | null = null;
  if (sharedRaw) {
    const parsed = readJson("shared_meds");
    shared =
      parsed && typeof parsed === "object"
        ? (parsed as { meds?: Medication[]; doses?: Dose[] })
        : { meds: [], doses: [] };
  }
  const legacyWrap = readJson("joni-tracker-v1") as { state?: LegacyState } | null;
  const legacy = (legacyWrap?.state ?? {}) as LegacyState;
  const logs = emptyLogs();
  logs.alex = {
    feeds: asList<Feed>(readJson("alex_feedings")),
    diapers: asList<Diaper>(readJson("alex_diapers")),
  };
  logs.joni = {
    feeds: mergeById(asList<Feed>(readJson("joni_feedings")), asList<Feed>(legacy.feeds)),
    diapers: mergeById(asList<Diaper>(readJson("joni_diapers")), asList<Diaper>(legacy.diapers)),
  };
  const deletedMedIds = [
    ...new Set([...(meta.deletedMedIds ?? []), ...(legacy.deletedMedIds ?? []), ...readDeletedMedIds()]),
  ];
  const seededMeds = medsFromStored({
    shared,
    legacyMeds: asList<Medication>(legacy.meds),
    legacyDoses: asList<Dose>(legacy.doses),
    seeds: [...new Set([...(meta.seeds ?? []), ...(legacy.seeds ?? [])])],
    deletedMedIds,
  });
  return {
    child: isChild(meta.child) ? meta.child : "joni",
    logs,
    meds: seededMeds.meds,
    doses: seededMeds.doses,
    notes: { ...(legacy.notes ?? {}), ...(meta.notes ?? {}) },
    settings: { ...defaultSettings, ...(legacy.settings ?? {}), ...(meta.settings ?? {}) },
    seeds: seededMeds.seeds,
    deletedMedIds: seededMeds.deletedMedIds,
    timer: meta.timer?.startedAt ? meta.timer : null,
    pending: meta.pending?.durationSec ? meta.pending : null,
    migrated: true,
  };
}

function writeState(state: Data) {
  const logs = state.logs ?? emptyLogs();
  localStorage.setItem("alex_feedings", JSON.stringify(logs.alex?.feeds ?? []));
  localStorage.setItem("joni_feedings", JSON.stringify(logs.joni?.feeds ?? []));
  localStorage.setItem("alex_diapers", JSON.stringify(logs.alex?.diapers ?? []));
  localStorage.setItem("joni_diapers", JSON.stringify(logs.joni?.diapers ?? []));
  localStorage.setItem("shared_meds", JSON.stringify({ meds: state.meds ?? [], doses: state.doses ?? [] }));
  const deletedMedIds = state.deletedMedIds ?? readDeletedMedIds();
  writeDeletedMedIds(deletedMedIds);
  localStorage.setItem(
    "nest_meta",
    JSON.stringify({
      child: state.child,
      notes: state.notes ?? {},
      settings: state.settings,
      seeds: state.seeds ?? [],
      deletedMedIds,
      timer: state.timer ?? null,
      pending: state.pending ?? null,
      migrated: true,
    }),
  );
}

const nestStorage = {
  getItem: () => {
    const hadLegacy = localStorage.getItem("joni-tracker-v1") != null;
    const state = assembleState();
    const meta = readJson("nest_meta") as { migrated?: boolean } | null;
    if (hadLegacy || !meta?.migrated) {
      writeState(state);
      localStorage.removeItem("joni-tracker-v1");
    }
    return JSON.stringify({ state, version: 1 });
  },
  setItem: (_name: string, value: string) => {
    const parsed = JSON.parse(value) as { state?: Data };
    writeState(parsed.state ?? (parsed as unknown as Data));
  },
  removeItem: () => {
    for (const key of [
      "alex_feedings",
      "joni_feedings",
      "alex_diapers",
      "joni_diapers",
      "shared_meds",
      "nest_meta",
      DELETED_MEDS_KEY,
    ]) {
      localStorage.removeItem(key);
    }
  },
};

const seeded = withDischargeSeed({});

let pendingUndo: (() => void) | null = null;

export const useTracker = create<Store>()(
  persist(
    (set, get) => ({
      child: "joni",
      logs: emptyLogs(),
      meds: seeded.meds,
      doses: seeded.doses,
      notes: {},
      seeds: seeded.seeds,
      deletedMedIds: seeded.deletedMedIds,
      settings: defaultSettings,
      timer: null,
      pending: null,
      migrated: true,
      toast: null,
      setChild: (child) => set({ child }),
      startTimer: (type) => {
        const current = get().timer;
        const child = get().child;
        if (current && current.child !== child) return;
        if (current) {
          set({ timer: { ...current, type } });
          return;
        }
        set({ timer: { child, startedAt: Date.now(), type }, pending: null });
      },
      setTimerType: (type) => {
        const timer = get().timer;
        if (!timer || timer.child !== get().child) return;
        set({ timer: { ...timer, type } });
      },
      stopTimer: () => {
        const timer = get().timer;
        if (!timer) return;
        const durationSec = Math.max(1, Math.round((Date.now() - timer.startedAt) / 1000));
        set({
          timer: null,
          pending: { child: timer.child, at: timer.startedAt, durationSec, type: timer.type },
          child: timer.child,
        });
      },
      clearPending: () => set({ pending: null }),
      addFeed: (input) => {
        const child = get().child;
        const feed: Feed = { id: uid(), ...cleanFeed(input) };
        pendingUndo = () =>
          set((state) => withLog(state, child, { ...state.logs[child], feeds: state.logs[child].feeds.filter((item) => item.id !== feed.id) }));
        set((state) => ({
          ...withLog(state, child, { ...state.logs[child], feeds: [feed, ...state.logs[child].feeds] }),
          pending: state.pending?.child === child ? null : state.pending,
          toast: toastOf("Feed logged", true),
        }));
      },
      updateFeed: (id, input) => {
        const child = get().child;
        const prev = get().logs[child].feeds.find((item) => item.id === id);
        if (!prev) return;
        const next = { ...prev, ...cleanFeed(input), id };
        pendingUndo = () =>
          set((state) =>
            withLog(state, child, {
              ...state.logs[child],
              feeds: state.logs[child].feeds.map((item) => (item.id === id ? prev : item)),
            }),
          );
        set((state) => ({
          ...withLog(state, child, {
            ...state.logs[child],
            feeds: state.logs[child].feeds.map((item) => (item.id === id ? next : item)),
          }),
          toast: toastOf("Feed updated", true),
        }));
      },
      deleteFeed: (id) => {
        const child = get().child;
        const prev = get().logs[child].feeds.find((item) => item.id === id);
        if (!prev) return;
        pendingUndo = () =>
          set((state) => withLog(state, child, { ...state.logs[child], feeds: [prev, ...state.logs[child].feeds] }));
        set((state) => ({
          ...withLog(state, child, { ...state.logs[child], feeds: state.logs[child].feeds.filter((item) => item.id !== id) }),
          toast: toastOf("Feed deleted", true),
        }));
      },
      addDiaper: (input) => {
        const child = get().child;
        const diaper: Diaper = { id: uid(), ...cleanDiaper(input) };
        pendingUndo = () =>
          set((state) =>
            withLog(state, child, {
              ...state.logs[child],
              diapers: state.logs[child].diapers.filter((item) => item.id !== diaper.id),
            }),
          );
        set((state) => ({
          ...withLog(state, child, { ...state.logs[child], diapers: [diaper, ...state.logs[child].diapers] }),
          toast: toastOf("Diaper logged", true),
        }));
      },
      updateDiaper: (id, input) => {
        const child = get().child;
        const prev = get().logs[child].diapers.find((item) => item.id === id);
        if (!prev) return;
        const next = { ...prev, ...cleanDiaper(input), id };
        pendingUndo = () =>
          set((state) =>
            withLog(state, child, {
              ...state.logs[child],
              diapers: state.logs[child].diapers.map((item) => (item.id === id ? prev : item)),
            }),
          );
        set((state) => ({
          ...withLog(state, child, {
            ...state.logs[child],
            diapers: state.logs[child].diapers.map((item) => (item.id === id ? next : item)),
          }),
          toast: toastOf("Diaper updated", true),
        }));
      },
      deleteDiaper: (id) => {
        const child = get().child;
        const prev = get().logs[child].diapers.find((item) => item.id === id);
        if (!prev) return;
        pendingUndo = () =>
          set((state) => withLog(state, child, { ...state.logs[child], diapers: [prev, ...state.logs[child].diapers] }));
        set((state) => ({
          ...withLog(state, child, {
            ...state.logs[child],
            diapers: state.logs[child].diapers.filter((item) => item.id !== id),
          }),
          toast: toastOf("Diaper deleted", true),
        }));
      },
      addMed: (input) => {
        const cleaned = cleanMed(input);
        if (!cleaned) return;
        const med: Medication = { id: uid(), ...cleaned, who: "mom" };
        pendingUndo = () => set((state) => ({ meds: state.meds.filter((item) => item.id !== med.id) }));
        set((state) => ({ meds: [med, ...state.meds], toast: toastOf("Medication saved", true) }));
      },
      updateMed: (id, input) => {
        const prev = get().meds.find((item) => item.id === id);
        const cleaned = cleanMed(input);
        if (!prev || !cleaned) return;
        const next = { ...prev, ...cleaned, id, who: prev.who === "baby" ? ("baby" as const) : ("mom" as const) };
        pendingUndo = () =>
          set((state) => ({ meds: state.meds.map((item) => (item.id === id ? prev : item)) }));
        set((state) => ({
          meds: state.meds.map((item) => (item.id === id ? next : item)),
          toast: toastOf("Medication updated", true),
        }));
      },
      deleteMed: (id) => {
        const prev = get().meds.find((item) => item.id === id);
        if (!prev) return;
        const deletedMedIds = get().deletedMedIds.includes(id) ? get().deletedMedIds : [...get().deletedMedIds, id];
        writeDeletedMedIds(deletedMedIds);
        pendingUndo = () => {
          const nextDeleted = get().deletedMedIds.filter((item) => item !== id);
          writeDeletedMedIds(nextDeleted);
          set((state) => ({
            meds: state.meds.some((item) => item.id === id) ? state.meds : [prev, ...state.meds],
            deletedMedIds: state.deletedMedIds.filter((item) => item !== id),
          }));
        };
        set((state) => ({
          meds: state.meds.filter((item) => item.id !== id),
          deletedMedIds,
          toast: toastOf("Medication removed", true),
        }));
      },
      markDose: (medId, at = Date.now()) => {
        const med = get().meds.find((item) => item.id === medId);
        if (!med) return;
        const when = clampPast(at);
        const recent = get()
          .doses.filter((dose) => dose.medId === medId)
          .sort((a, b) => b.at - a.at)[0];
        if (recent && Math.abs(recent.at - when) < 45_000) {
          pendingUndo = null;
          set({ toast: toastOf("Already marked just now", false) });
          return;
        }
        const dose: Dose = {
          id: uid(),
          medId: med.id,
          name: med.name,
          dose: med.dose,
          at: when,
          who: med.who === "baby" ? "baby" : "mom",
        };
        pendingUndo = () => set((state) => ({ doses: state.doses.filter((item) => item.id !== dose.id) }));
        set((state) => ({ doses: [dose, ...state.doses], toast: toastOf(`${med.name} marked taken`, true) }));
      },
      setLastTaken: (medId, at) => {
        const med = get().meds.find((item) => item.id === medId);
        if (!med || !Number.isFinite(at)) return;
        const latest = get()
          .doses.filter((dose) => dose.medId === medId)
          .sort((a, b) => b.at - a.at)[0];
        if (latest && at <= latest.at) {
          if (at === latest.at) {
            pendingUndo = null;
            set({ toast: toastOf("Already set to that time", false) });
            return;
          }
          const next = { ...latest, at };
          pendingUndo = () =>
            set((state) => ({ doses: state.doses.map((item) => (item.id === latest.id ? latest : item)) }));
          set((state) => ({
            doses: state.doses.map((item) => (item.id === latest.id ? next : item)),
            toast: toastOf(`${med.name} time updated`, true),
          }));
          return;
        }
        const dose: Dose = {
          id: uid(),
          medId: med.id,
          name: med.name,
          dose: med.dose,
          at,
          who: med.who === "baby" ? "baby" : "mom",
        };
        pendingUndo = () => set((state) => ({ doses: state.doses.filter((item) => item.id !== dose.id) }));
        set((state) => ({ doses: [dose, ...state.doses], toast: toastOf(`${med.name} time updated`, true) }));
      },
      updateDose: (id, at) => {
        const prev = get().doses.find((item) => item.id === id);
        if (!prev || !Number.isFinite(at)) return;
        const next = { ...prev, at };
        pendingUndo = () =>
          set((state) => ({ doses: state.doses.map((item) => (item.id === id ? prev : item)) }));
        set((state) => ({
          doses: state.doses.map((item) => (item.id === id ? next : item)),
          toast: toastOf("Dose time updated", true),
        }));
      },
      deleteDose: (id) => {
        const prev = get().doses.find((item) => item.id === id);
        if (!prev) return;
        pendingUndo = () => set((state) => ({ doses: [prev, ...state.doses] }));
        set((state) => ({
          doses: state.doses.filter((item) => item.id !== id),
          toast: toastOf("Dose removed", true),
        }));
      },
      setSettings: (patch) => {
        set((state) => ({ settings: { ...state.settings, ...patch } }));
      },
      setDayNote: (dayKey, note) => {
        set((state) => {
          const notes = { ...state.notes };
          if (!note.text && !note.mood) delete notes[dayKey];
          else notes[dayKey] = { text: note.text, mood: note.mood };
          return { notes };
        });
      },
      eraseAll: () => {
        const snap = {
          logs: get().logs,
          meds: get().meds,
          doses: get().doses,
          notes: get().notes,
          timer: get().timer,
          pending: get().pending,
        };
        pendingUndo = () => set(snap);
        set({
          logs: emptyLogs(),
          meds: [],
          doses: [],
          notes: {},
          timer: null,
          pending: null,
          toast: toastOf("All logs erased", true),
        });
      },
      dismissToast: () => {
        pendingUndo = null;
        set({ toast: null });
      },
      undoToast: () => {
        const undo = pendingUndo;
        pendingUndo = null;
        set({ toast: null });
        undo?.();
      },
    }),
    {
      name: "nest",
      storage: createJSONStorage(() => nestStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({
        child: state.child,
        logs: state.logs,
        meds: state.meds,
        doses: state.doses,
        notes: state.notes,
        settings: state.settings,
        seeds: state.seeds,
        deletedMedIds: state.deletedMedIds,
        timer: state.timer,
        pending: state.pending,
        migrated: true,
      }),
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<Data>;
        const next = withDischargeSeed(data);
        const logs = data.logs ?? emptyLogs();
        return {
          ...current,
          child: isChild(data.child) ? data.child : "joni",
          logs: {
            alex: { feeds: logs.alex?.feeds ?? [], diapers: logs.alex?.diapers ?? [] },
            joni: { feeds: logs.joni?.feeds ?? [], diapers: logs.joni?.diapers ?? [] },
          },
          meds: next.meds,
          doses: next.doses,
          notes: data.notes ?? {},
          seeds: next.seeds,
          deletedMedIds: next.deletedMedIds,
          settings: { ...defaultSettings, ...data.settings },
          timer: data.timer ?? null,
          pending: data.pending ?? null,
          migrated: true,
        };
      },
    },
  ),
);

export function useActiveLogs() {
  const child = useTracker((state) => state.child);
  const logs = useTracker((state) => state.logs);
  const log = logs[child] ?? { feeds: [], diapers: [] };
  return { child, name: childName(child), feeds: log.feeds, diapers: log.diapers };
}

function toastOf(message: string, undoable: boolean): Toast {
  return { id: uid(), message, undoable };
}

function cleanNote(notes?: string) {
  const text = notes?.trim();
  return text ? text : undefined;
}

function cleanFeed(input: FeedInput): FeedInput {
  const amount = input.amount && input.amount > 0 ? input.amount : undefined;
  const durationSec =
    input.durationSec && input.durationSec > 0 ? Math.round(input.durationSec) : undefined;
  const durationMin = durationSec
    ? Math.max(1, Math.round(durationSec / 60))
    : input.durationMin && input.durationMin > 0
      ? Math.round(input.durationMin)
      : undefined;
  return {
    type: input.type,
    at: clampPast(input.at),
    amount,
    unit: amount ? input.unit : undefined,
    durationMin,
    durationSec,
    notes: cleanNote(input.notes),
  };
}

function cleanDiaper(input: DiaperInput): DiaperInput {
  return {
    kind: input.kind,
    at: clampPast(input.at),
    tags: [...new Set(input.tags)],
    notes: cleanNote(input.notes),
  };
}

function cleanMed(input: MedInput): MedInput | null {
  const name = input.name.trim();
  if (!name) return null;
  const frequency =
    input.frequency.kind === "asneeded"
      ? { kind: "asneeded" as const }
      : input.frequency.kind === "every"
        ? { kind: "every" as const, hours: Math.min(24, Math.max(1, Math.round(input.frequency.hours))) }
        : {
            kind: "times" as const,
            times: [...new Set(input.frequency.times.filter((time) => /^\d{2}:\d{2}$/.test(time)))].sort(),
          };
  if (frequency.kind === "times" && frequency.times.length === 0) return null;
  return {
    name,
    dose: input.dose.trim(),
    frequency,
    notes: input.notes.trim(),
    active: input.active,
    who: input.who === "baby" ? "baby" : "mom",
  };
}
