import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminError, AdminShell, useAdminGuard } from "@/components/AdminShell";
import {
  AdminApiError,
  listAdminOrders,
  type AdminOrderListResponse,
  type GoodsOrderStatus,
} from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import {
  filterableStatusesFor,
  STATUS_LABELS,
  statusTone,
} from "./adminOrderStatus";

const PAGE_SIZE = 20;

/**
 * 굿즈 종류.
 *
 * 서버의 GoodsTypeNames 와 같아야 한다. 2차는 3D 전신 피규어 한 종이지만,
 * 1차 체험단 100건은 종류가 여러 개라 옛 주문을 찾을 때 쓴다.
 */
const GOODS_TYPES = [
  { code: "figure", label: "3D 전신 피규어" },
  { code: "face", label: "3D 얼굴 키링" },
  { code: "backplate", label: "뒷판형 3D 얼굴 키링" },
  { code: "acrylic", label: "아크릴 얼굴 키링" },
  { code: "custom", label: "원하는 형태 직접 제안" },
];

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  waiting: "bg-amber-100 text-amber-900",
  active: "bg-emerald-100 text-emerald-900",
  done: "bg-slate-200 text-slate-700",
  dead: "bg-rose-100 text-rose-900",
};

export default function AdminOrders() {
  const role = useAdminGuard();
  const [, setLocation] = useLocation();

  const [selected, setSelected] = useState<GoodsOrderStatus[]>([]);
  const [searchInput, setSearchInput] = useState("");
  // 입력할 때마다 부르지 않는다. 주문번호를 한 글자씩 칠 때마다 고객 목록을
  // 새로 긁어 오게 된다.
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  // 요구서 4-1 의 굿즈 종류·제출일·사진 수 필터. 상태 필터·검색어와 겹쳐 쓴다.
  const [submittedFrom, setSubmittedFrom] = useState("");
  const [submittedTo, setSubmittedTo] = useState("");
  const [minPhotoCount, setMinPhotoCount] = useState("");
  // 1차 체험단은 굿즈가 여러 종류다. 2차는 한 종이지만 옛 주문을 찾을 때 쓴다.
  const [goodsType, setGoodsType] = useState("");

  const [data, setData] = useState<AdminOrderListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await listAdminOrders({
          status: selected,
          q: query,
          submittedFrom: submittedFrom || undefined,
          submittedTo: submittedTo || undefined,
          minPhotoCount: minPhotoCount ? Number(minPhotoCount) : undefined,
          goodsType: goodsType || undefined,
          page,
          size: PAGE_SIZE,
        })
      );
    } catch (caught) {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }, [
    selected,
    query,
    submittedFrom,
    submittedTo,
    minPhotoCount,
    goodsType,
    page,
    setLocation,
  ]);

  useEffect(() => {
    if (role) void load();
  }, [role, load]);

  const toggleStatus = (status: GoodsOrderStatus) => {
    setPage(0);
    setSelected((current) =>
      current.includes(status)
        ? current.filter((item) => item !== status)
        : [...current, status]
    );
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setQuery(searchInput);
  };

  const totalPages = data ? Math.max(Math.ceil(data.totalCount / PAGE_SIZE), 1) : 1;

  return (
    <AdminShell title="굿즈 주문" role={role}>
      {data ? (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <SummaryCard label="결제 완료" value={data.summary.paymentCompleted} />
          <SummaryCard label="제작 중" value={data.summary.inProduction} />
          <SummaryCard label="발송 대기" value={data.summary.readyToShip} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filterableStatusesFor(role ?? "PRODUCTION").map((status) => {
          const on = selected.includes(status);
          return (
            <button
              key={status}
              type="button"
              onClick={() => toggleStatus(status)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      <form onSubmit={search} className="mb-4 flex gap-2">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={
            // 제작팀 검색은 보호자 이름에 걸리지 않는다. 걸린다고 적어 두면
            // 이름을 넣어 보고 결과가 없는 것을 없는 주문으로 읽는다.
            role === "ADMIN"
              ? "주문번호, 반려동물 또는 보호자 이름"
              : "주문번호 또는 반려동물 이름"
          }
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          검색
        </Button>
      </form>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-background p-3">
        <label className="text-xs text-muted-foreground">
          제출일
          <div className="mt-1 flex items-center gap-1">
            <Input
              type="date"
              value={submittedFrom}
              onChange={(event) => {
                setPage(0);
                setSubmittedFrom(event.target.value);
              }}
              className="h-8 w-[9.5rem]"
            />
            <span>~</span>
            <Input
              type="date"
              value={submittedTo}
              onChange={(event) => {
                setPage(0);
                setSubmittedTo(event.target.value);
              }}
              className="h-8 w-[9.5rem]"
            />
          </div>
        </label>

        <label className="text-xs text-muted-foreground">
          굿즈
          <select
            value={goodsType}
            onChange={(event) => {
              setPage(0);
              setGoodsType(event.target.value);
            }}
            className="mt-1 block h-8 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="">전체</option>
            {GOODS_TYPES.map((type) => (
              <option key={type.code} value={type.code}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted-foreground">
          사진 최소 장수
          <Input
            type="number"
            min={0}
            max={5}
            value={minPhotoCount}
            onChange={(event) => {
              setPage(0);
              setMinPhotoCount(event.target.value);
            }}
            placeholder="예: 5"
            className="mt-1 h-8 w-24"
          />
        </label>

        {submittedFrom || submittedTo || minPhotoCount || goodsType ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPage(0);
              setSubmittedFrom("");
              setSubmittedTo("");
              setMinPhotoCount("");
              setGoodsType("");
            }}
          >
            조건 지우기
          </Button>
        ) : null}
      </div>

      {error ? <AdminError message={error} /> : null}

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">주문번호</th>
              <th className="px-3 py-2 font-medium">신청일</th>
              <th className="px-3 py-2 font-medium">굿즈</th>
              <th className="px-3 py-2 font-medium">반려동물</th>
              <th className="px-3 py-2 font-medium">보호자</th>
              <th className="px-3 py-2 font-medium">연락처</th>
              <th className="px-3 py-2 font-medium">사진</th>
              {/* 부칠 건과 넘겨줄 건이 갈린다. 상세를 하나씩 열어 확인하면
                  스무 건을 포장하는 동안 한 건은 반드시 섞인다. */}
              <th className="px-3 py-2 font-medium">수령</th>
              <th className="px-3 py-2 font-medium">금액</th>
              <th className="px-3 py-2 font-medium">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            ) : null}

            {data?.orders.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-muted-foreground">
                  조건에 맞는 주문이 없습니다.
                </td>
              </tr>
            ) : null}

            {data?.orders.map((order) => (
              <tr
                key={order.orderNumber}
                onClick={() => setLocation(`/admin/orders/${order.orderNumber}`)}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-xs">{order.orderNumber}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateTime(order.submittedAt)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {order.goodsTypeLabel || order.goodsType}
                </td>
                <td className="px-3 py-2">{order.petName}</td>
                <td className="px-3 py-2">{order.guardianNameMasked}</td>
                <td className="px-3 py-2 font-mono text-xs">{order.phoneMasked}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {order.photoCount}/5
                </td>
                <td className="px-3 py-2">
                  {order.deliveryMethod === "PICKUP" ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                      현장 수령
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">택배</span>
                  )}
                </td>
                <td className="px-3 py-2">{formatKrw(order.paymentAmountKrw)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      TONE_CLASS[statusTone(order.status)]
                    }`}
                  >
                    {order.statusLabel ?? STATUS_LABELS[order.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>전체 {data?.totalCount ?? 0}건</span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0 || loading}
            onClick={() => setPage((current) => Math.max(current - 1, 0))}
          >
            이전
          </Button>
          <span>
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages || loading}
            onClick={() => setPage((current) => current + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </AdminShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
