import { analyticsConfig } from "../config";
import type { AnalyticsEvent, MetaPixelFunction } from "../types";

const SCRIPT_ID = "pawever-meta-pixel";

type MetaEventMapping = {
  method: "track" | "trackCustom";
  name: string;
};

const META_EVENTS: Partial<Record<AnalyticsEvent["name"], MetaEventMapping>> = {
  landing_view: { method: "track", name: "PageView" },
  survey_cta_click: { method: "trackCustom", name: "SurveyCtaClick" },
  survey_start: { method: "trackCustom", name: "SurveyStart" },
  survey_complete: { method: "trackCustom", name: "SurveyComplete" },
  application_complete: { method: "track", name: "Lead" },
};

let configured = false;

const installStub = () => {
  if (window.fbq) return window.fbq;

  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) {
      fbq.callMethod(...args);
    } else {
      fbq.queue.push(args);
    }
  }) as MetaPixelFunction;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = (...args: unknown[]) => {
    fbq.queue.push(args);
  };
  window.fbq = fbq;
  window._fbq = fbq;
  return fbq;
};

export const metaPixelProvider = {
  name: "meta-pixel",
  initialize() {
    if (
      configured ||
      !analyticsConfig.enabled ||
      !analyticsConfig.metaPixelId
    ) {
      return;
    }

    const fbq = installStub();

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }

    fbq("init", analyticsConfig.metaPixelId);
    configured = true;
  },
  track(event: AnalyticsEvent) {
    const mapping = META_EVENTS[event.name];
    if (!configured || !mapping || !window.fbq) return;

    window.fbq(
      mapping.method,
      mapping.name,
      {
        ...event.properties,
        visit_id: event.visitId,
        utm_source: event.attribution.lastTouch.utm_source,
        utm_medium: event.attribution.lastTouch.utm_medium,
        utm_campaign: event.attribution.lastTouch.utm_campaign,
        utm_content: event.attribution.lastTouch.utm_content,
      },
      { eventID: event.eventId }
    );
  },
};

export const setMetaConsent = (granted: boolean) => {
  if (!window.fbq) return;
  window.fbq("consent", granted ? "grant" : "revoke");
};
