import type { Diaper, Dose, Feed, Medication } from "@/lib/tracker/model";

export type TabId = "today" | "feeds" | "diapers" | "meds" | "log";

export type Composer =
  | { kind: "feed"; feed?: Feed }
  | { kind: "diaper"; diaper?: Diaper }
  | { kind: "med"; med?: Medication }
  | { kind: "dose"; dose: Dose }
  | { kind: "dose-time"; medId: string }
  | { kind: "pick-med" }
  | { kind: "settings" };
