import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { GOODS_PHOTO_MIN_COUNT } from "../lib/goodsSurveyApi";
import {
  clearGoodsSurveyPhotoHandoff,
  loadGoodsSurveyPhotoHandoff,
  saveGoodsSurveyPhotoHandoff,
} from "../lib/goodsSurveyPhotoHandoff";

/**
 * 09 FINAL 은 디자인상 구매 버튼이 아니라 사진 등록 카드로 끝난다.
 * (Figma 0uW99BqaTJKUVlowzQswli / Article 컴포넌트 5425:1411,
 *  09 FINAL 안의 인스턴스 5425:1470)
 *
 * 처음 옮길 때 이 인스턴스가 메타데이터에서 자식 없는 한 줄로 와서, 안을
 * 열어보지 않고 구매 버튼으로 채웠다. 그게 대표 코멘트 #27 "이 랜딩에서
 * 바로 사진, 정보 기입할 수 있는 폼도 넣어주세요"가 가리키던 자리다.
 */
const landing = // 랜딩은 화면 파일 하나가 아니다. 사진 등록 카드는 플리마켓 랜딩과 함께
  // 쓰려고 goodsSurveyIntake.tsx 로 나가 있다. 화면에 실제로 나가는 것을
  // 보려면 둘을 같이 읽어야 한다.
  [
    readFileSync(new URL("./GoodsSurvey.tsx", import.meta.url), "utf8"),
    readFileSync(new URL("./goodsSurveyIntake.tsx", import.meta.url), "utf8"),
  ]
    .join(" ")
    .replace(/\s+/g, " ");

const form = readFileSync(
  new URL("./GoodsSurveyForm.tsx", import.meta.url),
  "utf8"
).replace(/\s+/g, " ");

const fakeFile = (name: string) => ({ name }) as unknown as File;

describe("09 FINAL은 사진 등록 카드로 끝난다", () => {
  it("디자인이 적어 둔 문장을 그대로 쓴다", () => {
    expect(landing).toContain("사진 등록");
    expect(landing).toContain("우리 아이 사진을");
    expect(landing).toContain("추가해주세요.");
    expect(landing).toContain("사진을 누르면 앨범에서 바로 추가할 수 있어요.");
    expect(landing).toContain("사진은 주문 단계에서 최종 제출됩니다.");
    // 디자인 문구는 "사진 3장 등록하기"다. 3은 칸 수에서 나오게 둔다 —
    // 칸을 늘리고 문구를 못 고치면 버튼이 없는 장수를 말하게 된다.
    expect(landing).toContain("사진 {INTAKE_SLOTS.length}장 등록하기");
    // 칸 수와 주문 화면의 최소 장수는 같은 값이어야 한다. 랜딩은 세 칸을
    // 다 채워야 열리는데 주문 화면은 한 장이면 열려 있었다.
    expect(landing.match(/key: "(face|body|coat)"/g) ?? []).toHaveLength(
      GOODS_PHOTO_MIN_COUNT
    );
  });

  it("이 자리에 내가 넣었던 구매 버튼은 없다", () => {
    // 디자인의 09 FINAL 은 Article 인스턴스로 끝난다. 구매 버튼은 없었다.
    expect(landing).not.toContain('buyCta("final"');
  });

  it("슬롯 세 칸의 용도를 디자인대로 적는다", () => {
    // 아무 사진 3장이 아니다. 칸마다 무엇을 찍어야 하는지가 정해져 있다.
    expect(landing).toContain("정면 또는 옆모습");
    expect(landing).toContain("몸 전체가 보이게");
    expect(landing).toContain("특징이 잘 보이게");
    expect(landing).toContain("gs-intake-slot");
  });

  it("몇 장 골랐는지 세어 보여준다", () => {
    // 디자인 변형이 0/3 과 3/3 두 가지다.
    expect(landing).toContain("gs-intake-count");
    expect(landing).toContain("/{INTAKE_SLOTS.length}");
  });

  it("굿즈가 닫혀 있으면 사진을 받지 않는다", () => {
    // 살 수 없는데 사진만 받아 두면 줄 수 없는 것을 약속하는 셈이다.
    expect(landing).toMatch(
      /goodsAvailable \? \([\s\S]{0,200}?PhotoIntakeCard/
    );
  });
});

describe("랜딩에서 고른 사진은 주문 단계에서 제출된다", () => {
  it("랜딩은 사진을 서버로 보내지 않는다", () => {
    // 개인정보 동의는 주문 화면에서 받는다(privacyAgreed). 랜딩에서 미리
    // 올리면 동의 없이 개인정보를 받는 구조가 된다. 디자인이 적어 둔
    // "사진은 주문 단계에서 최종 제출됩니다" 도 같은 뜻이다.
    expect(landing).toContain("saveGoodsSurveyPhotoHandoff");
    expect(landing).not.toContain("uploadSurveyPhoto");
    expect(landing).not.toContain("createSurveyDraft");
  });

  it("주문 화면이 그 사진을 붙은 채로 연다", () => {
    // 함수를 그대로 넘기는 지연 초기화다. 호출해서 넘기면 렌더마다 다시 읽는다.
    expect(form).toContain("useState<File[]>(loadGoodsSurveyPhotoHandoff)");
    // 제출까지 끝나면 들고 있을 이유가 없다.
    expect(form).toContain("clearGoodsSurveyPhotoHandoff()");
  });

  it("랜딩과 주문 화면이 같은 사진 규칙을 쓴다", () => {
    ["image/jpeg", "image/png", "image/webp"].forEach(type => {
      expect(landing).toContain(type);
      expect(form).toContain(type);
    });
    expect(landing).toContain("10 * 1024 * 1024");
    expect(form).toContain("10 * 1024 * 1024");
  });
});

describe("사진 인계함", () => {
  beforeEach(() => clearGoodsSurveyPhotoHandoff());

  it("맡긴 사진을 그대로 돌려준다", () => {
    const files = [fakeFile("face.jpg"), fakeFile("body.jpg")];
    saveGoodsSurveyPhotoHandoff(files);
    expect(loadGoodsSurveyPhotoHandoff()).toEqual(files);
  });

  it("읽어도 사라지지 않는다", () => {
    // 개발 모드의 StrictMode 는 useState 초기화 함수를 두 번 부른다.
    // 읽을 때 비우면 두 번째 호출이 빈 배열을 받아 사진이 사라진다.
    saveGoodsSurveyPhotoHandoff([fakeFile("face.jpg")]);
    expect(loadGoodsSurveyPhotoHandoff()).toHaveLength(1);
    expect(loadGoodsSurveyPhotoHandoff()).toHaveLength(1);
  });

  it("비우면 빈 배열이 된다", () => {
    saveGoodsSurveyPhotoHandoff([fakeFile("face.jpg")]);
    clearGoodsSurveyPhotoHandoff();
    expect(loadGoodsSurveyPhotoHandoff()).toEqual([]);
  });

  it("아무것도 맡기지 않았으면 빈 배열이다", () => {
    expect(loadGoodsSurveyPhotoHandoff()).toEqual([]);
  });
});
