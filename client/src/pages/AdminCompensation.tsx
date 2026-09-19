import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { adminRequest, AdminApiError } from "@/lib/adminApi";
import { workflowCommand, type StaffAccount } from "@/lib/adminContracts";
import { formatDateTime, formatKrw } from "@/lib/adminFormat";
type Config = {
  version: number;
  enabled: boolean;
  paidWorkerIds: number[];
  amountKrw: number;
};
type Entry = {
  id: number;
  orderNumber: string;
  workerId: number;
  workerName: string;
  amountKrw: number;
  paymentStatus: "UNPAID" | "PREPARED" | "PAID" | "HELD";
  createdAt: string;
};
type PayoutBatch = {
  id: number;
  beneficiaryId: number;
  beneficiaryName: string;
  grossKrw: number;
  deductionKrw: number;
  netKrw: number;
  status: "PREPARED" | "PAID" | "HELD";
  preparedAt: string;
  paidAt: string | null;
  transferReference: string | null;
  settlementIds: number[];
};
type Summary = {
  isOwner: boolean;
  settlements: Entry[];
  totalsKrw: Partial<Record<Entry["paymentStatus"], number>>;
  payoutBatches: PayoutBatch[];
};
export function AdminCompensation({ accounts }: { accounts: StaffAccount[] }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [deductionKrw, setDeductionKrw] = useState("0");
  const [references, setReferences] = useState<Record<number, string>>({});
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const retry = useRef<{ body: string; key: string } | null>(null);
  const load = async () => {
    const [c, s] = await Promise.all([
      adminRequest<Config>("/api/admin/production-compensation"),
      adminRequest<Summary>("/api/admin/compensation/summary"),
    ]);
    setConfig(c);
    setSummary(s);
    setSelectedIds(ids =>
      ids.filter(id => s.settlements.some(row => row.id === id && row.paymentStatus === "UNPAID"))
    );
  };
  const run = async (save: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (save && config) {
        const body = JSON.stringify(config);
        if (retry.current?.body !== body)
          retry.current = { body, key: crypto.randomUUID() };
        setConfig(
          await workflowCommand<Config>(
            "/api/admin/production-compensation",
            config,
            retry.current.key
          )
        );
        retry.current = null;
        setNotice(
          "앞으로 포장이 끝나 실제 발송·수령 대기가 된 주문에 적용할 정산 설정을 저장했습니다."
        );
      } else await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "정산 정보를 처리하지 못했습니다."
      );
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        retry.current = null;
      if (e instanceof AdminApiError && e.status === 409)
        await load().catch(() => {});
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const workers = accounts.filter(
    a => a.status === "ACTIVE" && a.workRoles.includes("PRINT_FINISHING")
  );
  const ledger = summary?.settlements ?? [];
  const selected = ledger.filter(row => selectedIds.includes(row.id));
  const selectedGross = selected.reduce((sum, row) => sum + row.amountKrw, 0);
  const toggleSettlement = (row: Entry) => {
    if (row.paymentStatus !== "UNPAID") return;
    setSelectedIds(current => {
      if (current.includes(row.id)) return current.filter(id => id !== row.id);
      const differentWorker = ledger.some(
        item => current.includes(item.id) && item.workerId !== row.workerId
      );
      return differentWorker ? [row.id] : [...current, row.id];
    });
  };
  const preparePayout = async () => {
    if (!selectedIds.length) {
      setError("미지급 정산 항목을 한 건 이상 선택해 주세요.");
      return;
    }
    const deduction = Number(deductionKrw);
    if (!Number.isInteger(deduction) || deduction < 0 || deduction > selectedGross) {
      setError("공제액은 세전 합계 이하의 0원 이상 정수여야 합니다.");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await workflowCommand<PayoutBatch>(
        "/api/admin/compensation/payout-batches",
        { settlementIds: selectedIds, deductionKrw: deduction },
        crypto.randomUUID()
      );
      setSelectedIds([]);
      setDeductionKrw("0");
      await load();
      setNotice("지급 대상을 고정했습니다. 은행 이체 뒤에 이체 완료를 기록하세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "지급 준비를 만들지 못했습니다.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const markPaid = async (batch: PayoutBatch) => {
    const reference = (references[batch.id] ?? "").trim();
    if (!reference) {
      setError("은행 이체 확인 번호 또는 증빙 메모를 입력해 주세요.");
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await workflowCommand<PayoutBatch>(
        `/api/admin/compensation/payout-batches/${batch.id}/mark-paid`,
        { reference },
        crypto.randomUUID()
      );
      await load();
      setNotice("은행 자동 송금 없이, 확인한 이체만 지급 완료로 기록했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "이체 완료를 기록하지 못했습니다.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <div className="space-y-3 border-t pt-4">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => void run(false)}
      >
        {config ? "정산 설정·내역 새로고침" : "제작 정산 설정·내역 열기"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      {config && (
        <>
          <fieldset disabled={pending} className="space-y-3">
            <legend className="text-sm font-semibold">제작 정산 설정</legend>
            <p className="text-sm">
              정산 기능을 켜고 지정한 유급 담당자가 제작한 주문이 우체국에
              접수되거나 직접 수령 포장을 마치면 건당{" "}
              {formatKrw(config.amountKrw)}를 한 번 기록합니다. 실제 지급은
              별도로 진행합니다.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={e =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
              />
              발송 접수·직접 수령 포장 완료 시 정산 항목 생성
            </label>
            <p className="text-sm font-medium">유급 제작 담당자</p>
            {[
              ...workers.map(w => ({ id: w.id, name: w.name })),
              ...config.paidWorkerIds
                .filter(id => !workers.some(w => w.id === id))
                .map(id => ({
                  id,
                  name: accounts.find(a => a.id === id)?.name ?? "이전 담당자",
                })),
            ].map(w => (
              <label key={w.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.paidWorkerIds.includes(w.id)}
                  onChange={e =>
                    setConfig({
                      ...config,
                      paidWorkerIds: e.target.checked
                        ? [...config.paidWorkerIds, w.id]
                        : config.paidWorkerIds.filter(id => id !== w.id),
                    })
                  }
                />
                {w.name}
              </label>
            ))}
            {!workers.length && (
              <p className="text-sm text-muted-foreground">
                활성 출력·후가공 담당자를 먼저 설정하세요.
              </p>
            )}
            <Button disabled={pending} onClick={() => void run(true)}>
              정산 설정 저장
            </Button>
          </fieldset>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">정산·지급 원장 ({ledger.length}건)</h3>
            <p className="text-xs text-muted-foreground">
              세전 적립과 실제 은행 이체를 분리합니다. 자동 송금은 하지 않습니다.
            </p>
            {summary && (
              <p className="text-xs text-muted-foreground">
                미지급 {formatKrw(summary.totalsKrw.UNPAID ?? 0)} · 지급 준비 {formatKrw(summary.totalsKrw.PREPARED ?? 0)} · 지급 완료 {formatKrw(summary.totalsKrw.PAID ?? 0)}
              </p>
            )}
            {ledger.map(r => (
              <label
                key={r.id}
                className="flex items-start gap-2 break-words rounded bg-muted p-2 text-sm"
              >
                <input
                  type="checkbox"
                  disabled={pending || r.paymentStatus !== "UNPAID"}
                  checked={selectedIds.includes(r.id)}
                  onChange={() => toggleSettlement(r)}
                />
                <span>
                  {r.orderNumber} · {r.workerName} · {formatKrw(r.amountKrw)} · {formatDateTime(r.createdAt)} · {r.paymentStatus === "UNPAID" ? "미지급" : r.paymentStatus === "PREPARED" ? "지급 준비" : r.paymentStatus === "PAID" ? "지급 완료" : "보류"}
                </span>
              </label>
            ))}
            <fieldset disabled={pending} className="space-y-2 rounded border p-3">
              <legend className="px-1 text-sm font-semibold">선택 항목 지급 준비</legend>
              <p className="text-xs text-muted-foreground">
                한 번에 한 담당자만 선택할 수 있습니다. 선택 합계는 이후 변경되지 않습니다.
              </p>
              <label className="block text-sm">
                공제액(원)
                <input
                  className="ml-2 w-28 rounded border bg-background p-1 text-right"
                  inputMode="numeric"
                  value={deductionKrw}
                  onChange={e => setDeductionKrw(e.target.value)}
                />
              </label>
              <p className="text-sm">세전 {formatKrw(selectedGross)} · 실지급 {formatKrw(Math.max(0, selectedGross - (Number(deductionKrw) || 0)))}</p>
              <Button disabled={pending || !selectedIds.length} onClick={() => void preparePayout()}>
                선택 항목 지급 준비
              </Button>
            </fieldset>
            {summary?.payoutBatches.map(batch => (
              <div key={batch.id} className="space-y-2 rounded border p-3 text-sm">
                <p>
                  {batch.beneficiaryName} · 세전 {formatKrw(batch.grossKrw)} · 공제 {formatKrw(batch.deductionKrw)} · 실지급 {formatKrw(batch.netKrw)} · {batch.status === "PAID" ? "지급 완료" : "지급 준비"}
                </p>
                {batch.status === "PAID" ? (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(batch.paidAt!)} · 증빙 {batch.transferReference}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="rounded border bg-background p-1 text-sm"
                      placeholder="은행 이체 확인 번호 또는 증빙 메모"
                      value={references[batch.id] ?? ""}
                      onChange={e => setReferences(current => ({ ...current, [batch.id]: e.target.value }))}
                    />
                    <Button size="sm" disabled={pending} onClick={() => void markPaid(batch)}>
                      이체 완료 기록
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
