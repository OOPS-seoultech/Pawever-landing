import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useStaffSession } from "@/components/AdminSession";
import { AdminError, CopyButton } from "@/components/AdminShell";
import {
  AdminApiError,
  cancelAdminOrder,
  changeAdminOrderStatus,
  completeAdminPickup,
  getAdminOrder,
  registerAdminTracking,
  type AdminOrderDetail as OrderDetail,
  type AdminRole,
  type GoodsOrderStatus,
} from "@/lib/adminApi";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
import { accessActionLabel } from "@/lib/adminHistory";
import type { WorkflowOrder } from "@/lib/adminContracts";
import { AdminWorkflowPanel } from "./AdminWorkflowPanel";
import {
  canCancel,
  CANCEL_REASONS,
  cancelGuide,
  canCompletePickup,
  canRegisterTracking,
  settableStatusesFor,
  statusChangeHint,
  STATUS_LABELS,
} from "./adminOrderStatus";

/**
 * 주문 한 건의 상세.
 *
 * 목록의 드로어와 /admin/orders/:orderNumber 가 같은 것을 그린다. 두 벌로
 * 두면 한쪽만 고쳐진다.
 *
 * @param onChanged 무언가 바뀌었을 때. 목록이 자기 숫자를 다시 세도록 알린다.
 */
