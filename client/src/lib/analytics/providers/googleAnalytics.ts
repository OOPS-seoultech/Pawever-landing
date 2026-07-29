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

// GA4는 표준 획득 리포트를 page_location의 utm 쿼리에서 귀속한다.
// send_page_view를 끄고 수동 이벤트만 보내므로, utm이 담긴 전체 URL을
// page_location으로 직접 실어야 유입 소스/매체가 direct로 뭉개지지 않는다.
export const buildGoogleAnalyticsParams = (
  event: AnalyticsEvent,
  pageLocation: string
) =>
  compact({
    ...event.properties,
    ...campaignProperties(event.attribution.lastTouch),
    internal_event_name: event.name,
    event_id: event.eventId,
    visit_id: event.visitId,
    page_path: event.path,
    page_location: pageLocation,
    device_category: event.device.category,
    viewport_size: `${event.device.viewportWidth}x${event.device.viewportHeight}`,
    engagement_time_msec:
      typeof event.properties.active_ms === "number"
        ? event.properties.active_ms
        : undefined,
    // 이탈 이벤트는 화면이 사라지는 중에 나가므로 일반 요청은 취소된다.
    // beacon으로 보내야 브라우저가 언로드 뒤에도 전송을 끝낸다.
    transport_type: event.name === "survey_abandon" ? "beacon" : undefined,
  });

let configured = false;

const ensureGtag = () => {
  window.dataLayer ??= [];
  // gtag.js는 dataLayer에 담긴 것이 arguments 객체일 때만 명령으로 읽는다.
  // 화살표 함수로 배열을 밀어 넣으면 명령이 조용히 무시돼 이벤트가 사라진다.
  // 구글 공식 스니펫이 function 선언과 arguments를 쓰는 이유가 이것이다.
  if (!window.gtag) {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments);
    };
  }
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

    window.gtag?.(
      "event",
      eventName(event),
      buildGoogleAnalyticsParams(event, window.location.href)
    );
  },
};
