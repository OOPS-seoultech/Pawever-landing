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
  orders[0].filamentMappings.unshift({
    ...orders[0].filamentMappings[0],
    id: 99,
    taskId: 9,
    filamentId: 99,
    spoolId: "OLD-SPOOL",
    colorName: "이전 색상",
  });
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
      expect(b.slots).toEqual([{ filamentId: 41, slotLabel: "AMS 1" }]);
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
  await expect(page.getByText(/OLD-SPOOL/)).toHaveCount(0);
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

test("출력 시작과 중간 기록 후 실패 주문만 분리한다", async ({ page }) => {
  await session(page, true);
  let plate: any = {
    id: 7,
    version: 1,
    status: "CONFIRMED",
    layoutRevision: 1,
    printerName: "운영 프린터",
    printingAssigneeId: 4,
    printingAssigneeName: "출력 담당자",
    orders: [initialOrder("PE-PLATE1"), initialOrder("PE-PLATE2")].map(o => ({
      ...o,
      productionStage: "PRINT_QUEUE",
      assignee: { id: 4, name: "출력 담당자" },
    })),
    slots: [],
    artifacts: [],
    observations: [],
    results: [],
    blockingIssues: [],
    allowedActions: ["START_PRINT_BATCH"],
  };
  await page.route("**/api/production/print-batches**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/start")) {
      expect(route.request().postDataJSON().orders).toHaveLength(2);
      plate = {
        ...plate,
        version: 2,
        status: "PRINTING",
        orders: plate.orders.map((o: any) => ({
          ...o,
          version: 11,
          productionStage: "PRINTING",
        })),
        allowedActions: ["RECORD_PRINT_OBSERVATION", "FINISH_PRINT_BATCH"],
      };
    } else if (path.endsWith("/observations")) {
      const body = route.request().postDataJSON();
      expect(body.note).toBe("중간 상태 정상");
      plate = {
        ...plate,
        version: 3,
        observations: [
          {
            id: 1,
            note: body.note,
            purgeGrams: 5,
            issues: [],
            actorName: "출력 담당자",
            createdAt: "2026-09-13T12:00:00Z",
          },
        ],
      };
    } else if (path.endsWith("/finish")) {
      const body = route.request().postDataJSON();
      expect(body.orders[0].result).toBe("SUCCESS");
      expect(body.orders[1].result).toBe("FAILED");
      expect(body.orders[1].note).toBe("들뜸");
      plate = {
        ...plate,
        version: 4,
        status: "FINISHED",
        allowedActions: [],
        results: body.orders.map((o: any, i: number) => ({
          ...o,
          attempt: 1,
          id: i + 1,
        })),
        orders: plate.orders.map((o: any, i: number) => ({
          ...o,
          productionStage: i === 0 ? "POST_PROCESSING" : "PLATE_PREPARATION",
        })),
      };
    }
    return route.fulfill({
      json: {
        success: true,
        data: path.endsWith("/print-batches") ? [plate] : plate,
      },
    });
  });
  await page.goto("/admin/print-batches?batch=7");
  await page.getByRole("button", { name: "출력 시작", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /PB-7 · 출력 중/ })
  ).toBeVisible();
  await page.getByLabel("중간 확인 메모").fill("중간 상태 정상");
  await page.getByLabel("퍼지 잔여물(g)").fill("5");
  await page.getByRole("button", { name: "중간 확인 저장" }).click();
  await expect(page.getByText("중간 상태 정상", { exact: true })).toBeVisible();
  await page.getByLabel("PE-PLATE2 출력 실패").check();
  await expect(
    page.getByRole("button", { name: "출력 완료", exact: true })
  ).toBeDisabled();
  await page.getByLabel("PE-PLATE2 실패 사유").fill("들뜸");
  await page.getByRole("button", { name: "출력 완료", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /PB-7 · 출력 종료/ })
  ).toBeVisible();
  await expect(page.getByText(/재출력 구성 대기/)).toBeVisible();
});

test("후가공 확인과 품질 검수 통과 후 포장 대기로 이동한다", async ({
  page,
}) => {
  await session(page, true);
  let row: any = {
    ...initialOrder("PE-FINISH1"),
    taskId: 25,
    productionStage: "POST_PROCESSING",
    assignee: { id: 4, name: "출력 담당자" },
    allowedActions: ["COMPLETE_POST_PROCESSING"],
    finishingHistory: [],
  };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me"))
      return route.fulfill({
        json: {
          success: true,
          data: {
            id: 4,
            name: "출력 담당자",
            role: "PRODUCTION",
            workRoles: ["PRINT_FINISHING"],
            permissions: [
              "VIEW_ORDER_BASIC",
              "VIEW_PRODUCTION_FILES",
              "VIEW_FILAMENT",
              "MANAGE_PRINT_BATCH",
              "COMPLETE_POST_PROCESSING",
            ],
          },
        },
      });
    let data: any = row;
    if (path.endsWith("/my-tasks")) data = [row];
    else if (path.endsWith("/timeline")) data = [];
    else if (path.endsWith("/post-processing")) {
      expect(route.request().postDataJSON().checks).toEqual([
        "SUPPORT_REMOVED",
        "SURFACE_CHECKED",
      ]);
      expect(route.request().postDataJSON().resinCuring).toBe("NOT_APPLICABLE");
      row = {
        ...row,
        version: 11,
        taskId: 26,
        productionStage: "QC",
        allowedActions: ["COMPLETE_QUALITY_CHECK"],
      };
      data = row;
    } else if (path.endsWith("/quality-check")) {
      expect(route.request().postDataJSON().checks).toEqual([
        "SHAPE_COLOR",
        "SURFACE",
        "EYES_NOSE",
      ]);
      row = {
        ...row,
        version: 12,
        taskId: 27,
        productionStage: "PACKING",
        allowedActions: [],
      };
      data = row;
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-FINISH1/ }).click();
  await expect(
    page.getByRole("button", { name: "후가공 완료", exact: true })
  ).toBeDisabled();
  await page.getByLabel("서포트 제거 완료").check();
  await page.getByLabel("표면 상태 확인 완료").check();
  await page.getByLabel("레진 경화 확인").selectOption("NOT_APPLICABLE");
  await page.getByRole("button", { name: "후가공 완료", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "검수 통과", exact: true })
  ).toBeDisabled();
  await page.getByLabel("형상·색상 확인").check();
  await page.getByLabel("표면·마감 확인").check();
  await page.getByLabel("눈·코 등 핵심 부위 확인").check();
  await page.getByRole("button", { name: "검수 통과", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("포장 대기");
});

