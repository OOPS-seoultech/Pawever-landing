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
  workerName: string;
  amountKrw: number;
  createdAt: string;
};
export function AdminCompensation({ accounts }: { accounts: StaffAccount[] }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [ledger, setLedger] = useState<Entry[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const retry = useRef<{ body: string; key: string } | null>(null);
  const load = async () => {
    const [c, l] = await Promise.all([
      adminRequest<Config>("/api/admin/production-compensation"),
      adminRequest<Entry[]>("/api/admin/production-settlements"),
    ]);
    setConfig(c);
    setLedger(l);
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
            <h3 className="text-sm font-semibold">
              기록된 정산 항목 ({ledger.length}건)
            </h3>
            <p className="text-xs text-muted-foreground">
              지급 완료 내역이 아닌 실제 발송·수령 준비에 따른 정산 대상
              기록입니다.
            </p>
            {ledger.map(r => (
              <p
                key={r.id}
                className="break-words rounded bg-muted p-2 text-sm"
              >
                {r.orderNumber} · {r.workerName} · {formatKrw(r.amountKrw)} ·{" "}
                {formatDateTime(r.createdAt)}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
