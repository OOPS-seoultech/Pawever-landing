import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/adminFormat";
import type { PrintBatch } from "@/lib/printBatchContracts";

export function AdminPrintRun({
  batch,
  pending,
  onCommand,
}: {
  batch: PrintBatch;
  pending: boolean;
  onCommand: (action: string, body: object, message: string) => void;
}) {
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [cancelNote, setCancelNote] = useState("");
  const [grams, setGrams] = useState("");
  const [issues, setIssues] = useState<Record<string, string>>({});
  const can = (action: string) => batch.allowedActions.includes(action);
  const orders = batch.orders.map(o => ({
    orderNumber: o.orderNumber,
    version: o.version,
  }));
  const invalidFailure = batch.orders.some(
    o => failed[o.orderNumber] && !reasons[o.orderNumber]?.trim()
  );
  return (
    <div className="space-y-4">
      {can("CANCEL_QUEUED_PRINT") && (
        <details className="space-y-2 border-t pt-3">
          <summary className="cursor-pointer text-sm">
            출력 대기 취소·재구성
          </summary>
          <p className="text-sm">
            출력을 시작하기 전에만 해제할 수 있습니다. 활성 주문을 새 플레이트
            구성으로 보내며 기존 파일은 다시 사용하지 않습니다.
          </p>
          <label className="block text-sm">
            재구성 사유
            <Input
              value={cancelNote}
              maxLength={1000}
              disabled={pending}
              onChange={e => setCancelNote(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            disabled={pending || !cancelNote.trim()}
            onClick={() =>
              onCommand(
                "cancel-queued",
                { version: batch.version, orders, note: cancelNote.trim() },
                "출력 대기를 해제하고 활성 주문을 새 플레이트 구성으로 보냈습니다."
              )
            }
          >
            출력 대기 해제
          </Button>
        </details>
      )}
      {batch.startedAt && (
        <p className="text-xs text-muted-foreground">
          출력 시작: {formatDateTime(batch.startedAt)}
          {batch.finishedAt && <> · 종료: {formatDateTime(batch.finishedAt)}</>}
        </p>
      )}
      {can("START_PRINT_BATCH") && (
        <div className="space-y-2 border-t pt-3">
          <p className="text-sm">
            실제 프린터에서 출력 시작을 확인한 뒤 기록하세요. 포함 주문 전체가
            출력 중으로 이동합니다.
          </p>
          <Button
            disabled={pending || batch.blockingIssues.length > 0}
            onClick={() =>
              onCommand(
                "start",
                { version: batch.version, orders },
                "플레이트와 포함 주문의 출력 시작을 기록했습니다."
              )
            }
          >
            출력 시작
          </Button>
        </div>
      )}
      {can("RECORD_PRINT_OBSERVATION") && (
        <fieldset disabled={pending} className="space-y-2 border-t pt-3">
          <legend className="text-sm font-medium">중간 확인</legend>
          <label className="block text-sm">
            중간 확인 메모
            <textarea
              className="mt-1 block w-full rounded border bg-background p-2"
              value={note}
              maxLength={1000}
              onChange={e => setNote(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            퍼지 잔여물(g)
            <Input
              type="number"
              min={0}
              max={100000}
              step="0.01"
              value={grams}
              onChange={e => setGrams(e.target.value)}
            />
          </label>
          <details>
            <summary className="cursor-pointer text-sm">
              이상이 있는 주문 기록
            </summary>
            <div className="mt-2 space-y-2">
              {batch.orders.map(o => (
                <label key={o.orderNumber} className="block text-sm">
                  {o.orderNumber} 이상 메모
                  <Input
                    maxLength={1000}
                    value={issues[o.orderNumber] ?? ""}
                    onChange={e =>
                      setIssues(v => ({
                        ...v,
                        [o.orderNumber]: e.target.value,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </details>
          <Button
            variant="outline"
            disabled={
              pending ||
              (!note.trim() &&
                !grams &&
                !Object.values(issues).some(v => v.trim()))
            }
            onClick={() =>
              onCommand(
                "observations",
                {
                  version: batch.version,
                  note: note.trim(),
                  purgeGrams: grams ? Number(grams) : null,
                  issues: Object.entries(issues)
                    .filter(([, v]) => v.trim())
                    .map(([orderNumber, v]) => ({
                      orderNumber,
                      note: v.trim(),
                    })),
                },
                "중간 확인 기록을 저장했습니다."
              )
            }
          >
            중간 확인 저장
          </Button>
        </fieldset>
      )}
      {(batch.observations ?? []).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">중간 확인 기록</h3>
          {batch.observations?.map(r => (
            <div key={r.id} className="space-y-1 rounded bg-muted p-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{r.note}</p>
              {r.purgeGrams != null && <p>퍼지 잔여물: {r.purgeGrams}g</p>}
              {r.issues.map(i => (
                <p key={i.orderNumber} className="break-words">
                  {i.orderNumber}: {i.note}
                </p>
              ))}
              <p className="text-xs text-muted-foreground">
                {r.actorName} · {formatDateTime(r.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
      {can("FINISH_PRINT_BATCH") && (
        <fieldset disabled={pending} className="space-y-3 border-t pt-3">
          <legend className="text-sm font-medium">주문별 출력 결과</legend>
          <p className="text-sm">
            출력물을 모두 확인한 후 실패한 주문만 체크하세요. 취소되거나 결제
            상태가 변경된 주문은 후가공 인계에서 제외됩니다.
          </p>
          {batch.orders.map(o => (
            <div
              key={o.orderNumber}
              className="space-y-2 rounded border p-3 text-sm"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={`${o.orderNumber} 출력 실패`}
                  checked={!!failed[o.orderNumber]}
                  onChange={e =>
                    setFailed(v => ({
                      ...v,
                      [o.orderNumber]: e.target.checked,
                    }))
                  }
                />
                <span className="break-all">
                  {o.orderNumber} · {o.petName} 출력 실패
                </span>
              </label>
              {failed[o.orderNumber] && (
                <label className="block">
                  {o.orderNumber} 실패 사유
                  <Input
                    value={reasons[o.orderNumber] ?? ""}
                    maxLength={1000}
                    onChange={e =>
                      setReasons(v => ({
                        ...v,
                        [o.orderNumber]: e.target.value,
                      }))
                    }
                  />
                </label>
              )}
            </div>
          ))}
          <Button
            disabled={pending || invalidFailure}
            onClick={() =>
              onCommand(
                "finish",
                {
                  version: batch.version,
                  orders: orders.map(o => ({
                    ...o,
                    result: failed[o.orderNumber] ? "FAILED" : "SUCCESS",
                    note: failed[o.orderNumber]
                      ? reasons[o.orderNumber].trim()
                      : "",
                  })),
                },
                "출력 결과를 기록했습니다. 성공 주문은 후가공, 실패 주문은 새 플레이트 구성으로 넘어갔습니다."
              )
            }
          >
            출력 완료
          </Button>
        </fieldset>
      )}
      {(batch.results ?? []).length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-medium">이번 출력 결과</h3>
          {batch.results?.map(r => (
            <p key={r.id} className="break-words text-sm">
              {r.orderNumber} · 시도 {r.attempt} ·{" "}
              {r.result === "SUCCESS"
                ? "출력 성공"
                : r.result === "FAILED"
                  ? "출력 실패 · 재출력 구성 대기"
                  : "제작 인계 제외"}
              {r.note && ` — ${r.note}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
