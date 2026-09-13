import { test, expect, type Page } from "@playwright/test";

test("구성을 바꾸면 이전 파일로 확정할 수 없고 임시 구성을 취소할 수 있다", async ({
  page,
}) => {
  await session(page);
  let plate = {
    id: 7,
    version: 5,
    layoutRevision: 1,
    status: "DRAFT",
    printerName: "첫 프린터",
    printingAssigneeId: 4,
    printingAssigneeName: "출력 담당자",
    slots: [
      {
        slotLabel: "AMS 1",
        filamentId: 41,
        spoolId: "F-001",
        colorName: "크림",
        material: "PLA",
        finish: "무광",
      },
    ],
    orders: [initialOrder("PE-PLATE1")],
    artifacts: [
      { id: "file", fileName: "old.3mf", size: 10, currentLayout: true },
    ],
    allowedActions: [
      "EDIT_BATCH",
      "UPLOAD_BATCH_FILE",
      "CONFIRM_BATCH",
      "CANCEL_BATCH",
    ],
    blockingIssues: [],
  };
  await page.route("**/api/production/print-batches**", route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = plate;
    if (path.endsWith("/candidates")) data = [];
    else if (path.endsWith("/staff"))
      data = { defaultPrinting: 4, staff: [{ id: 4, name: "출력 담당자" }] };
    else if (path.endsWith("/cancel")) {
      plate = {
        ...plate,
        version: 7,
        status: "CANCELED",
        orders: [],
        slots: [],
        allowedActions: [],
      };
      data = plate;
    } else if (route.request().method() === "POST") {
      expect(route.request().postDataJSON().printerName).toBe("새 프린터");
      plate = {
        ...plate,
        version: 6,
        layoutRevision: 2,
        printerName: "새 프린터",
        artifacts: [{ ...plate.artifacts[0], currentLayout: false }],
      };
      data = plate;
    } else if (path.endsWith("/print-batches")) data = [plate];
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/print-batches?batch=7");
  await page.getByRole("button", { name: "구성 수정", exact: true }).click();
  await page.getByLabel("프린터 이름", { exact: true }).fill("새 프린터");
  await page.getByRole("button", { name: "구성 저장", exact: true }).click();
  await expect(
    page.getByText("이전 파일 · 현재 구성에 사용할 수 없음")
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: /출력 파일의 주문 배치와 필라멘트 슬롯/ })
    .check();
  await expect(
    page.getByRole("button", { name: "플레이트 확정", exact: true })
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "파일 열기", exact: true })
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "임시 플레이트 취소", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("주문을 다시 선택");
});

const initialOrder = (number: string) => ({
  orderNumber: number,
  petName: "콩이",
  goodsType: "figure",
  keyringAdded: false,
  orderStatus: "ACTIVE",
  paymentStatus: "CONFIRMED",
  productionStage: "PLATE_PREPARATION",
  shipmentStatus: "NOT_READY",
  version: 10,
  taskId: number.endsWith("1") ? 14 : 24,
  taskStatus: "WAITING",
  taskAttempt: 1,
  requiresMigrationReview: false,
  assignee: { id: 3, name: "검수 담당자" },
  blockingIssues: [],
  allowedActions: [],
  artifacts: [],
  reviews: [],
  expectedAmount: null,
  filamentMappings: [
    {
      id: 1,
      taskId: 13,
      modelingAttempt: 1,
      partName: "몸통",
      filamentId: 41,
      spoolId: "F-001",
      colorName: "크림",
      material: "PLA",
      finish: "무광",
      savedAt: "2026-09-12T12:00:00Z",
      completedAt: "2026-09-12T12:00:00Z",
    },
  ],
});
async function session(page: Page, printer = false) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: printer ? 4 : 3,
          name: "담당자",
          role: "PRODUCTION",
          workRoles: [printer ? "PRINT_FINISHING" : "DESIGN_QC"],
          permissions: [
            "VIEW_ORDER_BASIC",
            "VIEW_PRODUCTION_FILES",
            "DOWNLOAD_PRODUCTION_FILES",
            "VIEW_FILAMENT",
            "MANAGE_PRINT_BATCH",
          ],
        },
      },
    })
  );
}

