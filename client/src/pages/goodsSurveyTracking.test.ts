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

const analyticsSource = readFileSync(
  new URL("../lib/analytics/analytics.ts", import.meta.url),
  "utf8"
);

const metaPixelSource = readFileSync(
  new URL("../lib/analytics/providers/metaPixel.ts", import.meta.url),
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
    expect(landingSource).toContain('offer: "btn_A3"');
    expect(landingSource).toContain('final: "btn_A4"');
    expect(landingSource).toContain('sticky: "btn_B"');
  });

  it("다섯 개 CTA가 모두 규격 식별자를 갖는다", () => {
    const placements = ["hero", "price_comparison", "offer", "final", "sticky"];
    for (const placement of placements) {
      expect(landingSource).toContain(`openCta("${placement}")`);
    }
    expect(landingSource).toContain("cta_id: CTA_IDS[placement]");
  });

  it("안내 모달을 거쳐도 CTA 클릭은 버튼을 누른 시점에 남는다", () => {
    // 위치별 버튼 효과를 재는 지표라 모달 통과 여부와 분리해야 한다.
    // 모달에서 돌아선 사람은 설문 진입 이벤트가 없는 것으로 구분된다.
    expect(landingSource).toMatch(
      /trackEvent\("survey_cta_click"[\s\S]*?\}\);\s*setCtaPlacement\(placement\);/
    );
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

  it("새 응답을 시작하면 단계 기록과 전환 표시를 비운다", () => {
    // 비우지 않으면 두 번째 신청이 전환으로 세지 않고,
    // 단계 방문 횟수와 최대 도달 단계가 앞 응답 것과 섞인다.
    expect(formSource).toContain("stepVisits.current.reset()");
    expect(formSource).toContain("applicationTracked.current = false");
    expect(formSource).toContain("abandonTracked.current = false");
  });

  it("최종 제출과 단계 진입이 중복 집계되지 않게 막는다", () => {
    // 제출 중복 클릭, 리렌더로 같은 단계가 다시 잡히는 경우를 막는 장치.
    expect(formSource).toContain("if (!applicationTracked.current)");
    expect(formSource).toContain("enterOnce");
    expect(formSource).toContain("navigationLocked");
  });

  it("모든 이벤트에 어느 국면에서 나왔는지 함께 싣는다", () => {
    // 굿즈를 무료로 주던 때와 아무것도 주지 않는 때의 "설문 완료"를 한 숫자로
    // 합치면 참여 동기가 다른 수치가 섞여 2차 수량 산정을 그르친다.
    expect(analyticsSource).toContain("campaign_id: surveyPhase.campaignId");
    expect(analyticsSource).toContain("goods_open: surveyPhase.goodsOpen");
    // 캠페인을 조회한 곳에서 한 번만 심어 두고 이후는 자동으로 실린다.
    expect(landingSource).toContain("setSurveyPhaseContext");
    expect(formSource).toContain("setSurveyPhaseContext");
  });

  it("굿즈가 닫혀도 발생하는 이벤트를 Meta 표준 전환으로 둔다", () => {
    // 굿즈 신청에만 Lead가 걸려 있으면 굿즈가 닫힌 기간 내내 학습할 전환이 0이다.
    expect(metaPixelSource).toContain(
      'survey_complete: { method: "track", name: "Lead" }'
    );
    expect(metaPixelSource).not.toContain(
      'application_complete: { method: "track", name: "Lead" }'
    );
  });

  it("설문 완료 결과를 참·거짓이 아니라 상태 그대로 남긴다", () => {
    // 굿즈가 닫히면 늘 COMPLETED_NO_SLOT이라, 참·거짓으로 두면
    // 보고서에 "예약률 0%"로 보여 원인을 오해한다.
    expect(formSource).toContain("completion_status: completion.status");
    expect(formSource).not.toContain("goods_reserved");
  });
});
