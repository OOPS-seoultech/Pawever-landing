import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  GOODS_PHOTO_MAX_COUNT,
  GOODS_PHOTO_MIN_COUNT,
} from "../lib/goodsSurveyApi";
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
    // 두 랜딩의 디자인이 여기서 갈린다. 상시는 "추가", 플리마켓은 "등록"이다.
    expect(landing).toContain("추가해주세요.");
    expect(landing).toContain("사진을 누르면 앨범에서 바로 추가할 수 있어요.");
    expect(landing).toContain("사진은 주문 단계에서 최종 제출됩니다.");
    // 몇 장을 골랐는지 버튼이 말한다. 칸 수를 적어 두면 다 채우지 않은
    // 사람에게 없는 장수를 말하게 된다.
    expect(landing).toContain("장 등록하기");
    expect(landing).toContain("${chosen}장 등록하기");
    // 칸은 한 마리에 받는 최대 장수만큼 둔다. 처음에는 세 칸만 펼치고
    // 나머지는 더 넣고 싶은 사람에게만 연다.
    expect(
      landing.match(/key: "(face|body|coat|extra1|extra2)"/g) ?? []
    ).toHaveLength(GOODS_PHOTO_MAX_COUNT);
    // 한 장만 있어도 넘어갈 수 있다.
    expect(landing).toContain(`const MIN_PHOTOS = ${GOODS_PHOTO_MIN_COUNT}`);
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
    // 디자인 변형이 0/3 과 3/3 두 가지다. 펼친 칸 수로 센다 — 다섯 칸을
    // 다 세면 세 칸만 보이는 화면이 0/5 라고 말하게 된다.
    expect(landing).toContain("gs-intake-count");
    expect(landing).toContain("/{openSlots}");
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
    // 첫 아이에게 붙인다. 지연 초기화 안에서 읽으므로 렌더마다 다시
    // 읽지 않는다.
    expect(form).toContain("useState<PetDraft[]>(() =>");
    expect(form).toContain("photos: loadGoodsSurveyPhotoHandoff(),");
    // 제출까지 끝나면 들고 있을 이유가 없다.
    expect(form).toContain("clearGoodsSurveyPhotoHandoff()");
  });

  it("랜딩과 주문 화면이 같은 사진 규칙을 쓴다", () => {
    // 주문 화면의 사진 칸은 아이 줄 컴포넌트가 그린다.
    const petEditor = readFileSync(
      new URL("./goodsSurveyPetEditor.tsx", import.meta.url),
      "utf8"
    );
    ["image/jpeg", "image/png", "image/webp"].forEach(type => {
      expect(landing).toContain(type);
      expect(petEditor).toContain(type);
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
