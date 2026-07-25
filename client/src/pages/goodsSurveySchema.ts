export type SurveyAnswer = string | string[];
export type SurveyAnswers = Record<string, SurveyAnswer | undefined>;

export interface SurveyOption {
  id: string;
  label: string;
}

export interface SurveyNotice {
  title: string;
  paragraphs: string[];
}

export interface SurveyQuestion {
  id: string;
  number: string;
  section: string;
  title: string | ((answers: SurveyAnswers) => string);
  options: SurveyOption[] | ((answers: SurveyAnswers) => SurveyOption[]);
  kind?: "single" | "multi";
  maxSelections?: number;
  exclusiveOptionIds?: string[];
  optional?: boolean;
  nonSkippable?: boolean;
  helper?: string;
  notice?: SurveyNotice;
  matrix?: {
    title: string;
    row: string;
    index: number;
    total: number;
  };
  when?: (answers: SurveyAnswers) => boolean;
}

const numbered = (...labels: string[]): SurveyOption[] =>
  labels.map((label, index) => ({ id: String(index + 1), label }));

const named = (...options: Array<[string, string]>): SurveyOption[] =>
  options.map(([id, label]) => ({ id, label }));

const answerIs = (answers: SurveyAnswers, questionId: string, value: string) =>
  answers[questionId] === value;

const answerIn = (
  answers: SurveyAnswers,
  questionId: string,
  values: string[]
) => {
  const answer = answers[questionId];
  return typeof answer === "string" && values.includes(answer);
};

export const getNextMultiSelection = ({
  selected,
  optionId,
  exclusiveOptionIds = [],
  maxSelections,
}: {
  selected: string[];
  optionId: string;
  exclusiveOptionIds?: string[];
  maxSelections: number;
}) => {
  if (selected.includes(optionId)) {
    return selected.filter(id => id !== optionId);
  }

  if (exclusiveOptionIds.includes(optionId)) {
    return [optionId];
  }

  const withoutExclusive = selected.filter(
    id => !exclusiveOptionIds.includes(id)
  );
  if (withoutExclusive.length >= maxSelections) {
    return withoutExclusive;
  }

  return [...withoutExclusive, optionId];
};

const scaleLikelihood = numbered(
  "전혀 설치하지 않았을 것",
  "아마 설치하지 않았을 것",
  "반반이다",
  "아마 설치했을 것",
  "반드시 설치했을 것"
);

const scaleUsage = numbered(
  "전혀 이용하지 않음",
  "이용하지 않을 것 같음",
  "반반이다",
  "이용할 것 같음",
  "반드시 이용함"
);

const sensitiveNotice: SurveyNotice = {
  title: "민감 문항 전 안내",
  paragraphs: [
    "다음 문항부터는 마지막 돌봄이나 이별 이후의 정보에 관한 질문이 일부 나옵니다.",
    "이 질문들은 어떤 준비를 서두르게 하거나, 아이와 함께 있는 오늘을 슬프게 만들기 위한 것이 아닙니다. 오히려 필요한 정보가 너무 늦게 닿아 더 힘들었던 순간은 없었는지, 그리고 어떤 도움이라면 부담스럽지 않게 받아들일 수 있는지를 이해하기 위한 질문입니다.",
    "사람마다 편안하게 생각할 수 있는 시점이 다릅니다. 지금의 마음에 가장 가까운 답을 골라 주세요.",
  ],
};