export function AdminOrderPanel({
  orderNumber,
  petIndex = 0,
  role,
  onChanged,
  onSelectPet,
}: {
  orderNumber: string;
  petIndex?: number;
  role: AdminRole | null;
  onChanged?: (row?: WorkflowOrder) => void;
  onSelectPet?: (index: number) => void;
}) {
  const [, setLocation] = useLocation();
  const { staff } = useStaffSession();
  const [activePetIndex, setActivePetIndex] = useState(petIndex);
  useEffect(() => setActivePetIndex(petIndex), [orderNumber, petIndex]);

  const [salePriceTarget, setSalePriceTarget] = useState<HTMLDivElement | null>(
    null
  );
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [nextStatus, setNextStatus] = useState<GoodsOrderStatus | "">("");
  const [memo, setMemo] = useState("");
  const [company, setCompany] = useState("");
  const [invoice, setInvoice] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetail, setCancelDetail] = useState("");
  // 취소는 되돌릴 수 없다. 한 번 더 묻는다.
  const [cancelArmed, setCancelArmed] = useState(false);

  const handle = useCallback(
    (caught: unknown) => {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(failure.message);
    },
    [setLocation]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const detail = await getAdminOrder(orderNumber);
      setOrder(detail);
      setCompany(detail.shipping?.trackingCompany ?? "");
      setInvoice(detail.shipping?.trackingNumber ?? "");
    } catch (caught) {
      handle(caught);
    }
  }, [orderNumber, handle]);

  useEffect(() => {
    if (role) void load();
  }, [role, load]);

  const run = async (action: () => Promise<void>, done: string) => {
    if (pending) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(done);
      await load();
      // 목록의 요약과 상태 뱃지가 이 변경을 따라와야 한다.
      onChanged?.();
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  if (!order) {
    return error ? (
      <AdminError message={error} />
    ) : (
      <p className="text-sm text-muted-foreground">불러오는 중...</p>
    );
  }

  // 되돌릴 곳이 결제 여부로 갈린다. 제작팀에게는 결제 정보가 내려가지
  // 않으므로 그때는 좁히지 않는다.
  const options =
    order.workflow && order.workflow.productionStage !== "BLOCKED"
      ? []
      : settableStatusesFor(
          role ?? "PRODUCTION",
          order.status,
          order.payment ? Boolean(order.payment.paidAt) : undefined
        ).filter(status => !(order.workflow && status === "PAYMENT_COMPLETED"));
  // 계좌이체 주문은 환불을 사람이 먼저 한다. 결제 대행사 주문과 같은 말을
  // 하면 환불 안 된 취소가 생긴다.
  const cancelWords = cancelGuide(order.payment?.pgLinked ?? false);

  return (
    <>
      <div className="mb-4">
        <AdminWorkflowPanel
          key={`${orderNumber}:${activePetIndex}`}
          orderNumber={orderNumber}
          petIndex={activePetIndex}
          onSelectPet={index => {
            setActivePetIndex(index);
            onSelectPet?.(index);
          }}
          showPhotos
          salePriceTarget={salePriceTarget}
          onChanged={row => {
            void load();
            onChanged?.(row);
          }}
        />
      </div>
      {error ? <AdminError message={error} /> : null}
      {notice ? (
        <p className="mb-4 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {order.shipping ? (
          <Section title="배송">
            <Row label="보호자" value={order.shipping.guardianName} />
            <Row label="연락처" value={order.shipping.phone} copyAs="연락처" />
            {/* 방법을 주소보다 먼저 둔다. 주소가 빈 이유를 알고 나서 봐야
                빠뜨린 것과 구분된다. */}
            <Row
              label="수령 방법"
              value={
                order.shipping.deliveryMethod === "PICKUP"
                  ? "현장 수령 (배송비 없음)"
                  : "택배"
              }
            />
            {order.shipping.deliveryMethod === "PICKUP" ? (
              <Row label="주소" value="현장에서 직접 전달 — 주소를 받지 않음" />
            ) : (
              <Row
                label="주소"
                value={
                  [
                    order.shipping.postalCode
                      ? `(${order.shipping.postalCode})`
                      : "",
                    order.shipping.address ?? "",
                    order.shipping.addressDetail ?? "",
                  ]
                    .filter(Boolean)
                    .join(" ") || "-"
                }
                copyAs="주소"
              />
            )}
            <Row
              label="송장"
              value={
                order.shipping.trackingNumber
                  ? `${order.shipping.trackingCompany ?? ""} ${order.shipping.trackingNumber}`
                  : "-"
              }
            />
          </Section>
        ) : (
          <Section title="배송">
            {/* 제작팀에게는 서버가 비워서 내려준다. */}
            <p className="text-sm text-muted-foreground">
              보호자 정보는 관리자만 볼 수 있습니다.
            </p>
          </Section>
        )}

        {order.payment ? (
          <Section title="결제">
            <Row label="수단" value={order.payment.method ?? "-"} />
            <Row
              label="결제 시각"
              value={formatDateTime(order.payment.paidAt)}
            />
            <Row
              label="만료 시각"
              value={formatDateTime(order.payment.paymentExpiresAt)}
            />
            {order.payment.cancelReason ? (
              <Row label="취소 사유" value={order.payment.cancelReason} />
            ) : null}
          </Section>
        ) : null}

        <Section title="주문">
          <Row
            label="상태"
            value={order.statusLabel ?? STATUS_LABELS[order.status]}
          />
          <Row label="신청일" value={formatDateTime(order.submittedAt)} />
          <Row label="굿즈" value={order.goodsTypeLabel || order.goodsType} />
          {/* 한 주문에 여러 마리가 올 수 있다. 첫 아이만 보고 한 마리로
              여기면 만들다 빠뜨린다. */}
          <Row
            label={
              (order.pets?.length ?? 0) > 1
                ? `반려동물 ${order.pets?.length}마리`
                : "반려동물"
            }
            value={
              order.pets && order.pets.length > 0
                ? order.pets
                    .map(pet =>
                      [
                        pet.petName,
                        `사진 ${pet.photoCount}장`,
                        pet.keyringAdded ? "키링" : null,
                        pet.lowPhotoAcknowledged ? "사진 부족 확인" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    )
                    .join("\n")
                : order.petName
            }
          />
          {order.pricing ? (
            <>
              <Row label="정가" value={formatKrw(order.pricing.listPriceKrw)} />
              <Row
                label="할인"
                value={
                  order.pricing.discountAmountKrw > 0
                    ? `-${formatKrw(order.pricing.discountAmountKrw)}${
                        order.pricing.promotionName
                          ? ` (${order.pricing.promotionName})`
                          : ""
                      }`
                    : "-"
                }
              />
              <Row
                label="결제 금액"
                value={formatKrw(order.pricing.paymentAmountKrw)}
              />
            </>
          ) : null}
          <div ref={setSalePriceTarget} className="mt-5" />
        </Section>

        <Section title="상태 변경">
          {options.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {statusChangeHint(order.status) ??
                "지금 상태에서 바꿀 수 있는 값이 없습니다."}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {options.map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setNextStatus(status)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      nextStatus === status
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
              <Textarea
                value={memo}
                onChange={event => setMemo(event.target.value)}
                placeholder="메모 (선택). 왜 바꾸는지 남겨 두면 나중에 찾을 수 있습니다."
                maxLength={300}
                rows={2}
              />
              <Button
                size="sm"
                disabled={!nextStatus || pending}
                onClick={() =>
                  run(async () => {
                    await changeAdminOrderStatus(
                      order.orderNumber,
                      nextStatus as GoodsOrderStatus,
                      memo
                    );
                    setNextStatus("");
                    setMemo("");
                  }, "상태를 바꿨습니다.")
                }
              >
                상태 바꾸기
              </Button>
            </div>
          )}
        </Section>

        {(!order.workflow || order.workflow.productionStage === "BLOCKED") &&
        canCompletePickup(
          role ?? "PRODUCTION",
          order.status,
          order.shipping?.deliveryMethod
        ) ? (
          <Section title="현장 수령">
            <p className="mb-3 text-sm text-muted-foreground">
              현장에서 직접 건넸으면 눌러 주세요. 송장 없이 수령 완료로
              넘어가고, 이때부터 사진 보유 기간 3개월을 셉니다.
            </p>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => completeAdminPickup(order.orderNumber),
                  "수령 완료로 바꿨습니다."
                )
              }
            >
              수령 완료
            </Button>
          </Section>
        ) : null}

        {(!order.workflow || order.workflow.productionStage === "BLOCKED") &&
        canRegisterTracking(
          role ?? "PRODUCTION",
          order.status,
          order.shipping?.deliveryMethod
        ) ? (
          <Section title="송장 등록">
            <p className="mb-3 text-sm text-muted-foreground">
              등록하면 발송 완료로 넘어가고, 이때부터 사진 보유 기간 3개월을
              셉니다. 송장을 고쳐 다시 등록해도 그 날짜는 밀리지 않습니다.
            </p>
            <div className="space-y-2">
              <Input
                value={company}
                onChange={event => setCompany(event.target.value)}
                placeholder="택배사"
                maxLength={50}
              />
              <Input
                value={invoice}
                onChange={event => setInvoice(event.target.value)}
                placeholder="송장번호"
                maxLength={50}
              />
              <Button
                size="sm"
                disabled={!company.trim() || !invoice.trim() || pending}
                onClick={() =>
                  run(
                    () =>
                      registerAdminTracking(
                        order.orderNumber,
                        company.trim(),
                        invoice.trim()
                      ),
                    "송장을 등록했습니다."
                  )
                }
              >
                송장 등록
              </Button>
            </div>
          </Section>
        ) : null}

        {canCancel(
          role ?? "PRODUCTION",
          order.status,
          Boolean(order.payment?.paidAt)
        ) ? (
          <Section title="주문 취소">
            <p className="mb-3 text-sm text-muted-foreground">
              {cancelWords.description}
            </p>

            <div className="mb-3 flex flex-wrap gap-2">
              {CANCEL_REASONS.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => {
                    setCancelReason(reason);
                    setCancelArmed(false);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    cancelReason === reason
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <Input
              value={cancelDetail}
              onChange={event => {
                setCancelDetail(event.target.value);
                setCancelArmed(false);
              }}
              placeholder="직접 입력 (선택). 목록에 없는 사유면 여기에 적으세요."
              maxLength={300}
              className="mb-3"
            />

            {cancelArmed ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-destructive">
                  {cancelWords.confirm(order.orderNumber)}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await cancelAdminOrder(
                        order.orderNumber,
                        cancelDetail.trim() || cancelReason
                      );
                      setCancelReason("");
                      setCancelDetail("");
                      setCancelArmed(false);
                    }, cancelWords.done)
                  }
                >
                  취소 진행
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCancelArmed(false)}
                >
                  그만두기
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending || (!cancelReason && !cancelDetail.trim())}
                onClick={() => setCancelArmed(true)}
              >
                주문 취소하기
              </Button>
            )}
          </Section>
        ) : null}

        <Section title="상태 이력">
          {order.statusHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">기록이 없습니다.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {order.statusHistory.map((change, index) => (
                <li key={index} className="border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {change.fromStatus
                        ? (STATUS_LABELS[
                            change.fromStatus as GoodsOrderStatus
                          ] ?? change.fromStatus)
                        : "신규"}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <span>
                      {STATUS_LABELS[change.toStatus as GoodsOrderStatus] ??
                        change.toStatus}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {formatDateTime(change.changedAt)}
                    </span>
                  </div>
                  {change.memo ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {change.memo}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Section>

        {order.accessLogs.length > 0 ? (
          <details className="rounded-[15px] border bg-muted p-4">
            <summary className="cursor-pointer text-sm font-semibold">
              열람 이력
            </summary>
            <div className="mt-3 rounded-[15px] border bg-background p-3">
              <ul className="space-y-1 text-sm">
                {order.accessLogs.map((log, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span>{accessActionLabel(log.action)}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      담당자 #{log.adminAccountId} ·{" "}
                      {formatDateTime(log.accessedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[15px] border bg-muted p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <div className="rounded-[15px] border bg-background p-3">{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  copyAs,
}: {
  label: string;
  value: string;
  /** 값을 그대로 복사할 수 있게 한다. 송장에 붙여 넣는 값에만 붙인다. */
  copyAs?: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b py-1.5 text-sm last:border-0">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all">{value}</span>
      {copyAs && value !== "-" ? (
        <span className="ml-auto">
          <CopyButton value={value} label={copyAs} />
        </span>
      ) : null}
    </div>
  );
}
