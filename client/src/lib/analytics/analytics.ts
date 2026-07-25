import { refreshAttributionContext } from "./attribution";
import { analyticsConfig } from "./config";
import { getConsentState, subscribeConsent } from "./consent";
import { getDeviceContext } from "./device";
import { getFirstPartyEngagement } from "./firstPartyEngagement";
import {
  googleAnalyticsProvider,
  initializeGoogleConsentDefaults,
  setGoogleConsent,
} from "./providers/googleAnalytics";
import { metaPixelProvider, setMetaConsent } from "./providers/metaPixel";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperties,
  ConsentState,
  SubmissionTrackingContext,
} from "./types";

const MAX_PENDING_EVENTS = 50;
const FORBIDDEN_PROPERTY =
  /^(answer|answer_value|response|response_text|photo|file)$|email|phone|address|file_name|filename|photo_url|photo_name|pet_name|guardian_name/i;

let initialized = false;
let pendingEvents: AnalyticsEvent[] = [];

export const createAnalyticsEventId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const sanitizeAnalyticsProperties = (
  properties: AnalyticsProperties
) => {
  const sanitized: AnalyticsProperties = {};

  for (const [key, value] of Object.entries(properties)) {
    if (FORBIDDEN_PROPERTY.test(key) || value === undefined) continue;
    sanitized[key] =
      typeof value === "string" ? value.trim().slice(0, 120) : value;
  }

  return sanitized;
};

const dispatchEvent = (event: AnalyticsEvent, consent: ConsentState) => {
  if (!analyticsConfig.enabled) return;

  if (consent.analytics && analyticsConfig.ga4MeasurementId) {
    googleAnalyticsProvider.initialize();
    googleAnalyticsProvider.track(event);
  }

  if (consent.marketing && analyticsConfig.metaPixelId) {
    metaPixelProvider.initialize();
    metaPixelProvider.track(event);
  }
};

const applyConsent = (consent: ConsentState) => {
  if (analyticsConfig.ga4MeasurementId) {
    setGoogleConsent(consent.analytics, consent.marketing);
  }

  if (analyticsConfig.metaPixelId) {
    if (consent.marketing) {
      metaPixelProvider.initialize();
    }
    setMetaConsent(consent.marketing);
  }

  if (!consent.decidedAt) return;

  const queued = pendingEvents;
  pendingEvents = [];
  queued.forEach(event => dispatchEvent(event, consent));
};

export const initializeAnalytics = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    refreshAttributionContext();
    initializeGoogleConsentDefaults();
    applyConsent(getConsentState());
    subscribeConsent(applyConsent);
  } catch (error) {
    if (analyticsConfig.debug) {
      console.warn("[Pawever analytics] 초기화 실패", error);
    }
  }
};

export const trackEvent = (
  name: AnalyticsEventName,
  properties: AnalyticsProperties = {},
  options: { eventId?: string } = {}
) => {
  if (typeof window === "undefined") return null;
  try {
    initializeAnalytics();

    const attribution = refreshAttributionContext();
    const event: AnalyticsEvent = {
      eventId: options.eventId ?? createAnalyticsEventId(),
      name,
      occurredAt: new Date().toISOString(),
      path: window.location.pathname,
      visitId: attribution.visitId,
      attribution,
      device: getDeviceContext(),
      properties: sanitizeAnalyticsProperties(properties),
    };

    if (analyticsConfig.debug) {
      window.__PAWEVER_ANALYTICS__ ??= [];
      window.__PAWEVER_ANALYTICS__.push(event);
      console.debug("[Pawever analytics]", name, event.properties);
    }

    const consent = getConsentState();
    if (consent.decidedAt) {
      dispatchEvent(event, consent);
    } else {
      pendingEvents = [
        ...pendingEvents.slice(-(MAX_PENDING_EVENTS - 1)),
        event,
      ];
    }

    return event;
  } catch (error) {
    if (analyticsConfig.debug) {
      console.warn("[Pawever analytics] 이벤트 기록 실패", name, error);
    }
    return null;
  }
};

export const createSubmissionTrackingContext =
  (): SubmissionTrackingContext => {
    const attribution = refreshAttributionContext();
    return {
      visitId: attribution.visitId,
      conversionEventId: createAnalyticsEventId(),
      capturedAt: new Date().toISOString(),
      attribution,
      device: getDeviceContext(),
      consent: getConsentState(),
      engagement: getFirstPartyEngagement(),
    };
  };
