import { mockOrderDetail } from "./adminFixtures";
import { test, expect } from "./adminFixtures";

const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=";

test("다수 주문의 카드·사진을 겹치지 않게 표시하고 패널을 접으며 판매가와 매출을 갱신한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  const rows = Array.from({ length: 40 }, (_, i) => ({
    orderNumber: `TEST-${i}`,
    petIndex: 0,
    petCount: 1,
    pets: [],
    petName: `반려동물${i}`,
    guardianName: `보호자${i}`,
    goodsType: "figure",
    keyringAdded: false,
    orderStatus: "ACTIVE",
    paymentStatus: "CONFIRMED",
    productionStage: "MODELING",
    shipmentStatus: "NOT_READY",
    requiresMigrationReview: false,
    version: 0,
    taskId: 1,
    taskStatus: "WAITING",
    taskAttempt: 1,
    modelingTaskId: 1,
    assignee: { id: 2, name: "담당자" },
    blockingIssues: [],
    allowedActions: [],
    reviews: [],
    artifacts: [
      {
        id: "current",
        kind: "MULTIVIEW",
        taskId: 1,
        modelingAttempt: 1,
        fileName: "4면도.png",
        size: 100,
      },
    ],
    expectedAmount: 14900,
    salePriceKrw: 18900,
    salePriceCustom: false,
  }));
  const photos = new Set<string>();
  const mutations: string[] = [];
  let saved = false;
  await page.route("**/api/**", route => {
    const detail = mockOrderDetail(new URL(route.request().url()).pathname);
    if (detail && route.request().method() === "GET")
      return route.fulfill({ json: { success: true, data: detail } });
    const request = route.request();
    const path = new URL(request.url()).pathname;
    let data: unknown = [];
    if (path.endsWith("/me"))
      data = {
        id: 1,
        name: "관리자",
        role: "OWNER",
        workRoles: [],
        permissions: [
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
          "VIEW_CUSTOMER_IDENTITY",
          "VIEW_CUSTOMER_PHOTOS",
          "VIEW_PRODUCTION_FILES",
          "DOWNLOAD_PRODUCTION_FILES",
          "VIEW_PAYMENT",
          "MANAGE_OPERATION_SETTINGS",
        ],
      };
    if (path.endsWith("/workflow/orders")) data = rows;
    if (path.endsWith("/sales-summary"))
      data = {
        totalKrw: saved ? 52900 : 47800,
        monthKrw: saved ? 24000 : 18900,
        currentMonth: "2026-11",
        paidOrderCount: 3,
        months: Array.from({ length: 12 }, (_, i) => ({
          month: `2026-${String(i + 1).padStart(2, "0")}`,
          amountKrw: i === 10 ? (saved ? 24000 : 18900) : 0,
        })),
      };
    if (path.endsWith("/workflow")) data = rows[0];
    if (path.endsWith("/photo-links")) {
      photos.add(path);
      data = {
        photos: Array.from({ length: 5 }, (_, i) => ({
          slot: i + 1,
          url: image,
          expiresAt: "2030-01-01",
        })),
      };
    }
    if (path.endsWith("/download-link")) data = { url: image };
    if (path.endsWith("/sale-price")) {
      mutations.push(path);
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      expect(request.postDataJSON()).toEqual({
        version: 0,
        custom: true,
        petIndex: 0,
        salePriceKrw: 24000,
      });
      rows[0] = {
        ...rows[0],
        version: 1,
        salePriceKrw: 24000,
        salePriceCustom: true,
      };
      saved = true;
      data = rows[0];
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/operations");
  const list = page.getByRole("region", { name: "단계별 주문 목록" });
  const first = list.getByRole("button").nth(0);
  const second = list.getByRole("button").nth(1);
  await expect(first.getByRole("img")).toBeVisible();
  expect(photos.size).toBeLessThan(40);
  const a = await first.boundingBox(),
    b = await second.boundingBox();
  expect(a!.y + a!.height).toBeLessThanOrEqual(b!.y);
  expect(a!.height).toBeGreaterThan(100);
  await first.click();
  const panel = page.getByRole("region", { name: "운영 주문 상세" });
  const comparison = page.getByRole("region", { name: "고객 사진·4면도 비교" });
  await expect(comparison.getByRole("img", { name: /^고객 사진/ })).toHaveCount(
    5
  );
  const photoBox = await comparison
    .getByRole("img", { name: "고객 사진 1", exact: true })
    .boundingBox();
  expect(Math.abs(photoBox!.height - photoBox!.width)).toBeLessThan(2);
  const comp = await comparison.boundingBox();
  expect(comp!.height).toBeGreaterThan(200);
  await page.screenshot({ path: test.info().outputPath("desktop.png") });
  await expect(
    panel.getByRole("region", { name: "주문 판매가", exact: true })
  ).toContainText("18,900원");
  await page.getByRole("switch", { name: "직접 입력", exact: true }).check();
  await page.getByLabel("주문 판매가 (원)", { exact: true }).fill("-1");
  await expect(
    page.getByRole("button", { name: "판매가 저장", exact: true })
  ).toBeDisabled();
  await page.getByLabel("주문 판매가 (원)", { exact: true }).fill("24000");
  await page.getByRole("button", { name: "판매가 저장", exact: true }).click();
  await expect(
    panel.getByRole("region", { name: "주문 판매가", exact: true })
  ).toContainText("24,000원");
  await expect(page.getByLabel("판매가 기준 매출")).toContainText("52,900원");
  expect(mutations).toEqual(["/api/admin/orders/TEST-0/sale-price"]);
  expect(rows[0].expectedAmount).toBe(14900);
  await page.getByRole("switch", { name: "사진·상세 패널" }).uncheck();
  await expect(panel).toHaveCount(0);
  const wide = await list.boundingBox();
  await page.getByRole("switch", { name: "사진·상세 패널" }).check();
  await expect(panel).toBeVisible();
  const narrow = await list.boundingBox();
  expect(wide!.width).toBeGreaterThan(narrow!.width);
  await expect(comparison).toHaveCount(1);
  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    const listBox = await list.boundingBox(),
      detailBox = await panel.boundingBox();
    expect(listBox!.x + listBox!.width).toBeLessThanOrEqual(detailBox!.x);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
  }
  await first.focus();
  await first.press("Enter");
  await expect(panel).toBeFocused();

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.getByRole("button", { name: "매출 그래프 접기" }).click();
  await page.getByRole("button", { name: "매출 그래프 펼치기" }).click();
  await page.getByText("월별 금액 표로 보기").click();
  await expect(
    page.getByRole("table", { name: "최근 12개월 관리용 매출" })
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  await page.getByRole("switch", { name: "사진·상세 패널" }).uncheck();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  const smallA = await first.boundingBox(),
    smallB = await second.boundingBox();
  expect(smallA!.y + smallA!.height).toBeLessThanOrEqual(smallB!.y);
  await page.screenshot({ path: test.info().outputPath("narrow.png") });
});
