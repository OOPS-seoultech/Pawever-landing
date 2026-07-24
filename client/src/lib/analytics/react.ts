import { useCallback, useEffect, useRef } from "react";
import { ActiveTimeCounter } from "./activeTime";
import { recordFirstPartyEngagement } from "./firstPartyEngagement";
import { trackEvent } from "./analytics";
import type { AnalyticsEventName } from "./types";

const isActivelyViewing = () =>
  document.visibilityState === "visible" && document.hasFocus();

export const usePageEngagement = (
  pageName: string,
  viewEvent?: AnalyticsEventName
) => {
  useEffect(() => {
    const counter = new ActiveTimeCounter();
    let lastReported = 0;

    if (isActivelyViewing()) counter.resume(performance.now());
    if (viewEvent) trackEvent(viewEvent, { page_name: pageName });

    const sync = () => {
      if (isActivelyViewing()) {
        counter.resume(performance.now());
      } else {
        counter.pause(performance.now());
      }
    };

    const report = (reason: string) => {
      counter.pause(performance.now());
      const elapsed = Math.round(counter.elapsed(performance.now()));
      const activeMs = Math.max(0, elapsed - lastReported);
      if (activeMs > 0) {
        recordFirstPartyEngagement(pageName, activeMs);
        trackEvent("page_engagement", {
          page_name: pageName,
          active_ms: activeMs,
          report_reason: reason,
        });
        lastReported = elapsed;
      }
    };

    const onPageHide = () => report("pagehide");
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    window.addEventListener("pageshow", sync);
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", sync);

    return () => {
      report("route_change");
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pageName, viewEvent]);
};

export const useActiveTime = (key: string, enabled: boolean) => {
  const state = useRef({
    key,
    counter: new ActiveTimeCounter(),
  });

  if (state.current.key !== key) {
    state.current.key = key;
    state.current.counter.reset();
  }

  useEffect(() => {
    const counter = state.current.counter;
    const sync = () => {
      if (enabled && isActivelyViewing()) {
        counter.resume(performance.now());
      } else {
        counter.pause(performance.now());
      }
    };

    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("blur", sync);
    document.addEventListener("visibilitychange", sync);

    return () => {
      counter.pause(performance.now());
      window.removeEventListener("focus", sync);
      window.removeEventListener("blur", sync);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [enabled, key]);

  return useCallback(
    () => Math.round(state.current.counter.elapsed(performance.now())),
    []
  );
};
