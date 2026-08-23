import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 앱 서비스 화면이 피그마와 같은지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `Component` (5210:1909) 이다.
 *
 * 여기서 잡으려는 것은 문구가 아니라 빠진 구역이다. 예전 화면에는 앱 화면
 * 자리 세 개와 번호가 붙은 흐름 목록이 통째로 없었다. 있는 것끼리만 좌표를
 * 맞춰 보면 없는 구역은 끝까지 눈에 띄지 않는다.
 */
const page = readFileSync(join(__dirname, "AppService.tsx"), "utf-8");
const flat = page.replace(/\s+/g, " ");

describe("앱 서비스 구역", () => {
  it("앱 화면 자리를 세 군데 둔다", () => {
    // 피그마 5210:1950 / 5210:1966 / 5210:2005 이다. 자리를 지우면 두 칸
    // 배치가 한 칸으로 무너져 화면 구조가 달라진다.
    ["대표 앱 화면", "기록 화면", "비교 · 병원 준비 화면"].forEach(label =>
      expect(flat, `${label} 자리가 없다`).toContain(label)
    );
    expect(page.match(/<PhonePlaceholder /g) ?? []).toHaveLength(3);
  });

  it("번호가 붙은 흐름 네 줄을 둔다", () => {
    ["01", "02", "03", "04"].forEach(n =>
      expect(flat).toContain(`number: "${n}"`)
    );
  });

  it("흐름 목록을 기록과 확인·준비로 나눈다", () => {
    // 한 덩어리로 두면 가운데 앱 화면 자리가 들어갈 곳이 없다.
    expect(flat).toContain('eyebrow="기록"');
    expect(flat).toContain('eyebrow="확인·준비"');
  });

  it("흐름 줄은 카드가 아니라 선으로 나뉜다", () => {
    expect(flat).toContain("border-t-[3px] border-border");
  });

  it("앱 활용 흐름 한 줄을 따로 둔다", () => {
    // 예전에는 이 문구가 앱 사진 카드 안에 들어가 있었다. 피그마는 화면
    // 폭을 가로지르는 별도 구역이다.
    expect(flat).toContain("기록 → 비교 → 병원 준비");
    expect(flat).toContain(
      "보호자가 직접 확인한 사실을 차곡차곡 쌓아 다음 케어 판단에 활용합니다."
    );
  });

  it("기능 카드 네 장을 둔다", () => {
    [
      "오늘의 30초 케어 기록",
      "필요한 기록을 묻는 케어 질문",
      "주간 변화 비교",
      "병원 준비 요약",
    ].forEach(title => expect(flat).toContain(title));
  });
});

describe("앱 서비스 문구", () => {
  it("제목이 기준 프레임 문구다", () => {
    // 예전에는 "오늘의 기록으로 달라진 점을 확인하세요" 였다. 앞이 다르다.
    expect(flat).toContain("짧은 오늘 기록으로 달라진 점을 확인하세요");
  });

  it("설치 안내를 두 문장 그대로 둔다", () => {
    // "현재 앱은 설치할 수 있으며" 로 줄여 둔 적이 있다.
    expect(flat).toContain(
      "현재 앱은 두 가지 앱스토어 모두에서 설치할 수 있습니다."
    );
  });

  it("의료 고지에 별표를 붙인다", () => {
    // 피그마가 별표로 시작한다. 본문과 같은 무게로 두면 고지로 읽히지 않는다.
    expect(flat).toContain(
      "* 앱의 기록과 안내는 의료 진단이나 치료 지시를 대신하지 않습니다."
    );
  });

  it("02 는 카드와 문장 끝이 다르다", () => {
    // 피그마가 그렇게 두었다. 같은 문장으로 합치면 디자인과 달라진다.
    expect(flat).toContain("이어갈 수 있게 도와요.");
    expect(flat).toContain("이어갈 수 있도록 도와요.");
  });
});

describe("앱 서비스 크기", () => {
  it("제목은 48px 이다", () => {
    // 피그마가 CSS 로 준 값이다. 폭을 재서 역산하던 값이 아니다.
    expect(flat).toContain("md:text-[48px]");
  });

  it("흐름 줄 제목은 22px 이다", () => {
    expect(flat).toContain("md:text-[22px]");
  });

  it("스토어 버튼을 공용으로 쓴다", () => {
    expect(flat).toContain('from "@/components/StoreButtons"');
    expect(page).not.toContain("const STORE_LINKS = [");
  });
});
