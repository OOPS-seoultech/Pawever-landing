import { describe, expect, it } from "vitest";
import {
  SURVEY_STEP_TOTAL,
  StepVisitLog,
  surveyStepLabel,
  surveyStepOf,
} from "./surveyStep";
import {
  SCROLL_DEPTH_THRESHOLDS,
  computeScrollPercent,
  reachedScrollThresholds,
} from "./scrollDepth";

describe("노션 STEP 정의와 코드 단계 매핑", () => {
  it("노션 기준대로 전체 15단계다", () => {
    expect(SURVEY_STEP_TOTAL).toBe(15);
  });

  it("질문 13페이지가 STEP 1~13이 된다", () => {
    for (let page = 1; page <= 13; page += 1) {
      expect(surveyStepOf({ stage: "questions", page })).toBe(page);
    }
  });

  it("사연은 STEP 14, 굿즈 제작 정보는 STEP 15다", () => {
    expect(surveyStepOf({ stage: "story" })).toBe(14);
    expect(surveyStepOf({ stage: "production" })).toBe(15);
  });

  it("노션에 없는 화면은 단계 번호를 갖지 않는다", () => {
    // closing은 설문과 사연 사이의 전환 화면이라 노션 STEP에 없다.
    expect(surveyStepOf({ stage: "closing" })).toBeNull();
    expect(surveyStepOf({ stage: "intro" })).toBeNull();
    expect(surveyStepOf({ stage: "complete" })).toBeNull();
    expect(surveyStepOf({ stage: "terminated" })).toBeNull();
    expect(surveyStepOf({ stage: "full" })).toBeNull();
  });

  it("질문 페이지가 13을 넘으면 STEP으로 인정하지 않는다", () => {
    // 페이지가 늘어나면 사연·굿즈 단계 번호와 충돌하므로 조용히 넘기지 않는다.
    expect(surveyStepOf({ stage: "questions", page: 14 })).toBeNull();
    expect(surveyStepOf({ stage: "questions", page: 0 })).toBeNull();
  });

  it("보고서에서 알아볼 수 있는 이름을 붙인다", () => {
    expect(surveyStepLabel(1)).toBe("STEP 01 설문");
    expect(surveyStepLabel(13)).toBe("STEP 13 설문");
    expect(surveyStepLabel(14)).toBe("STEP 14 사연");
    expect(surveyStepLabel(15)).toBe("STEP 15 굿즈 제작 정보");
  });
});

describe("단계 재방문 기록", () => {
  it("같은 단계를 다시 열면 방문 횟수가 올라간다", () => {
    const log = new StepVisitLog();
    expect(log.enter(3)).toBe(1);
    expect(log.enter(4)).toBe(1);
    expect(log.enter(3)).toBe(2);
  });

  it("가장 멀리 간 단계를 기억한다", () => {
    const log = new StepVisitLog();
    log.enter(1);
    log.enter(5);
    log.enter(2);
    expect(log.furthest).toBe(5);
    expect(log.last).toBe(2);
  });

  it("설문을 다시 시작하면 기록을 비운다", () => {
    const log = new StepVisitLog();
    log.enter(7);
    log.reset();
    expect(log.furthest).toBe(0);
    expect(log.enter(7)).toBe(1);
  });
});

describe("랜딩 스크롤 도달 구간", () => {
  it("노션이 요청한 네 구간을 쓴다", () => {
    expect(SCROLL_DEPTH_THRESHOLDS).toEqual([25, 50, 75, 90]);
  });

  it("화면에 보이는 영역 하단을 기준으로 비율을 잰다", () => {
    // 문서 2000, 뷰포트 1000일 때 맨 위면 이미 절반을 본 것이다.
    expect(computeScrollPercent(0, 1000, 2000)).toBe(50);
    expect(computeScrollPercent(1000, 1000, 2000)).toBe(100);
  });

  it("문서가 화면보다 짧으면 전부 본 것으로 센다", () => {
    expect(computeScrollPercent(0, 1000, 800)).toBe(100);
  });

  it("이미 보낸 구간은 다시 보내지 않는다", () => {
    const sent = new Set<number>();
    expect(reachedScrollThresholds(60, sent)).toEqual([25, 50]);
    expect(reachedScrollThresholds(60, sent)).toEqual([]);
    expect(reachedScrollThresholds(95, sent)).toEqual([75, 90]);
  });

  it("한 번에 여러 구간을 지나쳐도 빠뜨리지 않는다", () => {
    const sent = new Set<number>();
    expect(reachedScrollThresholds(100, sent)).toEqual([25, 50, 75, 90]);
  });
});
