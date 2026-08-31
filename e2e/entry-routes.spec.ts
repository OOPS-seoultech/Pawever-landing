import { expect, test } from "@playwright/test";
import { mockCampaign, mockDraft } from "./fixtures/api";

/**
 * 웹사이트에서 굿즈로 들어가는 세 갈래와, 굿즈에서 웹사이트로 나가는 길을 본다.
 *
 * 근거: [카톡 8/24 14:03 단톡, 대표] 웹사이트팀 요청사항 3번 전문 —
 *
 *   3. 웹사이트 > 랜딩페이지 이동 분기 설정
 *   - 바로 굿즈 구매 페이지로 이동
 *   - 설문 후 굿즈 랜딩페이지로 이동
 *   - 바로 설문 페이지로 이동
 *   > 웹사이트에서 위 3가지 이동 시 홈 화면 클릭 했을 때 웹사이트 홈화면으로
 *     이동되도록 설정
 *
 * entryRoutes.test.ts 가 같은 요구를 소스 문자열로 지키고 있다. 그쪽은 링크
 * 주소가 코드에 적혀 있는지를 보고, 여기는 눌렀을 때 실제로 거기로 가는지를
 * 본다. wouter 는 href 를 가로채지 않아서 주소와 실제 이동이 갈릴 수 있다.
 */

test.describe("웹사이트 홈에서 굿즈로 들어가는 세 갈래", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
  });

  test("바로 굿즈 구매 — 신청 버튼이 설문을 건너뛴다", async ({ page }) => {
    await page.goto("/");
    // 같은 글자의 신청 버튼이 굿즈 줄과 하단 고정 바 두 곳에 있다.
    const cta = page.getByRole("link", { name: "굿즈 얼리버드 신청하기" });
    await expect(cta).toHaveCount(2);

    await cta.last().click();
    await expect(page).toHaveURL(/\/goods-survey\/survey\?direct=1$/);
  });

  test("굿즈 랜딩 — 보기 링크는 랜딩에 남는다", async ({ page }) => {
    // '보기'는 구매가 아니다. 여기까지 신청으로 보내면 랜딩을 지나칠 길이 없다.
    await page.goto("/");
    await page.getByRole("link", { name: /맞춤 굿즈 얼리버드 보기/ }).click();
    await expect(page).toHaveURL(/\/goods-survey$/);
  });

  test("바로 설문 — 설문 줄은 설문으로 곧장 간다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "15분 설문으로 의견 남기기" }).click();
    await expect(page).toHaveURL(/\/goods-survey\/survey$/);
  });
});

test.describe("굿즈에서 웹사이트로 나가는 길", () => {
  test("랜딩 로고를 누르면 웹사이트 홈으로 나간다", async ({ page }) => {
    // 로고가 자기 자신(/goods-survey)을 가리키고 있었다. 랜딩으로 바로 들어온
    // 사람에게 웹사이트로 돌아갈 길이 없었다.
    await mockCampaign(page, { goodsOpen: true });
    await page.goto("/goods-survey");
    await page.locator("a.gs-wordmark").click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("주문 화면 로고도 웹사이트 홈으로 나간다", async ({ page }) => {
    // wouter 는 href 를 가로채지 않는다. 이 자리는 onClick 이 이동을 맡고
    // 있어서, href 만 고치면 주소는 홈인데 눌리는 곳은 랜딩이 된다.
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
    await page.goto("/goods-survey/survey");
    await page.locator("a.gsf-brand").click();
    await expect(page).toHaveURL(/localhost:\d+\/$/);
  });

  test("설문 첫 화면의 뒤로가기는 랜딩으로 간다", async ({ page }) => {
    // 로고와 뒤로가기는 다른 물건이다. 첫 화면에서 뒤로 가면 방금 떠나온
    // 랜딩으로 돌아가는 게 맞다. 이것까지 홈으로 보내면 길을 잃는다.
    await mockCampaign(page, { goodsOpen: true });
    await mockDraft(page);
    await page.goto("/goods-survey/survey");
    await page.getByRole("button", { name: "랜딩페이지로 돌아가기" }).click();
    await expect(page).toHaveURL(/\/goods-survey$/);
  });
});
