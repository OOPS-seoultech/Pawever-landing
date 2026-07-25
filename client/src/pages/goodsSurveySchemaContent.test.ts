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
      "아이와의 일상에서 현재 가장 꾸준히 하고 있는 것은 무엇인가요?"
    );
    expect(copyOf("q11_1b", { q11: "search" }).title).toBe(
      "처음 찾아본 정보는 어느 내용였나요?"
    );
  });

  it("민감 문항과 서비스 설명을 노션 원문 그대로 제공한다", () => {
    expect(question("q16").notice).toEqual({
      title: "민감 문항 전 안내",
      paragraphs: [
        "다음 문항부터는 마지막 돌봄이나 이별 이후의 정보에 관한 질문이 일부 나옵니다.",
        "이 질문들은 어떤 준비를 서두르게 하거나, 아이와 함께 있는 오늘을 슬프게 만들기 위한 것이 아닙니다. 오히려 필요한 정보가 너무 늦게 닿아 더 힘들었던 순간은 없었는지, 그리고 어떤 도움이라면 부담스럽지 않게 받아들일 수 있는지를 이해하기 위한 질문입니다.",
        "사람마다 편안하게 생각할 수 있는 시점이 다릅니다. 지금의 마음에 가장 가까운 답을 골라 주세요.",
      ],
    });
    expect(question("q20").notice).toEqual({
      title: "서비스 설명",
      paragraphs: [
        "이제부터는 하나의 가상 서비스를 떠올려 주세요.",
        "이 서비스는 건강한 날에는 사진·영상과 일상·건강 기록을 도와주고, 아이가 나이를 먹거나 아플 때에는 필요한 돌봄 정보를 보여줍니다. 마지막 돌봄이나 이별 이후의 정보는 처음부터 앞에 내세우지 않고, 보호자가 원하거나 실제로 필요해진 때에만 조심스럽게 제공합니다.",
        "이 서비스의 목표는 이별을 앞당겨 생각하게 하는 것이 아니라, 오늘 함께할 일을 놓치지 않고 행복한 시간과 기억을 더 많이 남기도록 돕는 것입니다.",
      ],
    });
  });

  it("Q22와 Q28은 모바일 한 행 화면에서도 원 질문을 그대로 보여준다", () => {
    const q22Title =
      "기능과 가격이 같다고 가정할 때, 각 시점에 이 서비스를 처음 소개받았다면 설치했을 가능성은 어느 정도인가요?";
    const q28Title =
      "일상·건강 기록으로 먼저 사용하다가 아래 지원이 필요할 때 추가된다면 이용 의향은 어느 정도인가요?";

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