const serviceNotice: SurveyNotice = {
  title: "서비스 설명",
  paragraphs: [
    "이제부터는 하나의 가상 서비스를 떠올려 주세요.",
    "이 서비스는 건강한 날에는 사진·영상과 일상·건강 기록을 도와주고, 아이가 나이를 먹거나 아플 때에는 필요한 돌봄 정보를 보여줍니다. 마지막 돌봄이나 이별 이후의 정보는 처음부터 앞에 내세우지 않고, 보호자가 원하거나 실제로 필요해진 때에만 조심스럽게 제공합니다.",
    "이 서비스의 목표는 이별을 앞당겨 생각하게 하는 것이 아니라, 오늘 함께할 일을 놓치지 않고 행복한 시간과 기억을 더 많이 남기도록 돕는 것입니다.",
  ],
};

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: "q1",
    number: "Q1",
    section: "A. 아이와 함께하는 지금",
    title: "현재 또는 과거의 반려견 양육 경험과 가장 가까운 것은 무엇인가요?",
    nonSkippable: true,
    options: named(
      ["current_only", "현재 반려견과 살고 있으며 과거 이별 경험은 없다"],
      ["current_and_loss", "현재 반려견과 살고 있으며 과거 이별 경험도 있다"],
      ["loss_only", "현재 함께 사는 반려견은 없지만 이별 경험이 있다"],
      ["no_experience", "반려견을 주로 돌본 경험이 없다"],
      ["prefer_not", "답하고 싶지 않다"]
    ),
  },
  {
    id: "q2",
    number: "Q2",
    section: "A. 아이와 함께하는 지금",
    title: "이번 설문에서 어떤 아이를 떠올리며 답하시겠어요?",
    nonSkippable: true,
    options: answers => {
      if (answerIs(answers, "q1", "current_only")) {
        return named(["current", "현재 가장 많이 돌보고 있는 아이"]);
      }
      if (answerIs(answers, "q1", "loss_only")) {
        return named(
          ["recent_departed", "가장 최근에 이별한 아이"],
          ["longest", "가장 오랜 기간 주로 돌보았던 아이"]
        );
      }
      return named(
        ["current", "현재 가장 많이 돌보고 있는 아이"],
        ["recent_departed", "가장 최근에 이별한 아이"],
        ["longest", "가장 오랜 기간 주로 돌보았던 아이"]
      );
    },
  },
  {
    id: "q3",
    number: "Q3",
    section: "A. 아이와 함께하는 지금",
    title: "아이의 현재 나이 또는 이별 당시 나이는 몇 살인가요?",
    options: numbered(
      "2세 이하",
      "3~5세",
      "6~8세",
      "9~11세",
      "12세 이상 또는 정확히 모름"
    ),
  },
  {
    id: "q4",
    number: "Q4",
    section: "A. 아이와 함께하는 지금",
    title:
      "현재 아이의 상태 또는 이별 전 마지막 6개월의 상태와 가장 가까운 것은 무엇인가요?",
    options: named(
      ["healthy", "특별한 증상 없이 건강한 일상을 보냈다"],
      ["small_change", "작은 노화나 이상 변화를 느꼈지만 일상은 비슷했다"],
      ["diagnosed", "질환을 진단받았지만 치료·관리하며 비교적 안정적이었다"],
      ["continuous_care", "악화와 회복을 반복하거나 지속적인 돌봄이 필요했다"],
      ["sudden", "갑작스러운 사고·급성 질환으로 위 단계를 거의 겪지 못했다"]
    ),
  },
  {
    id: "q4_1",
    number: "Q4-1",
    section: "A. 아이와 함께하는 지금",
    title: "가장 먼저 눈에 들어온 변화는 무엇이었나요?",
    options: numbered(
      "흰털·눈·체형 등 겉모습의 변화",
      "걷기·점프·놀이 등 움직임의 변화",
      "잠·활동량·반응 등 생활 리듬의 변화",
      "식사·물·배변 등 기본 습관의 변화",
      "기침·호흡·통증처럼 건강이 걱정되는 신호"
    ),
    when: answers => answerIs(answers, "q4", "small_change"),
  },
  {
    id: "q4_2",
    number: "Q4-2",
    section: "A. 아이와 함께하는 지금",
    title: "당시 돌봄에서 가장 큰 비중을 차지한 것은 무엇이었나요?",
    options: numbered(
      "정기 검진과 약·처방식 관리",
      "증상과 일상 상태의 반복 관찰",
      "입원·수술·응급진료 대응",
      "이동·식사·배변 등 일상 보조",
      "치료 방향과 삶의 질에 관한 결정"
    ),
    kind: "multi",
    helper: "해당하는 것을 모두 선택할 수 있어요.",
    when: answers => answerIn(answers, "q4", ["diagnosed", "continuous_care"]),
  },
  {
    id: "q5",
    number: "Q5",
    section: "A. 아이와 함께하는 지금",
    title: "아이와 함께한 기간은 얼마나 되나요?",
    options: numbered("2년 미만", "2~4년", "5~7년", "8~10년", "11년 이상"),
  },
  {
    id: "q6",
    number: "Q6",
    section: "A. 아이와 함께하는 지금",
    title:
      "최근 1년 또는 이별 전 마지막 1년 동안 지출한 병원비는 대략 얼마인가요?",
    options: numbered(
      "10만 원 미만",
      "10만 원 이상~30만 원 미만",
      "30만 원 이상~100만 원 미만",
      "100만 원 이상",
      "잘 모르거나 답하고 싶지 않다"
    ),
  },
  {
    id: "q7",
    number: "Q7",
    section: "A. 아이와 함께하는 지금",
    title: "아이와의 일상에서 현재 가장 꾸준히 하고 있는 것은 무엇인가요?",
    options: numbered(
      "사진·영상·일기 등 추억 기록",
      "식사·배변·약·병원 등 건강 기록",
      "산책·놀이·여행 등 함께하는 활동",
      "가족과 돌봄 일정·상태 공유",
      "특별히 꾸준히 하는 것은 없다"
    ),
    kind: "multi",
    exclusiveOptionIds: ["5"],
    helper: "해당하는 것을 모두 선택할 수 있어요.",
  },
  {
    id: "q8",
    number: "Q8",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title:
      "아이와의 시간이 영원하지 않을 수 있다고 처음 실감하게 한 계기는 무엇인가요?",
    options: named(
      ["anniversary", "생일·입양기념일 또는 예전 사진을 보았을 때"],
      ["change", "겉모습이나 평소 행동이 달라졌을 때"],
      ["medical", "병원 진료·검사·질환 진단을 경험했을 때"],
      ["others", "다른 반려동물의 노화·아픔·이별을 접했을 때"],
      ["not_yet", "아직 그런 생각을 해본 적이 없다"]
    ),
  },
  {
    id: "q8_1a",
    number: "Q8-1A",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "그중 가장 기억에 남는 순간은 무엇인가요?",
    options: numbered(
      "생일이나 입양기념일에 나이를 세어본 순간",
      "어린 시절 사진·영상을 다시 본 순간",
      "처음 만난 날과 지금을 비교해 본 순간",
      "함께한 계절이나 햇수가 문득 떠오른 순간",
      "평범하게 행복한데 시간이 멈췄으면 했던 순간"
    ),
    when: answers => answerIs(answers, "q8", "anniversary"),
  },
  {
    id: "q8_1b",
    number: "Q8-1B",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "어떤 변화가 그런 생각을 불러왔나요?",
    options: numbered(
      "흰털·눈·체형 등 겉모습의 변화",
      "걷기·점프·산책 속도의 변화",
      "잠·놀이·반응 등 생활 리듬의 변화",
      "식사·배변·호흡 등 건강 신호의 변화",
      "예전에는 쉽게 하던 일을 망설이는 모습"
    ),
    when: answers => answerIs(answers, "q8", "change"),
  },
  {
    id: "q8_1c",
    number: "Q8-1C",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "어떤 의료 경험이 가장 크게 다가왔나요?",
    options: numbered(
      "처음으로 큰 검사나 병원비를 경험한 일",
      "만성 또는 중증 질환 진단을 들은 일",
      "입원·수술·응급진료를 경험한 일",
      "증상 악화와 회복을 반복한 일",
      "수의사에게 노화나 앞으로의 시간을 설명 들은 일"
    ),
    when: answers => answerIs(answers, "q8", "medical"),
  },
  {
    id: "q8_1d",
    number: "Q8-1D",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "어떤 경로의 이야기가 가장 크게 다가왔나요?",
    options: numbered(
      "가족·친구·지인의 경험",
      "반려동물 커뮤니티의 사연",
      "SNS·유튜브의 사진이나 영상",
      "뉴스·방송·책의 이야기",
      "산책이나 병원에서 우연히 본 다른 아이의 모습"
    ),
    when: answers => answerIs(answers, "q8", "others"),
  },
  {
    id: "q9",
    number: "Q9",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "그 계기 전에는 아이와의 이별 가능성을 얼마나 자주 떠올렸나요?",
    options: numbered(
      "전혀 떠올리지 않았다",
      "거의 떠올리지 않았다",
      "가끔 떠올렸다",
      "자주 떠올렸다",
      "매우 자주 떠올렸다"
    ),
    when: answers => !answerIs(answers, "q8", "not_yet"),
  },
  {
    id: "q10",
    number: "Q10",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "그 순간 가장 먼저 든 마음과 가까운 것은 무엇인가요?",
    options: numbered(
      "지금을 더 소중하게 보내고 싶었다",
      "더 잘 돌봐야겠다는 책임감을 느꼈다",
      "불안하고 무엇을 해야 할지 막막했다",
      "미안함이나 슬픔이 먼저 들었다",
      "아직 먼 일이라 생각하거나 최대한 생각을 피하고 싶었다"
    ),
    when: answers => !answerIs(answers, "q8", "not_yet"),
  },
  {
    id: "q11",
    number: "Q11",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: answers =>
      answerIs(answers, "q8", "not_yet")
        ? "최근 아이를 위해 달라진 행동 중 가장 먼저 한 것은 무엇인가요?"
        : "그 뒤 가장 먼저 한 행동은 무엇인가요?",
    options: named(
      ["record", "아이의 상태나 일상을 더 자주 관찰·기록했다"],
      ["search", "인터넷·앱·책 등에서 정보를 찾아봤다"],
      ["consult", "병원이나 주변 사람에게 상담·질문했다"],
      ["prepare", "상품을 구매하거나 구체적인 준비를 시작했다"],
      ["none", "특별한 행동을 하지 않았다"]
    ),
  },
  {
    id: "q11_1a",
    number: "Q11-1A",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "무엇을 가장 먼저 관찰하거나 기록했나요?",
    options: numbered(
      "식사·물·배변",
      "산책·놀이·활동량",
      "잠·호흡·기침 등 건강 신호",
      "약·진료·검사 결과",
      "사진·영상과 함께한 일상"
    ),
    when: answers => answerIs(answers, "q11", "record"),
  },
  {
    id: "q11_1b",
    number: "Q11-1B",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "처음 찾아본 정보는 어느 내용이었나요?",
    options: named(
      ["symptom", "증상의 원인과 응급 여부"],
      ["treatment", "검사·치료·질환의 예후"],
      ["care", "집에서의 돌봄과 삶의 질"],
      ["cost", "병원비·보험·공공 지원"],
      ["farewell", "마지막 돌봄·장례·추억·펫로스"]
    ),
    when: answers => answerIs(answers, "q11", "search"),
  },
  {
    id: "q11_2b",
    number: "Q11-2B",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "그중 가장 먼저 찾아본 것은 무엇인가요?",
    options: numbered(
      "마지막 시기에 나타날 수 있는 변화와 돌봄",
      "치료 선택·완화 돌봄·삶의 질 판단",
      "장례업체·절차·방식·비용",
      "사진·발도장·털 등 추억을 남기는 방법",
      "펫로스와 이별 후 마음을 돌보는 방법"
    ),
    when: answers => answerIs(answers, "q11_1b", "farewell"),
  },
  {
    id: "q11_1c",
    number: "Q11-1C",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "가장 먼저 누구에게 이야기했나요?",
    options: numbered(
      "다니던 동물병원·수의사",
      "다른 동물병원·전문가",
      "함께 사는 가족·파트너",
      "친구·지인·다른 반려인",
      "온라인 상담·커뮤니티"
    ),
    when: answers => answerIs(answers, "q11", "consult"),
  },
  {
    id: "q11_1d",
    number: "Q11-1D",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "가장 먼저 구매하거나 준비한 것은 무엇인가요?",
    options: numbered(
      "검진·치료·약·처방식",
      "영양제·계단·유모차·간호용품",
      "보험 가입·의료비 마련",
      "사진·앨범·여행 등 함께할 추억",
      "마지막 돌봄·장례·추모 관련 준비"
    ),
    when: answers => answerIs(answers, "q11", "prepare"),
  },
  {
    id: "q11_1e",
    number: "Q11-1E",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "행동으로 옮기지 않은 가장 큰 이유는 무엇인가요?",
    options: numbered(
      "아직 필요하지 않다고 생각했다",
      "생각하면 너무 슬프거나 불안했다",
      "무엇부터 해야 할지 몰랐다",
      "믿을 만한 정보나 서비스를 찾기 어려웠다",
      "시간·비용·가족 의견 때문에 미뤘다"
    ),
    when: answers => answerIs(answers, "q11", "none"),
  },
  {
    id: "q12",
    number: "Q12",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "첫 행동은 계기를 느낀 뒤 얼마나 지나서 시작했나요?",
    options: numbered(
      "같은 날",
      "2~3일 안에",
      "1주일 안에",
      "1개월 이후",
      "계기 이전부터 했거나 행동하지 않았다"
    ),
  },
  {
    id: "q13",
    number: "Q13",
    section: "B. 아이와의 시간이 조금 다르게 보이기 시작한 순간",
    title: "그 행동은 어느 정도 이어졌나요?",
    options: numbered(
      "한두 번만 했다",
      "며칠 동안 했다",
      "몇 주 또는 몇 달 동안 했다",
      "지금까지 습관처럼 이어지고 있다",
      "행동하지 않았거나 기억나지 않는다"
    ),
  },
  {
    id: "q14",
    number: "Q14",
    section: "C. 실제로 찾은 정보와 준비",
    title: "아이와 관련된 정보를 찾아본 경험은 어느 쪽에 가깝나요?",
    options: named(
      ["health_only", "건강·질환 정보만 찾아봤다"],
      ["future_only", "앞으로의 돌봄·이별 관련 정보만 찾아봤다"],
      ["health_first", "두 종류를 찾아봤고 건강·질환 정보가 먼저였다"],
      ["future_first", "두 종류를 찾아봤고 앞으로의 돌봄·이별 정보가 먼저였다"],
      ["none", "정보를 찾아본 적이 없거나 기억나지 않는다"]
    ),
  },
  {
    id: "q14_1h",
    number: "Q14-1H",
    section: "C. 실제로 찾은 정보와 준비",
    title: "건강·질환 정보 중 가장 먼저 찾아본 것은 무엇인가요?",
    options: numbered(
      "증상 원인과 응급 여부",
      "병원·검사·치료 방법",
      "질환의 예후와 회복 가능성",
      "약·식단·재활·집에서의 관리",
      "다른 반려인의 치료 경험"
    ),
    when: answers => answerIn(answers, "q14", ["health_only", "health_first"]),
  },
  {
    id: "q14_1f",
    number: "Q14-1F",
    section: "C. 실제로 찾은 정보와 준비",
    title: "앞으로의 돌봄·이별 정보 중 가장 먼저 찾아본 것은 무엇인가요?",
    options: numbered(
      "삶의 질과 치료 선택 기준",
      "마지막 시기의 변화와 집에서의 돌봄",
      "장례업체·절차·방식·비용",
      "사진·발도장·털 등 추억 보존",
      "펫로스·상담·이별 후 해야 할 일"
    ),
    when: answers => answerIn(answers, "q14", ["future_only", "future_first"]),
  },
  {
    id: "q15",
    number: "Q15",
    section: "C. 실제로 찾은 정보와 준비",
    title: "정보를 처음 찾을 때 가장 먼저 이용한 곳은 어디였나요?",
    options: numbered(
      "네이버·구글 등 검색 포털",
      "SNS·유튜브·반려동물 커뮤니티",
      "동물병원·수의사·전문가",
      "가족·친구·다른 반려인",
      "반려동물 앱·공공기관·관련 업체"
    ),
    when: answers => !answerIs(answers, "q14", "none"),
  },
  {
    id: "q16",
    number: "Q16",
    section: "C. 실제로 찾은 정보와 준비",
    title: "실제로 알아본 기관·서비스와 가장 가까운 범주는 무엇인가요?",
    options: named(
      ["medical", "병원·검사·치료 서비스"],
      ["finance", "보험·의료비·공공 지원"],
      ["care", "간병·재활·삶의 질 지원"],
      ["farewell", "장례·추억 보존·펫로스 지원"],
      ["none", "관련 기관이나 서비스를 알아본 적이 없다"]
    ),
    notice: sensitiveNotice,
  },
  {
    id: "q16_1a",
    number: "Q16-1A",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 먼저 알아본 것은 무엇인가요?",
    options: numbered(
      "다니던 동물병원의 추가 진료",
      "전문·대학동물병원",
      "24시간 응급동물병원",
      "다른 병원의 2차 의견",
      "비대면·방문 상담"
    ),
    when: answers => answerIs(answers, "q16", "medical"),
  },
  {
    id: "q16_1b",
    number: "Q16-1B",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 먼저 알아본 것은 무엇인가요?",
    options: numbered(
      "펫보험 가입·보장 내용",
      "병원비 비교·예상 비용",
      "지자체·공공기관 지원 사업",
      "카드·할부·의료비 마련 방법",
      "민간단체·모금 지원"
    ),
    when: answers => answerIs(answers, "q16", "finance"),
  },
  {
    id: "q16_1c",
    number: "Q16-1C",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 먼저 알아본 것은 무엇인가요?",
    options: numbered(
      "재활·물리치료",
      "방문 돌봄·간병",
      "통증 관리·완화 돌봄",
      "삶의 질을 확인하는 방법",
      "치료 방향을 상담하는 서비스"
    ),
    when: answers => answerIs(answers, "q16", "care"),
  },
  {
    id: "q16_1d",
    number: "Q16-1D",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 먼저 알아본 것은 무엇인가요?",
    options: numbered(
      "장례업체·장묘시설",
      "장례 방식·절차·비용",
      "사진·앨범·발도장·털 보관",
      "추모 공간·메모리얼 상품",
      "펫로스 상담·모임·콘텐츠"
    ),
    when: answers => answerIs(answers, "q16", "farewell"),
  },
  {
    id: "q17",
    number: "Q17",
    section: "C. 실제로 찾은 정보와 준비",
    title:
      "실제로 비용을 지불하거나 구체적으로 준비한 것과 가장 가까운 것은 무엇인가요?",
    options: numbered(
      "검진·치료·약·건강관리",
      "보험 가입·의료비 마련",
      "사진·여행·앨범 등 함께할 추억",
      "마지막 돌봄·장례·추모·상담",
      "비용을 지불하거나 준비한 적이 없다"
    ),
  },
  {
    id: "q18",
    number: "Q18",
    section: "C. 실제로 찾은 정보와 준비",
    title:
      "마지막 돌봄·장례·추억 보존·펫로스 중 하나라도 처음 찾아본 시점은 언제인가요?",
    options: named(
      ["healthy", "건강하고 특별한 변화가 없던 때"],
      ["aging", "나이가 들거나 작은 변화를 느낀 때"],
      ["diagnosis", "이상 증상 또는 질환 진단이 생긴 때"],
      ["care", "간호가 늘거나 앞으로의 시간을 설명 들은 때"],
      ["late_or_never", "이별 무렵·이별 후 또는 아직 찾아보지 않음"]
    ),
  },
  {
    id: "q18_1",
    number: "Q18-1",
    section: "C. 실제로 찾은 정보와 준비",
    title: "조금 더 가까운 답을 골라 주세요.",
    options: numbered(
      "이별이 임박했다고 느낀 때",
      "이별한 당일",
      "이별한 뒤 며칠 또는 그 이후",
      "아직 찾아본 적이 없다",
      "기억나지 않거나 답하고 싶지 않다"
    ),
    when: answers => answerIs(answers, "q18", "late_or_never"),
  },
  {
    id: "q19",
    number: "Q19",
    section: "C. 실제로 찾은 정보와 준비",
    title: "관련 정보를 더 일찍 접하기 어려웠던 가장 큰 이유는 무엇인가요?",
    options: named(
      ["emotion", "마음이 힘들거나 불길하게 느껴져서"],
      ["timing", "아직 알아볼 시기가 아니라고 생각해서"],
      ["search", "무엇을 어떻게 찾아야 할지 몰라서"],
      ["trust", "서비스의 신뢰·비용·상업성이 걱정돼서"],
      ["other", "큰 어려움이 없었거나 다른 이유가 있어서"]
    ),
  },
  {
    id: "q19_1a",
    number: "Q19-1A",
    section: "C. 실제로 찾은 정보와 준비",
    title: "어떤 마음이 가장 컸나요?",
    options: numbered(
      "알아보면 나쁜 일이 생길 것 같았다",
      "아이를 포기하거나 배신하는 느낌이었다",
      "너무 슬프고 불안해질 것 같았다",
      "좋지 않은 사실을 확인할까 두려웠다",
      "가족에게도 슬픈 생각을 안길 것 같았다"
    ),
    when: answers => answerIs(answers, "q19", "emotion"),
  },
  {
    id: "q19_1b",
    number: "Q19-1B",
    section: "C. 실제로 찾은 정보와 준비",
    title: "왜 아직 이르다고 느꼈나요?",
    options: numbered(
      "아이가 건강했기 때문에",
      "나이가 아직 어리다고 생각했기 때문에",
      "뚜렷한 증상이 없었기 때문에",
      "병원에서 관련 설명을 듣지 못했기 때문에",
      "급해지면 알아봐도 된다고 생각했기 때문에"
    ),
    when: answers => answerIs(answers, "q19", "timing"),
  },
  {
    id: "q19_1c",
    number: "Q19-1C",
    section: "C. 실제로 찾은 정보와 준비",
    title: "무엇이 가장 어려웠나요?",
    options: numbered(
      "어떤 검색어를 써야 할지 몰랐다",
      "정보가 너무 많고 서로 달랐다",
      "광고와 객관적 정보를 구분하기 어려웠다",
      "내 아이에게 맞는 정보를 찾기 어려웠다",
      "전체 과정과 순서를 알 수 없었다"
    ),
    when: answers => answerIs(answers, "q19", "search"),
  },
  {
    id: "q19_1d",
    number: "Q19-1D",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 걱정된 부분은 무엇이었나요?",
    options: numbered(
      "업체나 정보의 신뢰성",
      "비용과 추가 결제",
      "지나치게 상업적인 권유",
      "개인정보·건강기록의 이용",
      "결정을 재촉하거나 불안을 키우는 표현"
    ),
    when: answers => answerIs(answers, "q19", "trust"),
  },
  {
    id: "q19_1e",
    number: "Q19-1E",
    section: "C. 실제로 찾은 정보와 준비",
    title: "가장 가까운 답을 골라 주세요.",
    options: numbered(
      "정보를 찾는 데 큰 어려움이 없었다",
      "시간과 돌봄 여유가 부족했다",
      "가족과 의견이 달랐다",
      "이미 필요한 정보를 알고 있었다",
      "다른 이유가 있다"
    ),
    when: answers => answerIs(answers, "q19", "other"),
  },
  {
    id: "q20",
    number: "Q20",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title:
      "이 서비스를 처음 소개받는다면 가장 편안하게 느껴지는 표현은 무엇인가요?",
    options: numbered(
      "매일의 건강과 추억을 함께 기록하는 서비스",
      "나이에 따라 달라지는 돌봄을 알려주는 서비스",
      "아이와 더 많이 함께하고 기억하도록 돕는 서비스",
      "아픈 날부터 회복과 일상까지 곁에 있는 서비스",
      "어느 표현도 아직은 부담스럽다"
    ),
    notice: serviceNotice,
  },
  {
    id: "q21",
    number: "Q21",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title:
      "이 서비스를 거부감 없이 설치할 수 있는 가장 이른 시점은 언제인가요?",
    options: named(
      ["healthy", "건강한 일상기·입양기념일·정기검진 때"],
      ["aging", "작은 노화 변화를 처음 느낀 때"],
      ["signal", "평소와 다른 건강 신호를 처음 본 때"],
      ["diagnosis", "질환 진단을 받거나 돌봄이 늘어난 때"],
      ["later", "그보다 나중이거나 설치하고 싶지 않다"]
    ),
  },
  {
    id: "q21_1",
    number: "Q21-1",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "가장 가까운 시점은 언제인가요?",
    options: numbered(
      "수의사에게 앞으로의 시간을 설명 들은 때",
      "이별이 임박했다고 느낀 때",
      "이별한 뒤",
      "어느 시점에도 설치하고 싶지 않다",
      "아직 잘 모르겠다"
    ),
    when: answers => answerIs(answers, "q21", "later"),
  },
  ...[
    "건강하고 특별한 변화가 없던 때",
    "작은 노화 변화를 처음 느낀 때",
    "평소와 다른 건강 신호를 처음 본 때",
    "질환 진단을 받거나 돌봄이 늘어난 때",
    "앞으로의 시간을 설명 들은 때",
  ].map(
    (row, index): SurveyQuestion => ({
      id: `q22_${index + 1}`,
      number: "Q22",
      section: "D. 부담 없이 시작할 수 있는 서비스",
      title:
        "기능과 가격이 같다고 가정할 때, 각 시점에 이 서비스를 처음 소개받았다면 설치했을 가능성은 어느 정도인가요?",
      options: scaleLikelihood,
      matrix: {
        title:
          "기능과 가격이 같다고 가정할 때, 처음 소개받는 시점별 설치 가능성",
        row,
        index: index + 1,
        total: 5,
      },
    })
  ),
  {
    id: "q23",
    number: "Q23",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "건강한 시기에도 설치를 자연스럽게 만드는 기능 범주는 무엇인가요?",
    options: named(
      ["memory", "사진·영상·일기 등 추억 기록"],
      ["health", "예방접종·검진·약 등 건강 기록"],
      ["daily", "산책·식사·가족 돌봄 등 일상 관리"],
      ["info", "나이별 돌봄·전문가·지원 정보"],
      ["never", "어떤 기능이 있어도 건강할 때는 설치하지 않는다"]
    ),
  },
  {
    id: "q23_1a",
    number: "Q23-1A",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "가장 필요한 추억 기능은 무엇인가요?",
    options: numbered(
      "사진·영상 자동 정리",
      "하루 한 줄 성장일기",
      "생일·입양기념일 회고",
      "가족이 함께 만드는 앨범",
      "사진책·발도장 등 실물 제작"
    ),
    when: answers => answerIs(answers, "q23", "memory"),
  },
  {
    id: "q23_1b",
    number: "Q23-1B",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "가장 필요한 건강 기록 기능은 무엇인가요?",
    options: numbered(
      "예방접종·검진 일정 알림",
      "약·처방식·영양제 기록",
      "병원·검사 결과 보관",
      "증상 사진·영상과 메모",
      "수의사에게 보여줄 요약 리포트"
    ),
    when: answers => answerIs(answers, "q23", "health"),
  },
  {
    id: "q23_1c",
    number: "Q23-1C",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "가장 필요한 일상 관리 기능은 무엇인가요?",
    options: numbered(
      "산책·활동량 기록",
      "식사·물·배변 기록",
      "수면·휴식 기록",
      "가족 공동 돌봄 일정",
      "실종·응급 연락 카드"
    ),
    when: answers => answerIs(answers, "q23", "daily"),
  },
  {
    id: "q23_1d",
    number: "Q23-1D",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "가장 필요한 정보 기능은 무엇인가요?",
    options: numbered(
      "나이·체중에 맞는 건강 체크",
      "전문가가 검수한 노화 정보",
      "증상별 병원 방문 기준",
      "보험·병원비·공공 지원",
      "지역 병원·돌봄 서비스 정보"
    ),
    when: answers => answerIs(answers, "q23", "info"),
  },
  {
    id: "q24",
    number: "Q24",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title:
      "마지막 돌봄·장례 관련 정보는 앱 안에서 어떻게 보이는 것이 가장 편안한가요?",
    options: numbered(
      "내가 직접 찾아볼 때만 보여준다",
      "메뉴는 두되 내가 누르기 전에는 알리지 않는다",
      "내가 미리 ‘필요할 때 알려 달라’고 설정한 경우만 안내한다",
      "건강 변화나 수의사 설명 등 명확한 계기 뒤에만 안내한다",
      "같은 앱에는 관련 정보가 없는 편이 좋다"
    ),
  },
  {
    id: "q25",
    number: "Q25",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title:
      "건강한 시기에 “앞으로 필요할 수 있는 돌봄 정보를 원하는 때에만 받으시겠어요?”라는 선택지가 있다면 신청하시겠어요?",
    options: numbered(
      "절대 신청하지 않는다",
      "아마 신청하지 않는다",
      "잘 모르겠다",
      "아마 신청한다",
      "반드시 신청한다"
    ),
  },
  {
    id: "q26",
    number: "Q26",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title:
      "이 서비스를 처음 알게 된다면 가장 신뢰할 수 있는 경로는 어디인가요?",
    options: numbered(
      "다니던 동물병원·수의사",
      "지자체·동물등록·공공기관",
      "가족·친구·다른 반려인",
      "반려동물 커뮤니티의 실제 후기",
      "포털·SNS·입양처·생활 서비스"
    ),
  },
  {
    id: "q27",
    number: "Q27",
    section: "D. 부담 없이 시작할 수 있는 서비스",
    title: "이 서비스에서 가장 중요한 신뢰 조건을 두 개까지 골라 주세요.",
    options: numbered(
      "수의사·전문가가 검수한 정보",
      "광고와 객관적 정보의 명확한 구분",
      "가격·절차·후기의 투명한 공개",
      "원할 때 메뉴·알림을 끌 수 있는 선택권",
      "불안을 과장하거나 결정을 재촉하지 않는 표현"
    ),
    kind: "multi",
    maxSelections: 2,
    helper: "최대 2개까지 선택할 수 있어요.",
  },
  ...[
    "증상·투약·병원 기록과 수의사용 리포트",
    "노화 변화 확인과 집에서의 돌봄 안내",
    "삶의 질 점검과 치료 결정 대화 가이드",
    "마지막 돌봄·장례 절차와 비용 안내",
    "추억 보존과 이별 후 마음 돌봄",
  ].map(
    (row, index): SurveyQuestion => ({
      id: `q28_${index + 1}`,
      number: "Q28",
      section: "D. 부담 없이 시작할 수 있는 서비스",
      title:
        "일상·건강 기록으로 먼저 사용하다가 아래 지원이 필요할 때 추가된다면 이용 의향은 어느 정도인가요?",
      options: scaleUsage,
      matrix: {
        title: "일상·건강 기록 이후 추가 지원별 이용 의향",
        row,
        index: index + 1,
        total: 5,
      },
    })
  ),
  {
    id: "q29_current",
    number: "Q29-A",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "알고 싶지만 마음이 무거워 충분히 알아보지 못한 것은 무엇인가요?",
    options: named(
      ["health", "건강 변화·예후·응급상황"],
      ["quality", "삶의 질·치료 선택·마지막 돌봄"],
      ["cost", "병원비·보험·공공 지원"],
      ["memory", "함께할 추억·장례·추모"],
      ["emotion", "내 감정·가족 대화 또는 특별히 없음"]
    ),
    when: answers => answerIs(answers, "q2", "current"),
  },
  {
    id: "q29_departed",
    number: "Q29-B",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "조금 더 일찍 알았더라면 덜 힘들었을 것은 무엇인가요?",
    options: named(
      ["health", "건강 변화·예후·응급상황"],
      ["quality", "삶의 질·치료 선택·마지막 돌봄"],
      ["cost", "병원비·보험·공공 지원"],
      ["memory", "함께할 추억·장례·추모"],
      ["emotion", "내 감정·가족 대화 또는 특별히 없음"]
    ),
    when: answers => answerIn(answers, "q2", ["recent_departed", "longest"]),
  },
  {
    id: "q29_1a",
    number: "Q29-1A",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "가장 필요했던 내용은 무엇인가요?",
    options: numbered(
      "앞으로 나타날 수 있는 몸의 변화",
      "위급함을 판단하는 기준",
      "야간·주말 응급 대처",
      "질환의 예후와 회복 가능성",
      "병원에 전달할 관찰·기록 방법"
    ),
    when: answers =>
      answerIs(answers, "q29_current", "health") ||
      answerIs(answers, "q29_departed", "health"),
  },
  {
    id: "q29_1b",
    number: "Q29-1B",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "가장 필요했던 내용은 무엇인가요?",
    options: numbered(
      "통증과 불편함을 알아채는 방법",
      "삶의 질을 확인하는 기준",
      "치료를 계속하거나 바꾸는 대화",
      "집에서 해줄 수 있는 마지막 돌봄",
      "수의사·가족과 결정을 나누는 방법"
    ),
    when: answers =>
      answerIs(answers, "q29_current", "quality") ||
      answerIs(answers, "q29_departed", "quality"),
  },
  {
    id: "q29_1c",
    number: "Q29-1C",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "가장 필요했던 내용은 무엇인가요?",
    options: numbered(
      "예상 치료비와 비용 비교",
      "펫보험 보장과 청구",
      "지자체·공공 지원 사업",
      "의료비 마련과 결제 방법",
      "장례·돌봄 비용의 전체 범위"
    ),
    when: answers =>
      answerIs(answers, "q29_current", "cost") ||
      answerIs(answers, "q29_departed", "cost"),
  },
  {
    id: "q29_1d",
    number: "Q29-1D",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "가장 필요했던 내용은 무엇인가요?",
    options: numbered(
      "지금 함께하면 좋을 경험",
      "사진·영상·목소리를 남기는 방법",
      "발도장·털·앨범 등 추억 보존",
      "장례 방식·절차·업체 선택",
      "추모 공간과 유품을 간직하는 방법"
    ),
    when: answers =>
      answerIs(answers, "q29_current", "memory") ||
      answerIs(answers, "q29_departed", "memory"),
  },
  {
    id: "q29_1e",
    number: "Q29-1E",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title: "가장 가까운 답을 골라 주세요.",
    options: numbered(
      "불안과 죄책감을 다루는 방법",
      "가족과 조심스럽게 대화하는 방법",
      "이별 후 일상으로 돌아오는 방법",
      "비슷한 경험을 한 사람과의 연결",
      "특별히 더 필요했던 것은 없다"
    ),
    when: answers =>
      answerIs(answers, "q29_current", "emotion") ||
      answerIs(answers, "q29_departed", "emotion"),
  },
  {
    id: "q30",
    number: "Q30",
    section: "E. 지금 또는 지나고 나서 필요했던 것",
    title:
      "위와 같은 정보를 가장 편안하게 받아들일 수 있는 전달자는 누구인가요?",
    options: numbered(
      "다니던 수의사·동물병원",
      "공공기관·동물보호기관",
      "경험이 있는 다른 반려인",
      "전문가가 검수한 중립적 앱",
      "내가 직접 검색할 때만 보고 싶다"
    ),
  },
  {
    id: "q31",
    number: "Q31",
    section: "F. 통계 분류",
    title: "응답자의 연령대는 어떻게 되나요?",
    options: numbered(
      "만 18~24세",
      "25~34세",
      "35~44세",
      "45~54세",
      "55세 이상"
    ),
    optional: true,
  },
  {
    id: "q32",
    number: "Q32",
    section: "F. 통계 분류",
    title: "현재 가구 형태와 가장 가까운 것은 무엇인가요?",
    options: numbered(
      "1인 가구",
      "배우자·파트너와 거주",
      "부모·형제 등 성인 가족과 거주",
      "미성년 또는 성인 자녀와 거주",
      "기타 가구 형태"
    ),
    optional: true,
  },
  {
    id: "q33",
    number: "Q33",
    section: "F. 통계 분류",
    title: "현재 거주 지역은 어디인가요?",
    options: numbered(
      "서울",
      "경기·인천",
      "강원·대전·세종·충청",
      "광주·전라·제주",
      "대구·부산·울산·경상 또는 해외"
    ),
    optional: true,
  },
];

