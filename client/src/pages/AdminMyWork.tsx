import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { adminRequest } from "@/lib/adminApi";
import {
  stageLabels,
  paymentLabels,
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
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
  const visible = rows.filter(
    row =>
      `${row.orderNumber} ${row.petName}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "ALL" || filter === "ISSUES"
        ? filter !== "ISSUES" ||
          row.blockingIssues.length > 0 ||
          row.requiresMigrationReview
        : row.productionStage === filter)
  );
  return (
    <AdminShell title={all ? "입금·제작 관리" : "내 작업"} role={role}>
      {!allowed ? (
        <p className="text-sm">
          {staff ? "조회할 수 있는 작업 권한이 없습니다." : "계정 확인 중..."}
        </p>
      ) : (
        <>
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
              <option value="MODELING_QUEUE">모델링 대기</option>
              <option value="MODELING">모델링 중</option>
              <option value="MODEL_REVIEW">검수 대기</option>
              <option value="COLOR_MAPPING">색상 작업 대기</option>
              <option value="PLATE_PREPARATION">플레이트 준비</option>
              <option value="PRINT_QUEUE">출력 대기</option>
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
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
            <div className="min-w-0 space-y-2">
              <p className="text-sm text-muted-foreground">
                {loading ? "불러오는 중..." : `${visible.length}건`}
              </p>
              {!loading && visible.length === 0 && (
                <p className="rounded-lg border bg-background p-5 text-sm text-muted-foreground">
                  {rows.length
                    ? "조건에 맞는 작업이 없습니다."
                    : "배정된 작업이 없습니다."}
                </p>
              )}
              {visible.map(row => (
                <button
                  type="button"
                  key={row.orderNumber}
                  aria-pressed={selected === row.orderNumber}
                  className={`w-full min-w-0 space-y-2 rounded-lg border bg-background p-4 text-left hover:border-primary ${selected === row.orderNumber ? "border-primary ring-1 ring-primary" : ""}`}
                  onClick={() => setSelected(row.orderNumber)}
                >
                  <p className="break-all font-medium">
                    {row.orderNumber} · {row.petName}
                  </p>
                  <p className="text-sm">
                    {stageLabels[row.productionStage] ?? row.productionStage} ·{" "}
                    {row.assignee?.name ?? "미배정"}
                  </p>
                  {all && (
                    <p className="text-xs text-muted-foreground">
                      {paymentLabels[row.paymentStatus] ?? row.paymentStatus}
                    </p>
                  )}
                  {(row.blockingIssues.length > 0 ||
                    row.requiresMigrationReview) && (
                    <p className="text-xs text-amber-800">확인 필요</p>
                  )}
                </button>
              ))}
            </div>
            <div className="min-w-0">
              {selected ? (
                <AdminWorkflowPanel
                  key={selected}
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
