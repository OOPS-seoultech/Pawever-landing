import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDataLayerPayload } from "@/lib/analytics/providers/googleTagManager";
import { buildGoogleAnalyticsParams } from "@/lib/analytics/providers/googleAnalytics";
import type { AnalyticsEvent } from "@/lib/analytics/types";

const landingSource = readFileSync(
  new URL("./GoodsSurvey.tsx", import.meta.url),
  "utf8"
);

const formSource = readFileSync(
  new URL("./GoodsSurveyForm.tsx", import.meta.url),
  "utf8"
);

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

describe("랜딩 CTA 식별자", () => {
  it("노션 규격대로 위에서부터 btn_A1~A4, 하단 고정이 btn_B다", () => {
    expect(landingSource).toContain('hero: "btn_A1"');
    expect(landingSource).toContain('price_comparison: "btn_A2"');
    expect(landingSource).toContain('goods_options: "btn_A3"');
    expect(landingSource).toContain('final: "btn_A4"');
    expect(landingSource).toContain('sticky: "btn_B"');
  });

  it("다섯 개 CTA가 모두 규격 식별자를 갖는다", () => {
    const placements = [
      "hero",
      "price_comparison",
      "goods_options",
      "final",
      "sticky",
    ];
    for (const placement of placements) {
      expect(landingSource).toContain(`startSurvey("${placement}")`);
    }
    expect(landingSource).toContain("cta_id: CTA_IDS[placement]");
  });

  it("랜딩에서 스크롤 도달 구간을 측정한다", () => {
    expect(landingSource).toContain("useScrollDepth");
  });
});

describe("설문 단계 추적", () => {
  it("노션 STEP 정의를 코드가 직접 참조한다", () => {
    expect(formSource).toContain("surveyStepOf");
    expect(formSource).toContain("surveyStepLabel");
  });

  it("진입·완료·뒤로가기를 각각 남긴다", () => {
    expect(formSource).toContain('trackEvent("survey_step_view"');
    expect(formSource).toContain('trackEvent("survey_step_complete"');
    expect(formSource).toContain('trackEvent("survey_step_back"');
  });

  it("안내 화면 방문과 시작 버튼 클릭을 구분한다", () => {
    expect(formSource).toContain('trackEvent("survey_intro_view"');
    expect(formSource).toContain('trackEvent("survey_start"');
  });

  it("같은 단계를 다시 열면 재방문 횟수를 함께 보낸다", () => {
    expect(formSource).toContain("step_visit_count");
    expect(formSource).toContain("StepVisitLog");
  });

  it("이탈은 pagehide에서 마지막 단계와 최대 도달 단계를 남긴다", () => {
    expect(formSource).toContain('window.addEventListener("pagehide"');
    expect(formSource).toContain('trackEvent("survey_abandon"');
    expect(formSource).toContain("furthest_step");
  });

  it("완료한 사람은 이탈로 세지 않는다", () => {
    expect(formSource).toContain("applicationTracked");
    expect(formSource).toContain("abandonTracked");
  });

  it("최종 제출과 단계 진입이 중복 집계되지 않게 막는다", () => {
    // 제출 중복 클릭, 리렌더로 같은 단계가 다시 잡히는 경우를 막는 장치.
    expect(formSource).toContain("if (!applicationTracked.current)");
    expect(formSource).toContain("enterOnce");
    expect(formSource).toContain("navigationLocked");
  });
});
