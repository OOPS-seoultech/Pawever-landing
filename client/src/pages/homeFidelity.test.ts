import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 홈 화면이 피그마와 같은 것을 말하는지 본다.
 *
 * 기준 프레임은 피그마 8. Website 의
 * `Identify and Connect Home Component` > `PawEverHome` (5200:1448) 이다.
 *
 * 이 파일이 필요한 이유가 있다. 같은 페이지 안에 Home 프레임이 열 개 넘게 있고,
 * 한 번은 다른 프레임을 보고 만들어 화면 구조가 통째로 어긋난 적이 있다.
 * 문구만 맞춰 보면 그때도 통과했다 — 문구는 어느 프레임이나 거의 같았다.
 * 그래서 여기서는 구조를 가르는 값을 함께 붙들어 둔다.
 *
 * 바꿔야 하면 피그마부터 바꾸고 여기를 맞춘다.
 */
const home = readFileSync(join(__dirname, "Home.tsx"), "utf-8");
const flat = home.replace(/\s+/g, " ");

describe("홈 화면 기준 문구", () => {
  it("세 가지 방법 카드에 카테고리·제목·설명이 있다", () => {
    [
      ["기록과 케어", "포에버 앱"],
      ["우리 아이 맞춤 제작", "3D 맞춤 굿즈 얼리버드"],
      ["함께 만드는 다음 서비스", "반려인 설문"],
    ].forEach(([category, title]) => {
      expect(flat).toContain(category);
      expect(flat).toContain(title);
    });
  });

  it("굿즈·설문 줄에 실적 한 줄이 붙는다", () => {
    expect(home).toContain('proof: "우리 아이 완전 맞춤 3D굿즈 100건 제작 중"');
    expect(home).toContain('proof: "반려인 731명 조사 완료"');
  });

  it("앱 줄에는 실적을 지어내지 않는다", () => {
    // 피그마도 이 자리를 비워 둔다. 채우려면 실제 수가 있어야 한다.
    expect(home).toContain('proof: ""');
  });

  it("설문 실적에 기준 날짜를 붙인다", () => {
    // 731명이 언제 기준인지 없으면 시간이 지나도 같은 수가 사실처럼 남는다.
    expect(home).toContain('proofNote: "(2026. 08. 12 기준)"');
  });

  it("히어로 아래 실적 두 줄을 그대로 둔다", () => {
    expect(flat).toContain("반려견 생애주기에 따른 보호자의 행동 데이터를 모았습니다.");
    expect(flat).toContain(
      "보호자의 사진과 이야기를 바탕으로 한 맞춤 제작을 이어가고 있습니다."
    );
  });
});

describe("홈 화면 구조", () => {
  it("히어로가 배경 사진을 깐다", () => {
    // 예전에는 오른쪽 흰 카드 안에 이미지를 넣었다. 피그마는 사진이 화면
    // 끝까지 가고 그 위에 흰 글씨가 얹힌다.
    expect(flat).toContain("url(/home/hero.png)");
  });

  it("굿즈 줄만 배경으로 강조한다", () => {
    // 셋 다 같은 무게로 두면 지금 밀어야 할 길이 묻힌다.
    const highlighted = home.match(/highlighted: true/g) ?? [];
    expect(highlighted).toHaveLength(1);
  });

  it("앱 줄만 조용한 버튼이다", () => {
    expect(home.match(/variant: "quiet" as const/g) ?? []).toHaveLength(1);
    expect(home.match(/variant: "primary" as const/g) ?? []).toHaveLength(2);
  });

  it("굿즈 줄에 보조 링크가 하나 더 있다", () => {
    expect(flat).toContain("맞춤 굿즈 얼리버드 보기 →");
  });

  it("이동만 하는 버튼에는 화살표를 붙인다", () => {
    // 피그마가 '보기·살펴보기'류에만 화살표를 뒀다. 신청·참여는 없다.
    ["앱 서비스 살펴보기 →", "향후 방향 보기 →", "문의 유형 선택하기 →"].forEach(
      label => expect(flat).toContain(label)
    );
    expect(flat).not.toContain("굿즈 얼리버드 신청하기 →");
    expect(flat).not.toContain("15분 설문 참여하기 →");
  });

  it("STEP 설명이 피그마 문구다", () => {
    // 다른 프레임에는 '예전과 달라진 점', '진료 상담 전에 필요한 정보'로
    // 적혀 있다. 어느 프레임을 봤는지가 여기서 갈린다.
    expect(flat).toContain("지난 기록과 나란히 보며 달라진 점을 놓치지 않아요.");
    expect(flat).toContain("관찰한 내용을 정리해 진료 상담 전 정보를 준비해요.");
  });

  it("세 가지 방법 눈썹 문구에 마침표가 있다", () => {
    expect(flat).toContain("<Eyebrow>지금 필요한 길을 선택하세요.</Eyebrow>");
  });
});
