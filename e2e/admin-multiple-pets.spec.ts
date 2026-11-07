import { test, expect } from "./adminFixtures";

const image =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+c3ioAAAAASUVORK5CYII=";

test("한 주문의 두 아이를 구별하고 개별 사진·단계와 주문 총액을 관리한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  const pets = [
    { petIndex: 0, petName: "뚜비", productionStage: "MODELING_QUEUE" },
    { petIndex: 1, petName: "별이", productionStage: "MODELING_QUEUE" },
  ];
  let rows = pets.map(pet => ({
    ...pet,
    orderNumber: "PE-TWO",
    petCount: 2,
    pets,
    guardianName: "테스트 보호자",
    goodsType: "figure",
    keyringAdded: false,
    orderStatus: "ACTIVE",
    paymentStatus: "CONFIRMED",
    shipmentStatus: "NOT_READY",
    requiresMigrationReview: false,
    version: 0,
    taskId: pet.petIndex + 10,
    taskStatus: "WAITING",
    taskAttempt: 1,
    modelingTaskId: pet.petIndex + 10,
    assignee: { id: 2, name: "담당자" },
    blockingIssues: [],
    allowedActions: ["START_TASK"],
    artifacts: [],
    salePriceKrw: 37800,
    salePriceCustom: false,
    expectedAmount: 37800,
  }));
  const requestedPets: string[] = [];
  const starts: number[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname;
    let data: unknown = [];
    if (path.endsWith("/me"))
      data = {
        id: 2,
        name: "관리자",
        role: "OWNER",
        workRoles: ["MODELING"],
        permissions: [
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
          "VIEW_CUSTOMER_IDENTITY",
          "VIEW_CUSTOMER_PHOTOS",
          "VIEW_PAYMENT",
          "MANAGE_OPERATION_SETTINGS",
          "COMPLETE_MODELING",
        ],
      };
    if (path.endsWith("/workflow/orders")) data = rows;
    if (path.endsWith("/workflow"))
      data = rows[Number(url.searchParams.get("petIndex"))];
    if (path.endsWith("/photo-links")) {
      requestedPets.push(url.searchParams.get("petIndex")!);
      data = { photos: [{ slot: 1, url: image, expiresAt: "2030-01-01" }] };
    }
    if (path.endsWith("/start")) {
      const index = Number(path.split("/").at(-2)) - 10;
      starts.push(index);
      pets[index].productionStage = "MODELING";
      rows = rows.map(row => ({
        ...row,
        version: row.version + 1,
        pets,
        ...(row.petIndex === index
          ? {
              productionStage: "MODELING",
              taskStatus: "IN_PROGRESS",
              allowedActions: [],
            }
          : {}),
      }));
      data = rows[index];
    }
    if (path.endsWith("/sale-price")) {
      const body = request.postDataJSON();
      expect(body.petIndex).toBe(1);
      rows = rows.map(row => ({
        ...row,
        version: row.version + 1,
        salePriceKrw: body.salePriceKrw,
        salePriceCustom: true,
      }));
      data = rows[1];
    }
    if (path.endsWith("/sales-summary"))
      data = {
        totalKrw: 37800,
        monthKrw: 37800,
        paidOrderCount: 1,
        currentMonth: "2026-11",
        months: [],
      };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/operations");
  await expect(
    page.getByText("진행 1건 · 제작 2마리", { exact: false })
  ).toBeVisible();
  const list = page.getByRole("region", { name: "단계별 주문 목록" });
  await expect(list.getByRole("button")).toHaveCount(2);
  await list.getByRole("button", { name: /별이/ }).click();
  const panel = page.getByRole("region", { name: "운영 주문 상세" });
  await expect(
    panel.getByRole("heading", { name: "PE-TWO · 별이" })
  ).toBeVisible();
  await expect(
    panel.getByRole("region", { name: "주문 판매가" })
  ).toContainText("37,800원");
  await expect(panel.getByLabel("기본 판매가 (원)")).toHaveValue("37800");
  await panel.getByRole("button", { name: "작업 시작", exact: true }).click();
  expect(starts).toEqual([1]);
  await expect(list.getByRole("button", { name: /뚜비/ })).toContainText(
    "모델링 결과물 대기"
  );
  await expect(list.getByRole("button", { name: /별이/ })).toContainText(
    "모델링 결과물 등록 중"
  );
  await panel.getByRole("switch", { name: "직접 입력", exact: true }).check();
  await panel.getByLabel("주문 판매가 (원)", { exact: true }).fill("36000");
  await panel.getByRole("button", { name: "판매가 저장", exact: true }).click();
  await expect(list.getByRole("button", { name: /뚜비/ })).toContainText(
    "36,000원"
  );
  await expect(list.getByRole("button", { name: /별이/ })).toContainText(
    "36,000원"
  );
  expect(rows[0].expectedAmount).toBe(37800);
  await panel.getByRole("button", { name: /^뚜비 ·/ }).click();
  await expect(
    panel.getByRole("heading", { name: "PE-TWO · 뚜비" })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "고객 사진·4면도 비교" })
  ).toHaveCount(1);
  await panel.getByRole("button", { name: /^별이 ·/ }).click();
  await expect(
    panel.getByRole("heading", { name: "PE-TWO · 별이" })
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "고객 사진·4면도 비교" })
  ).toHaveCount(1);
  expect(requestedPets).toContain("0");
  expect(requestedPets).toContain("1");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("two-pets-desktop.png"),
  });
});
