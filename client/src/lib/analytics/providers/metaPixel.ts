import { analyticsConfig } from "../config";
import type { AnalyticsEvent, MetaPixelFunction } from "../types";

const SCRIPT_ID = "pawever-meta-pixel";

type MetaEventMapping = {
  method: "track" | "trackCustom";
  name: string;
};

// 표준 이벤트(track)만 Meta 광고의 전환 최적화 대상이 된다.
// 굿즈 신청은 굿즈가 열려 있을 때만 일어나므로, 거기에 Lead를 걸어 두면
// 굿즈가 닫힌 기간 내내 학습할 전환이 하나도 발생하지 않는다.
// 그래서 이 국면의 목표인 설문 완료를 Lead로 두고, 굿즈 신청은 그 뒤에 오는
// 별도 단계로 SubmitApplication에 매핑해 둘이 겹치지 않게 한다.
const META_EVENTS: Partial<Record<AnalyticsEvent["name"], MetaEventMapping>> = {
  landing_view: { method: "track", name: "PageView" },
  survey_cta_click: { method: "trackCustom", name: "SurveyCtaClick" },
  survey_start: { method: "trackCustom", name: "SurveyStart" },
  survey_complete: { method: "track", name: "Lead" },
  notice_subscribe: { method: "trackCustom", name: "NoticeSubscribe" },
  application_complete: { method: "track", name: "SubmitApplication" },
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
