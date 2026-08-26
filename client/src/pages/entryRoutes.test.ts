import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * 굿즈 랜딩·설문 화면에서 웹사이트로 나가는 길이 있는지 본다.
 *
 * 대표님 요청 3번의 마지막 줄이 이것이다 — "웹사이트에서 위 3가지 이동 시
 * 홈 화면 클릭 했을 때 웹사이트 홈화면으로 이동되도록 설정".
 *
 * 두 화면 다 로고가 자기 자신(/goods-survey)을 가리키고 있었다. 랜딩에서
 * 로고를 누르면 아무 일도 일어나지 않았고, 설문 화면에서 누르면 랜딩으로
 * 되돌아갔다. 웹사이트 홈으로 나가는 길이 어느 쪽에도 없었다.
 *
 * 링크 주소는 화면에 보이지 않아서 눈으로 훑는 대조에는 잡히지 않는다.
 * 그래서 여기 적어 둔다.
 */
const read = (name: string) =>
  readFileSync(join(__dirname, name), "utf-8").replace(/\s+/g, " ");

const landing = read("GoodsSurvey.tsx");
const form = read("GoodsSurveyForm.tsx");

describe("굿즈 랜딩·설문에서 웹사이트로 나가는 길", () => {
  it("랜딩 로고가 웹사이트 홈으로 간다", () => {
    expect(landing).toContain('<a href="/" className="gs-wordmark">');
  });

  it("설문 화면 로고도 웹사이트 홈으로 간다", () => {
    // wouter는 href를 가로채지 않는다. 이 자리는 onClick이 실제 이동을
    // 맡고 있어서, href만 고치면 주소는 홈인데 눌리는 곳은 랜딩이 된다.
    // 둘을 같이 붙들어야 한다.
    expect(form).toContain(
      '<a href="/" onClick={event => { event.preventDefault(); setLocation("/"); }} className="gsf-brand" >'
    );
  });

  it("설문 도중 뒤로가기는 랜딩으로 남는다", () => {
    // 로고와 뒤로가기는 다른 물건이다. 첫 화면에서 뒤로 가면 방금 떠나온
    // 랜딩으로 돌아가는 게 맞다. 이것까지 홈으로 보내면 신청하던 사람이
    // 길을 잃는다.
    expect(form).toContain(
      'stage === "intro" ? () => setLocation("/goods-survey") : goBack'
    );
  });
});
