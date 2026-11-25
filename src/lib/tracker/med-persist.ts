import type { Dose, Medication } from "./model";

/** Nov 2, 2026 clock times from the discharge sheet, as Pacific (UTC−8). */
function pacific(hour: number, minute: number) {
  return Date.UTC(2026, 10, 2, hour + 8, minute);
}

export const DISCHARGE_SEED = "discharge-2026-11-02";
export const EXTRA_SEED = "extra-2026-11-02";
export const BABY_SEED = "baby-d3-2026-11-02";

const dischargeMeds: Medication[] = [
  {
    id: "med-acetaminophen",
    name: "Acetaminophen",
    dose: "2 tablets · 500 mg",
    frequency: { kind: "every", hours: 6 },
    notes: "As needed for pain or fever. Do not exceed 6 tablets in 24 hours.",
    active: true,
  },
  {
    id: "med-ibuprofen",
    name: "Ibuprofen",
    dose: "1 tablet · 600 mg",
    frequency: { kind: "every", hours: 6 },
    notes: "As needed for pain. Take with food.",
    active: true,
  },
  {
    id: "med-oxycodone",
    name: "Oxycodone",
    dose: "1 tablet · 5 mg",
    frequency: { kind: "every", hours: 4 },
    notes: "As needed for pain.",
    active: true,
  },
  {
    id: "med-clearlax",
    name: "ClearLax",
    dose: "17 g",
    frequency: { kind: "every", hours: 12 },
    notes: "As needed for constipation, up to twice a day. Mix in a non-carbonated liquid.",
    active: true,
  },
  {
    id: "med-prenatal",
    name: "Prenatal",
    dose: "1 capsule",
    frequency: { kind: "times", times: ["08:00"] },
    notes: "Once a day. Change the time if 8:00am isn’t when you take it.",
    active: true,
  },
];

const extraMeds: Medication[] = [
  {
    id: "med-aspirin",
    name: "Aspirin",
    dose: "81 mg chew tab",
    frequency: { kind: "asneeded" },
    notes: "As needed.",
    active: true,
  },
  {
    id: "med-sertraline",
    name: "Sertraline",
    dose: "1 tablet · 25 mg",
    frequency: { kind: "times", times: ["08:00"] },
    notes: "Once a day. Change the time if 8:00am isn’t when you take it.",
    active: true,
  },
];

const babyMeds: Medication[] = [
  {
    id: "med-vitamin-d3",
    name: "Super Daily D3",
    dose: "1 drop · 10 mcg (400 IU)",
    frequency: { kind: "times", times: ["08:00"] },
    notes: "For Joni. Give 1 drop by mouth once a day. Change the time if 8:00am isn’t when you give it.",
    active: true,
    who: "baby",
  },
];

const dischargeDoses: Dose[] = [
  {
    id: "dose-acetaminophen-1",
    medId: "med-acetaminophen",
    name: "Acetaminophen",
    dose: "2 tablets · 500 mg",
    at: pacific(8, 31),
  },
  {
    id: "dose-ibuprofen-1",
    medId: "med-ibuprofen",
    name: "Ibuprofen",
    dose: "1 tablet · 600 mg",
    at: pacific(7, 31),
  },
  {
    id: "dose-oxycodone-1",
    medId: "med-oxycodone",
    name: "Oxycodone",
    dose: "1 tablet · 5 mg",
    at: pacific(1, 33),
  },
];

export type MedSnapshot = {
  meds: Medication[];
  doses: Dose[];
  seeds: string[];
  deletedMedIds: string[];
};

function uniq(ids: string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

/**
 * Starter meds are added once, and never again after the user removes them.
 * A deleted id stays out even if it is still sitting in saved meds or a seed runs late.
 */
export function reconcileMeds(input: Partial<MedSnapshot> | null | undefined): MedSnapshot {
  const deleted = new Set(uniq(input?.deletedMedIds ?? []));
  let seeds = [...(input?.seeds ?? [])];
  let meds = (input?.meds ?? []).filter((med) => med?.id && !deleted.has(med.id));
  let doses = [...(input?.doses ?? [])];

  if (!seeds.includes(DISCHARGE_SEED)) {
    const medIds = new Set(dischargeMeds.map((med) => med.id));
    const doseIds = new Set(dischargeDoses.map((dose) => dose.id));
    meds = [...dischargeMeds.filter((med) => !deleted.has(med.id)), ...meds.filter((med) => !medIds.has(med.id))];
    doses = [
      ...dischargeDoses.filter((dose) => !deleted.has(dose.medId)),
      ...doses.filter((dose) => !doseIds.has(dose.id)),
    ];
    seeds = [...seeds, DISCHARGE_SEED];
  }
  if (!seeds.includes(EXTRA_SEED)) {
    const have = new Set(meds.map((med) => med.id));
    meds = [...extraMeds.filter((med) => !have.has(med.id) && !deleted.has(med.id)), ...meds];
    seeds = [...seeds, EXTRA_SEED];
  }
  if (!seeds.includes(BABY_SEED)) {
    const have = new Set(meds.map((med) => med.id));
    meds = [...meds, ...babyMeds.filter((med) => !have.has(med.id) && !deleted.has(med.id))];
    seeds = [...seeds, BABY_SEED];
  }

  return { meds, doses, seeds, deletedMedIds: [...deleted] };
}

/**
 * Once `shared_meds` exists it is the only med list. The old `joni-tracker-v1`
 * blob is a frozen copy and must not put deleted meds back.
 */
export function medsFromStored(options: {
  shared: { meds?: Medication[]; doses?: Dose[] } | null;
  legacyMeds?: Medication[];
  legacyDoses?: Dose[];
  seeds?: string[];
  deletedMedIds?: string[];
}): MedSnapshot {
  const hasShared = options.shared != null;
  return reconcileMeds({
    meds: hasShared ? (options.shared?.meds ?? []) : (options.legacyMeds ?? []),
    doses: hasShared ? (options.shared?.doses ?? []) : (options.legacyDoses ?? []),
    seeds: options.seeds ?? [],
    deletedMedIds: options.deletedMedIds ?? [],
  });
}
