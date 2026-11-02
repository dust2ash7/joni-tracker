import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  clampPast,
  type DayNote,
  type DiaperInput,
  type Dose,
  type FeedInput,
  type MedInput,
  type Settings,
  uid,
  type Diaper,
  type Feed,
  type Medication,
} from "@/lib/tracker/model";

export type Toast = {
  id: string;
  message: string;
  undoable: boolean;
};

type Data = {
  feeds: Feed[];
  diapers: Diaper[];
  meds: Medication[];
  doses: Dose[];
  notes: Record<string, DayNote>;
  settings: Settings;
};

type Store = Data & {
  toast: Toast | null;
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

let pendingUndo: (() => void) | null = null;

function toastOf(message: string, undoable: boolean): Toast {
  return { id: uid(), message, undoable };
}

function cleanNote(notes?: string) {
  const text = notes?.trim();
  return text ? text : undefined;
}

function cleanFeed(input: FeedInput): FeedInput {
  const amount = input.amount && input.amount > 0 ? input.amount : undefined;
  const durationMin =
    input.durationMin && input.durationMin > 0 ? Math.round(input.durationMin) : undefined;
  return {
    type: input.type,
    at: clampPast(input.at),
    amount,
    unit: amount ? input.unit : undefined,
    durationMin,
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
    input.frequency.kind === "every"
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
  };
}

export const useTracker = create<Store>()(
  persist(
    (set, get) => ({
      feeds: [],
      diapers: [],
      meds: [],
      doses: [],
      notes: {},
      settings: defaultSettings,
      toast: null,
      addFeed: (input) => {
        const feed: Feed = { id: uid(), ...cleanFeed(input) };
        pendingUndo = () => set((state) => ({ feeds: state.feeds.filter((item) => item.id !== feed.id) }));
        set((state) => ({ feeds: [feed, ...state.feeds], toast: toastOf("Feed logged", true) }));
      },
      updateFeed: (id, input) => {
        const prev = get().feeds.find((item) => item.id === id);
        if (!prev) return;
        const next = { ...prev, ...cleanFeed(input), id };
        pendingUndo = () =>
          set((state) => ({ feeds: state.feeds.map((item) => (item.id === id ? prev : item)) }));
        set((state) => ({
          feeds: state.feeds.map((item) => (item.id === id ? next : item)),
          toast: toastOf("Feed updated", true),
        }));
      },
      deleteFeed: (id) => {
        const prev = get().feeds.find((item) => item.id === id);
        if (!prev) return;
        pendingUndo = () => set((state) => ({ feeds: [prev, ...state.feeds] }));
        set((state) => ({
          feeds: state.feeds.filter((item) => item.id !== id),
          toast: toastOf("Feed deleted", true),
        }));
      },
      addDiaper: (input) => {
        const diaper: Diaper = { id: uid(), ...cleanDiaper(input) };
        pendingUndo = () =>
          set((state) => ({ diapers: state.diapers.filter((item) => item.id !== diaper.id) }));
        set((state) => ({
          diapers: [diaper, ...state.diapers],
          toast: toastOf("Diaper logged", true),
        }));
      },
      updateDiaper: (id, input) => {
        const prev = get().diapers.find((item) => item.id === id);
        if (!prev) return;
        const next = { ...prev, ...cleanDiaper(input), id };
        pendingUndo = () =>
          set((state) => ({ diapers: state.diapers.map((item) => (item.id === id ? prev : item)) }));
        set((state) => ({
          diapers: state.diapers.map((item) => (item.id === id ? next : item)),
          toast: toastOf("Diaper updated", true),
        }));
      },
      deleteDiaper: (id) => {
        const prev = get().diapers.find((item) => item.id === id);
        if (!prev) return;
        pendingUndo = () => set((state) => ({ diapers: [prev, ...state.diapers] }));
        set((state) => ({
          diapers: state.diapers.filter((item) => item.id !== id),
          toast: toastOf("Diaper deleted", true),
        }));
      },
      addMed: (input) => {
        const cleaned = cleanMed(input);
        if (!cleaned) return;
        const med: Medication = { id: uid(), ...cleaned };
        pendingUndo = () => set((state) => ({ meds: state.meds.filter((item) => item.id !== med.id) }));
        set((state) => ({ meds: [med, ...state.meds], toast: toastOf("Medication saved", true) }));
      },
      updateMed: (id, input) => {
        const prev = get().meds.find((item) => item.id === id);
        const cleaned = cleanMed(input);
        if (!prev || !cleaned) return;
        const next = { ...prev, ...cleaned, id };
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
        pendingUndo = () => set((state) => ({ meds: [prev, ...state.meds] }));
        set((state) => ({
          meds: state.meds.filter((item) => item.id !== id),
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
        };
        pendingUndo = () => set((state) => ({ doses: state.doses.filter((item) => item.id !== dose.id) }));
        set((state) => ({ doses: [dose, ...state.doses], toast: toastOf(`${med.name} marked taken`, true) }));
      },
      updateDose: (id, at) => {
        const prev = get().doses.find((item) => item.id === id);
        if (!prev) return;
        const next = { ...prev, at: clampPast(at) };
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
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
            babyName: patch.babyName !== undefined ? patch.babyName : state.settings.babyName,
          },
        }));
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
          feeds: get().feeds,
          diapers: get().diapers,
          meds: get().meds,
          doses: get().doses,
          notes: get().notes,
        };
        pendingUndo = () => set(snap);
        set({
          feeds: [],
          diapers: [],
          meds: [],
          doses: [],
          notes: {},
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
      name: "joni-tracker-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      version: 1,
      partialize: (state) => ({
        feeds: state.feeds,
        diapers: state.diapers,
        meds: state.meds,
        doses: state.doses,
        notes: state.notes,
        settings: state.settings,
      }),
      merge: (persisted, current) => {
        const data = (persisted ?? {}) as Partial<Data>;
        return {
          ...current,
          feeds: data.feeds ?? [],
          diapers: data.diapers ?? [],
          meds: data.meds ?? [],
          doses: data.doses ?? [],
          notes: data.notes ?? {},
          settings: { ...defaultSettings, ...data.settings },
        };
      },
    },
  ),
);