test("주문을 묶고 슬롯·파일을 확인한 후 한 번에 출력 대기로 인계한다", async ({
  page,
}) => {
  await session(page);
  const orders = [initialOrder("PE-PLATE1"), initialOrder("PE-PLATE2")];
  let plate: any = null;
  const keys: string[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    let data: unknown = null;
    if (path.endsWith("/candidates")) data = plate ? [] : orders;
    else if (path.endsWith("/staff"))
      data = { defaultPrinting: 4, staff: [{ id: 4, name: "출력 담당자" }] };
    else if (path.endsWith("/upload-requests"))
      data = {
        artifactId: "plate-file",
        version: ++plate.version,
        url: "https://files.example.test/plate-put",
        headers: { "Content-Type": "application/octet-stream" },
      };
    else if (path.includes("/artifacts/") && path.endsWith("/confirm")) {
      plate = {
        ...plate,
        version: plate.version + 1,
        artifacts: [
          {
            id: "plate-file",
            fileName: "plate.3mf",
            size: 4,
            currentLayout: true,
          },
        ],
      };
      data = plate;
    } else if (path.endsWith("/confirm")) {
      expect(request.postDataJSON().layoutChecked).toBe(true);
      expect(request.postDataJSON().orders).toHaveLength(2);
      keys.push(request.headers()["idempotency-key"]);
      if (keys.length === 1) return route.abort("failed");
      plate = {
        ...plate,
        version: plate.version + 1,
        status: "CONFIRMED",
        allowedActions: [],
        orders: orders.map(o => ({
          ...o,
          productionStage: "PRINT_QUEUE",
          assignee: { id: 4, name: "출력 담당자" },
        })),
      };
      data = plate;
    } else if (path.endsWith("/print-batches") && request.method() === "POST") {
      const b = request.postDataJSON();
      expect(b.orders).toHaveLength(2);
      plate = {
        id: 7,
        version: 0,
        layoutRevision: 1,
        status: "DRAFT",
        printerName: b.printerName,
        printingAssigneeId: b.printingAssigneeId,
        printingAssigneeName: "출력 담당자",
        slots: b.slots,
        orders,
        artifacts: [],
        allowedActions: [
          "EDIT_BATCH",
          "UPLOAD_BATCH_FILE",
          "CONFIRM_BATCH",
          "CANCEL_BATCH",
        ],
        blockingIssues: [],
      };
      data = plate;
    } else if (path.endsWith("/print-batches")) data = plate ? [plate] : [];
    else if (path.endsWith("/7")) data = plate;
    else return route.fulfill({ status: 404 });
    return route.fulfill({ json: { success: true, data } });
  });
  await page.route("https://files.example.test/**", route =>
    route.fulfill({ status: 200, body: "" })
  );
  await page.goto("/admin/print-batches");
  await page.getByRole("button", { name: "새 플레이트", exact: true }).click();
  await page.getByRole("checkbox", { name: /PE-PLATE1/ }).check();
  await page.getByRole("checkbox", { name: /PE-PLATE2/ }).check();
  await page.getByLabel("프린터 이름", { exact: true }).fill("작업실 프린터 1");
  await page.getByLabel("F-001 슬롯", { exact: true }).fill("AMS 1");
  await page.getByRole("button", { name: "구성 저장", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("저장");
  await page.getByLabel("플레이트 파일 등록", { exact: true }).setInputFiles({
    name: "plate.3mf",
    mimeType: "application/octet-stream",
    buffer: Buffer.from([80, 75, 3, 4]),
  });
  await expect(page.getByText("plate.3mf", { exact: true })).toBeVisible();
  const confirm = page.getByRole("button", {
    name: "플레이트 확정",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  await page
    .getByRole("checkbox", { name: /출력 파일의 주문 배치와 필라멘트 슬롯/ })
    .check();
  await confirm.click();
  await expect(page.getByRole("alert")).toBeVisible();
  await confirm.click();
  await expect(page.getByRole("status")).toContainText("출력 대기");
  await expect(confirm).toHaveCount(0);
  expect(keys[0]).toBeTruthy();
  expect(keys[1]).toBe(keys[0]);
});

test("출력 담당자는 확정된 플레이트와 파일을 확인한다", async ({ page }) => {
  await session(page, true);
  const plate = {
    id: 7,
    version: 5,
    layoutRevision: 1,
    status: "CONFIRMED",
    printerName: "작업실 프린터",
    printingAssigneeId: 4,
    printingAssigneeName: "출력 담당자",
    slots: [
      {
        slotLabel: "AMS 1",
        filamentId: 41,
        spoolId: "F-001",
        colorName: "크림",
        material: "PLA",
        finish: "무광",
      },
    ],
    orders: [{ ...initialOrder("PE-PLATE1"), productionStage: "PRINT_QUEUE" }],
    artifacts: [
      { id: "file", fileName: "plate.3mf", size: 10, currentLayout: true },
    ],
    allowedActions: [],
    blockingIssues: [],
  };
  await page.route("**/api/production/print-batches**", route =>
    route.fulfill({
      json: {
        success: true,
        data: route.request().url().endsWith("/print-batches")
          ? [plate]
          : plate,
      },
    })
  );
  await page.goto("/admin/print-batches");
  await page.getByRole("button", { name: /PB-7/ }).click();
  await expect(page.getByText("plate.3mf", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "파일 열기", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "새 플레이트", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "플레이트 확정", exact: true })
  ).toHaveCount(0);
});
