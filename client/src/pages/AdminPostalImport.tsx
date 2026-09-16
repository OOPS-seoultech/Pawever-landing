import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AdminApiError, adminRequest } from "@/lib/adminApi";

/**
 * 우체국 접수 내역 붙여넣기.
 *
 * 우체국이 돌려주는 내역에는 주문번호가 없다. 이름 한 덩어리뿐이라, 답이 하나로
 * 확실할 때만 자동으로 넘기고 조금이라도 갈리면 여기서 사람이 고른다. 잘못
 * 맞추면 다른 고객에게 다른 피규어가 간다.
 *
 * 붙여넣는 것만으로는 아무것도 바뀌지 않는다. 실제로 송장이 붙는 것은
 * '선택 건 송장 반영'을 누를 때 한 번뿐이다.
 */
type ImportRow = {
  id: number;
  version: number;
  lineNumber: number;
  rawLine: string | null;
  trackingNumber: string | null;
  postageKrw: number | null;
  postalCode: string | null;
  recipientLabel: string | null;
  status: string;
  matchKind: string | null;
  reason: string | null;
  candidates: string[];
  matchedOrderNumber: string | null;
  selectable: boolean;
};

type Candidate = {
  orderNumber: string;
  guardianName: string;
  petName: string;
  postalCode: string;
};

type ImportView = {
  batchId: number;
  outboundBatchId: number;
  rows: ImportRow[];
  candidates: Candidate[];
};

type NotificationEvent = {
  id: number;
  orderNumber: string;
  trackingNumber: string;
  status: string;
  sendAttempts: number;
  resultChecks: number;
  lastResultCode?: string | null;
  lastResultMessage?: string | null;
};

type NotificationBatch = {
  id: number;
  configured: boolean;
  pending: number;
  succeeded: number;
  failed: number;
  events: NotificationEvent[];
};

const STATUS_LABELS: Record<string, string> = {
  AUTO_MATCH: "자동 연결",
  NEEDS_REVIEW: "확인 필요",
  CONFIRMED_MANUAL: "직접 선택함",
  BLOCKED: "처리 불가",
  ALREADY_APPLIED: "이미 반영됨",
  COMMITTED: "반영 완료",
};

const RESULT_LABELS: Record<string, string> = {
  APPLIED: "반영했습니다",
  ALREADY_APPLIED: "이미 반영되어 있습니다",
  TRACKING_CONFLICT: "이 주문에 다른 송장이 이미 있습니다",
  TRACKING_TAKEN: "이 송장이 다른 주문에 이미 있습니다",
  ORDER_NOT_ACTIVE: "취소되었거나 진행할 수 없는 주문입니다",
  ORDER_NOT_FOUND: "주문을 찾을 수 없습니다",
  NOT_IN_BATCH: "이 발송 묶음에 없는 주문입니다",
  NOT_SELECTABLE: "고를 수 없는 줄입니다",
};

const NOTIFICATION_LABELS: Record<string, string> = {
  PENDING_CONFIGURATION: "알림 설정 대기",
  PENDING: "발송 대기",
  ACCEPTED: "제공자 접수 · 수신 확인 중",
  UNKNOWN: "수신 결과 확인 중",
  SUCCEEDED: "수신 성공",
  FAILED: "수신 실패",
};

const base = "/api/admin/postal-imports";