export const getQuestionTitle = (
  question: SurveyQuestion,
  answers: SurveyAnswers
) =>
  typeof question.title === "function"
    ? question.title(answers)
    : question.title;

export const getQuestionOptions = (
  question: SurveyQuestion,
  answers: SurveyAnswers
) =>
  typeof question.options === "function"
    ? question.options(answers)
    : question.options;

export const isSurveyTerminated = (answers: SurveyAnswers) =>
  answerIn(answers, "q1", ["no_experience", "prefer_not"]);

export const getSurveyProgress = ({
  currentIndex,
  visibleQuestionCount,
  terminated,
}: {
  currentIndex: number;
  visibleQuestionCount: number;
  terminated: boolean;
}) => {
  if (terminated) {
    return {
      value: 3,
      label: "대상 확인",
      detail: "선택한 응답에 따라 설문이 종료됩니다",
    };
  }

  const value =
    visibleQuestionCount > 0
      ? Math.round(((currentIndex + 1) / visibleQuestionCount) * 100)
      : 0;

  return {
    value,
    label: `${value}%`,
    detail: `${currentIndex + 1} / 예상 ${visibleQuestionCount}단계`,
  };
};

export const getVisibleQuestions = (answers: SurveyAnswers) => {
  if (isSurveyTerminated(answers)) {
    return surveyQuestions.filter(question => question.id === "q1");
  }

  return surveyQuestions.filter(
    question => !question.when || question.when(answers)
  );
};

