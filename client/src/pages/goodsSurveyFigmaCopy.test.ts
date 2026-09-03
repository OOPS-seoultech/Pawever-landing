import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import figmaCopy from "./goodsSurveyFigmaCopy.json";

/**
 * 화면 문구가 디자인에서 벗어나지 않는지 본다.
 *
 * 여기 오기까지 같은 실수를 두 번 했다. 09 FINAL 의 사진 등록 카드를 통째로
 * 빼먹었고, 잠깐! 카드도 빼먹었다. 둘 다 우연히 발견했다. 손으로 훑는 것으로는
 * 놓친 자리를 못 찾는다.
 *
 * goodsSurveyFigmaCopy.json 은 피그마에서 뽑은 문구 그대로다. 디자인이 바뀌면
 * 그 파일을 다시 뽑아 갈아 끼우고, 화면을 거기에 맞춘다. 반대로 하지 않는다.
 */
const rawSource = // 랜딩은 화면 파일 하나가 아니다. 사진 등록 카드는 플리마켓 랜딩과 함께
  // 쓰려고 goodsSurveyIntake.tsx 로 나가 있다. 화면에 실제로 나가는 것을
  // 보려면 둘을 같이 읽어야 한다.
  [
    readFileSync(new URL("./GoodsSurvey.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("./goodsSurveyIntake.tsx", import.meta.url), "utf8"),
  ].join(" ");

/**
 * 주석을 먼저 걷는다.
 *
 * 근거를 적어 두느라 주석이 디자인 문구를 그대로 인용하는 자리가 많다.
 * 그대로 두면 화면에서 빠진 문장도 주석에서 찾혀 통과해 버린다.
 */
const withoutComments = rawSource
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/\/\/[^\n]*/g, " ");

/**
 * 화면이 실제로 그리는 값으로 바꾼다.
 *
 * 금액과 정원은 goodsSurveyContent 와 서버에서 오므로 소스에는 식으로만 있다.
 * 디자인에는 계산된 값이 적혀 있어, 바꾸지 않으면 전부 빠진 것으로 잡힌다.
 */
const RENDERED: Array<[RegExp, string]> = [
  [/won\(PRICE\.presale\)/g, "29,900원"],
  [/won\(PRICE\.member\)/g, "23,900원"],
  [/won\(PRICE\.shipping\)/g, "3,000원"],
  [/won\(GOODS_SURVEY_DISCOUNT\)/g, "6,000원"],
  [/CAMPAIGN\.capacity/g, "100"],
  [/CAMPAIGN\.duration/g, "약 10~15분"],
  [/INTAKE_SLOTS\.length/g, "3"],
];

const rendered = RENDERED.reduce(
  (text, [pattern, value]) => text.replace(pattern, value),
  withoutComments
)
  // JSX 태그와 중괄호를 걷어 글자만 잇는다
  .replace(/<[^>]*>/g, " ")
  .replace(/\{" "\}/g, " ")
  .replace(/[{}$]/g, " ");

const flat = rendered.replace(/\s+/g, "");
const squash = (s: string) => s.replace(/\s+/g, "");

/**
 * 디자인과 일부러 다르게 쓰는 자리. 이유 없이는 넣지 않는다.
 * 새 문구가 빠지면 목록에 없으므로 테스트가 잡는다.
 */
const DELIBERATE: Record<string, string> = {
  "01.구매가 1순위":
    "화면에 낼 문구가 아니라 내부 메모다. 다른 구간과 같은 형식인 01 ORDER 로 쓴다.",
  "무료 선착순 100명 한정":
    "1차 무료 체험단 때 수식어다. 2차는 29,900원을 받는 판매라 '무료'를 뺐다.",
  "73명": "디자인의 예시 숫자다. 화면은 서버가 준 남은 자리를 쓴다.",
  "27명 신청 완료": "예시 숫자다. 화면은 서버가 준 신청 수를 쓴다.",
  "/ 100":
    "정원도 서버에서 온다. 수량을 막지 않는 모집에서는 이 줄이 아예 없다.",
  "0/3": "고른 장수라 0 에서 시작해 바뀐다. 화면은 실제 개수를 센다.",
  "12135  님": "디자인에 공백이 두 칸이다. 화면은 한 칸으로 쓴다.",
};

describe("화면 문구는 피그마에서 온다", () => {
  it("디자인이 적어 둔 문구가 화면에 다 있다", () => {
    const missing = figmaCopy.copy
      .filter(line => !flat.includes(squash(line)))
      .filter(line => !(line in DELIBERATE));

    expect(
      missing,
      `피그마에 있는데 화면에 없는 문구 ${missing.length}개:\n` +
        missing.map(s => `  · ${s}`).join("\n") +
        "\n\n디자인이 바뀐 것이면 goodsSurveyFigmaCopy.json 을 다시 뽑고," +
        "\n일부러 다르게 쓰는 것이면 DELIBERATE 에 이유와 함께 적는다."
    ).toEqual([]);
  });

  it("일부러 다르게 쓰는 자리는 이유가 적혀 있다", () => {
    Object.entries(DELIBERATE).forEach(([line, why]) => {
      expect(why.length, `${line} 에 이유가 없다`).toBeGreaterThan(10);
    });
    // 디자인에서 사라진 문구를 목록에만 남겨 두면 다음 사람이 헷갈린다.
    Object.keys(DELIBERATE).forEach(line => {
      expect(
        figmaCopy.copy,
        `${line} 은 이제 디자인에 없다. DELIBERATE 에서 지운다.`
      ).toContain(line);
    });
  });

  it("어디서 뽑았는지 남긴다", () => {
    // 디자인이 바뀌었을 때 어느 노드를 다시 뽑아야 하는지 알아야 한다.
    expect(figmaCopy.source.file).toBe("0uW99BqaTJKUVlowzQswli");
    expect(figmaCopy.source.node).toBe("5423:1415");
    expect(figmaCopy.copy.length).toBeGreaterThan(100);
  });
});
