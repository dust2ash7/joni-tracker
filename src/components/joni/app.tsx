import { useEffect, useState } from "react";
import { formatTimer, isHot, scheduledMeds } from "@/lib/tracker/model";
import { childName, useTracker } from "@/lib/tracker/store";
import { applyTheme } from "@/lib/tracker/theme";
import { ComposerHost } from "@/components/joni/forms";
import { DiapersScreen, Dock, FeedsScreen, MedsScreen, TodayScreen } from "@/components/joni/screens";
import { OverviewScreen } from "@/components/joni/overview";
import type { Composer, TabId } from "@/components/joni/types";

function useHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    const finish = () => {
      if (live) setReady(true);
    };
    const unsub = useTracker.persist.onFinishHydration(finish);
    void Promise.resolve(useTracker.persist.rehydrate()).then(finish);
    return () => {
      live = false;
      unsub();
    };
  }, []);
  return ready;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function BootScreen() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-cream px-5 pt-safe text-ink">
      <p className="font-serif text-4xl font-medium">Nest</p>
      <p className="mt-2 text-sm text-muted">Opening today’s log…</p>
    </div>
  );
}

function ToastBar() {
  const toast = useTracker((state) => state.toast);
  const dismissToast = useTracker((state) => state.dismissToast);
  const undoToast = useTracker((state) => state.undoToast);
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => dismissToast(), 5000);
    return () => window.clearTimeout(id);
  }, [toast, dismissToast]);
  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 z-50 mx-auto w-full max-w-lg px-4 bottom-dock">
      <div
        role="status"
        className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-cream"
      >
        <p className="text-sm font-medium">{toast.message}</p>
        {toast.undoable ? (
          <button type="button" onClick={undoToast} className="min-h-11 shrink-0 font-medium underline">
            Undo
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ChildSwitch() {
  const child = useTracker((state) => state.child);
  const setChild = useTracker((state) => state.setChild);
  return (
    <div className="grid grid-cols-2 gap-1 rounded-full bg-sage-soft p-1" role="tablist" aria-label="Child">
      {(["alex", "joni"] as const).map((id) => {
        const on = child === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => setChild(id)}
            className={`min-h-12 rounded-full text-base font-medium ${on ? "bg-paper text-ink" : "text-muted"}`}
          >
            {childName(id)}
          </button>
        );
      })}
    </div>
  );
}

function TimerBanner({ go }: { go: (tab: TabId) => void }) {
  const timer = useTracker((state) => state.timer);
  const setChild = useTracker((state) => state.setChild);
  const stopTimer = useTracker((state) => state.stopTimer);
  const [tick, setTick] = useState(() => Date.now());
  useEffect(() => {
    if (!timer) return;
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [timer]);
  if (!timer) return null;
  const elapsed = Math.max(0, Math.floor((tick - timer.startedAt) / 1000));
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setChild(timer.child);
          go("feeds");
        }}
        className="min-h-12 flex-1 rounded-2xl bg-sage px-4 text-left text-on-sage"
      >
        <span className="block text-sm">Timing {childName(timer.child)}</span>
        <span className="font-serif text-2xl tabular-nums">{formatTimer(elapsed)}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          stopTimer();
          go("feeds");
        }}
        className="min-h-12 rounded-2xl bg-clay px-4 font-medium text-on-clay"
      >
        Stop
      </button>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>("today");
  const [composer, setComposer] = useState<Composer | null>(null);
  const now = useNow();
  const theme = useTracker((state) => state.settings.theme);
  const meds = useTracker((state) => state.meds);
  const doses = useTracker((state) => state.doses);
  const due = scheduledMeds(meds, doses, now).some((item) => isHot(item.due.status));

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  return (
    <div className="min-h-screen bg-frame text-ink">
      <div className="mx-auto min-h-screen max-w-lg bg-cream pb-dock">
        <div className="sticky top-0 z-20 bg-cream/95 px-4 pt-safe pb-2 backdrop-blur">
          <ChildSwitch />
          <TimerBanner go={setTab} />
        </div>
        <main className="px-4">
          {tab === "today" ? <TodayScreen now={now} open={setComposer} go={setTab} /> : null}
          {tab === "feeds" ? <FeedsScreen now={now} open={setComposer} /> : null}
          {tab === "diapers" ? <DiapersScreen now={now} open={setComposer} /> : null}
          {tab === "meds" ? <MedsScreen now={now} open={setComposer} /> : null}
          {tab === "overview" ? <OverviewScreen now={now} open={setComposer} /> : null}
        </main>
      </div>
      <Dock tab={tab} setTab={setTab} due={due} />
      <ComposerHost composer={composer} close={() => setComposer(null)} />
      <ToastBar />
    </div>
  );
}

export function JoniApp() {
  const hydrated = useHydrated();
  if (!hydrated) return <BootScreen />;
  return <Shell />;
}
