import { Settings, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/tracker/model";

export function choiceClass(on: boolean, tone: "sage" | "clay" = "sage") {
  if (!on) return "bg-sage-soft text-ink";
  return tone === "clay" ? "bg-clay text-on-clay" : "bg-sage text-on-sage";
}

export function TopBar({
  title,
  sub,
  onSettings,
}: {
  title: string;
  sub?: string;
  onSettings: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-2 pb-2">
      <div className="min-w-0">
        <h1 className="font-serif text-4xl font-medium leading-tight break-words">{title}</h1>
        {sub ? <p className="mt-2 text-sm text-pretty text-muted">{sub}</p> : null}
      </div>
      <button
        type="button"
        aria-label="Settings"
        onClick={onSettings}
        className="mt-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-paper text-ink ring-1 ring-line"
      >
        <Settings className="size-5" strokeWidth={1.75} />
      </button>
    </header>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl bg-paper px-5 py-8 text-center ring-1 ring-line">
      <p className="font-serif text-xl font-medium text-balance">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-sm text-pretty text-muted">{body}</p>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  tone = "sage",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  tone?: "sage" | "clay";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`flex min-h-14 w-full items-center justify-center rounded-2xl px-4 text-base font-medium ${
        tone === "clay" ? "bg-clay text-on-clay" : "bg-sage text-on-sage"
      }`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-sage-soft px-4 text-base font-medium text-ink"
    >
      {children}
    </button>
  );
}

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const items = [
        ...node.querySelectorAll<HTMLElement>(
          'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ].filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="sheet-in sheet-panel relative z-10 w-full max-w-lg rounded-t-3xl bg-paper outline-none"
      >
        <div className="sticky top-0 z-10 bg-paper px-5 pt-3 pb-3">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line" />
          <div className="flex items-center justify-between gap-3">
            <h2 id={titleId} className="font-serif text-2xl font-medium">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="flex size-11 items-center justify-center rounded-full bg-sage-soft text-ink"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

const OFFSETS = [
  { label: "Now", minutes: 0, name: "Now" },
  { label: "15m", minutes: 15, name: "15 minutes ago" },
  { label: "30m", minutes: 30, name: "30 minutes ago" },
  { label: "1h", minutes: 60, name: "1 hour ago" },
  { label: "2h", minutes: 120, name: "2 hours ago" },
];

export function TimeField({ value, onChange }: { value: number; onChange: (next: number) => void }) {
  const id = useId();
  return (
    <div>
      <label className="mb-2 block text-sm text-muted" htmlFor={id}>
        Time
      </label>
      <input
        id={id}
        className="field tabular-nums"
        type="datetime-local"
        value={toDateTimeLocal(value)}
        onChange={(event) => onChange(fromDateTimeLocal(event.target.value))}
      />
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {OFFSETS.map((offset) => (
          <button
            key={offset.label}
            type="button"
            aria-label={offset.name}
            onClick={() => onChange(Date.now() - offset.minutes * 60_000)}
            className="min-h-11 rounded-full bg-sage-soft text-sm font-medium text-ink"
          >
            {offset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  onStep,
  aside,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onStep: (direction: -1 | 1) => void;
  aside?: ReactNode;
  inputMode: "decimal" | "numeric";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">{label}</span>
        {aside}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onStep(-1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-xl text-ink"
        >
          −
        </button>
        <input
          className="field min-w-0 flex-1 text-center tabular-nums"
          inputMode={inputMode}
          placeholder="Optional"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onStep(1)}
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-sage-soft text-xl text-ink"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function EventButton({
  icon: Icon,
  title,
  detail,
  time,
  onClick,
  iconClass = "text-sage",
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  time: string;
  onClick: () => void;
  iconClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-2xl py-3 text-left"
    >
      <span className={`mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sage-soft ${iconClass}`}>
        <Icon className="size-5" strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="font-medium">{title}</span>
          <span className="shrink-0 text-sm tabular-nums text-muted">{time}</span>
        </span>
        {detail ? <span className="mt-0.5 block text-sm text-pretty text-muted line-clamp-2">{detail}</span> : null}
      </span>
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-paper px-2 py-3 text-center ring-1 ring-line">
      <div className="font-serif text-xl font-medium tabular-nums">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
