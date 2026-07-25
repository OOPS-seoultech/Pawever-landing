import { describe, expect, it } from "vitest";
import { ActiveTimeCounter } from "./activeTime";
import { initializeAttribution, type AttributionStorage } from "./attribution";
import { classifyDevice } from "./device";
import {
  getFirstPartyEngagement,
  recordFirstPartyEngagement,
} from "./firstPartyEngagement";
import { sanitizeAnalyticsProperties } from "./analytics";
import { createAutomaticConsentState } from "./consent";

class MemoryStorage implements AttributionStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe("캠페인 어트리뷰션", () => {
  it("허용된 UTM과 클릭 ID만 저장하고 visit_id를 세션 동안 유지한다", () => {
    const storage = new MemoryStorage();
    const first = initializeAttribution({
      search:
        "?utm_source=meta&utm_medium=cpc&utm_campaign=goods&utm_content=video-a&fbclid=click-1&name=should-not-be-stored",
      pathname: "/goods-survey",
      storage,
      now: () => "2026-07-24T00:00:00.000Z",
      createId: () => "visit-fixed",
    });
    const later = initializeAttribution({
      search: "?utm_source=kakao&utm_campaign=reminder",
      pathname: "/goods-survey",
      storage,
      now: () => "2026-07-24T00:10:00.000Z",
      createId: () => "visit-other",
    });

    expect(first.visitId).toBe("visit-fixed");
    expect(first.firstTouch).toEqual({
      utm_source: "meta",
      utm_medium: "cpc",
      utm_campaign: "goods",
      utm_content: "video-a",
      fbclid: "click-1",
    });
    expect(JSON.stringify(first)).not.toContain("should-not-be-stored");
    expect(later.visitId).toBe("visit-fixed");
    expect(later.firstTouch).toEqual(first.firstTouch);
    expect(later.lastTouch).toEqual({
      utm_source: "kakao",
      utm_campaign: "reminder",
    });
  });

  it("같은 캠페인 이벤트가 반복되어도 실제 유입 시각을 덮어쓰지 않는다", () => {
    const storage = new MemoryStorage();
    const first = initializeAttribution({
      search: "?utm_source=meta&utm_campaign=goods",
      pathname: "/goods-survey",
      storage,
      now: () => "2026-07-24T00:00:00.000Z",
      createId: () => "visit-fixed",
    });
    const repeated = initializeAttribution({
      search: "?utm_source=meta&utm_campaign=goods",
      pathname: "/goods-survey",
      storage,
      now: () => "2026-07-24T00:10:00.000Z",
    });

    expect(repeated.lastTouchAt).toBe(first.lastTouchAt);
  });
});

describe("활성 화면 시간", () => {
  it("화면이 실제 활성 상태인 구간만 누적한다", () => {
    const counter = new ActiveTimeCounter();

    counter.resume(100);
    expect(counter.elapsed(300)).toBe(200);
    counter.pause(500);
    expect(counter.elapsed(1_000)).toBe(400);
    counter.resume(1_000);
    expect(counter.elapsed(1_250)).toBe(650);
  });

  it("동의 여부와 무관한 1차 데이터로 페이지별 활성시간을 누적한다", () => {
    const storage = new MemoryStorage();

    recordFirstPartyEngagement("goods_survey_landing", 1_000, storage);
    recordFirstPartyEngagement("goods_survey_landing", 500, storage);
    recordFirstPartyEngagement("goods_survey_form", 2_000, storage);

    expect(getFirstPartyEngagement(storage)).toEqual({
      goods_survey_landing: 1_500,
      goods_survey_form: 2_000,
    });
  });
});

describe("기기 범주", () => {
  it("뷰포트 너비를 모바일·태블릿·데스크톱으로만 분류한다", () => {
    expect(classifyDevice(390)).toBe("mobile");
    expect(classifyDevice(820)).toBe("tablet");
    expect(classifyDevice(1_440)).toBe("desktop");
  });
});

describe("분석 속성 개인정보 방어", () => {
  it("답변·연락처·주소·사진 식별값은 제거하고 집계값은 유지한다", () => {
    expect(
      sanitizeAnalyticsProperties({
        question_id: "q1",
        answer_value: "민감한 답",
        shipping_address: "서울시",
        phone: "010-0000-0000",
        photo_name: "dog.jpg",
        photo_count: 3,
      })
    ).toEqual({
      question_id: "q1",
      photo_count: 3,
    });
  });
});

describe("외부 방문 분석 자동 허용", () => {
  it("팝업 선택 없이 분석과 광고 측정을 모두 허용한다", () => {
    expect(
      createAutomaticConsentState(() => "2026-07-25T12:00:00.000Z")
    ).toEqual({
      analytics: true,
      marketing: true,
      decidedAt: "2026-07-25T12:00:00.000Z",
    });
  });
});
