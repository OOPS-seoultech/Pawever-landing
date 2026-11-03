import { describe, expect, it } from "vitest";
import { buildDataLayerPayload } from "@/lib/analytics/providers/googleTagManager";
import { buildGoogleAnalyticsParams } from "@/lib/analytics/providers/googleAnalytics";
import type { AnalyticsEvent } from "@/lib/analytics/types";

const eventOf = (
  name: AnalyticsEvent["name"],
  properties: AnalyticsEvent["properties"] = {}
): AnalyticsEvent => ({
  eventId: "evt-1",
  name,
  occurredAt: "2026-07-29T00:00:00.000Z",
  path: "/goods-survey/survey",
  visitId: "visit-1",
  attribution: {
    visitId: "visit-1",
    startedAt: "2026-07-29T00:00:00.000Z",
    entryPath: "/goods-survey",
    firstTouch: { utm_source: "meta", utm_medium: "cpc" },
    lastTouch: { utm_source: "meta", utm_medium: "cpc", utm_campaign: "goods" },
    lastTouchAt: "2026-07-29T00:00:00.000Z",
  },
  device: {
    category: "mobile",
    viewportWidth: 390,
    viewportHeight: 844,
    screenWidth: 390,
    screenHeight: 844,
    pixelRatio: 3,
    language: "ko-KR",
    timezone: "Asia/Seoul",
  },
  properties,
});

describe("GTM dataLayer 페이로드", () => {
  it("GTM 트리거가 읽는 event 키로 이벤트 이름을 싣는다", () => {
    const payload = buildDataLayerPayload(
      eventOf("survey_step_view", { step_number: 7 })
    );

    expect(payload.event).toBe("survey_step_view");
    expect(payload.step_number).toBe(7);
    expect(payload.campaign_source).toBe("meta");
    expect(payload.visit_id).toBe("visit-1");
  });
});

describe("GA4 전송 방식", () => {
  it("이탈 이벤트만 beacon으로 보내 언로드 중에도 전송을 끝낸다", () => {
    const abandon = buildGoogleAnalyticsParams(
      eventOf("survey_abandon", { step_number: 11 }),
      "https://www.pawever.kr/goods-survey/survey"
    );
    const normal = buildGoogleAnalyticsParams(
      eventOf("survey_step_view", { step_number: 11 }),
      "https://www.pawever.kr/goods-survey/survey"
    );

    expect(abandon.transport_type).toBe("beacon");
    expect(normal.transport_type).toBeUndefined();
  });
});
