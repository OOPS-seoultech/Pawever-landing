import { useCallback, useEffect, useRef } from "react";
import { ActiveTimeCounter } from "./activeTime";
import { recordFirstPartyEngagement } from "./firstPartyEngagement";
import { trackEvent } from "./analytics";
import { computeScrollPercent, reachedScrollThresholds } from "./scrollDepth";
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

/**
 * 랜딩페이지에서 어디까지 내려봤는지 25/50/75/90 구간으로 기록한다.
 * 같은 구간은 한 번만 보낸다.
 */
export const useScrollDepth = (pageName: string) => {
  useEffect(() => {
    const sent = new Set<number>();

    const measure = () => {
      const percent = computeScrollPercent(
        window.scrollY,
        window.innerHeight,
        document.documentElement.scrollHeight
      );
      for (const threshold of reachedScrollThresholds(percent, sent)) {
        trackEvent("scroll_depth", {
          page_name: pageName,
          percent_scrolled: threshold,
        });
      }
    };

    // 첫 측정은 load 이후에 한다. 이미지가 아직 안 잡힌 상태에서 재면
    // 문서가 짧아 보여 스크롤도 안 했는데 90%로 잡힌다.
    const measureInitial = () => measure();
    if (document.readyState === "complete") measureInitial();
    else window.addEventListener("load", measureInitial, { once: true });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        measure();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("load", measureInitial);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pageName]);
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
