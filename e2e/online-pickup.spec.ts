import { expect, test } from "@playwright/test";
import { mockCampaign, mockDraft, mockSubmit, photoFile } from "./fixtures/api";
test("온라인 방문 수령은 주소 없이 25900원에 신청하고 기존 계좌·문자 안내를 유지한다", async ({
  page,
}) => {
  await mockCampaign(page);
  await mockDraft(page);
  await mockSubmit(page, {
    listPriceKrw: 29900,
    discountAmountKrw: 4000,
    shippingFeeKrw: 0,
    paymentAmountKrw: 25900,
  });
  let submitted: Record<string, unknown> | undefined;
  page.on("request", request => {
    if (request.method() === "POST" && request.url().endsWith("/application"))
      submitted = request.postDataJSON();
  });
  await page.goto("/goods-survey/order");
  await page
    .getByRole("radio", {
      name: "서울과학기술대학교 상상관에서 받아가기 배송비 없음",
    })
    .check();
  await expect(page.getByPlaceholder("우편번호")).toHaveCount(0);
  await page.getByPlaceholder("반려견 이름").fill("보리");
  await page.getByPlaceholder("받는 분 이름").fill("테스트 보호자");
  await page.getByPlaceholder("010-0000-0000").fill("01012345678");
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
  const payment = page.locator('label:has-text("결제하는 데 동의합니다")');
  await expect(payment).toContainText("25,900원");
  await payment.locator("input").check();
  await page.getByRole("button", { name: "신청 완료하기" }).click();
  await expect(page.locator(".gsf-payment-notice")).toContainText("25,900원");
  await expect(page.locator(".gsf-payment-notice")).toContainText(
    "문자로도 보내드립니다"
  );
  await expect(page.locator(".gsf-bank")).toContainText(
    "기업은행 000-000000-00-000"
  );
  expect(submitted).toMatchObject({
    deliveryMethod: "pickup",
    postalCode: "",
    address: "",
    addressDetail: "",
    privacyAgreed: true,
    marketingAgreed: false,
  });
  expect(JSON.stringify(submitted)).toContain('"publicPhotoIds":[]');
  await expect(page.locator("body")).not.toContainText("설문");
});
