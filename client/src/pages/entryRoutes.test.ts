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

const home = read("Home.tsx");
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

/**
 * 웹사이트에서 굿즈로 들어가는 세 갈래가 다 열려 있는지 본다.
 *
 * 대표님 요청 3번이다.
 *
 *   - 바로 굿즈 구매 페이지로 이동
 *   - 설문 후 굿즈 랜딩페이지로 이동
 *   - 바로 설문 페이지로 이동
 *
 * 뒤의 둘은 이미 있었다. 첫 갈래만 홈에서 가는 길이 없었다 — ?direct=1 은
 * 랜딩 안에서만 열려서, 웹사이트에서 곧장 신청하러 갈 수가 없었다.
 *
 * 두 길은 값이 다르다. 설문을 거치면 23,900원, 건너뛰면 29,900원이다.
 * 그래서 어느 버튼이 어디로 가는지가 그냥 링크 문제가 아니다.
 */
describe("웹사이트에서 굿즈로 들어가는 세 갈래", () => {
  it("바로 굿즈 구매 — 신청 버튼이 설문을 건너뛴다", () => {
    // 같은 이름의 신청 버튼이 세 가지 방법 줄과 아래 고정 바 두 곳에 있다.
    // 한쪽만 고치면 같은 글자가 다른 곳으로 간다.
    expect(home.match(/goods-survey\/survey\?direct=1/g) ?? []).toHaveLength(2);
  });

  it("굿즈 랜딩 — 보기 링크는 랜딩에 남는다", () => {
    // '보기'는 구매가 아니다. 여기까지 신청으로 보내면 랜딩을 지나칠 길이
    // 사라진다.
    expect(home).toContain(
      'secondary: { label: "맞춤 굿즈 얼리버드 보기 →", href: "/goods-survey" }'
    );
  });

  it("바로 설문 — 설문 줄은 설문으로 곧장 간다", () => {
    expect(home).toContain('href: "/goods-survey/survey"');
  });
});
