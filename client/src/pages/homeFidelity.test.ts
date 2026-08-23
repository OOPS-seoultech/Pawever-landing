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
 * 그다음에는 크기가 문제였다. 좌표만 받아서 글자 크기를 역산하던 시절에
 * 36→35, 23→19, 34→32 처럼 조금씩 어긋났고, 버튼 높이·모서리·굵기처럼
 * 좌표에 잡히지 않는 것은 아예 다른 값이었다. 아래 "크기와 모양" 묶음이
 * 그때 놓친 종류다.
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

  it("히어로 본문에 쉼표를 넣지 않는다", () => {
    // "변화를 쌓고, 필요한" 으로 두었던 적이 있다. 피그마는 쉼표가 없다.
    expect(flat).toContain("건강 변화를 쌓고 필요한 케어와 병원 상담 준비를 돕습니다.");
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

  it("버튼 세 줄이 저마다 다른 색이다", () => {
    // 앱은 조용한 버튼, 굿즈는 --primary, 설문은 그보다 밝은 주황이다.
    expect(home.match(/variant: "quiet" as const/g) ?? []).toHaveLength(1);
    expect(home.match(/variant: "primary" as const/g) ?? []).toHaveLength(1);
    expect(home.match(/variant: "survey" as const/g) ?? []).toHaveLength(1);
  });

  it("설문 버튼은 --primary 가 아닌 다른 주황이다", () => {
    // 굿즈 버튼(#FF9F43)과 나란히 두면 설문 쪽이 아주 조금 밝다.
    expect(flat).toContain('SURVEY_BUTTON_BG = "#FFA94E"');
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

  it("굿즈 버튼만 글자에 밑줄이 있다", () => {
    // 피그마에서 일곱 버튼을 확대해 보니 이 하나만 그렇다. 밑줄은 자리도
    // 크기도 바꾸지 않아서, 좌표와 색만 재던 방식으로는 잡히지 않았다.
    expect(home.match(/underlined: true/g) ?? []).toHaveLength(1);
    expect(home.match(/underlined: false/g) ?? []).toHaveLength(2);
    expect(flat).toContain('entry.underlined ? "underline underline-offset-4" : ""');
  });

  it("문의 아이콘은 피그마가 내보낸 자산이다", () => {
    // 테두리 원에 물음표를 그려 넣던 것과는 다른 물건이다. 45x60 이고
    // 오른쪽 여백이 도형 안에 들어 있다.
    expect(flat).toContain('src="/home/question.svg"');
    expect(flat).toContain('className="h-[60px] w-[45px] shrink-0"');
    expect(flat).not.toContain("bg-[#505152]");
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

describe("홈 화면 크기와 모양", () => {
  it("구역 제목 세 곳이 36px 로 같다", () => {
    // 35px 로 두었던 적이 있다. 역산 오차였다. 한곳에 모아 두면 다음에
    // 바뀔 때 한 곳만 고치면 된다.
    //
    // 넷이 아니라 셋이다. 문의 제목만 34px 로 따로 논다 — 피그마가 그렇게
    // 두었고, 넷을 한 값으로 묶으려다 그 차이를 지울 뻔했다.
    expect(flat).toContain("md:text-[36px] md:leading-[45px]");
    expect(flat).not.toContain("md:text-[35px]");
    expect(home.match(/<SectionTitle>/g) ?? []).toHaveLength(3);
  });

  it("히어로 제목은 52px 이다", () => {
    expect(flat).toContain("md:text-[52px] md:leading-[60.84px]");
    expect(flat).toContain("tracking-[-1.3px]");
  });

  it("세 가지 방법 제목은 23px 이다", () => {
    // 19px 로 두었던 적이 있다. 네 단계나 작았다.
    expect(flat).toContain("text-[23px] font-semibold leading-[31.05px]");
  });

  it("문의 제목은 34px 이다", () => {
    expect(flat).toContain("md:text-[34px] md:leading-[42.5px]");
  });

  it("버튼 일곱 개가 같은 높이·모서리를 쓴다", () => {
    // 예전에는 px-5 py-3 rounded-[10px] text-sm 이었다. 피그마는 전부
    // 50px 높이에 12px 모서리, 16px SemiBold 다.
    expect(flat).toContain(
      'BUTTON = "inline-flex h-[50px] items-center justify-center rounded-[12px] px-6 text-base font-semibold transition-colors"'
    );
    expect(flat).not.toContain("rounded-[10px] px-5 py-3");
  });

  it("히어로 버튼만 20px 이다", () => {
    expect(home.match(/\$\{BUTTON\} bg-primary text-xl/g) ?? []).toHaveLength(1);
    expect(home.match(/\$\{BUTTON\} text-xl/g) ?? []).toHaveLength(1);
  });

  it("굿즈 줄 모서리는 16px 이고 그림자가 깔린다", () => {
    // 12px 에 그림자 없이 두었던 적이 있다.
    expect(flat).toContain(
      '"-mx-6 rounded-[16px] px-6 shadow-[0_3px_7.5px_rgba(0,0,0,0.06)]"'
    );
  });

  it("흐름 세 칸 사이를 56px 로 벌린다", () => {
    // 32px 로 두면 세 칸이 한 덩어리처럼 붙어 보인다.
    expect(flat).toContain("md:grid-cols-3 md:gap-14");
  });

  it("고지 문구는 본문보다 흐리다", () => {
    // --muted-foreground 로 두면 본문과 같은 무게라 읽어야 할 문장처럼 보인다.
    expect(flat).toContain("text-[rgba(102,112,133,0.57)]");
  });
});