test("정산 설정은 명시적으로 켜고 유급 담당자를 지정하며 응답 유실 시 같은 요청을 재시도한다", async ({
  page,
}) => {
  await session(page);
  const keys: string[] = [];
  let config: any = {
    version: 0,
    enabled: false,
    paidWorkerIds: [],
    amountKrw: 3000,
  };
  await page.route("**/api/**", async route => {
    const path = new URL(route.request().url()).pathname;
    let data: any = [];
    if (path.endsWith("/me"))
      data = {
        id: 1,
        name: "관리자",
        role: "ADMIN",
        workRoles: [],
        permissions: [
          "MANAGE_ACCOUNTS",
          "MANAGE_OPERATION_SETTINGS",
          "VIEW_ORDER_BASIC",
          "VIEW_ALL_ORDERS",
        ],
      };
    else if (path.endsWith("/staff"))
      data = [
        {
          id: 4,
          name: "제작 보조",
          role: "PRODUCTION",
          status: "ACTIVE",
          workRoles: ["PRINT_FINISHING"],
          version: 0,
        },
      ];
    else if (path.endsWith("/default-assignees"))
      data = { version: 0, modeling: null, review: null, printing: null };
    else if (path.endsWith("/production-compensation")) {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        expect(body.enabled).toBe(true);
        expect(body.paidWorkerIds).toEqual([4]);
        keys.push(route.request().headers()["idempotency-key"]);
        config = { ...body, version: 1 };
        if (keys.length === 1) return route.abort("failed");
      }
      data = config;
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/accounts");
  await page.getByRole("button", { name: "제작 정산 설정·내역 열기" }).click();
  await expect(
    page.getByLabel("검수 통과 시 정산 항목 생성")
  ).not.toBeChecked();
  await page.getByLabel("검수 통과 시 정산 항목 생성").check();
  await page.getByRole("checkbox", { name: "제작 보조", exact: true }).check();
  await page.getByRole("button", { name: "정산 설정 저장" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "정산 설정 저장" }).click();
  await expect(page.getByRole("status")).toContainText("정산 설정을 저장");
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("검수 불합격에는 사유와 보정 경로와 메모가 필요하다", async ({ page }) => {
  await session(page, true);
  let row: any = {
    ...initialOrder("PE-QCFAIL"),
    productionStage: "QC",
    taskId: 28,
    assignee: { id: 4, name: "출력 담당자" },
    allowedActions: ["COMPLETE_QUALITY_CHECK"],
  };
  await page.route("**/api/**", route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/me")) return route.fallback();
    let data: any = row;
    if (path.endsWith("/my-tasks")) data = [row];
    else if (path.endsWith("/timeline")) data = [];
    else if (path.endsWith("/quality-check")) {
      const body = route.request().postDataJSON();
      expect(body.decision).toBe("FAILED");
      expect(body.reasonCode).toBe("FINISH_DEFECT");
      expect(body.reworkStage).toBe("POST_PROCESSING");
      expect(body.note).toBe("눈 부분 재마감");
      row = {
        ...row,
        version: 11,
        taskId: 29,
        taskAttempt: 2,
        productionStage: "POST_PROCESSING",
        allowedActions: ["COMPLETE_POST_PROCESSING"],
      };
      data = row;
    }
    return route.fulfill({ json: { success: true, data } });
  });
  await page.goto("/admin/my-work");
  await page.getByRole("button", { name: /PE-QCFAIL/ }).click();
  await page.getByText("불합격·재작업 요청", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "불합격 및 재작업" })
  ).toBeDisabled();
  await page.getByLabel("불합격 사유").selectOption("FINISH_DEFECT");
  await page.getByLabel("보정 경로").selectOption("POST_PROCESSING");
  await page.getByLabel("검수 메모").fill("눈 부분 재마감");
  await page.getByRole("button", { name: "불합격 및 재작업" }).click();
  await expect(page.getByRole("status")).toContainText("새 보정 작업");
  await expect(
    page.getByRole("button", { name: "후가공 완료", exact: true })
  ).toBeVisible();
});
