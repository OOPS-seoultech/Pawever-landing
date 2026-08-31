import { expect, test } from "@playwright/test";
import { failCampaign, mockCampaign } from "./fixtures/api";

/**
 * 굿즈 판매 랜딩(/goods-survey)에서 버튼을 눌렀을 때 어디로 가는지 본다.
 *
 * 각 단언 위에 그렇게 동작해야 하는 근거를 적는다. 근거는 세 곳에서 온다 —
 *
 *   [카톡]   O.O.P.S 단톡방 / 대표님 개인톡. 날짜와 시각으로 특정한다.
 *   [피그마] 0uW99BqaTJKUVlowzQswli · 2nd Landing / Body(5423:1415) 와 그 코멘트
 *   [서버]   Pawever-back 의 마이그레이션·서비스 코드
 *
 * 지시가 여러 번 바뀐 자리가 있어서 날짜를 반드시 같이 남긴다.
 */

const LANDING = "/goods-survey";

/** 판매를 앞세운 버튼이 가는 곳. 설문을 건너뛴다는 뜻이다. */
const DIRECT = /\/goods-survey\/survey\?direct=1$/;
/** 설문 버튼이 가는 곳. direct 가 붙지 않는다. */
const SURVEY = /\/goods-survey\/survey$/;

test.describe("판매가 열려 있을 때", () => {
  test.beforeEach(async ({ page }) => {
    await mockCampaign(page, { goodsOpen: true, surveyOpen: true });
  });

  test("구매 버튼 셋이 설문을 건너뛰고 주문으로 간다", async ({ page }) => {
    // 근거: [카톡 8/24 14:03 단톡, 대표] "랜딩페이지 목적은 설문받는 게
    //       우선이 아니라, 상품 판매가 우선입니다!!"
    // 근거: [피그마 코멘트 #27 / 카톡 8/27 14:26] 사러 온 사람을 한 번 더
    //       세우는 뎁스를 없앤다.
    for (const ctaId of ["btn_A1", "btn_A2", "btn_B"]) {
      await page.goto(LANDING);
      const cta = page.locator(`[data-cta-id="${ctaId}"]`);
      await expect(cta, `${ctaId} 가 보여야 한다`).toBeVisible();
      await cta.click();
      await expect(page, `${ctaId} 는 설문을 건너뛴다`).toHaveURL(DIRECT);
    }
  });

  test("설문 버튼 둘은 안내를 한 번 띄운 뒤 설문으로 간다", async ({
    page,
  }) => {
    // 근거: [피그마 코멘트 #27] 뎁스를 없애라는 건 '구매' 쪽이다. 설문은
    //       10~15분짜리라 무엇을 받는지 먼저 보여준 뒤 들어가야 한다.
    // 근거: [카톡 8/24 14:03] "설문 미진행 = 그냥 굿즈 구매 / 설문 진행 =
    //       할인 받고 굿즈 구매 소구점 각각 재설정"
    for (const ctaId of ["btn_A3", "btn_A4"]) {
      await page.goto(LANDING);
      await page.locator(`[data-cta-id="${ctaId}"]`).click();

      const modal = page.getByRole("dialog");
      await expect(modal, `${ctaId} 는 안내를 먼저 띄운다`).toBeVisible();
      // 모달이 참여자 가격을 처음 보여주는 자리다.
      await expect(modal).toContainText("23,900원");

      await modal.getByRole("button", { name: /설문하고/ }).click();
      await expect(page, `${ctaId} 는 할인 경로로 간다`).toHaveURL(SURVEY);
    }
  });

  test("안내 모달은 닫으면 화면에 남지 않는다", async ({ page }) => {
    await page.goto(LANDING);
    await page.locator('[data-cta-id="btn_A4"]').click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await modal.getByRole("button", { name: "닫기" }).click();

    await expect(modal).toBeHidden();
    // 닫기는 이동이 아니다. 랜딩에 그대로 있어야 한다.
    await expect(page).toHaveURL(/\/goods-survey$/);
  });

  test("남은 자리를 서버가 준 값 그대로 보여준다", async ({ page }) => {
    // 근거: [피그마 코멘트 #25] "지난번 랜딩처럼 수량이 계속 줄고 있는 모습"
    // 근거: [서버] remaining = capacity − historicalAllocated − activeAllocations.
    //       화면이 자기 값을 만들면 실제 남은 자리와 어긋난다.
    await mockCampaign(page, { capacity: 100, allocated: 37, remaining: 63 });
    await page.goto(LANDING);

    const card = page.locator(".gs-remaining-card");
    await expect(card).toHaveAttribute("data-remaining", "63");
    await expect(card).toContainText("63명");
    await expect(card).toContainText("선착순 100명 한정");
  });

  test("정원이 없는 모집에서는 선착순 카드를 감춘다", async ({ page }) => {
    // 근거: [서버] capacity <= 0 이면 무제한이고 서버는 remaining 에 -1 을 준다.
    //       "-1명만 더 받을 수 있어요"가 뜨면 안 된다.
    await mockCampaign(page, { capacity: 0, allocated: 12, remaining: -1 });
    await page.goto(LANDING);

    await expect(page.locator('[data-cta-id="btn_A1"]')).toBeVisible();
    await expect(page.locator(".gs-remaining-card")).toHaveCount(0);
  });
});

