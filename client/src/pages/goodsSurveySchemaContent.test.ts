import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionScreen } from "./GoodsSurveyForm";
import {
  getQuestionNotice,
  getQuestionOptions,
  getQuestionTitle,
  isSurveyTerminated,
  surveyQuestions,
  type SurveyAnswers,
} from "./goodsSurveySchema";

const question = (id: string) => {
  const found = surveyQuestions.find(item => item.id === id);
  if (!found) throw new Error(`Missing survey question: ${id}`);
  return found;
};

const copyOf = (id: string, answers: SurveyAnswers = {}) => {
  const found = question(id);
  return {
    title: getQuestionTitle(found, answers),
    options: getQuestionOptions(found, answers).map(option => option.label),
  };
};

describe("노션 설문 원문", () => {
  it("기본·꼬리·모바일 분할 매트릭스 문항을 빠짐없이 제공한다", () => {
    expect(surveyQuestions).toHaveLength(76);
    expect(new Set(surveyQuestions.map(item => item.id)).size).toBe(76);
  });

  it("선택지가 5개를 넘는 문항은 노션에서 쪼개진 것만 허용한다", () => {
    // 백엔드 GoodsSurveyAnswerValidator의 문항별 허용 개수와 같이 관리한다.
    // 여기에 문항을 추가하려면 서버 검증도 함께 넓혀야 응답이 거부되지 않는다.
    expect(
      surveyQuestions
        .map(item => [item.id, getQuestionOptions(item, {}).length] as const)
        .filter(([, count]) => count > 5)
    ).toEqual([
      ["q3", 6],
      ["q12", 6],
      ["q18", 6],
      ["q29_current", 6],
      ["q29_departed", 6],
      ["q33", 7],
    ]);
  });

  it("Q1은 개정본대로 네 개만 보여주되 예전 prefer_not 응답도 종료로 처리한다", () => {
    expect(copyOf("q1").options).toEqual([
      "반려견과 살고 있으며 이별 경험은 없어요",
      "반려견과 살고 있으며 이별 경험도 있어요",
      "함께 사는 반려견은 없지만 이별 경험이 있어요",
      "반려견을 돌본 경험이 없다",
    ]);
    expect(isSurveyTerminated({ q1: "prefer_not" })).toBe(true);
    expect(isSurveyTerminated({ q1: "no_experience" })).toBe(true);
  });

  it("Q18-1은 이별 무렵 응답에만 보이고 예전 late_or_never 응답도 받아준다", () => {
    const q18_1 = question("q18_1");
    expect(q18_1.when?.({ q18: "late" })).toBe(true);
    expect(q18_1.when?.({ q18: "late_or_never" })).toBe(true);
    expect(q18_1.when?.({ q18: "never" })).toBe(false);
    expect(q18_1.when?.({ q18: "healthy" })).toBe(false);
  });

  it("현재 구현에서 축약됐던 질문을 노션 원문으로 복원한다", () => {
    expect(copyOf("q4_2", { q4: "diagnosed" }).title).toBe(
      "당시 돌봄에서 가장 큰 비중을 차지한 것은 무엇이었나요?"
    );
    expect(copyOf("q7").title).toBe(
      "아이와 일상에서 무엇을 가장 꾸준히 하고 있나요?"
    );
    // 노션 원문의 오타("내용였나요")는 코드에서 "내용이었나요"로 교정한다.
    expect(copyOf("q11_1b", { q11: "search" }).title).toBe(
      "처음 찾아본 정보는 어느 내용이었나요?"
    );
  });

  it("절반 안내는 Q16 화면이 아니라 그 다음 화면에 한 번만 붙는다", () => {
    const halfway = {
      title: "절반 정도 왔어요!",
      paragraphs: [
        "이제부터 마지막 돌봄이나 이별에 관한 질문이 등장해요.",
        "필요한 정보가 늦어 힘들었던 순간은 없었는지 어떤 도움이 부담 없이 닿을 수 있을지 알기 위한 질문이니, 지금 마음에 가까운 답을 선택해 주세요.",
      ],
    };

    // Q16 본인 화면에는 붙지 않는다.
    expect(getQuestionNotice(question("q16"), {})).toBeUndefined();

    // 꼬리 문항이 있는 경로는 꼬리 문항 화면에서 본다.
    for (const id of ["q16_1a", "q16_1b", "q16_1c", "q16_1d"]) {
      expect(getQuestionNotice(question(id), {})).toEqual(halfway);
    }

    // 꼬리 문항이 없는 경로(Q16=없음)는 다음 화면인 Q17에서 본다.
    expect(getQuestionNotice(question("q17"), { q16: "none" })).toEqual(
      halfway
    );
    expect(
      getQuestionNotice(question("q17"), { q16: "medical" })
    ).toBeUndefined();
  });

  it("Q29 진입 화면에 마지막 단계 안내를 붙인다", () => {
    const finalStep = {
      title: "마지막 단계에요.",
      paragraphs: ["세상에 하나뿐인 굿즈를 정성스레 만들어드릴게요."],
    };
    expect(getQuestionNotice(question("q29_current"), {})).toEqual(finalStep);
    expect(getQuestionNotice(question("q29_departed"), {})).toEqual(finalStep);
  });

  it("서비스 설명을 노션 원문 그대로 제공한다", () => {
    expect(question("q20").notice).toEqual({
      title: "서비스 설명",
      paragraphs: [
        "이제 하나의 가상 서비스를 떠올려 봐요.",
        "건강한 날엔 사진과 일상·건강 기록을 돕고, 아프거나 나이 들 때는 돌봄 정보를 보여줍니다. 이별 관련 정보는 필요해진 때에만 조심스럽게 전해집니다.",
        "오늘 함께할 시간과 기억을 더 많이 남기도록 돕는 게 목표에요.",
      ],
    });
  });

  it("Q22와 Q28은 모바일 한 행 화면에서도 원 질문을 그대로 보여준다", () => {
    const q22Title =
      "기능과 가격이 같다면, 각 시점에 이 서비스를 알았을 때 얼마나 설치하고 싶으신가요?";
    const q28Title =
      "일상·건강 기록으로 먼저 사용하다가 아래 지원이 추가된다면 이용 의향은 어느 정도인가요?";

    for (let index = 1; index <= 5; index += 1) {
      expect(copyOf(`q22_${index}`).title).toBe(q22Title);
      expect(copyOf(`q28_${index}`).title).toBe(q28Title);
    }
  });

  it("분할 매트릭스 화면에 현재 평가할 행을 직접 표시한다", () => {
    const q22 = renderToStaticMarkup(
      createElement(QuestionScreen, {
        question: question("q22_1"),
        answers: {},
        onAnswer: () => undefined,
      })
    );
    const q28 = renderToStaticMarkup(
      createElement(QuestionScreen, {
        question: question("q28_5"),
        answers: {},
        onAnswer: () => undefined,
      })
    );

    expect(q22).toContain("건강하고 특별한 변화가 없던 때");
    expect(q28).toContain("추억 보존과 이별 후 마음 돌봄");
  });
});
