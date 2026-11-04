import { useRef, useState } from "react";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { workflowCommand, type WorkflowOrder } from "@/lib/adminContracts";

type Receipt = { operationId: string; completed: number; orders: unknown[] };

export function AdminAdministrativeCompletion({
  rows,
  disabled,
  onCompleted,
}: {
  rows: WorkflowOrder[];
  disabled: boolean;
  onCompleted: () => void;
}) {
  const { staff } = useStaffSession();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<WorkflowOrder[]>([]);
  const [numbers, setNumbers] = useState("");
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const keys = useRef(new Map<string, string>());
  const busy = useRef(false);
  const allowed =
    staff?.role === "OWNER" && staff.permissions.includes("OVERRIDE_WORKFLOW");
  const eligible = rows.filter(
    row =>
      row.orderStatus === "ACTIVE" &&
      row.shipmentStatus === "NOT_READY" &&
      ["CONFIRMED", "NOT_REQUIRED"].includes(row.paymentStatus)
  );
  const requested = numbers
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const targets = snapshot.filter(row => requested.includes(row.orderNumber));
  const valid =
    requested.length > 0 &&
    requested.length <= 200 &&
    new Set(requested).size === requested.length &&
    targets.length === requested.length;
  const saveReceipt = () => {
    if (!receipt) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `admin-completion-${receipt.operationId}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const complete = async () => {
    if (busy.current || !valid || !reason.trim()) return;
    busy.current = true;
    setPending(true);
    setError("");
    const body = {
      orders: targets.map(row => ({
        orderNumber: row.orderNumber,
        version: row.version,
      })),
      reason: reason.trim(),
    };
    const fingerprint = JSON.stringify(body);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const result = await workflowCommand<Receipt>(
        "/api/admin/orders/administrative-completions",
        body,
        key
      );
      setReceipt(result);
      setOpen(false);
      onCompleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "완료 처리에 실패했습니다.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  if (!allowed) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Button
        variant="outline"
        disabled={disabled || !eligible.length}
        onClick={() => {
          setSnapshot(eligible);
          setNumbers(eligible.map(row => row.orderNumber).join("\n"));
          setReason("");
          setError("");
          setOpen(true);
        }}
      >
        관리자 완료 처리
      </Button>
      {receipt && (
        <>
          <span role="status">
            {receipt.completed}건 관리자 완료 · 고객 알림 없음
          </span>
          <Button variant="outline" onClick={saveReceipt}>
            변경 전·후 기록 다운로드
          </Button>
        </>
      )}
      <Dialog
        open={open}
        onOpenChange={value => {
          if (!pending) setOpen(value);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] overflow-y-auto"
          showCloseButton={!pending}
          onInteractOutside={event => {
            if (pending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>진행 주문 관리자 완료</DialogTitle>
            <DialogDescription>
              선택한 주문을 완료 목록으로 이동합니다. 기존 제작
              단계·입금·배송·파일·정산 기록을 보존하고 고객 문자·Telegram을
              보내지 않습니다. 실제 배송·수령 완료를 새로 기록하지 않습니다.
              창을 연 뒤 새로 들어오는 주문은 추가하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <label className="flex flex-col gap-2 text-sm">
            완료 대상 주문번호
            <Textarea
              aria-label="완료 대상 주문번호"
              className="h-40 font-mono text-xs"
              value={numbers}
              disabled={pending}
              onChange={event => setNumbers(event.target.value)}
            />
          </label>
          <p>
            선택 {targets.length}건 / 창을 열 때 확인한 대상 {snapshot.length}건
          </p>
          {!valid && (
            <p role="alert" className="text-destructive">
              중복·누락·대상에 없는 주문번호를 확인해 주세요. 한 번에 최대
              200건입니다.
            </p>
          )}
          <label className="flex flex-col gap-2 text-sm">
            처리 사유
            <Input
              aria-label="관리자 완료 사유"
              maxLength={300}
              value={reason}
              disabled={pending}
              onChange={event => setReason(event.target.value)}
            />
          </label>
          <p className="text-xs text-muted-foreground">
            변경 전 상태는 서버 이력에 보존됩니다. 완료 목록에서 주문을 선택하면
            소유자가 개별 복구할 수 있습니다. 다른 사람이 주문을 변경했다면 전체
            처리를 중단합니다.
          </p>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button
              disabled={pending || !valid || !reason.trim()}
              onClick={() => void complete()}
            >
              {pending ? "처리 중…" : `${targets.length}건 관리자 완료 확정`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
