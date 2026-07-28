import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuestionScreen } from "./GoodsSurveyForm";
import {
  getQuestionOptions,
  getQuestionTitle,
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
    expect(
      surveyQuestions.every(item => getQuestionOptions(item, {}).length <= 5)
    ).toBe(true);
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

  it("민감 문항과 서비스 설명을 노션 원문 그대로 제공한다", () => {
    expect(question("q16").notice).toEqual({
      title: "절반 정도 왔어요!",
      paragraphs: [
        "이제부터 마지막 돌봄이나 이별에 관한 질문이 등장해요.",
        "필요한 정보가 늦어 힘들었던 순간은 없었는지 어떤 도움이 부담 없이 닿을 수 있을지 알기 위한 질문이니, 지금 마음에 가까운 답을 선택해 주세요.",
      ],
    });
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
