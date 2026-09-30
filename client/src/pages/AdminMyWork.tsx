import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { adminRequest } from "@/lib/adminApi";
import {
  stageLabels,
  paymentLabels,
  issueLabels,
  workflowCommand,
  type WorkflowOrder,
} from "@/lib/adminContracts";
import { AdminWorkflowPanel } from "./AdminWorkflowPanel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminMyWork({ all = false }: { all?: boolean }) {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [rows, setRows] = useState<WorkflowOrder[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const detailPane = useRef<HTMLDivElement>(null);
  const selectedButton = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      detailPane.current?.scrollTo({ top: 0 });
    } else {
      detailPane.current?.scrollIntoView({ block: "start" });
    }
  }, [selected]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [workFilter, setWorkFilter] = useState("ACTIVE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const assigningRef = useRef(false);
  const assignmentKeys = useRef(new Map<string, string>());
  const [assignmentResults, setAssignmentResults] = useState<string[]>([]);
  const [detailRevision, setDetailRevision] = useState(0);
  const canAssign = all && Boolean(staff?.permissions.includes("ASSIGN_WORK"));
  const canConfigure = Boolean(
    staff?.permissions.includes("MANAGE_ACCOUNTS") &&
      staff?.permissions.includes("MANAGE_OPERATION_SETTINGS")
  );
  useEffect(() => {
    setChecked([]);
  }, [query, filter, workFilter, all]);
  const allowed = Boolean(
    staff?.permissions.includes(all ? "VIEW_ALL_ORDERS" : "VIEW_ORDER_BASIC")
  );
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    try {
      setRows(
        await adminRequest(
          all ? "/api/admin/workflow/orders" : "/api/production/my-tasks"
        )
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [all, allowed]);
  useEffect(() => {
    void load();
  }, [load]);
  const needsAttention = (row: WorkflowOrder) =>
    row.blockingIssues.length > 0 || row.requiresMigrationReview;
  const paid = (row: WorkflowOrder) =>
    ["CONFIRMED", "NOT_REQUIRED"].includes(row.paymentStatus);
  const matchesWork = (row: WorkflowOrder) => {
    if (!all || workFilter === "ALL") return true;
    if (workFilter === "CLOSED") return row.orderStatus !== "ACTIVE";
    if (row.orderStatus !== "ACTIVE") return false;
    if (workFilter === "PAYMENT") return row.paymentStatus === "PENDING";
    if (workFilter === "WAITING")
      return paid(row) && (!row.taskId || !row.assignee);
    if (workFilter === "PRODUCTION")
      return paid(row) && !!row.taskId && row.productionStage !== "COMPLETE";
    if (workFilter === "ISSUES") return needsAttention(row);
    return true;
  };
  const visible = rows.filter(
    row =>
      matchesWork(row) &&
      `${row.orderNumber} ${row.petName}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "ALL" || filter === "ISSUES"
        ? filter !== "ISSUES" ||
          row.blockingIssues.length > 0 ||
          row.requiresMigrationReview
        : row.productionStage === filter)
  );
  // Preserve the handoff receipt when a completed task leaves my task list.
  useEffect(() => {
    setSelected(null);
  }, [query, filter, workFilter, all]);
  const assignable = (row: WorkflowOrder) =>
    canAssign &&
    !row.assignee &&
    !!row.taskId &&
    row.allowedActions.includes("ASSIGN_TASK") &&
    !["PRINT_QUEUE", "PRINTING", "PACKING"].includes(row.productionStage);
  const candidates = visible.filter(assignable);
  const targets = candidates.filter(row => checked.includes(row.orderNumber));
  const assignDefaults = async () => {
    if (assigningRef.current || loading || targets.length === 0) return;
    assigningRef.current = true;
    setAssigning(true);
    setAssignmentResults([]);
    try {
      for (const row of targets) {
        const fingerprint = `${row.orderNumber}:${row.version}`;
        let key = assignmentKeys.current.get(fingerprint);
        if (!key) {
          key = crypto.randomUUID();
          assignmentKeys.current.set(fingerprint, key);
        }
        try {
          await workflowCommand(
            `/api/admin/orders/${encodeURIComponent(row.orderNumber)}/workflow/assign`,
            {
              version: row.version,
              useDefault: true,
              reason: "선택한 미배정 작업에 기본 담당자 적용",
            },
            key
          );
          setChecked(previous =>
            previous.filter(number => number !== row.orderNumber)
          );
          setAssignmentResults(previous => [
            ...previous,
            `${row.orderNumber}: 배정 완료`,
          ]);
        } catch (e) {
          setAssignmentResults(previous => [
            ...previous,
            `${row.orderNumber}: ${e instanceof Error ? e.message : "배정 실패"}`,
          ]);
        }
      }
      await load();
      setDetailRevision(previous => previous + 1);
    } finally {
      assigningRef.current = false;
      setAssigning(false);
    }
  };
  return (
    <AdminShell
      title={all ? "입금·제작 관리" : "내 작업"}
      role={role}
      splitWorkspace
    >
      {!allowed ? (
        <p className="text-sm">
          {staff ? "조회할 수 있는 작업 권한이 없습니다." : "계정 확인 중..."}
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {all
              ? "입금 확인과 작업 준비가 필요한 주문을 업무별로 찾아 처리하세요."
              : "현재 내 계정에 배정된 미완료 작업입니다. 결제 확인 또는 무료 주문의 작업이 생성되고, 담당자로 배정되면 표시됩니다."}
          </p>
          {all && canConfigure && (
            <Link
              href="/admin/accounts#work-defaults"
              className="mb-3 block text-sm underline"
            >
              역할별 기본 담당자 설정 (새 작업 자동 배정)
            </Link>
          )}
          {all && (
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="group"
              aria-label="업무 필터"
            >
              {[
                ["ACTIVE", "진행 주문"],
                ["PAYMENT", "입금 대기"],
                ["WAITING", "입금 확인·작업 준비"],
                ["PRODUCTION", "제작 진행"],
                ["ISSUES", "확인 필요"],
                ["CLOSED", "완료·취소·만료"],
                ["ALL", "전체"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={workFilter === value ? "default" : "outline"}
                  aria-pressed={workFilter === value}
                  onClick={() => {
                    setWorkFilter(value);
                    setFilter("ALL");
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
          <div className="mb-5 flex flex-wrap gap-2">
            <Input
              className="w-full sm:w-64"
              aria-label="작업 검색"
              placeholder="주문번호 또는 반려동물 이름"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <select
              aria-label="제작 단계 필터"
              className="rounded border bg-background px-3 py-2 text-sm"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="ALL">모든 단계</option>
              <option value="MODELING_QUEUE">모델링 결과물 대기</option>
              <option value="MODELING">모델링 결과물 등록 중</option>
              <option value="MODEL_REVIEW">모델 검수 대기</option>
              <option value="COLOR_MAPPING">색상 작업 대기</option>
              <option value="PLATE_PREPARATION">플레이트 준비</option>
              <option value="PRINT_QUEUE">출력 대기</option>
              <option value="PRINTING">출력 중</option>
              <option value="POST_PROCESSING">후가공 대기</option>
              <option value="QC">출력물 검수 대기</option>
              <option value="PACKING">포장 대기</option>
              <option value="ISSUES">확인 필요</option>
            </select>
            <Button variant="outline" onClick={() => void load()}>
              목록 새로고침
            </Button>
          </div>
          {error && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid min-w-0 gap-5 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)] lg:overflow-hidden">
            <div
              role="region"
              aria-label="주문 목록"
              tabIndex={0}
              className="min-w-0 space-y-2 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:pr-3"
            >
              <p className="text-sm text-muted-foreground">
                {loading ? "불러오는 중..." : `${visible.length}건`}
              </p>
              {canAssign && (
                <div className="space-y-2 rounded-lg border p-3 text-sm">
                  <p>
                    기존 미배정 작업만 선택해 단계별 기본 담당자에게 배정합니다.
                    필터를 바꾸면 선택이 해제됩니다.
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      disabled={assigning || loading || candidates.length === 0}
                      checked={
                        candidates.length > 0 &&
                        targets.length === candidates.length
                      }
                      onChange={e =>
                        setChecked(
                          e.target.checked
                            ? candidates.map(row => row.orderNumber)
                            : []
                        )
                      }
                    />
                    현재 목록의 배정 가능한 작업 {candidates.length}건 전체 선택
                  </label>
                  <Button
                    disabled={assigning || loading || targets.length === 0}
                    onClick={() => void assignDefaults()}
                  >
                    {assigning
                      ? "배정 중..."
                      : `선택 ${targets.length}건 기본 담당자에게 배정`}
                  </Button>
                  <div role="status" className="max-h-32 overflow-y-auto">
                    {assignmentResults.map((result, index) => (
                      <p key={index}>{result}</p>
                    ))}
                  </div>
                </div>
              )}
              {!loading && !error && visible.length === 0 && (
                <div className="space-y-3 rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                  <p>
                    {rows.length
                      ? "조건에 맞는 작업이 없습니다."
                      : all
                        ? "조회할 주문이 없습니다."
                        : "내 계정에 배정된 미완료 작업이 없습니다."}
                  </p>
                  {rows.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQuery("");
                        setFilter("ALL");
                        setWorkFilter("ALL");
                      }}
                    >
                      필터 초기화
                    </Button>
                  )}
                  {!all &&
                    (staff?.permissions.includes("VIEW_ALL_ORDERS") ? (
                      <Link href="/admin/workflow" className="block underline">
                        입금·제작 관리에서 작업·담당자 확인
                      </Link>
                    ) : (
                      <p>
                        작업이 예정돼 있다면 관리자에게 입금 확인과 담당자 배정
                        여부를 확인해 주세요.
                      </p>
                    ))}
                </div>
              )}
              {visible.map(row => (
                <div key={row.orderNumber}>
                  {assignable(row) && (
                    <label className="flex items-center gap-2 px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        disabled={assigning || loading}
                        checked={checked.includes(row.orderNumber)}
                        onChange={e =>
                          setChecked(previous =>
                            e.target.checked
                              ? [...previous, row.orderNumber]
                              : previous.filter(
                                  number => number !== row.orderNumber
                                )
                          )
                        }
                      />
                      {row.orderNumber} 기본 담당자 배정 대상으로 선택
                    </label>
                  )}
                  <button
                    type="button"
                    key={row.orderNumber}
                    aria-pressed={selected === row.orderNumber}
                    className={`w-full min-w-0 space-y-2 rounded-lg border bg-background p-4 text-left hover:border-primary ${selected === row.orderNumber ? "border-primary ring-1 ring-primary" : ""}`}
                    onClick={event => {
                      selectedButton.current = event.currentTarget;
                      setSelected(row.orderNumber);
                      if (
                        selected === row.orderNumber &&
                        !window.matchMedia("(min-width: 1024px)").matches
                      )
                        detailPane.current?.scrollIntoView({ block: "start" });
                    }}
                  >
                    <p className="break-all font-medium">
                      {row.orderNumber} · {row.petName}
                    </p>
                    <p className="text-sm">
                      {stageLabels[row.productionStage] ?? row.productionStage}{" "}
                      · {row.assignee?.name ?? "미배정"}
                    </p>
                    {all && (
                      <p className="text-xs text-muted-foreground">
                        {paymentLabels[row.paymentStatus] ?? row.paymentStatus}
                      </p>
                    )}
                    {(row.blockingIssues.length > 0 ||
                      row.requiresMigrationReview) && (
                      <div className="space-y-1 text-xs text-amber-800">
                        {row.requiresMigrationReview && (
                          <p>기존 주문의 실제 제작 단계 확인 필요</p>
                        )}
                        {row.blockingIssues.map(issue => (
                          <p key={issue}>
                            {issueLabels[issue] ?? `확인 필요: ${issue}`}
                          </p>
                        ))}
                      </div>
                    )}
                    {row.orderStatus === "ACTIVE" && (
                      <p className="text-xs font-medium">
                        {row.allowedActions.includes("CONFIRM_PAYMENT")
                          ? "다음: 입금 내역 대조"
                          : row.allowedActions.includes("ENROLL")
                            ? "다음: 제작 작업 생성"
                            : !row.assignee &&
                                row.allowedActions.includes("ASSIGN_TASK")
                              ? "다음: 담당자 지정"
                              : needsAttention(row)
                                ? "다음: 상세에서 확인 사항 점검"
                                : "상세에서 가능한 작업 확인"}
                      </p>
                    )}
                  </button>
                </div>
              ))}
            </div>
            <div
              ref={detailPane}
              role="region"
              aria-label="주문 상세"
              tabIndex={0}
              className="min-w-0 scroll-mt-4 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:pr-3"
            >
              {selected && (
                <Button
                  variant="outline"
                  className="mb-3 lg:hidden"
                  onClick={() => {
                    selectedButton.current?.scrollIntoView({ block: "center" });
                    selectedButton.current?.focus({ preventScroll: true });
                  }}
                >
                  선택한 주문으로 돌아가기
                </Button>
              )}
              {selected ? (
                <AdminWorkflowPanel
                  key={`${selected}:${detailRevision}`}
                  orderNumber={selected}
                  onChanged={() => void load()}
                />
              ) : (
                <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  주문을 선택하면 사진과 작업 내용을 확인할 수 있습니다.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </AdminShell>
  );
}
