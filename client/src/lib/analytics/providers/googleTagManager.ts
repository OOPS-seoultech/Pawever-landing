import { analyticsConfig } from "../config";
import type { AnalyticsEvent } from "../types";

// GTM은 서드파티 태그를 코드 배포 없이 붙이기 위한 통로다.
// GA4는 googleAnalytics.ts가 직접 보내므로, GTM 안에서 GA4 태그를 만들면
// 같은 행동이 두 번 집계된다. docs/analytics-events.md에 같은 경고를 적어 뒀다.

const SCRIPT_ID = "pawever-gtm";

/**
 * GTM 트리거는 dataLayer의 event 키를 본다.
 * 태그 화면에서 변수로 꺼내 쓸 수 있도록 이름을 평평하게 펼쳐 둔다.
 */
export const buildDataLayerPayload = (event: AnalyticsEvent) => ({
  event: event.name,
  event_id: event.eventId,
  visit_id: event.visitId,
  page_path: event.path,
  device_category: event.device.category,
  campaign_source: event.attribution.lastTouch.utm_source,
  campaign_medium: event.attribution.lastTouch.utm_medium,
  campaign_name: event.attribution.lastTouch.utm_campaign,
  campaign_content: event.attribution.lastTouch.utm_content,
  ...event.properties,
});

let configured = false;

export const googleTagManagerProvider = {
  name: "gtm",
  initialize() {
    if (
      configured ||
      !analyticsConfig.enabled ||
      !analyticsConfig.gtmContainerId
    ) {
      return;
    }

    window.dataLayer ??= [];

    if (!document.getElementById(SCRIPT_ID)) {
      window.dataLayer.push({
        "gtm.start": new Date().getTime(),
        event: "gtm.js",
      });
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(
        analyticsConfig.gtmContainerId
      )}`;
      document.head.appendChild(script);
    }

    configured = true;
  },
  track(event: AnalyticsEvent) {
    if (!configured) return;
    window.dataLayer?.push(buildDataLayerPayload(event));
  },
};
