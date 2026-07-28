import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const landingSource = readFileSync(
  new URL("./GoodsSurvey.tsx", import.meta.url),
  "utf8"
);

const formSource = readFileSync(
  new URL("./GoodsSurveyForm.tsx", import.meta.url),
  "utf8"
);

describe("굿즈 랜딩 피그마 기준본", () => {
  it("피그마의 핵심 문구를 임의로 바꾸지 않는다", () => {
    expect(landingSource).toContain(
      "그런데 표정과 털무늬까지 닮게 만들고, 얼굴을 3D로 세우거나 전신으로 제작하려면 옵션마다 금액이 붙어 생각보다 비싸집니다."
    );
    expect(landingSource).toContain(
      "한쪽만 접히는 귀, 코 옆의 작은 점, 웃을 때 올라가는 입꼬리처럼 우리 가족만 알아보는 우리 아이의 모습이 남았으면 하는 마음."
    );
    expect(landingSource).toContain(
      "사진첩 속에만 있던 그 표정을 매일 손에 잡히는 모습으로 만들어드리고 싶어요."
    );
  });

  it("제공받은 실제 이미지 자산을 사용하고 임시 스프라이트를 사용하지 않는다", () => {
    [
      "hero-original.png",
      "hero-acrylic.png",
      "hero-face-keyring.png",
      "hero-fullbody.png",
      "price-comparison.png",
      "product-acrylic.png",
      "product-keycap.png",
      "product-backplate.png",
      "product-figure.png",
      "process-reference.png",
      "why-free.png",
      "final-banner.png",
    ].forEach(asset => expect(landingSource).toContain(asset));

    expect(landingSource).not.toContain("ProductSprite");
    expect(landingSource).not.toContain("StorySprite");
    expect(landingSource).not.toContain("product-sprite-v1.png");
    expect(landingSource).not.toContain("story-sprite-v1.png");
  });

  it("상단 워드마크는 피그마에서 받은 벡터 로고를 사용한다", () => {
    expect(landingSource).toContain("paw-ever-logo.svg");
    expect(landingSource).toContain('alt="PAW-EVER"');
    expect(landingSource).not.toMatch(/className="gs-wordmark">\s*PAW-EVER/);

    const logoSource = readFileSync(
      new URL("../../public/goods-survey/paw-ever-logo.svg", import.meta.url),
      "utf8"
    );
    expect(logoSource).toContain('width="118" height="16"');
    expect(logoSource).toContain('fill="#FFA94E"');
  });

  it("최하단 크레딧과 문의 링크를 노션 수정본대로 표기한다", () => {
    expect(landingSource).toContain(
      "서울과학기술대학교 창업팀이 만드는 반려인 서비스. 포에버 (PAW-EVER)"
    );
    expect(landingSource).not.toContain("서울특별시공덕지원센터");
    expect(landingSource).toContain("문의하기");
    expect(landingSource).toContain('href="/contact"');
    expect(landingSource).not.toContain("문의 채널 준비 중");
  });
});

describe("굿즈 제작 정보 화면", () => {
  // 화면 문구 자체는 goodsSurveyContent.test.ts가 고정한다.
  // 여기서는 화면 구조에서 빠져야 할 것과 새로 생긴 것만 확인한다.
  it("예전 제목과 마감 시각 카운트다운을 더 이상 쓰지 않는다", () => {
    expect(formSource).not.toContain("우리 아이 굿즈 제작 정보를 알려주세요");
    expect(formSource).not.toContain("선착순 자리는 오늘");
    expect(formSource).not.toContain("reservationDeadline");
  });

  it("연락처 형식 오류는 최상단이 아니라 입력란 바로 아래에 보여준다", () => {
    expect(formSource).toContain("gsf-field-error");
    expect(formSource).toContain("phoneFormatError");
    expect(formSource).toContain("PHONE_PATTERN");
  });

  it("남은 자리를 화면을 열어둔 동안에도 다시 조회한다", () => {
    expect(landingSource).toContain("setInterval");
    expect(landingSource).toContain("visibilitychange");
    expect(landingSource).toContain("clearInterval");
  });

  it("첨부한 사진을 미리 보여준다", () => {
    expect(formSource).toContain("createObjectURL");
    expect(formSource).toContain("revokeObjectURL");
    expect(formSource).toContain("gsf-photo-preview");
  });
});