test.describe("판매가 닫혀 있을 때", () => {
  test.beforeEach(async ({ page }) => {
    // 근거: [서버] V6__split_goods_survey_gates.sql 이 설문과 굿즈를 다른
    //       스위치로 쪼갰다. 설문만 열어 두는 상태가 정상 상태 중 하나다.
    await mockCampaign(page, { goodsOpen: false, surveyOpen: true });
    await page.goto(LANDING);
  });

  test("구매 버튼이 사라지고 안내 문구가 대신 선다", async ({ page }) => {
    await expect(page.getByText("2차 오픈 시 신청할 수 있어요")).toHaveCount(3);
    for (const ctaId of ["btn_A1", "btn_A2", "btn_A5"]) {
      await expect(page.locator(`[data-cta-id="${ctaId}"]`)).toHaveCount(0);
    }
  });

  test("하단 고정 버튼은 설문으로 방향을 바꾼다", async ({ page }) => {
    // 근거: 굿즈가 닫혀 있을 때 설문은 그때 할 수 있는 유일한 일이다.
    const sticky = page.locator('[data-cta-id="btn_B"]');
    await expect(sticky).toContainText("설문하고 23,900원 혜택 받기");

    await sticky.click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /설문하고/ })
      .click();
    await expect(page).toHaveURL(SURVEY);
  });
});

test.describe("설문까지 닫혀 있을 때", () => {
  test("설문 버튼이 모두 잠기고 마감이라고 말한다", async ({ page }) => {
    await mockCampaign(page, { goodsOpen: false, surveyOpen: false });
    await page.goto(LANDING);

    for (const ctaId of ["btn_A3", "btn_A4", "btn_B"]) {
      const cta = page.locator(`[data-cta-id="${ctaId}"]`);
      await expect(cta, `${ctaId} 는 잠겨야 한다`).toBeDisabled();
      await expect(cta).toContainText("설문 접수 마감");
    }
  });
});

test.describe("캠페인 조회가 실패할 때", () => {
  test("화면은 뜨되 팔지는 않는다", async ({ page }) => {
    // 근거: [소스 주석 GoodsSurvey.tsx] "굿즈가 잘못 열리면 지킬 수 없는
    //       약속이 화면에 뜬다." 그래서 실패의 기본값은 닫힘이다.
    await failCampaign(page);
    await page.goto(LANDING);

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expect(page.locator('[data-cta-id="btn_A1"]')).toHaveCount(0);
    await expect(
      page.getByText("2차 오픈 시 신청할 수 있어요").first()
    ).toBeVisible();
  });
});
