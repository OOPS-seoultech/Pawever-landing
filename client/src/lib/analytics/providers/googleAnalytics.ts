import { analyticsConfig } from "../config";
import type {
  AnalyticsEvent,
  AnalyticsProperties,
  CampaignParameters,
} from "../types";

const SCRIPT_ID = "pawever-ga4";

const campaignProperties = (campaign: CampaignParameters) => ({
  campaign_source: campaign.utm_source,
  campaign_medium: campaign.utm_medium,
  campaign_name: campaign.utm_campaign,
  campaign_content: campaign.utm_content,
  campaign_term: campaign.utm_term,
});

const compact = (properties: AnalyticsProperties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined)
  );

const eventName = (event: AnalyticsEvent) => {
  if (event.name === "landing_view") return "page_view";
  if (event.name === "application_complete") return "generate_lead";
  return event.name;
};

let configured = false;

const ensureGtag = () => {
  window.dataLayer ??= [];
  window.gtag ??= (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
};

export const setGoogleConsent = (analytics: boolean, marketing: boolean) => {
  ensureGtag();
  window.gtag?.("consent", "update", {
    analytics_storage: analytics ? "granted" : "denied",
    ad_storage: marketing ? "granted" : "denied",
    ad_user_data: marketing ? "granted" : "denied",
    ad_personalization: marketing ? "granted" : "denied",
  });
};

export const initializeGoogleConsentDefaults = () => {
  if (!analyticsConfig.enabled || !analyticsConfig.ga4MeasurementId) return;
  ensureGtag();
  window.gtag?.("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    wait_for_update: 500,
  });
};

export const googleAnalyticsProvider = {
  name: "ga4",
  initialize() {
    if (
      configured ||
      !analyticsConfig.enabled ||
      !analyticsConfig.ga4MeasurementId
    ) {
      return;
    }

    ensureGtag();

    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        analyticsConfig.ga4MeasurementId
      )}`;
      document.head.appendChild(script);
    }

    window.gtag?.("js", new Date());
    window.gtag?.("config", analyticsConfig.ga4MeasurementId, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    configured = true;
  },
  track(event: AnalyticsEvent) {
    if (!configured) return;

    const lastTouch = event.attribution.lastTouch;
    const properties = compact({
      ...event.properties,
      ...campaignProperties(lastTouch),
      internal_event_name: event.name,
      event_id: event.eventId,
      visit_id: event.visitId,
      page_path: event.path,
      device_category: event.device.category,
      viewport_size: `${event.device.viewportWidth}x${event.device.viewportHeight}`,
      engagement_time_msec:
        typeof event.properties.active_ms === "number"
          ? event.properties.active_ms
          : undefined,
    });

    window.gtag?.("event", eventName(event), properties);
  },
};
