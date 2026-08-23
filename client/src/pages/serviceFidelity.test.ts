import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 서비스 소개가 피그마와 같은지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `Component` (5210:1808) 이다.
 *
 * 이 화면은 좌표만 받아서 글자 크기를 역산하던 시절에 만들어졌다. 구조는
 * 맞췄는데 값이 1~3px 씩 어긋났고, 색과 굵기로만 드러나는 것은 아예 잡히지
 * 않았다. 여기서는 그때 놓친 종류를 골라 붙든다 — 크기, 배경색, 굵기.
 */
const service = readFileSync(join(__dirname, "Service.tsx"), "utf-8");
const flat = service.replace(/\s+/g, " ");

describe("서비스 소개 기준 문구", () => {
  it("STEP 설명이 기준 프레임 문구다", () => {
    // 옛 프레임은 '남깁니다 / 확인합니다 / 준비합니다' 로 끝난다.
    expect(flat).toContain("식사, 산책, 수면과 눈에 띈 변화를 짧게 남겨요.");
    expect(flat).toContain("이번 주와 지난 기록을 나란히 보며 달라진 점을 쉽게 확인해요.");
    expect(flat).toContain("관찰한 변화를 정리해 진료 상담 전에 필요한 정보를 준비해요.");
  });

  it("나이 범위는 붙임표다", () => {
    // 물결표(6~11세)로 두었던 적이 있다. 피그마는 붙임표다.
    expect(flat).toContain("6-11세 반려견의 주 양육자");
    expect(flat).not.toContain("6~11세");
  });

  it("앱 자리 표시 문구를 그대로 둔다", () => {
    // 앱 화면이 준비되면 들어갈 자리다. 피그마도 비워 두었다.
    expect(flat).toContain("APP 업데이트 후 추가");
  });

  it("앱 연결 문단을 둔다", () => {
    expect(flat).toContain("현재 앱은 두 가지 앱스토어 모두에서 설치할 수 있습니다.");
  });
});

describe("서비스 소개 구조", () => {
  it("세 단계를 카드가 아니라 가로 줄로 둔다", () => {
    // 옛 화면은 카드 세 장이었다. 피그마는 왼쪽에 큰 단계 번호가 서는 줄이다.
    expect(flat).toContain("md:grid-cols-[196px_minmax(0,1fr)]");
    expect(flat).not.toContain("rounded-[16px] border border-border bg-card p-6");
  });

  it("단계 번호가 행 높이 한가운데에 선다", () => {
    // 위 정렬로 두면 제목과 나란히 붙어 번호가 제목의 일부처럼 보인다.
    expect(flat).toContain('<div className="flex items-center">');
  });

  it("번호만 굵다", () => {
    // 피그마는 'STEP ' 이 Medium, 숫자만 Bold 다. 통째로 굵게 두면
    // 세 줄이 전부 같은 무게로 눌러 보인다.
    expect(flat).toContain('STEP <span className="font-bold">{step.number}</span>');
  });

  it("원칙 두 갈래를 가운데 선으로 나눈다", () => {
    expect(flat).toContain("md:border-l-[3px] md:border-border");
  });

  it("구분선은 3px 이다", () => {
    // 1px 로 두면 줄 사이가 표처럼 얇아진다. 피그마는 3.331px 다.
    expect(flat).toContain("border-t-[3px] border-border");
    expect(flat).toContain("border-b-[3px] border-border");
  });

  it("앱 연결 제목에 밑줄이 있다", () => {
    expect(flat).toContain("underline underline-offset-4");
  });

  it("스토어 버튼을 두 화면이 같은 것으로 쓴다", () => {
    // 주소도 모양도 화면마다 따로 두면 한쪽만 고치고 끝난다.
    // 굿즈 버튼 밑줄이 실제로 그렇게 한 화면만 맞았다.
    expect(flat).toContain('from "@/components/StoreButtons"');
    expect(flat).toContain("<StoreButtons");
    expect(service).not.toContain("function StoreButton(");
  });
});

describe("서비스 소개 크기와 색", () => {
  it("제목 크기가 피그마 CSS 값이다", () => {
    // 폭을 재서 역산하던 값이 아니다.
    expect(flat).toContain("md:text-[52px] md:leading-[66.56px]");
    expect(flat).toContain("tracking-[-1.56px]");
  });

  it("소제목은 32px 이다", () => {
    // 33px 로 두었던 적이 있다. 역산 오차였다.
    expect(flat).toContain("md:text-[32px]");
    expect(flat).not.toContain("md:text-[33px]");
  });

  it("단계 번호는 35px 이다", () => {
    // 36px 로 두었던 적이 있다.
    expect(flat).toContain("md:text-[35px]");
    expect(flat).not.toContain("md:text-[36px]");
  });

  it("작은 눈썹 글자는 13px, 히어로 눈썹은 15px 이다", () => {
    // 둘 다 14px(text-sm)로 뭉뚱그려 두었던 적이 있다.
    expect(flat).toContain("text-[13px]");
    expect(flat).toContain("text-[15px]");
  });

  it("세 단계와 앱 연결 구역 배경이 #F5F5F3 이다", () => {
    // --background(#FAFAF8)로 두면 흰 구역과의 경계가 거의 사라진다.
    // 좌표만 재는 방식으로는 색 차이가 잡히지 않는다.
    expect(service.match(/<section className="bg-muted">/g) ?? []).toHaveLength(2);
    expect(service).not.toContain('<section className="bg-background">');
  });

  it("본문 강조는 색이 아니라 굵기로만 한다", () => {
    // 검정으로 두면 문단 안에 검은 덩어리 둘이 생긴다. 피그마는 본문과
    // 같은 회색에 굵기만 Bold 다.
    expect(flat).toContain('<strong className="font-bold">');
    expect(flat).not.toContain("font-semibold text-foreground");
  });
});
