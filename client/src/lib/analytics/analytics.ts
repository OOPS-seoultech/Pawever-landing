import { refreshAttributionContext } from "./attribution";
import { analyticsConfig } from "./config";
import { getConsentState } from "./consent";
import { getDeviceContext } from "./device";
import { getFirstPartyEngagement } from "./firstPartyEngagement";
import {
  googleAnalyticsProvider,
  initializeGoogleConsentDefaults,
  setGoogleConsent,
} from "./providers/googleAnalytics";
import { googleTagManagerProvider } from "./providers/googleTagManager";
import { metaPixelProvider, setMetaConsent } from "./providers/metaPixel";
import type {
  AnalyticsEvent,
  AnalyticsEventName,
  AnalyticsProperties,
  ConsentState,
  SubmissionTrackingContext,
} from "./types";

const FORBIDDEN_PROPERTY =
  /^(answer|answer_value|response|response_text|photo|file)$|email|phone|address|file_name|filename|photo_url|photo_name|pet_name|guardian_name/i;

let initialized = false;

export const createAnalyticsEventId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * 모든 이벤트에 함께 실을 캠페인 국면.
 *
 * 설문과 굿즈가 각각의 스위치로 열리고 닫히면서, 같은 이벤트라도 어느 국면에서
 * 나온 것인지에 따라 뜻이 달라졌다. 굿즈를 무료로 주던 때와 아무것도 주지 않는
 * 때의 "설문 완료"를 한 숫자로 합치면 참여 동기가 다른 수치가 섞인다.
 * 호출부마다 붙이면 빠뜨리기 쉬워, 캠페인을 조회한 곳에서 한 번 넣어 두면
 * 이후 모든 이벤트에 자동으로 실린다.
 */
type SurveyPhaseContext = {
  campaignId: string;
  goodsOpen: boolean;
};

let surveyPhase: Partial<SurveyPhaseContext> = {};

export const setSurveyPhaseContext = (context: SurveyPhaseContext) => {
  surveyPhase = context;
};

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

  // GTM 컨테이너는 이후 붙는 서드파티 태그의 통로다.
  // 컨테이너 ID가 비어 있으면 이 분기째로 빌드에서 사라진다.
  if (consent.analytics && analyticsConfig.gtmContainerId) {
    googleTagManagerProvider.initialize();
    googleTagManagerProvider.track(event);
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
};

export const initializeAnalytics = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  try {
    refreshAttributionContext();
    initializeGoogleConsentDefaults();
    applyConsent(getConsentState());
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
      // 국면 값을 뒤에 둔다. 호출부가 실수로 같은 이름을 써도 실제 상태가 남는다.
      properties: sanitizeAnalyticsProperties({
        ...properties,
        campaign_id: surveyPhase.campaignId,
        goods_open: surveyPhase.goodsOpen,
      }),
    };

    if (analyticsConfig.debug) {
      window.__PAWEVER_ANALYTICS__ ??= [];
      window.__PAWEVER_ANALYTICS__.push(event);
      console.debug("[Pawever analytics]", name, event.properties);
    }

    const consent = getConsentState();
    dispatchEvent(event, consent);

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
