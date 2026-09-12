import { test, expect, type Page } from "@playwright/test";

const modelPermissions = [
  "VIEW_ORDER_BASIC",
  "VIEW_CUSTOMER_PHOTOS",
  "VIEW_PRODUCTION_FILES",
  "DOWNLOAD_PRODUCTION_FILES",
  "COMPLETE_MODELING",
];
const initial = () => ({
  orderNumber: "PE-TEST001",
  petName: "초코",
  goodsType: "figure",
  keyringAdded: true,
  orderStatus: "ACTIVE",
  paymentStatus: "CONFIRMED",
  productionStage: "MODELING_QUEUE",
  shipmentStatus: "NOT_READY",
  version: 1,
  taskId: 11,
  taskStatus: "WAITING",
  assignee: { id: 2, name: "모델러" },
  blockingIssues: [],
  allowedActions: ["START_TASK"],
  artifacts: [] as {
    id: string;
    kind: string;
    fileName: string;
    size: number;
  }[],
  expectedAmount: null as number | null,
});

async function login(page: Page, role: string, permissions: string[]) {
  await page.addInitScript(() =>
    sessionStorage.setItem("pawever.admin.accessToken", "test-token")
  );
  await page.route("**/api/admin/me", route =>
    route.fulfill({
      json: {
        success: true,
        data: {
          id: 2,
          name: "테스트 담당자",
          role,
          workRoles: ["MODELING"],
          permissions,
        },
      },
    })
  );
}

test("검수 담당자는 넘어온 고객 사진과 모델 파일을 열람한다", async ({ page }) => {
  await login(page, "PRODUCTION", ["VIEW_ORDER_BASIC", "VIEW_CUSTOMER_PHOTOS", "VIEW_PRODUCTION_FILES", "DOWNLOAD_PRODUCTION_FILES", "REVIEW_MODEL"]);
  const row = { ...initial(), productionStage: "MODEL_REVIEW", taskId: 12, assignee: { id: 2, name: "검수 담당자" }, allowedActions: [], artifacts: [{ id: "file-review", kind: "PRINT_MODEL", fileName: "choco.stl", size: 1024 }] };
  let downloads = 0;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/my-tasks")) return route.fulfill({ json: { success: true, data: [row] } });
    if (path.endsWith("/workflow")) return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/timeline")) return route.fulfill({ json: { success: true, data: [] } });
    if (path.endsWith("/photo-links")) return route.fulfill({ json: { success: true, data: { photos: [{ slot: 1, url: "https://files.example.test/photo.png", expiresAt: "2099-01-01" }] } } });
    if (path.endsWith("/download-link")) { downloads++; return route.fulfill({ json: { success: true, data: { url: "https://files.example.test/choco.stl" } } }); }
    return route.fulfill({ status: 404 });
  });
  await page.route("https://files.example.test/**", route => route.fulfill({ body: "test file" }));
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-TEST001/ }).click();
  await expect(page.getByRole("img", { name: "고객 사진 1" })).toHaveAttribute("src", "https://files.example.test/photo.png");
  await expect(page.getByText("choco.stl", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "모델링 완료", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "담당자", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "열기", exact: true }).click();
  await expect.poll(() => downloads).toBe(1);
});

test("담당자 관리에서 작업 역할과 기본 배정을 저장한다", async ({ page }) => {
  await login(page, "OWNER", ["MANAGE_ACCOUNTS", "MANAGE_OPERATION_SETTINGS", "VIEW_ALL_ORDERS", "VIEW_ORDER_BASIC"]);
  let staff = { id: 3, name: "모델링 담당자", role: "PRODUCTION", status: "ACTIVE", workRoles: [] as string[], version: 0 };
  let settings = { modeling: null as number | null, review: null as number | null, version: 0 };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path === "/api/admin/accounts") return route.fulfill({ json: { success: true, data: [] } });
    if (path.endsWith("/staff")) return route.fulfill({ json: { success: true, data: [staff] } });
    if (path.endsWith("/roles")) { const body = route.request().postDataJSON(); expect(body.reason).toBe("모델링 업무 배정"); expect(body.version).toBe(0); staff = { ...staff, workRoles: body.workRoles, version: 1 }; return route.fulfill({ json: { success: true, data: staff } }); }
    if (path.endsWith("/default-assignees")) { if (route.request().method() === "PATCH") settings = { ...route.request().postDataJSON(), version: 1 }; return route.fulfill({ json: { success: true, data: settings } }); }
    return route.fulfill({ status: 404 });
  });
  await page.goto("/admin/accounts");
  await page.getByRole("combobox", { name: "계정", exact: true }).selectOption("3");
  await page.getByLabel("모델링", { exact: true }).check();
  await page.getByLabel("변경 사유").fill("모델링 업무 배정");
  await page.getByRole("button", { name: "작업 역할 저장" }).click();
  await expect(page.getByRole("status")).toContainText("작업 역할을 저장했습니다.");
  await page.getByRole("combobox", { name: "모델링 기본 담당자", exact: true }).selectOption("3");
  await page.getByRole("button", { name: "기본 담당자 저장" }).click();
  await expect(page.getByRole("status")).toContainText("기본 담당자를 저장했습니다.");
  expect(settings.modeling).toBe(3);
});

