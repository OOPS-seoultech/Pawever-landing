import { describe, expect, it } from "vitest";
import {
  getNextMultiSelection,
  getVisibleQuestionIds,
  surveyQuestions,
  type SurveyAnswers,
} from "./goodsSurveySchema";

describe("굿즈 설문 분기", () => {
  it("양육 경험이 없거나 응답을 원하지 않으면 첫 문항에서 종료한다", () => {
    expect(getVisibleQuestionIds({ q1: "no_experience" })).toEqual(["q1"]);
    expect(getVisibleQuestionIds({ q1: "prefer_not" })).toEqual(["q1"]);
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
});
