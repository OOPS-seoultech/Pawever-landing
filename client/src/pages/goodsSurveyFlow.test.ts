import { describe, expect, it } from "vitest";
import {
  getNextMultiSelection,
  pruneHiddenAnswers,
  getSurveyProgress,
  getVisibleQuestionIds,
  surveyQuestions,
  type SurveyAnswers,
} from "./goodsSurveySchema";

describe("굿즈 설문 분기", () => {
  it("양육 경험이 없거나 응답을 원하지 않으면 첫 문항에서 종료한다", () => {
    expect(getVisibleQuestionIds({ q1: "no_experience" })).toEqual(["q1"]);
    expect(getVisibleQuestionIds({ q1: "prefer_not" })).toEqual(["q1"]);
  });

  it("첫 문항에서 종료 답변을 골라도 진행률을 100% 완료로 표시하지 않는다", () => {
    expect(
      getSurveyProgress({
        currentIndex: 0,
        visibleQuestionCount: 1,
        terminated: true,
      })
    ).toMatchObject({
      value: expect.any(Number),
      label: "대상 확인",
      detail: "선택한 응답에 따라 설문이 종료됩니다",
    });
    expect(
      getSurveyProgress({
        currentIndex: 0,
        visibleQuestionCount: 1,
        terminated: true,
      }).value
    ).toBeLessThan(100);
  });

  it("Q4에서 선택한 상태에 맞는 꼬리 문항 하나만 노출한다", () => {
    expect(
      getVisibleQuestionIds({ q1: "current_only", q4: "small_change" })
    ).toContain("q4_1");
    expect(
      getVisibleQuestionIds({ q1: "current_only", q4: "small_change" })
    ).not.toContain("q4_2");

    expect(
      getVisibleQuestionIds({ q1: "current_only", q4: "diagnosed" })
    ).toContain("q4_2");
    expect(
      getVisibleQuestionIds({ q1: "current_only", q4: "diagnosed" })
    ).not.toContain("q4_1");
  });

  it("Q4·Q8은 단일선택, Q4-2·Q7은 복수선택으로 유지한다", () => {
    const questionKind = (id: string) =>
      surveyQuestions.find(question => question.id === id)?.kind ?? "single";

    expect(questionKind("q4")).toBe("single");
    expect(questionKind("q4_2")).toBe("multi");
    expect(questionKind("q7")).toBe("multi");
    expect(questionKind("q8")).toBe("single");
  });

  it("Q7의 '특별히 없음'은 다른 선택과 동시에 유지하지 않는다", () => {
    expect(
      getNextMultiSelection({
        selected: ["1"],
        optionId: "2",
        exclusiveOptionIds: ["5"],
        maxSelections: 5,
      })
    ).toEqual(["1", "2"]);

    expect(
      getNextMultiSelection({
        selected: ["1", "2"],
        optionId: "5",
        exclusiveOptionIds: ["5"],
        maxSelections: 5,
      })
    ).toEqual(["5"]);

    expect(
      getNextMultiSelection({
        selected: ["5"],
        optionId: "2",
        exclusiveOptionIds: ["5"],
        maxSelections: 5,
      })
    ).toEqual(["2"]);
  });

  it("아직 계기를 느낀 적이 없으면 Q9·Q10을 건너뛴다", () => {
    const ids = getVisibleQuestionIds({
      q1: "current_only",
      q8: "not_yet",
    });

    expect(ids).not.toContain("q9");
    expect(ids).not.toContain("q10");
    expect(ids).toContain("q11");
  });

  it("정보를 찾아본 적이 없으면 Q15를 건너뛴다", () => {
    const ids = getVisibleQuestionIds({
      q1: "current_only",
      q14: "none",
    });

    expect(ids).not.toContain("q15");
    expect(ids).toContain("q16");
  });

  it("기준으로 선택한 아이에 맞는 Q29 문구만 노출한다", () => {
    const current: SurveyAnswers = {
      q1: "current_and_loss",
      q2: "current",
    };
    const departed: SurveyAnswers = {
      q1: "current_and_loss",
      q2: "recent_departed",
    };

    expect(getVisibleQuestionIds(current)).toContain("q29_current");
    expect(getVisibleQuestionIds(current)).not.toContain("q29_departed");
    expect(getVisibleQuestionIds(departed)).toContain("q29_departed");
    expect(getVisibleQuestionIds(departed)).not.toContain("q29_current");
  });

  it("이전 답변으로 생긴 꼬리 문항은 상위 답변을 바꾸면 제출값에서 제거한다", () => {
    expect(
      pruneHiddenAnswers({
        q1: "current_only",
        q4: "healthy",
        q4_1: "2",
        q8: "medical",
        q8_1a: "1",
        q8_1c: "3",
        q9: "2",
      })
    ).toEqual({
      q1: "current_only",
      q4: "healthy",
      q8: "medical",
      q8_1c: "3",
      q9: "2",
    });
  });

  it("상위 답변 변경으로 선택지에서 사라진 기존 답변도 연쇄 제거한다", () => {
    expect(
      pruneHiddenAnswers({
        q1: "loss_only",
        q2: "current",
        q29_current: "health",
        q29_1a: "2",
      })
    ).toEqual({
      q1: "loss_only",
    });
  });
});
