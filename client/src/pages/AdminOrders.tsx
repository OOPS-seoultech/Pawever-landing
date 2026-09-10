import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AdminError, AdminShell, useAdminGuard } from "@/components/AdminShell";
import {
  AdminApiError,
  changeAdminOrderStatus,
  completeAdminPickup,
  listAdminOrders,
  startAdminProduction,
  startAdminProductionMatching,
  undoAdminProduction,
  type AdminOrderListResponse,
  type AdminOrderSummary,
} from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import { AdminOrderPanel } from "./AdminOrderPanel";
import {
  ADMIN_ORDER_VIEWS,
  canStartProduction,
  filterableStatusesFor,
  primaryRowAction,
  statusesForView,
  STATUS_LABELS,
  statusTone,
  type AdminOrderViewKey,
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

  /**
   * 지금 보고 있는 일.
   *
   * 상태 칩 아홉 개를 늘어놓으면 기본이 "전체"가 되어, 8월에 들어온 100건이
   * 오늘 들어온 세 건을 덮는다. 들어오면 할 일이 남은 자리부터 본다.
   */
  const [view, setView] = useState<AdminOrderViewKey>("PAYMENT_CHECK");
  const selected = statusesForView(view).filter((status) =>
    filterableStatusesFor(role ?? "PRODUCTION").includes(status)
  );
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
  /**
   * 드로어에 띄운 주문.
   *
   * 상세로 화면을 옮기지 않는다. 옮겼다 돌아오면 필터도 페이지도 풀려,
   * 70건을 처리하는 동안 같은 자리를 몇 번씩 찾아 들어가게 된다.
   */
  const [opened, setOpened] = useState<string | null>(null);
  /** 지금 처리 중인 주문번호. 두 번 눌러 두 번 나가지 않게 한다. */
  const [acting, setActing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /**
   * 묶어서 처리하려고 고른 주문.
   *
   * 제작은 낱개로 하는 일이 아니다. 1차 체험단 100건을 한 건씩 누르면
   * 100번이다.
   */
  const [picked, setPicked] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  /**
   * 방금 옮긴 주문.
   *
   * 100건을 잘못 옮겼을 때 한 건씩 되돌리게 두지 않는다. 다음 처리를
   * 하거나 화면을 옮기면 사라진다.
   */
  const [undoable, setUndoable] = useState<string[]>([]);
  /**
   * 좁은 화면에서 조건 칸을 접어 둔다.
   *
   * 제출일·굿즈·사진 장수 세 칸이 폰에서는 한 줄에 안 들어가 세 줄로 서고,
   * 목록이 그만큼 아래로 밀린다. 현장에서 하는 일은 조건 거는 일이 아니라
   * 방금 들어온 건을 보는 일이다. 넓은 화면에서는 늘 펴 둔다.
   */
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await listAdminOrders({
          status: statusesForView(view),
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
    view,
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

  // 목록이 바뀌면 고른 것을 비운다. 안 보이는 주문이 골라진 채로 남으면
  // 무엇을 누르는지 모르는 채 누르게 된다.
  useEffect(() => {
    setPicked([]);
  }, [view, query, submittedFrom, submittedTo, minPhotoCount, goodsType, page]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setPage(0);
    setQuery(searchInput);
  };

  /** 이 화면에서 묶어 제작 시작할 수 있는 줄. */
  const startable = (data?.orders ?? []).filter((order) =>
    canStartProduction(role ?? "PRODUCTION", order.status)
  );
  const allPicked = startable.length > 0 && picked.length === startable.length;

  const runBulk = async () => {
    if (bulkBusy || picked.length === 0) return;
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startAdminProduction(picked);
      setNotice(
        result.skipped.length === 0
          ? `${result.changed}건을 제작 중으로 옮겼습니다.`
          : `${result.changed}건을 옮겼습니다. 옮기지 못한 ${result.skipped.length}건: ${result.skipped.join(", ")}`
      );
      setUndoable(result.changedOrderNumbers);
      setPicked([]);
      await load();
    } catch (caught) {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * 조건에 맞는 전부를 옮긴다.
   *
   * 보이는 스무 건이 아니라 이 뷰의 조건에 맞는 전부다. 되돌릴 수 없는 일이
   * 아니지만 안 보이는 줄까지 건드리므로 한 번 더 묻는다.
   */
  const runMatching = async () => {
    const total = data?.totalCount ?? 0;
    if (bulkBusy || total === 0) return;
    if (
      !window.confirm(
        `지금 조건에 맞는 ${total}건을 제작 중으로 옮깁니다. 계속할까요?`
      )
    ) {
      return;
    }
    setBulkBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startAdminProductionMatching({
        q: query,
        goodsType: goodsType || undefined,
        submittedFrom: submittedFrom || undefined,
        submittedTo: submittedTo || undefined,
        minPhotoCount: minPhotoCount ? Number(minPhotoCount) : undefined,
      });
      setNotice(
        result.skipped.length === 0
          ? `${result.changed}건을 제작 중으로 옮겼습니다.`
          : `${result.changed}건을 옮겼습니다. 옮기지 못한 ${result.skipped.length}건: ${result.skipped.join(", ")}`
      );
      setUndoable(result.changedOrderNumbers);
      setPicked([]);
      await load();
    } catch (caught) {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    } finally {
      setBulkBusy(false);
    }
  };

  /** 방금 옮긴 것을 되돌린다. */
  const runUndo = async () => {
    if (bulkBusy || undoable.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      const result = await undoAdminProduction(undoable);
      setNotice(`${result.changed}건을 되돌렸습니다.`);
      setUndoable([]);
      await load();
    } catch (caught) {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    } finally {
      setBulkBusy(false);
    }
  };

  /**
   * 줄에서 바로 처리한다.
   *
   * 끝나면 목록을 다시 읽는다. 상태 뱃지와 위 요약이 방금 한 일을 따라와야
   * 다음 건으로 넘어갈 수 있다.
   */
  const runRowAction = async (
    order: AdminOrderSummary,
    action: NonNullable<ReturnType<typeof primaryRowAction>>
  ) => {
    if (acting) return;
    if (action.kind === "open") {
      setOpened(order.orderNumber);
      return;
    }
    if (
      action.confirm &&
      !window.confirm(
        `${order.orderNumber} 을(를) ${action.label} 로 바꿉니다. 되돌릴 수 없습니다.`
      )
    ) {
      return;
    }

    setActing(order.orderNumber);
    setError(null);
    setNotice(null);
    try {
      if (action.kind === "pickup") {
        await completeAdminPickup(order.orderNumber);
      } else {
        await changeAdminOrderStatus(order.orderNumber, action.nextStatus!);
      }
      setNotice(`${order.orderNumber} — ${action.label} 처리했습니다.`);
      await load();
    } catch (caught) {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    } finally {
      setActing(null);
    }
  };

  const totalPages = data ? Math.max(Math.ceil(data.totalCount / PAGE_SIZE), 1) : 1;
  /**
   * 접어 둔 칸에 걸린 조건 수.
   *
   * 안 적어 주면 목록이 왜 비었는지 알려고 접힌 칸을 열어 봐야 한다.
   */
  const filterCount = [submittedFrom, submittedTo, minPhotoCount, goodsType]
    .filter(Boolean).length;

  return (
    <AdminShell title="굿즈 주문" role={role}>
      {/* 일 단위로 나눈 탭. 상태 칩을 늘어놓으면 기본이 "전체"가 되어
          8월의 100건이 오늘의 세 건을 덮는다. 숫자는 필터와 무관한 전체다 —
          탭은 "무엇이 남았나"이지 "지금 목록이 몇 건인가"가 아니다. */}
      <div className="mb-4 flex flex-wrap items-center gap-1 border-b">
        {ADMIN_ORDER_VIEWS.filter((item) =>
          statusesForView(item.key).some((status) =>
            filterableStatusesFor(role ?? "PRODUCTION").includes(status)
          )
        ).map((item) => {
          const on = view === item.key;
          const count = data?.viewCounts?.[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setPage(0);
                setUndoable([]);
                setView(item.key);
              }}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition ${
                on
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {count != null ? (
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {count}
                </span>
              ) : null}
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

      {/* 폰에서만 나온다. 넓은 화면은 아래 칸이 늘 펴져 있어 이 버튼이
          가리키는 것이 없다. */}
      <Button
        variant="outline"
        size="sm"
        className="mb-3 md:hidden"
        onClick={() => setFiltersOpen((current) => !current)}
      >
        검색 조건 {filtersOpen ? "접기" : "펼치기"}
        {filterCount > 0 ? ` (${filterCount})` : ""}
      </Button>

      <div
        className={`mb-4 flex-wrap items-end gap-3 rounded-lg border bg-background p-3 md:flex ${
          filtersOpen ? "flex" : "hidden"
        }`}
      >
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

      {/* 고를 수 있는 것이 있는데 아직 안 골랐을 때. 체크 칸만 두면 화면이
          그대로 보여서, 무엇을 할 수 있는지 한 줄로 알린다. */}
      {picked.length === 0 && startable.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            제작 시작할 수 있는 주문이 이 페이지에 {startable.length}건 있습니다.
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPicked(startable.map((order) => order.orderNumber))}
          >
            이 페이지 모두 선택
          </Button>
          {/* 페이지에 다 담기지 않을 때만. 스무 건이 전부면 위 버튼과 같은
              일을 두 번 두는 셈이다. */}
          {(data?.totalCount ?? 0) > startable.length ? (
            <Button size="sm" disabled={bulkBusy} onClick={runMatching}>
              {bulkBusy
                ? "처리 중..."
                : `조건에 맞는 ${data?.totalCount}건 모두 제작 시작`}
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* 고른 것이 있을 때만 나타난다. 늘 떠 있으면 목록이 그만큼 밀린다. */}
      {picked.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium">{picked.length}건 선택됨</span>
          <Button size="sm" disabled={bulkBusy} onClick={runBulk}>
            {bulkBusy ? "처리 중..." : "제작 시작"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={bulkBusy}
            onClick={() => setPicked([])}
          >
            선택 해제
          </Button>
        </div>
      ) : null}

      {error ? <AdminError message={error} /> : null}
      {notice ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>{notice}</span>
          {/* 100건을 잘못 옮겼을 때 한 건씩 되돌리게 두지 않는다. */}
          {undoable.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={bulkBusy}
              onClick={runUndo}
            >
              되돌리기
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* 열 열두 개는 860px 아래로 못 줄인다. 폰에서는 아래 카드로 같은
          것을 보여 준다. 표를 가로로 밀게 두면 오른쪽 끝의 처리 버튼이
          늘 화면 밖에 있다. */}
      <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-8 px-3 py-2">
                {/* 이 페이지에서 제작 시작할 수 있는 줄만 고른다. 고를 수
                    없는 줄까지 켜 두면 눌러도 건너뛴 것으로만 돌아온다. */}
                <input
                  type="checkbox"
                  aria-label="제작 시작할 수 있는 주문 모두 선택"
                  disabled={startable.length === 0}
                  checked={allPicked}
                  onChange={(event) =>
                    setPicked(
                      event.target.checked
                        ? startable.map((order) => order.orderNumber)
                        : []
                    )
                  }
                />
              </th>
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
              {/* 한 건을 끝내려고 상세로 들어갔다 나오면 필터와 페이지가
                  풀린다. 다음에 할 일 하나를 줄에 세워 둔다. */}
              <th className="px-3 py-2 font-medium">처리</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  불러오는 중...
                </td>
              </tr>
            ) : null}

            {data?.orders.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  조건에 맞는 주문이 없습니다.
                </td>
              </tr>
            ) : null}

            {data?.orders.map((order) => (
              <tr
                key={order.orderNumber}
                onClick={() => setOpened(order.orderNumber)}
                className="cursor-pointer border-b last:border-0 hover:bg-muted/40"
              >
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                  {canStartProduction(role ?? "PRODUCTION", order.status) ? (
                    <input
                      type="checkbox"
                      aria-label={`${order.orderNumber} 선택`}
                      checked={picked.includes(order.orderNumber)}
                      onChange={(event) =>
                        setPicked((current) =>
                          event.target.checked
                            ? [...current, order.orderNumber]
                            : current.filter((n) => n !== order.orderNumber)
                        )
                      }
                    />
                  ) : null}
                </td>
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
                  <div className="flex flex-wrap items-center gap-1">
                    {order.deliveryMethod === "PICKUP" ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                        현장 수령
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">택배</span>
                    )}
                    {/* 고리를 달아야 하는 건. 상세를 열어야 알면 스무 건을
                        만드는 동안 한 건은 고리 없이 나간다. */}
                    {order.keyringAdded ? (
                      <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-900">
                        키링
                      </span>
                    ) : null}
                  </div>
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
                <td className="px-3 py-2">
                  <RowAction
                    order={order}
                    role={role ?? "PRODUCTION"}
                    busy={acting === order.orderNumber}
                    disabled={Boolean(acting) || loading}
                    onRun={runRowAction}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 폰에서 쓰는 같은 목록. 표를 줄인 것이 아니라, 손가락으로 누를 수
          있게 다시 세운 것이다. 한 건에서 확인하는 것과 누르는 것을 한 장에
          담는다. */}
      <ul className="space-y-2 md:hidden">
        {loading && !data ? (
          <li className="rounded-lg border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
            불러오는 중...
          </li>
        ) : null}

        {data?.orders.length === 0 ? (
          <li className="rounded-lg border bg-background px-3 py-8 text-center text-sm text-muted-foreground">
            조건에 맞는 주문이 없습니다.
          </li>
        ) : null}

        {data?.orders.map((order) => (
          <OrderCard
            key={order.orderNumber}
            order={order}
            role={role ?? "PRODUCTION"}
            picked={picked.includes(order.orderNumber)}
            onPick={(on) =>
              setPicked((current) =>
                on
                  ? [...current, order.orderNumber]
                  : current.filter((n) => n !== order.orderNumber)
              )
            }
            busy={acting === order.orderNumber}
            disabled={Boolean(acting) || loading}
            onOpen={() => setOpened(order.orderNumber)}
            onRun={runRowAction}
          />
        ))}
      </ul>

      {/* 상세를 옆에서 연다. 목록은 그대로 남아 방금 보던 자리에서 이어
          간다. 주소(/admin/orders/:orderNumber)는 북마크용으로 남겨 둔다. */}
      <Sheet
        open={opened !== null}
        onOpenChange={(next) => {
          if (!next) setOpened(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto p-4 sm:max-w-xl lg:max-w-3xl"
        >
          <SheetHeader className="p-0">
            <SheetTitle className="text-base">주문 {opened}</SheetTitle>
          </SheetHeader>
          {opened ? (
            <AdminOrderPanel
              orderNumber={opened}
              role={role}
              onChanged={load}
            />
          ) : null}
        </SheetContent>
      </Sheet>

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

/**
 * 폰에서 보는 주문 한 건.
 *
 * 표를 가로로 미는 대신 세로로 다시 세운다. 열두 열에 나뉘어 있던 것을 네
 * 줄로 접되, 그 자리에서 누르는 것 — 고르기와 처리 — 은 손가락 크기로
 * 남긴다. 카드를 누르면 표의 줄을 누른 것과 같이 상세가 열린다.
 */
function OrderCard({
  order,
  role,
  picked,
  onPick,
  busy,
  disabled,
  onOpen,
  onRun,
}: {
  order: AdminOrderSummary;
  role: "ADMIN" | "PRODUCTION";
  picked: boolean;
  onPick: (on: boolean) => void;
  busy: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRun: (
    order: AdminOrderSummary,
    action: NonNullable<ReturnType<typeof primaryRowAction>>
  ) => void;
}) {
  const action = primaryRowAction(role, order.status, order.deliveryMethod);
  const selectable = canStartProduction(role, order.status);

  return (
    <li
      className={`rounded-lg border bg-background ${
        picked ? "border-primary bg-primary/5" : ""
      }`}
    >
      <div className="flex items-start gap-3 px-3 py-3">
        {selectable ? (
          // 칸만 두면 폰에서 못 누른다. 둘레까지 눌리게 라벨로 감싼다.
          <label className="-m-1 shrink-0 cursor-pointer p-1">
            <input
              type="checkbox"
              aria-label={`${order.orderNumber} 선택`}
              checked={picked}
              onChange={(event) => onPick(event.target.checked)}
              className="h-5 w-5"
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="truncate font-medium">{order.petName}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                TONE_CLASS[statusTone(order.status)]
              }`}
            >
              {order.statusLabel ?? STATUS_LABELS[order.status]}
            </span>
          </div>

          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {order.guardianNameMasked} · {order.phoneMasked}
          </p>

          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
            {order.orderNumber}
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(order.submittedAt)} ·{" "}
            {order.goodsTypeLabel || order.goodsType} · 사진 {order.photoCount}/5
          </p>

          {/* 수령 방법은 줄을 따로 쓴다. 앞 줄에 이어 붙이면 폰 너비에서
              "현장 수령"이 두 줄로 갈라져 배지 바탕이 끊긴다. 부칠 건과
              넘겨줄 건을 가르는 값이라 흐리게 두면 스무 건을 포장하는 동안
              한 건은 섞인다. */}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            {order.deliveryMethod === "PICKUP" ? (
              <span className="whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">
                현장 수령
              </span>
            ) : (
              <span>택배</span>
            )}
            {order.keyringAdded ? (
              <span className="whitespace-nowrap rounded bg-sky-100 px-1.5 py-0.5 text-sky-900">
                키링
              </span>
            ) : null}
            <span>·</span>
            <span>{formatKrw(order.paymentAmountKrw)}</span>
          </p>
        </button>
      </div>

      {action ? (
        <div className="border-t px-3 py-2">
          <Button
            className="w-full"
            variant={action.kind === "pickup" ? "default" : "secondary"}
            disabled={disabled}
            onClick={() => onRun(order, action)}
          >
            {busy ? "처리 중..." : action.label}
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * 줄에서 다음에 할 일 하나.
 *
 * 여러 개를 세우면 어느 것이 다음인지 매번 고르게 된다. 지금 상태에서
 * 할 일은 대개 하나다.
 */
function RowAction({
  order,
  role,
  busy,
  disabled,
  onRun,
}: {
  order: AdminOrderSummary;
  role: "ADMIN" | "PRODUCTION";
  busy: boolean;
  disabled: boolean;
  onRun: (
    order: AdminOrderSummary,
    action: NonNullable<ReturnType<typeof primaryRowAction>>
  ) => void;
}) {
  const action = primaryRowAction(role, order.status, order.deliveryMethod);
  if (!action) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <Button
      size="sm"
      variant={action.kind === "pickup" ? "default" : "secondary"}
      disabled={disabled}
      onClick={(event) => {
        // 줄을 누르면 드로어가 열린다. 버튼은 그 자리에서 끝내는 것이다.
        event.stopPropagation();
        onRun(order, action);
      }}
    >
      {busy ? "처리 중..." : action.label}
    </Button>
  );
}
