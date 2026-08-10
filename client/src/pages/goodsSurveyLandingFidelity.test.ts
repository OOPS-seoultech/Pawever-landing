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

  it("첨부한 사진을 미리 보여주고 장별로 취소할 수 있다", () => {
    expect(formSource).toContain("createObjectURL");
    expect(formSource).toContain("revokeObjectURL");
    expect(formSource).toContain("gsf-photo-preview");
    expect(formSource).toContain("gsf-photo-remove");
    expect(formSource).toContain("첨부 취소");
    // 같은 파일을 다시 고를 수 있어야 하므로 input 값을 비운다.
    expect(formSource).toContain("photoInputRef");
  });

  it("아코디언 스케일은 밀려났을 때만 스크롤을 보정한다", () => {
    // 스펙: scrollIntoView 금지. 화면 밖으로 나간 만큼만 움직인다.
    expect(formSource).not.toContain("scrollIntoView");
    expect(formSource).toContain("window.scrollBy");
    expect(formSource).toContain("prefers-reduced-motion");
    // 사용자가 직접 펼친 카드는 보정 대상이 아니다.
    expect(formSource).toContain("autoOpened");
  });

  it("굿즈가 닫혀 있으면 제작 단계로 보내지 않는다", () => {
    // 배송 정보와 사진까지 다 채우게 한 뒤 거절하면 그때 쓴 것이 통째로 날아간다.
    // 그래서 굿즈 여부는 제작 화면으로 넘어가는 갈림길에서 한 번만 판단한다.
    expect(formSource).toContain(
      "const latest = await getSurveyCampaign().catch(() => campaign)"
    );
    expect(formSource).toContain("if (!(latest?.goodsOpen ?? false))");
    expect(formSource).toContain('setStage("full")');
  });

  it("굿즈가 마감돼도 설문을 마친 사람은 사연까지 갈 수 있다", () => {
    // 설문을 계속 받는 이유가 사연이다. 자리를 못 받았다는 이유로
    // 완료 직후나 이어서 참여할 때 흐름을 끊으면 사연을 한 건도 못 받는다.
    expect(formSource).toContain('session.status === "COMPLETED_NO_SLOT"');
    expect(formSource).not.toContain(
      'completion.status === "COMPLETED_NO_SLOT"'
    );
  });

  it("설문과 굿즈를 각각의 스위치로 판단한다", () => {
    // 하나의 값으로 둘을 함께 막으면 굿즈가 마감될 때 설문까지 닫힌다.
    expect(landingSource).toContain("campaign?.surveyOpen ?? true");
    expect(landingSource).toContain("campaign?.goodsOpen ?? false");
    expect(landingSource).not.toContain("campaign?.open");
  });

  it("2차 안내 이메일은 동의를 받아야 보내고, 받는 자리에서 고지한다", () => {
    // 광고성 정보라 항목·목적·보유 기간·거부 권리를 받는 화면에서 밝혀야 한다.
    expect(formSource).toContain("noticeAgreed");
    expect(formSource).toContain("수집 항목: 이메일 주소");
    expect(formSource).toContain("보유 기간: 수집일로부터 1년");
    // 동의 없이 눌러 보낼 수 없어야 한다.
    expect(formSource).toContain("noticeAgreed &&");
  });

  it("고르지 않은 굿즈를 임의의 값으로 채우지 않는다", () => {
    // 기본값이 붙으면 실제 선호가 아닌 값이 2차 수량 산정에 섞인다.
    expect(landingSource).toContain('useState("")');
    expect(landingSource).not.toContain('useState("acrylic")');
    expect(formSource).toContain("GOODS_UNSELECTED");
  });

  it("제출 실패 안내를 제출 버튼 옆에도 보여준다", () => {
    // 화면 맨 위 안내는 긴 양식 끝에 있는 사람에게 보이지 않는다.
    // 진행 문구만 사라지면 아무 일도 안 일어난 것처럼 보인다.
    expect(formSource).toContain("{apiError && !apiBusy && (");
    expect(formSource).toContain(
      '<p className="gsf-field-error" role="alert">'
    );
  });

  it("단일선택도 고른 항목을 다시 눌러 취소할 수 있다", () => {
    // 건너뛸 수 있는 문항에서 실수로 누르면 되돌릴 방법이 필요하다.
    expect(formSource).toContain("getNextSingleSelection(selected, optionId)");
    expect(formSource).not.toMatch(
      /kind !== "multi"\) \{\s*onAnswer\(optionId\)/
    );
  });

  it("동의 질문은 legend 대신 일반 요소로 둬 한 줄에 배치한다", () => {
    // legend는 flex 아이템이 되지 않아 항상 줄이 나뉜다.
    expect(formSource).toContain("gsf-consent-question-label");
    expect(formSource).not.toMatch(/<legend>\s*\{label\}/);
  });
});
