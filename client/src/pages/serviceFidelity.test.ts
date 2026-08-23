import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 서비스 소개가 피그마와 같은지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `Component` (5210:1808) 이다.
 *
 * 홈과 다른 프레임 계열이 아니다. 같은 계열 안에서 페이지별로 나뉘어 있고,
 * 예전에는 `PAW-EVER Website / Service / Editable` 을 보고 만들어 두었다.
 * 문구까지 조금씩 달라서 어느 쪽을 봤는지가 여기서 갈린다.
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

  it("단계 번호를 크게 둔다", () => {
    // 피그마에서 36px 다. 제목(26)보다 크다.
    expect(flat).toContain("md:text-[36px]");
  });

  it("원칙 두 갈래를 가운데 선으로 나눈다", () => {
    expect(flat).toContain("md:border-l md:border-border");
  });

  it("앱 연결 제목에 밑줄이 있다", () => {
    expect(flat).toContain("underline underline-offset-4");
  });

  it("스토어 버튼을 두 화면이 같은 자리에서 가져온다", () => {
    // 각 화면에 따로 적어 두면 주소가 들어올 때 한쪽만 고치게 된다.
    expect(flat).toContain('from "@/lib/storeLinks"');
    expect(service).not.toContain("const STORE_LINKS = [");
  });

  it("주소가 없는 스토어 버튼은 링크로 걸지 않는다", () => {
    // 빈 링크를 걸면 눌렀을 때 아무 데도 가지 않는다.
    expect(flat).toContain('aria-disabled="true"');
  });
});
