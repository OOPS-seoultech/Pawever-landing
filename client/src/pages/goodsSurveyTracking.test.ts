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

/**
 * 랜딩을 판매 우선으로 다시 세우면서 버튼 자리가 바뀌었다.
 *
 * 예전에는 다섯 자리가 전부 설문으로 가는 버튼이라 openCta 하나로 묶였다.
 * 지금은 구매로 가는 자리(hero·purchase_now·final)와 설문으로 가는
 * 자리(purchase_survey·wait)가 갈리고, 하단 고정 버튼은 굿즈 스위치에 따라
 * 둘 중 하나가 된다. 규격 자체 — 위에서부터 A1…A5, 하단 고정이 B — 는 그대로다.
 */
const CTA_PLACEMENTS = [
  "hero",
  "purchase_now",
  "purchase_survey",
  "wait",
  "final",
  "sticky",
];

describe("랜딩 CTA 식별자", () => {
  it("위에서부터 btn_A1~A5, 하단 고정이 btn_B다", () => {
    expect(landingSource).toContain('hero: "btn_A1"');
    expect(landingSource).toContain('purchase_now: "btn_A2"');
    expect(landingSource).toContain('purchase_survey: "btn_A3"');
    expect(landingSource).toContain('wait: "btn_A4"');
    expect(landingSource).toContain('final: "btn_A5"');
    expect(landingSource).toContain('sticky: "btn_B"');
  });

  it("여섯 자리가 모두 어느 한 갈래로 연결된다", () => {
    for (const placement of CTA_PLACEMENTS) {
      expect(
        landingSource.includes(`openCta("${placement}")`) ||
          landingSource.includes(`startDirectPurchase("${placement}")`) ||
          landingSource.includes(`buyCta("${placement}"`),
        `연결되지 않은 CTA 자리: ${placement}`
      ).toBe(true);
    }
    // 두 갈래 모두 같은 자리 식별자를 이벤트에 실어야 한 지표로 볼 수 있다.
    expect(
      landingSource.match(/cta_id: CTA_IDS\[placement\]/g) ?? []
    ).toHaveLength(2);
  });

  it("여섯 자리가 DOM에도 규격 식별자를 드러낸다", () => {
    // Meta 이벤트 설정 도구와 GTM 클릭 트리거는 DOM만 본다. 구매 버튼 셋은
    // 클래스도 문구도 비슷해서, 식별자가 없으면 서로 구분할 수 없다.
    expect(landingSource).toContain("data-cta-id={ctaId}");
    for (const placement of CTA_PLACEMENTS) {
      expect(landingSource).toMatch(
        // 구매 버튼은 buyCta가 CTA_IDS[placement]로 넘겨주므로,
        // 자리 이름이 buyCta 호출에 나타나는 것으로 갈음한다.
        new RegExp(
          `(ctaId|data-cta-id)=\\{CTA_IDS\\.${placement}\\}|buyCta\\("${placement}"`
        )
      );
    }
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

  it("참여자 가격을 실제로 본 지점을 따로 센다", () => {
    // 굿즈가 열려 있으면 설문 완료 뒤 제작 화면으로 가므로
    // survey_complete로는 가격을 본 사람 수를 셀 수 없다.
    expect(landingSource).toContain('offer_placement: "cta_modal"');
    expect(formSource).toContain('offer_placement: "survey_complete"');
  });

  it("설문 완료 결과를 참·거짓이 아니라 상태 그대로 남긴다", () => {
    // 굿즈가 닫히면 늘 COMPLETED_NO_SLOT이라, 참·거짓으로 두면
    // 보고서에 "예약률 0%"로 보여 원인을 오해한다.
    expect(formSource).toContain("completion_status: completion.status");
    expect(formSource).not.toContain("goods_reserved");
  });
});
