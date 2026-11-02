import { useEffect, useState } from "react";
import { isHot, scheduledMeds } from "@/lib/tracker/model";
import { useTracker } from "@/lib/tracker/store";
import { applyTheme } from "@/lib/tracker/theme";
import { ComposerHost } from "@/components/joni/forms";
import { DiapersScreen, Dock, FeedsScreen, LogScreen, MedsScreen, TodayScreen } from "@/components/joni/screens";
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
      <p className="font-serif text-4xl font-medium">Joni</p>
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
        <main className="px-4">
          {tab === "today" ? <TodayScreen now={now} open={setComposer} go={setTab} /> : null}
          {tab === "feeds" ? <FeedsScreen now={now} open={setComposer} /> : null}
          {tab === "diapers" ? <DiapersScreen now={now} open={setComposer} /> : null}
          {tab === "meds" ? <MedsScreen now={now} open={setComposer} /> : null}
          {tab === "log" ? <LogScreen now={now} open={setComposer} /> : null}
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