export default function AdminPostalImport({
  outboundBatchId,
  onApplied,
}: {
  /** 이번에 부친 묶음. 찾는 범위를 이 안으로 가둔다. */
  outboundBatchId: number;
  onApplied: () => void;
}) {
  const [text, setText] = useState("");
  const [view, setView] = useState<ImportView | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [reviewing, setReviewing] = useState<ImportRow | null>(null);
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [notification, setNotification] = useState<NotificationBatch | null>(
    null
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handle = (caught: unknown) => {
    setError(
      caught instanceof AdminApiError
        ? caught.message
        : "요청을 처리하지 못했습니다."
    );
  };

  const load = (next: ImportView) => {
    setView(next);
    // 자동으로 맞은 줄만 미리 골라 둔다. 확인이 필요한 줄까지 골라 두면
    // 사람이 보지 않은 것을 누르게 된다.
    setSelected(next.rows.filter(r => r.selectable).map(r => r.id));
  };

  const refreshNotification = async (id: number) => {
    setNotification(
      await adminRequest<NotificationBatch>(
        `/api/admin/notification-batches/${id}`
      )
    );
  };

  useEffect(() => {
    if (!notification || notification.pending === 0) return;
    const timer = window.setInterval(() => {
      void refreshNotification(notification.id).catch(handle);
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [notification?.id, notification?.pending]);

  const preview = async () => {
    setPending(true);
    setError("");
    setResults(null);
    try {
      load(
        await adminRequest<ImportView>(`${base}/preview`, {
          method: "POST",
          body: JSON.stringify({ outboundBatchId, text }),
        })
      );
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  const resolve = async (row: ImportRow, orderNumber: string) => {
    if (!view) return;
    setPending(true);
    setError("");
    try {
      load(
        await adminRequest<ImportView>(
          `${base}/${view.batchId}/rows/${row.id}/resolve`,
          {
            method: "POST",
            body: JSON.stringify({
              orderNumber,
              expectedVersion: row.version,
              reason: "화면에서 직접 선택",
            }),
          }
        )
      );
      setReviewing(null);
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  const commit = async () => {
    if (!view) return;
    setPending(true);
    setError("");
    try {
      const done = await adminRequest<{
        notificationBatchId?: number;
        results: Record<string, string>;
        rows: ImportRow[];
      }>(`${base}/${view.batchId}/commit`, {
        method: "POST",
        body: JSON.stringify({ selectedRowIds: selected }),
      });
      setResults(done.results);
      setView({ ...view, rows: done.rows });
      setSelected([]);
      if (done.notificationBatchId) {
        await refreshNotification(done.notificationBatchId);
      }
      onApplied();
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  const retryNotification = async (event: NotificationEvent) => {
    const reason = window.prompt("알림 재시도 사유를 입력해 주세요.");
    if (!reason?.trim() || !notification) return;
    setPending(true);
    setError("");
    try {
      await adminRequest(`/api/admin/notification-events/${event.id}/retry`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await refreshNotification(notification.id);
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  const rows = view?.rows ?? [];
  const selectable = rows.filter(r => r.selectable);
  const needsReview = rows.filter(r => r.status === "NEEDS_REVIEW");
  const blocked = rows.filter(r => r.status === "BLOCKED");

  return (
    <section className="space-y-3 rounded border p-4 text-sm">
      <h2 className="font-semibold">우체국 결과 가져오기</h2>
      <p className="text-muted-foreground">
        우체국에서 받은 접수 내역을 그대로 붙여넣으세요. 붙여넣는 것만으로는
        아무것도 바뀌지 않습니다.
      </p>

      <textarea
        className="h-40 w-full rounded border p-2 font-mono text-xs"
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder={
          "1234567890123\t1,800\t01811\t홍길동 보리\n통상 반송불요 20g"
        }
        aria-label="우체국 접수 내역"
      />

      <div className="flex gap-2">
        <Button
          disabled={pending || !text.trim()}
          onClick={() => void preview()}
        >
          {pending ? "읽는 중..." : "읽어보기"}
        </Button>
        {view && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => {
              setView(null);
              setSelected([]);
              setResults(null);
              setNotification(null);
            }}
          >
            다시 붙여넣기
          </Button>
        )}
      </div>

      {error && (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      )}

      {view && (
        <>
          <p>
            전체 {rows.length}줄 · 자동·선택 완료 {selectable.length}
            {needsReview.length > 0 && ` · 확인 필요 ${needsReview.length}`}
            {blocked.length > 0 && ` · 처리 불가 ${blocked.length}`}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="border-b">
                <tr>
                  <th className="px-2 py-1">선택</th>
                  <th className="px-2 py-1">줄</th>
                  <th className="px-2 py-1">송장번호</th>
                  <th className="px-2 py-1">받는 분</th>
                  <th className="px-2 py-1">우편번호</th>
                  <th className="px-2 py-1">요금</th>
                  <th className="px-2 py-1">상태</th>
                  <th className="px-2 py-1">연결된 주문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        disabled={!row.selectable || pending}
                        checked={selected.includes(row.id)}
                        aria-label={`${row.lineNumber}번째 줄 선택`}
                        onChange={event =>
                          setSelected(previous =>
                            event.target.checked
                              ? [...previous, row.id]
                              : previous.filter(id => id !== row.id)
                          )
                        }
                      />
                    </td>
                    <td className="px-2 py-1">{row.lineNumber}</td>
                    <td className="px-2 py-1 font-mono">
                      {row.trackingNumber}
                    </td>
                    <td className="px-2 py-1">{row.recipientLabel}</td>
                    <td className="px-2 py-1 font-mono">{row.postalCode}</td>
                    <td className="px-2 py-1">
                      {row.postageKrw?.toLocaleString("ko-KR")}
                    </td>
                    <td className="px-2 py-1">
                      {STATUS_LABELS[row.status] ?? row.status}
                      {row.reason && (
                        <span className="block text-muted-foreground">
                          {row.reason}
                        </span>
                      )}
                      {results?.[String(row.id)] && (
                        <span className="block font-medium">
                          {RESULT_LABELS[results[String(row.id)]] ??
                            results[String(row.id)]}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      {row.matchedOrderNumber ?? "-"}
                      {row.status === "NEEDS_REVIEW" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={pending}
                          onClick={() => setReviewing(row)}
                        >
                          고르기
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button
            disabled={pending || selected.length === 0}
            onClick={() => void commit()}
          >
            선택 건 송장 반영 ({selected.length}건)
          </Button>

          {notification && (
            <section
              className="space-y-2 rounded border p-3"
              aria-label="발송 알림 현황"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>발송 알림 현황</strong>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    void refreshNotification(notification.id).catch(handle)
                  }
                >
                  새로고침
                </Button>
              </div>
              <p>
                {notification.configured
                  ? `수신 성공 ${notification.succeeded}건 · 확인 중 ${notification.pending}건 · 실패 ${notification.failed}건`
                  : `알림 설정 대기 ${notification.pending}건`}
              </p>
              {!notification.configured && (
                <p className="text-muted-foreground">
                  알림톡은 아직 발송되지 않았습니다.
                </p>
              )}
              <div className="space-y-1">
                {notification.events.map(event => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1"
                  >
                    <span>
                      {event.orderNumber} · {event.trackingNumber} ·{" "}
                      {NOTIFICATION_LABELS[event.status] ?? event.status}
                      {event.lastResultMessage &&
                        ` · ${event.lastResultMessage}`}
                    </span>
                    {event.status === "FAILED" && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => void retryNotification(event)}
                      >
                        실패 건 재시도
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {reviewing && view && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-lg bg-background p-5 shadow-lg"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="postal-review-title"
          >
            <strong id="postal-review-title" className="block text-base">
              어느 주문인지 골라 주세요
            </strong>
            <small className="mt-1 block text-muted-foreground">
              {reviewing.recipientLabel} · {reviewing.postalCode} ·{" "}
              {reviewing.reason}
            </small>
            <div className="mt-3 space-y-2">
              {(reviewing.candidates.length > 0
                ? view.candidates.filter(c =>
                    reviewing.candidates.includes(c.orderNumber)
                  )
                : view.candidates
              ).map(candidate => (
                <Button
                  key={candidate.orderNumber}
                  variant="outline"
                  className="w-full justify-start"
                  disabled={pending}
                  onClick={() => void resolve(reviewing, candidate.orderNumber)}
                >
                  {candidate.orderNumber} · {candidate.guardianName} /{" "}
                  {candidate.petName} · {candidate.postalCode}
                </Button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={() => setReviewing(null)}>
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
