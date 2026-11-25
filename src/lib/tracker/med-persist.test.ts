import assert from "node:assert/strict";
import test from "node:test";
import { medsFromStored, reconcileMeds } from "./med-persist.ts";
import type { Dose, Medication } from "./model.ts";

const acetaminophen: Medication = {
  id: "med-acetaminophen",
  name: "Acetaminophen",
  dose: "2 tablets · 500 mg",
  frequency: { kind: "every", hours: 6 },
  notes: "",
  active: true,
};

const custom: Medication = {
  id: "med-custom",
  name: "Vitamin",
  dose: "1",
  frequency: { kind: "asneeded" },
  notes: "",
  active: true,
};

const keptDose: Dose = {
  id: "dose-user",
  medId: "med-custom",
  name: "Vitamin",
  dose: "1",
  at: 1,
};

test("a saved med list is not refilled from the old snapshot", () => {
  const next = medsFromStored({
    shared: { meds: [custom], doses: [keptDose] },
    legacyMeds: [acetaminophen, custom],
    legacyDoses: [],
    seeds: ["discharge-2026-11-02", "extra-2026-11-02", "baby-d3-2026-11-02"],
    deletedMedIds: [],
  });
  assert.deepEqual(next.meds.map((med) => med.id), ["med-custom"]);
  assert.deepEqual(next.doses.map((dose) => dose.id), ["dose-user"]);
});

test("deleting a starter med sticks even when the seed has not been recorded", () => {
  const next = medsFromStored({
    shared: { meds: [custom], doses: [keptDose] },
    legacyMeds: [acetaminophen],
    seeds: [],
    deletedMedIds: ["med-acetaminophen"],
  });
  assert.equal(next.meds.some((med) => med.id === "med-acetaminophen"), false);
  assert.equal(next.doses.some((dose) => dose.medId === "med-acetaminophen"), false);
  assert.equal(next.meds.some((med) => med.id === "med-custom"), true);
  assert.ok(next.seeds.includes("discharge-2026-11-02"));
});

test("a tombstone removes a med that was written back into storage", () => {
  const next = reconcileMeds({
    meds: [acetaminophen, custom],
    doses: [keptDose],
    seeds: ["discharge-2026-11-02", "extra-2026-11-02", "baby-d3-2026-11-02"],
    deletedMedIds: ["med-acetaminophen"],
  });
  assert.deepEqual(next.meds.map((med) => med.id), ["med-custom"]);
  assert.deepEqual(next.doses.map((dose) => dose.id), ["dose-user"]);
});

test("a brand new log still gets the starter meds", () => {
  const next = medsFromStored({ shared: null });
  assert.ok(next.meds.some((med) => med.id === "med-acetaminophen"));
  assert.ok(next.meds.some((med) => med.id === "med-vitamin-d3"));
});

test("starter meds are not added again after the first seed", () => {
  const next = medsFromStored({
    shared: { meds: [custom], doses: [] },
    seeds: ["discharge-2026-11-02", "extra-2026-11-02", "baby-d3-2026-11-02"],
  });
  assert.deepEqual(next.meds.map((med) => med.id), ["med-custom"]);
});
