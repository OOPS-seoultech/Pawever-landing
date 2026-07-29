import { describe, expect, it } from "vitest";
import {
  FREE_TEXT_MAX_LENGTH,
  getNextMultiSelection,
  getNextSingleSelection,
  hasMinimumAnswers,
  pruneHiddenAnswers,
  getSurveyProgress,
  getVisibleQuestionIds,
  getVisibleScreens,
  surveyQuestions,
  type SurveyAnswers,
} from "./goodsSurveySchema";

describe("굿즈 설문 분기", () => {
  it("복수선택을 모두 해제하면 응답 자체를 지운다", () => {
    // 서버는 빈 배열을 거부한다. 저장 요청에 실려 나가면 안 된다.
    expect(pruneHiddenAnswers({ q1: "current_only", q7: [] })).toEqual({
      q1: "current_only",
    });
    expect(
      getNextMultiSelection({
        selected: ["3"],
        optionId: "3",
        maxSelections: 5,
      })
    ).toEqual([]);
  });

  it("단일선택도 고른 항목을 다시 누르면 취소된다", () => {
    // 건너뛸 수 있는 문항에서 실수로 누르면 되돌릴 방법이 있어야 한다.
    expect(getNextSingleSelection([], "2")).toBe("2");
    expect(getNextSingleSelection(["3"], "2")).toBe("2");
    expect(getNextSingleSelection(["2"], "2")).toEqual([]);
  });

  it("단일선택을 취소하면 응답과 직접 입력값이 함께 지워진다", () => {
    // Q17의 6번은 자유 입력칸을 여는 선택지다.
    const answered: SurveyAnswers = {
      q1: "current_only",
      q17: ["6"],
      q17_text: "직접 적은 내용",
    };
    expect(pruneHiddenAnswers(answered).q17_text).toBe("직접 적은 내용");

    const cleared = { ...answered, q17: getNextSingleSelection(["6"], "6") };
    const pruned = pruneHiddenAnswers(cleared);
    expect(pruned.q17).toBeUndefined();
    expect(pruned.q17_text).toBeUndefined();
  });

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

  it("노션에서 복수선택인 문항만 복수선택으로 둔다", () => {
    // 백엔드 MULTI_QUESTION_IDS와 같은 목록이어야 한다.
    expect(
      surveyQuestions
        .filter(question => question.kind === "multi")
        .map(question => question.id)
    ).toEqual(["q4", "q4_2", "q7", "q8", "q11_1a", "q17", "q27", "q30"]);
  });

  it("직접 입력을 고른 동안에만 자유 입력값을 남긴다", () => {
    const base = { q1: "current_only", q2: "current", q16: "none" };

    // 6번(직접 입력)을 고르면 q17_text가 유지된다.
    expect(
      pruneHiddenAnswers({ ...base, q17: ["6"], q17_text: "장난감" })
    ).toMatchObject({ q17: ["6"], q17_text: "장난감" });

    // 선택을 바꾸면 입력값도 같이 지워진다.
    expect(
      pruneHiddenAnswers({ ...base, q17: ["1"], q17_text: "장난감" })
    ).not.toHaveProperty("q17_text");

    // 길이 제한을 넘으면 잘라서 보낸다.
    const long = "가".repeat(FREE_TEXT_MAX_LENGTH + 20);
    expect(
      pruneHiddenAnswers({ ...base, q17: ["6"], q17_text: long }).q17_text
    ).toHaveLength(FREE_TEXT_MAX_LENGTH);
  });

  it("Q4에서 여러 상태를 고르면 해당 꼬리 문항이 모두 열린다", () => {
    // "2 + 3 동시 선택 시 질문 2개 동시 노출" — 노션 댓글
    const visible = getVisibleQuestionIds({
      q1: "current_only",
      q2: "current",
      q4: ["small_change", "diagnosed"],
    });
    expect(visible).toContain("q4_1");
    expect(visible).toContain("q4_2");

    const onlyOne = getVisibleQuestionIds({
      q1: "current_only",
      q2: "current",
      q4: ["small_change"],
    });
    expect(onlyOne).toContain("q4_1");
    expect(onlyOne).not.toContain("q4_2");
  });

  it("Q8에서 여러 계기를 고르면 꼬리 문항이 고른 만큼 열린다", () => {
    const visible = getVisibleQuestionIds({
      q1: "current_only",
      q2: "current",
      q8: ["anniversary", "medical", "others"],
    });
    expect(visible).toContain("q8_1a");
    expect(visible).toContain("q8_1c");
    expect(visible).toContain("q8_1d");
    expect(visible).not.toContain("q8_1b");
  });

  it("Q8에서 '아직 생각해본 적 없다'를 고르면 Q9·Q10을 건너뛴다", () => {
    const visible = getVisibleQuestionIds({
      q1: "current_only",
      q2: "current",
      q8: ["not_yet"],
    });
    expect(visible).not.toContain("q9");
    expect(visible).not.toContain("q10");
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
        q4: ["healthy"],
        q4_1: "2",
        q8: ["medical"],
        q8_1a: "1",
        q8_1c: "3",
        q9: "2",
      })
    ).toEqual({
      q1: "current_only",
      q4: ["healthy"],
      q8: ["medical"],
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

  it("노션 구분선대로 13페이지에 문항을 나눠 담는다", () => {
    // 페이지 번호가 빠진 문항이 있으면 화면 묶기가 어긋난다.
    expect(surveyQuestions.every(question => question.page >= 1)).toBe(true);

    const pages = new Map<number, string[]>();
    for (const question of surveyQuestions) {
      pages.set(question.page, [
        ...(pages.get(question.page) ?? []),
        question.id,
      ]);
    }
    expect([...pages.keys()].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(pages.get(1)).toEqual(["q1", "q2", "q3", "q4"]);
    expect(pages.get(13)).toEqual(["q31", "q32", "q33"]);

    // 페이지 번호는 문항 순서와 어긋나면 안 된다(뒤로 돌아가는 페이지 금지).
    const order = surveyQuestions.map(question => question.page);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("한 화면에 같은 페이지의 보이는 문항을 모두 담는다", () => {
    const screens = getVisibleScreens({
      q1: "current_only",
      q2: "current",
      q4: ["small_change", "diagnosed"],
    });

    const page2 = screens.find(screen => screen.page === 2);
    // Q4에서 두 상태를 골랐으므로 꼬리 문항 둘 다 같은 화면에 들어온다.
    expect(page2?.questions.map(item => item.id)).toEqual([
      "q4_1",
      "q4_2",
      "q5",
      "q6",
      "q7",
      "q8",
    ]);

    // 조건에 맞지 않는 꼬리 문항은 그 화면에서 빠진다.
    const onlyOne = getVisibleScreens({
      q1: "current_only",
      q2: "current",
      q4: ["small_change"],
    }).find(screen => screen.page === 2);
    expect(onlyOne?.questions.map(item => item.id)).toEqual([
      "q4_1",
      "q5",
      "q6",
      "q7",
      "q8",
    ]);
  });

  it("Q29는 Q2에서 고른 아이 기준으로 A·B 한쪽만 보여준다", () => {
    const q29Of = (q2: string) =>
      getVisibleQuestionIds({ q1: "current_and_loss", q2 }).filter(id =>
        id.startsWith("q29_")
      );

    expect(q29Of("current")).toEqual(["q29_current"]);
    expect(q29Of("recent_departed")).toEqual(["q29_departed"]);
    expect(q29Of("longest")).toEqual(["q29_departed"]);
  });

  it("건너뛰기는 노션에서 허용한 Q19-1A에만 둔다", () => {
    expect(
      surveyQuestions
        .filter(question => question.skippable)
        .map(question => question.id)
    ).toEqual(["q19_1a"]);
  });

  it("자격 문항만 답하고 나머지를 건너뛰면 무료 제작 예약 기준에 미달한다", () => {
    expect(hasMinimumAnswers({ q1: "current_only", q2: "current" })).toBe(
      false
    );

    expect(
      hasMinimumAnswers({
        q1: "current_only",
        q2: "current",
        q3: "3",
        q4: "healthy",
        q5: "2",
        q6: "1",
      })
    ).toBe(true);
  });
});
