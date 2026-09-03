import { expect, test } from "@playwright/test";
import {
  mockCampaign,
  mockDraft,
  mockFleaCampaign,
  mockSubmit,
  photoFile,
} from "./fixtures/api";

/**
 * 플리마켓 랜딩에서 넘어온 주문(/goods-survey/survey?direct=1&channel=flea).
 *
 * 화면과 서버가 같은 값을 봐야 한다. 랜딩이 11,900원이라고 적어 두고 주문
 * 화면이 29,900원으로 열리면, 사람은 동의한 적 없는 금액을 청구받는다.
 *
 * 근거: [피그마 0uW99BqaTJKUVlowzQswli / 8-2. Rending Page]
 *       5472:1480 "11,900원" · 5472:1482 "방문수령 외 택배 시 배송비 3,000원 별도"
 *       5472:1755 "선착순 70명 예약하고, 과기대에서 수령하기"
 */

const FLEA = "/goods-survey/survey?direct=1&channel=flea";
const ONLINE = "/goods-survey/survey?direct=1";

const consent = (page: import("@playwright/test").Page) =>
  page.locator('label:has-text("결제하는 데 동의합니다")');

test.describe("플리마켓 주문", () => {
  test.beforeEach(async ({ page }) => {
    await mockFleaCampaign(page);
    await mockCampaign(page);
    await mockDraft(page);
  });

  test("들어온 경로를 서버에 알린다", async ({ page }) => {
    // 값이 갈리는 판정은 서버가 한다. 화면이 혼자 11,900원을 그려 놓고
    // 알리지 않으면, 서버는 이 사람을 상시 판매로 보고 29,900원을 매긴다.
    const bodies: string[] = [];
    page.on("request", request => {
      if (
        request.method() === "POST" &&
        request.url().endsWith("/goods-survey/responses")
      ) {
        bodies.push(request.postData() ?? "");
      }
    });

    await page.goto(FLEA);
    await expect(page.getByText("마지막 단계")).toBeVisible();

    expect(bodies.join(" ")).toContain('"channel":"flea"');
  });

  test("현장 수령이 기본이고, 그때 값은 11,900원이다", async ({ page }) => {
    // 랜딩이 "선착순 70명 예약하고, 과기대에서 수령하기"로 부른다. 택배가
    // 기본이면 랜딩이 약속한 11,900원이 주문 화면에서 14,900원이 된다.
    await page.goto(FLEA);

    await expect(page.locator(".gsf-delivery")).toBeVisible();
    await expect(
      page.locator('.gsf-delivery label:has-text("과기대에서 받아가기") input')
    ).toBeChecked();

    await expect(consent(page)).toContainText("제작비 11,900원");
    await expect(consent(page)).toContainText("방문수령(배송비 없음)");
    await expect(consent(page)).toContainText("11,900원을 결제하는 데");
  });

  test("현장 수령이면 주소를 묻지 않는다", async ({ page }) => {
    // 받는 사람이 그 자리에 온다. 쓰지 않을 주소를 받아 두면 지킬 것만 는다.
    await page.goto(FLEA);

    await expect(page.getByPlaceholder("우편번호")).toHaveCount(0);
    await expect(page.getByPlaceholder("도로명 주소")).toHaveCount(0);

    // 주소 없이도 나머지를 채우면 신청이 열려야 한다.
    await page.getByPlaceholder("반려견 이름").fill("보리");
    await page.getByPlaceholder("받는 분 이름").fill("황성욱");
    await page.getByPlaceholder("010-0000-0000").fill("010-1234-5678");
    await page
      .locator('label:has-text("개인정보 수집·이용에 동의합니다") input')
      .check();
    await consent(page).locator("input").check();

    // 사진은 아직이므로 잠겨 있다. 주소가 이유가 아니라는 것만 본다.
    await expect(
      page.getByRole("button", { name: /신청 완료하기/ })
    ).toBeDisabled();
    await expect(page.locator(".gsf-field-error")).toHaveCount(0);
  });

  test("택배로 바꾸면 주소를 묻고 배송비가 붙는다", async ({ page }) => {
    await page.goto(FLEA);
    await page
      .locator('.gsf-delivery label:has-text("택배로 받기") input')
      .check();

    await expect(page.getByPlaceholder("우편번호")).toBeVisible();
    await expect(page.getByPlaceholder("도로명 주소")).toBeVisible();

    // 제작비 11,900 + 배송비 3,000 = 14,900
    await expect(consent(page)).toContainText("배송비 3,000원");
    await expect(consent(page)).toContainText("14,900원을 결제하는 데");
  });

  test("접수되면 어디로 넣을지가 화면에 뜬다", async ({ page }) => {
    // 계좌를 문자로만 보내던 때가 있었다. 문자가 오기 전까지 사람은 아무것도
    // 할 수 없고, 현장에서 QR 을 찍고 그 자리에서 넣는 자리라면 줄이 선다.
    await mockSubmit(page);
    await page.goto(FLEA);

    await page.getByPlaceholder("반려견 이름").fill("보리");
    await page.getByPlaceholder("받는 분 이름").fill("황성욱");
    await page.getByPlaceholder("010-0000-0000").fill("010-1234-5678");
    await page
      .locator('.gsf-upload input[type="file"]')
      .setInputFiles([
        photoFile("1.jpg"),
        photoFile("2.jpg"),
        photoFile("3.jpg"),
      ]);
    await page
      .locator('label:has-text("개인정보 수집·이용에 동의합니다") input')
      .check();
    await consent(page).locator("input").check();
    await page.getByRole("button", { name: /신청 완료하기/ }).click();

    // 계좌를 눈앞에 두고 "문자로 보내드릴게요"라고 하면 기다려야 하는지
    // 헷갈린다. 지금 넣을 수 있다는 것이 먼저다.
    await expect(page.locator(".gsf-payment-notice strong").first()).toHaveText(
      "아래 계좌로 입금해 주세요"
    );

    const bank = page.locator(".gsf-bank");
    await expect(bank).toBeVisible();
    await expect(bank).toContainText("기업은행");
    await expect(bank).toContainText("000-000000-00-000");
    await expect(bank).toContainText("예금주 포에버");
    // 입금자명이 아니라 주문번호로 대조한다.
    await expect(page.locator(".gsf-payment-notice")).toContainText(
      "PE-2026-000123"
    );
    // 현장 수령이라 배송비가 붙지 않은 값 그대로다.
    await expect(page.locator(".gsf-payment-notice")).toContainText("11,900원");

    await expect(bank.getByRole("button")).toContainText("계좌번호 복사");
  });

  test("계좌를 정하지 않았으면 그 자리를 비워 둔다", async ({ page }) => {
    // 없는 계좌를 빈칸으로 그려 두면 사람이 빈칸으로 송금할 곳을 찾는다.
    await mockSubmit(page, { bank: null });
    await page.goto(FLEA);

    await page.getByPlaceholder("반려견 이름").fill("보리");
    await page.getByPlaceholder("받는 분 이름").fill("황성욱");
    await page.getByPlaceholder("010-0000-0000").fill("010-1234-5678");
    await page
      .locator('.gsf-upload input[type="file"]')
      .setInputFiles([
        photoFile("1.jpg"),
        photoFile("2.jpg"),
        photoFile("3.jpg"),
      ]);
    await page
      .locator('label:has-text("개인정보 수집·이용에 동의합니다") input')
      .check();
    await consent(page).locator("input").check();
    await page.getByRole("button", { name: /신청 완료하기/ }).click();

    await expect(page.locator(".gsf-payment-notice")).toBeVisible();
    await expect(page.locator(".gsf-bank")).toHaveCount(0);
    // 계좌가 없으면 예전처럼 문자로 안내한다.
    await expect(page.locator(".gsf-payment-notice strong").first()).toHaveText(
      "입금 안내를 문자로 보내드릴게요"
    );
  });

  test("상시 주문은 그대로 정가에 택배다", async ({ page }) => {
    // 플리마켓을 붙이면서 기존 길을 건드리지 않았다는 확인이다.
    await page.goto(ONLINE);

    await expect(page.locator(".gsf-delivery")).toHaveCount(0);
    await expect(page.getByPlaceholder("우편번호")).toBeVisible();
    await expect(consent(page)).toContainText("제작비 29,900원");
    await expect(consent(page)).toContainText("32,900원");
  });
});