export const getVisibleQuestionIds = (answers: SurveyAnswers) =>
  getVisibleQuestions(answers).map(question => question.id);

export const pruneHiddenAnswers = (answers: SurveyAnswers): SurveyAnswers => {
  const pruned: SurveyAnswers = { ...answers };

  for (let pass = 0; pass < surveyQuestions.length; pass += 1) {
    let changed = false;
    const visibleQuestions = getVisibleQuestions(pruned);
    const visibleById = new Map(
      visibleQuestions.map(question => [question.id, question])
    );

    for (const questionId of Object.keys(pruned)) {
      if (!visibleById.has(questionId)) {
        delete pruned[questionId];
        changed = true;
      }
    }

    for (const question of visibleQuestions) {
      const answer = pruned[question.id];
      if (answer === undefined) continue;

      const optionIds = new Set(
        getQuestionOptions(question, pruned).map(option => option.id)
      );
      if (question.kind !== "multi") {
        if (Array.isArray(answer) || !optionIds.has(answer)) {
          delete pruned[question.id];
          changed = true;
        }
        continue;
      }

      if (!Array.isArray(answer)) {
        delete pruned[question.id];
        changed = true;
        continue;
      }

      const valid = Array.from(
        new Set(answer.filter(optionId => optionIds.has(optionId)))
      );
      const exclusive = valid.find(optionId =>
        question.exclusiveOptionIds?.includes(optionId)
      );
      const normalized = exclusive
        ? [exclusive]
        : valid.slice(0, question.maxSelections ?? optionIds.size);

      if (normalized.length === 0) {
        delete pruned[question.id];
        changed = true;
      } else if (
        normalized.length !== answer.length ||
        normalized.some((optionId, index) => optionId !== answer[index])
      ) {
        pruned[question.id] = normalized;
        changed = true;
      }
    }

    if (!changed) break;
  }

  return pruned;
};

// 무료 제작 슬롯을 예약하려면 최소한의 실제 응답이 있어야 한다.
// 자격 확인(Q1)과 기준 아이 선택(Q2)만 답하고 나머지를 모두 건너뛴
// 사실상 빈 응답이 선착순 자리를 선점하는 것을 막는 1차 방어선이다.
// 값을 낮게 둔 이유: 민감한 주제라 힘든 문항은 자유롭게 건너뛰게 두되
// 참여 자체를 하지 않은 응답만 걸러내기 위함이며, 서버측 검증과 함께 쓴다.
export const MIN_ANSWERED_FOR_RESERVATION = 5;

export const hasMinimumAnswers = (answers: SurveyAnswers) =>
  Object.keys(pruneHiddenAnswers(answers)).length >=
  MIN_ANSWERED_FOR_RESERVATION;