test("모델러가 시작하고 필수 파일을 등록하면 검수 인계 결과를 본다", async ({
  page,
}) => {
  await login(page, "PRODUCTION", modelPermissions);
  let row = initial();
  let pending = { id: "", kind: "", fileName: "", size: 0 };
  const keys: string[] = [];
  await page.route("**/api/**", async route => {
    const request = route.request(),
      path = new URL(request.url()).pathname;
    if (path === "/api/admin/me") return route.fallback();
    if (path.endsWith("/my-tasks"))
      return route.fulfill({
        json: {
          success: true,
          data: row.productionStage === "MODEL_REVIEW" ? [] : [row],
        },
      });
    if (path.endsWith("/workflow/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    if (path.endsWith("/photo-links"))
      return route.fulfill({
        json: { success: true, data: { photos: [], expiresAt: "2099-01-01" } },
      });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (request.method() === "POST") {
      expect(request.headers()["idempotency-key"]).toBeTruthy();
      keys.push(request.headers()["idempotency-key"]);
      const body = request.postDataJSON();
      expect(body.version).toBe(row.version);
      row = { ...row, version: row.version + 1 };
      if (path.endsWith("/start"))
        row = {
          ...row,
          productionStage: "MODELING",
          taskStatus: "IN_PROGRESS",
          allowedActions: ["UPLOAD_ARTIFACT", "COMPLETE_MODELING"],
        };
      if (path.endsWith("/upload-requests")) {
        pending = {
          id: body.kind,
          kind: body.kind,
          fileName: body.fileName,
          size: body.size,
        };
        return route.fulfill({
          json: {
            success: true,
            data: {
              artifactId: pending.id,
              version: row.version,
              url: "https://upload.example.test/file",
              headers: {},
            },
          },
        });
      }
      if (path.endsWith("/confirm"))
        row.artifacts = [...row.artifacts, pending];
      if (path.endsWith("/complete")) {
        expect(row.artifacts).toHaveLength(3);
        row = {
          ...row,
          productionStage: "MODEL_REVIEW",
          taskStatus: "WAITING",
          assignee: { id: 3, name: "검수자" },
          allowedActions: [],
        };
      }
      return route.fulfill({ json: { success: true, data: row } });
    }
    return route.fulfill({
      status: 404,
      json: { success: false, message: "없는 테스트 경로" },
    });
  });
  await page.route("https://upload.example.test/**", route =>
    route.fulfill({ status: 200, body: "" })
  );
  await page.goto("/admin/my-work");
  await expect(
    page.getByRole("heading", { name: "내 작업", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: /PE-TEST001/ }).click();
  await page.getByRole("button", { name: "작업 시작", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "모델링 완료", exact: true })
  ).toBeDisabled();
  for (const [label, name, mime] of [
    ["4면도", "views.png", "image/png"],
    ["모델 원본", "model.blend", "application/octet-stream"],
    ["출력 파일", "model.stl", "application/octet-stream"],
  ]) {
    await page
      .getByLabel(`${label} 파일 선택`, { exact: true })
      .setInputFiles({
        name,
        mimeType: mime,
        buffer: Buffer.from("test-model-file"),
      });
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  await page.getByRole("button", { name: "모델링 완료", exact: true }).click();
  await expect(page.getByText("검수 담당자에게 인계했습니다.")).toBeVisible();
  expect(new Set(keys).size).toBe(keys.length);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBeTruthy();
});

test("입금 금액 불일치와 동시 수정 오류는 다음 행동을 안내한다", async ({
  page,
}) => {
  await login(page, "ADMIN", [
    "VIEW_ORDER_BASIC",
    "VIEW_ALL_ORDERS",
    "VIEW_PAYMENT",
    "CONFIRM_PAYMENT",
  ]);
  let row = {
    ...initial(),
    paymentStatus: "PENDING",
    productionStage: "BLOCKED",
    expectedAmount: 18900,
    allowedActions: ["CONFIRM_PAYMENT"],
  };
  let attempt = 0;
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    if (path.endsWith("/workflow/orders"))
      return route.fulfill({ json: { success: true, data: [row] } });
    if (path.endsWith("/timeline"))
      return route.fulfill({ json: { success: true, data: [] } });
    if (path.endsWith("/workflow"))
      return route.fulfill({ json: { success: true, data: row } });
    if (path.endsWith("/payments/confirm")) {
      attempt++;
      if (attempt === 1) {
        row = { ...row, version: 2, blockingIssues: ["PAYMENT_MISMATCH"] };
        return route.fulfill({ json: { success: true, data: row } });
      }
      return route.fulfill({
        status: 409,
        json: {
          success: false,
          code: "VERSION_CONFLICT",
          message: "다른 작업자가 변경했습니다. 최신 내용을 확인해 주세요.",
          data: row,
        },
      });
    }
    return route.fulfill({ status: 404, json: { success: false } });
  });
  await page.goto("/admin/workflow");
  await page.getByRole("button", { name: /PE-TEST001/ }).click();
  await page.getByLabel("실제 입금액").fill("1");
  await page.getByRole("button", { name: "입금 확인", exact: true }).click();
  await expect(
    page.getByText("입금액이 주문 금액과 다릅니다.", { exact: true })
  ).toBeVisible();
  await page.getByLabel("실제 입금액").fill("18900");
  await page.getByRole("button", { name: "입금 확인", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "다른 작업자가 변경했습니다"
  );
});
