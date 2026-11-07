import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { AdminOrderPhotoPreview } from "./AdminOrderPhotoPreview";
import { AdminApiError, adminRequest } from "@/lib/adminApi";
import {
  issueLabels,
  paymentLabels,
  workKey,
  stageLabels,
  type WorkflowOrder,
} from "@/lib/adminContracts";
import {
  currentFilaments,
  operationQueue,
  operationQueues,
  type OperationQueue,
} from "@/lib/adminOperations";
import { AdminWorkflowPanel } from "./AdminWorkflowPanel";
import { AdminMaterialComparison } from "./AdminMaterialComparison";
import { AdminAdministrativeCompletion } from "./AdminAdministrativeCompletion";

const AdminSalesSummary = lazy(() => import("./AdminSalesSummary"));

export default function AdminOperations() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const allowed = Boolean(staff?.permissions.includes("VIEW_ORDER_BASIC"));
  const all = Boolean(staff?.permissions.includes("VIEW_ALL_ORDERS"));
  const identity = Boolean(
    staff?.permissions.includes("VIEW_CUSTOMER_IDENTITY")
  );
  const filaments = Boolean(staff?.permissions.includes("VIEW_FILAMENT"));
  const permissionsKey = staff?.permissions.slice().sort().join(",") ?? "";
  const [rows, setRows] = useState<WorkflowOrder[]>([]);
  const [queue, setQueue] = useState<OperationQueue | "active">("active");
  const [query, setQuery] = useState("");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [salesRevision, setSalesRevision] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const detail = useRef<HTMLDivElement>(null);
  const focusDetail = useRef(false);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    setRows([]);
    setSelected(null);
    setDetailOpen(false);
    setUpdatedAt("");
  }, [allowed, all, permissionsKey]);
  useEffect(() => {
    if (!allowed) {
      setLoading(false);
      return;
    }
    let live = true;
    let controller: AbortController | null = null;
    const load = async () => {
      if (controller) return;
      controller = new AbortController();
      setLoading(true);
      try {
        const next = await adminRequest<WorkflowOrder[]>(
          all ? "/api/admin/workflow/orders" : "/api/production/my-tasks",
          { signal: controller.signal }
        );
        if (!live) return;
        setRows(next);
        setSalesRevision(value => value + 1);
        setUpdatedAt(new Date().toLocaleTimeString("ko-KR"));
        setError("");
      } catch (e) {
        if (!live || (e instanceof Error && e.name === "AbortError")) return;
        if (e instanceof AdminApiError && [401, 403].includes(e.status)) {
          setRows([]);
          setSelected(null);
          setDetailOpen(false);
          setUpdatedAt("");
        }
        setError(
          e instanceof Error ? e.message : "주문 목록을 불러오지 못했습니다."
        );
      } finally {
        controller = null;
        if (live) setLoading(false);
      }
    };
    void load();
    const refresh = () => {
      if (!document.hidden) void load();
    };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      live = false;
      controller?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [allowed, all, permissionsKey, revision]);
  const needsAttention = (row: WorkflowOrder) =>
    row.requiresMigrationReview ||
    row.blockingIssues.length > 0 ||
    operationQueue(row) === "attention";
  const active = rows.filter(row => operationQueue(row) !== "closed");
  const visible = rows.filter(
    row =>
      (queue === "active"
        ? operationQueue(row) !== "closed"
        : operationQueue(row) === queue) &&
      (!issuesOnly || needsAttention(row)) &&
      `${row.orderNumber} ${row.petName} ${identity ? (row.guardianName ?? "") : ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase())
  );
  // Keep the current task receipt after a handoff, but never show it in a different stage queue.
  const current = visible.find(row => workKey(row) === selected);
  const selectedRow = rows.find(row => workKey(row) === selected);
  const changed = (row: WorkflowOrder) => {
    setSelected(workKey(row));
    setSalesRevision(value => value + 1);
    setRevision(value => value + 1);
    setRows(previous =>
      all ||
      (row.assignee?.id === staff?.id &&
        row.taskStatus !== "COMPLETED" &&
        row.orderStatus === "ACTIVE")
        ? previous.map(value => (workKey(value) === workKey(row) ? row : value))
        : previous.filter(value => workKey(value) !== workKey(row))
    );
  };
  useEffect(() => {
    if (detailOpen && focusDetail.current) {
      detail.current?.focus();
      focusDetail.current = false;
    }
    if (
      detailOpen &&
      selected &&
      !window.matchMedia("(min-width: 1280px)").matches
    )
      detail.current?.scrollIntoView({ block: "start" });
  }, [detailOpen, selected]);
  const selectQueue = (value: OperationQueue | "active") => {
    setQueue(value);
    setSelected(null);
    setDetailOpen(false);
    setQuery("");
    setIssuesOnly(false);
  };
  return (
    <AdminShell title={all ? "운영 현황" : "제작 작업실"} role={role} wide>
      {!allowed ? (
        <p>{staff ? "작업 조회 권한이 없습니다." : "계정 확인 중..."}</p>
      ) : (
        <>
          {all && staff?.permissions.includes("VIEW_PAYMENT") && (
            <Suspense fallback={<p role="status">매출 조회 중…</p>}>
              <AdminSalesSummary
                key={permissionsKey}
                revision={salesRevision + revision}
              />
            </Suspense>
          )}
          <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3 text-sm">
            <p className="flex-1 text-muted-foreground">
              {all ? "실제 접수 주문 전체" : "내게 배정된 미완료 작업"} · 진행{" "}
              {new Set(active.map(row => row.orderNumber)).size}건 · 제작{" "}
              {active.length}마리 · 확인 필요{" "}
              {active.filter(needsAttention).length}마리
            </p>
            <span role="status">
              {loading
                ? "목록 갱신 중…"
                : updatedAt
                  ? `${updatedAt} 갱신 · 30초 자동 확인`
                  : "갱신 전"}
            </span>
            <Button
              variant="outline"
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
            >
              목록 새로고침
            </Button>
            <Link
              className="underline"
              href={all ? "/admin/workflow" : "/admin/my-work"}
            >
              기존 작업 화면
            </Link>
            {all && (
              <Link className="underline" href="/admin/orders">
                기존 전체 주문
              </Link>
            )}
          </div>
          {error && (
            <p role="alert" className="mb-3 text-sm text-destructive">
              {error}
              {updatedAt ? " · 이전 조회 결과입니다. 새로고침해 주세요." : ""}
            </p>
          )}
          <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <AdminAdministrativeCompletion
              rows={rows}
              disabled={loading}
              onCompleted={() => setRevision(value => value + 1)}
            />
            <label className="flex items-center gap-2 text-sm">
              <Switch
                aria-label="사진·상세 패널"
                aria-controls="operation-detail"
                checked={detailOpen}
                disabled={!selected}
                onCheckedChange={setDetailOpen}
              />
              사진·상세 패널
            </label>
          </div>
          <div
            className={cn(
              "grid min-w-0 items-start gap-4 lg:grid-cols-[160px_minmax(0,1fr)]",
              detailOpen &&
                "xl:grid-cols-[160px_minmax(280px,360px)_minmax(0,1fr)]"
            )}
          >
            <nav
              aria-label="작업 단계"
              className="flex flex-wrap content-start gap-2 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:p-1"
            >
              <Button
                variant={queue === "active" ? "default" : "outline"}
                className="justify-between"
                aria-pressed={queue === "active"}
                onClick={() => selectQueue("active")}
              >
                진행 전체 <span>{active.length}</span>
              </Button>
              {operationQueues.map(item => (
                <Button
                  key={item.id}
                  variant={queue === item.id ? "default" : "outline"}
                  className="justify-between"
                  aria-pressed={queue === item.id}
                  onClick={() => selectQueue(item.id)}
                >
                  {item.label}{" "}
                  <span>
                    {rows.filter(row => operationQueue(row) === item.id).length}
                  </span>
                </Button>
              ))}
            </nav>
            <section
              aria-label="단계별 주문 목록"
              className="grid min-w-0 content-start gap-3 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-1 lg:pr-2"
            >
              <h2 className="font-semibold">
                {queue === "active"
                  ? "진행 전체"
                  : operationQueues.find(item => item.id === queue)?.label}
              </h2>
              <p className="text-xs text-muted-foreground">
                {queue === "active"
                  ? "단계를 선택하면 그 단계의 주문만 표시합니다."
                  : operationQueues.find(item => item.id === queue)?.help}
              </p>
              <Input
                aria-label="운영 주문 검색"
                placeholder={
                  identity
                    ? "아이 · 보호자 · 주문번호 검색"
                    : "아이 · 주문번호 검색"
                }
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setDetailOpen(false);
                }}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={issuesOnly}
                  onChange={e => {
                    setIssuesOnly(e.target.checked);
                    setSelected(null);
                    setDetailOpen(false);
                  }}
                />
                확인 필요한 주문만
              </label>
              <p className="text-xs text-muted-foreground">
                검색 결과 {visible.length}마리
              </p>
              {!loading && !visible.length && (
                <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                  {rows.length
                    ? "이 단계·검색 조건에 해당하는 주문이 없습니다."
                    : all
                      ? "조회된 주문이 없습니다."
                      : "현재 내게 배정된 미완료 작업이 없습니다. 관리자에게 담당자 배정을 확인해 주세요."}
                </p>
              )}
              {visible.map(row => (
                <button
                  key={workKey(row)}
                  type="button"
                  aria-pressed={selected === workKey(row)}
                  className={`flex w-full shrink-0 flex-col gap-2 rounded-lg border bg-background p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${selected === workKey(row) ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={event => {
                    selectedButton.current = event.currentTarget;
                    focusDetail.current = event.detail === 0;
                    if (focusDetail.current) detail.current?.focus();
                    setSelected(workKey(row));
                    setDetailOpen(true);
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {staff?.permissions.includes("VIEW_CUSTOMER_PHOTOS") && (
                      <AdminOrderPhotoPreview
                        key={`${workKey(row)}:${permissionsKey}`}
                        number={row.orderNumber}
                        petIndex={row.petIndex}
                        petName={row.petName}
                      />
                    )}
                    <span className="min-w-0 break-words font-medium">
                      {row.petName}
                      {identity && row.guardianName
                        ? ` · ${row.guardianName}`
                        : ""}
                    </span>
                  </span>
                  <span className="break-all text-xs text-muted-foreground">
                    {row.orderNumber}
                  </span>
                  <span className="text-sm">
                    {row.administrativelyCompleted
                      ? "관리자 완료 · 당시 단계: "
                      : ""}
                    {stageLabels[row.productionStage] ?? row.productionStage} ·{" "}
                    {row.assignee?.name ?? "미배정"}
                  </span>
                  {staff?.permissions.includes("VIEW_PAYMENT") && (
                    <span className="text-xs">
                      {paymentLabels[row.paymentStatus] ?? row.paymentStatus}
                      {row.salePriceKrw != null &&
                        ` · 주문 ${row.petCount}마리 합계 ${row.salePriceKrw.toLocaleString("ko-KR")}원`}
                    </span>
                  )}
                  {filaments && (
                    <span className="flex flex-col gap-1 border-t pt-2 text-xs">
                      <span className="font-medium">필라멘트 조합</span>
                      {currentFilaments(row).length ? (
                        currentFilaments(row).map(f => (
                          <span key={f.spoolId}>
                            {f.colorName} · {f.spoolId}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">미지정</span>
                      )}
                    </span>
                  )}
                  {row.printBatch && (
                    <span className="text-xs">
                      플레이트 #{row.printBatch.id}
                    </span>
                  )}
                  {needsAttention(row) && (
                    <Badge variant="outline">확인 필요</Badge>
                  )}
                  {row.requiresMigrationReview && (
                    <span className="text-xs">
                      기존 주문의 실제 단계 확인 필요
                    </span>
                  )}
                  {row.blockingIssues.map(issue => (
                    <span className="text-xs" key={issue}>
                      {issueLabels[issue] ?? issue}
                    </span>
                  ))}
                </button>
              ))}
            </section>
            {detailOpen && (
              <div
                id="operation-detail"
                ref={detail}
                role="region"
                aria-label="운영 주문 상세"
                tabIndex={0}
                className="grid min-w-0 scroll-mt-4 content-start gap-3 lg:col-start-2 xl:col-start-auto"
              >
                {current ? (
                  <>
                    <Button
                      variant="outline"
                      className="justify-self-start"
                      onClick={() => {
                        setDetailOpen(false);
                        selectedButton.current?.scrollIntoView({
                          block: "center",
                        });
                        selectedButton.current?.focus({ preventScroll: true });
                      }}
                    >
                      사진·상세 패널 닫기
                    </Button>
                    <AdminMaterialComparison
                      key={`comparison:${workKey(current)}:${permissionsKey}`}
                      row={current}
                    />
                    <AdminWorkflowPanel
                      key={`workflow:${workKey(current)}:${permissionsKey}`}
                      orderNumber={current.orderNumber}
                      petIndex={current.petIndex}
                      onSelectPet={index =>
                        setSelected(
                          workKey({
                            orderNumber: current.orderNumber,
                            petIndex: index,
                          })
                        )
                      }
                      showPhotos={false}
                      onChanged={changed}
                    />
                  </>
                ) : (
                  <p className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    {selectedRow
                      ? `현재 단계가 변경되었습니다. ${operationQueues.find(item => item.id === operationQueue(selectedRow))?.label} 목록에서 이어서 확인하세요.`
                      : "주문을 선택하면 사진·4면도와 현재 가능한 작업을 이곳에서 확인합니다."}
                  </p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
