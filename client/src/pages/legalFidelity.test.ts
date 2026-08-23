import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 정책 세 화면이 피그마와 같은 색을 쓰는지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * - `PAW-EVER Website / 이용약관 / Editable` (5226:1411)
 * - `PAW-EVER Website / 개인정보처리방침 / Editable` (5226:1579)
 * - `PAW-EVER Website / 데이터 삭제 요청 안내 / Editable` (5226:1787)
 *
 * 이 세 화면은 홈·서비스 소개 등을 피그마에 맞출 때 한 번도 대조하지 않았다.
 * 글은 다 맞는데 강조 색이 어긋나 있었다 — 조 제목이 검정이었고, 링크는
 * Tailwind 기본 orange-500(#FF6900)이라 나머지 화면의 주황(#FF9F43)과
 * 눈에 띄게 달랐다.
 *
 * 여기서 붙드는 것은 문구가 아니라 색이다. 문구는 법무 쪽이 정한다.
 */
const read = (name: string) =>
  readFileSync(join(__dirname, name), "utf-8").replace(/\s+/g, " ");

const terms = read("TermsOfService.tsx");
const privacy = read("PrivacyPolicy.tsx");
const deletion = read("AccountDeletion.tsx");

describe("이용약관", () => {
  it("조 제목이 주황 Medium 이다", () => {
    // 검정 SemiBold 였다. 피그마는 18px Medium #FFA94E 다. 검정으로 두면
    // 장 제목(24px Bold)과 무게가 비슷해 조가 장처럼 읽힌다.
    expect(terms).toContain('className="text-lg font-medium text-primary mb-2"');
    expect(terms).not.toContain("text-lg font-semibold text-foreground");
  });

  it("장 제목은 24px Bold 검정 그대로다", () => {
    expect(terms).toContain('className="text-2xl font-bold text-foreground mb-4"');
  });
});

describe("개인정보처리방침", () => {
  it("링크가 프로젝트 주황이다", () => {
    // Tailwind orange-500 은 #FF6900 이라 --primary(#FF9F43)와 확연히 다르다.
    // 피그마는 #FFA94E 다.
    expect(privacy).toContain("text-primary hover:text-primary/80 font-medium");
    expect(privacy).not.toContain("text-orange-500");
  });

  it("표 첫 열이 주황 Medium 이다", () => {
    expect(privacy).toContain("px-4 py-3 font-medium text-primary");
  });

  it("불릿은 주황이 아니라 회색이다", () => {
    // 피그마는 본문과 같은 #667085 다. 주황으로 두면 항목마다 시선이 점에
    // 먼저 간다.
    expect(privacy).toContain('<span className="text-muted-foreground">•</span>');
  });

  it("세로 막대만 Tailwind 기본 팔레트를 쓴다", () => {
    // 피그마가 이 막대를 #FF8904 로 지정했고 그 팔레트의 400 이 정확히 그
    // 값이다. 이 화면에서 --primary 가 아닌 색을 쓰는 유일한 곳이다.
    //
    // 주석에도 같은 이름이 나오므로 파일 전체가 아니라 클래스만 센다.
    expect(privacy).toContain("w-1 h-8 bg-orange-400 rounded-full");
    expect(privacy.match(/className="[^"]*orange-\d+/g) ?? []).toHaveLength(1);
  });
});

describe("개인정보처리방침 위탁 고지", () => {
  it("결제대행사를 적어 둔다", () => {
    // 결제가 붙었는데 여기가 비어 있으면 고지 없는 위탁이 된다.
    expect(privacy).toContain("포트원");
    expect(privacy).toContain("KG이니시스");
  });

  it("텔레그램 국외 이전을 적어 둔다", () => {
    // 대표님 판단으로 알림에 이름과 연락처를 그대로 싣는다. 그러면 이
    // 고지가 선택이 아니라 조건이 된다. 보내는 항목을 늘릴 때 이 줄도
    // 같이 고쳐야 한다.
    expect(privacy).toContain("Telegram");
    expect(privacy).toContain("국외 이전");
    expect(privacy).toContain("신청자 이름·연락처");
  });

  it("결제수단 정보는 보관하지 않는다고 밝힌다", () => {
    expect(privacy).toContain("포에버는 보관하지 않습니다");
  });
});

describe("데이터 삭제 요청 안내", () => {
  it("불릿과 이메일이 강조 색이다", () => {
    // --accent 와 --primary 는 둘 다 #FF9F43 이다. 피그마는 #FFA94E 다.
    expect(deletion).toContain('<span className="text-accent">•</span>');
    expect(deletion).toContain("font-semibold text-accent hover:underline");
  });
});

describe("정책 세 화면 공통", () => {
  it("Tailwind 기본 orange 팔레트를 함부로 쓰지 않는다", () => {
    // 기본 팔레트를 쓰면 나머지 화면과 주황이 갈린다. 피그마가 그 값을
    // 콕 집어 지정한 곳(개인정보 세로 막대)만 예외다.
    expect(terms.match(/className="[^"]*orange-\d+/g) ?? []).toHaveLength(0);
    expect(deletion.match(/className="[^"]*orange-\d+/g) ?? []).toHaveLength(0);
  });
});
