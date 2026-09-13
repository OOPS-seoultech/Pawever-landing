import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/adminFormat";
import { stageLabels, type WorkflowOrder } from "@/lib/adminContracts";

const postChecks = {
  SUPPORT_REMOVED: "서포트 제거 완료",
  SURFACE_CHECKED: "표면 상태 확인 완료",
};
const qcChecks = {
  SHAPE_COLOR: "형상·색상 확인",
  SURFACE: "표면·마감 확인",
  EYES_NOSE: "눈·코 등 핵심 부위 확인",
};
export function AdminFinishing({
  row,
  pending,
  onCommand,
}: {
  row: WorkflowOrder;
  pending: boolean;
  onCommand: (action: string, body: object, message: string) => void;
}) {
  const [checks, setChecks] = useState<string[]>([]);
  const [resin, setResin] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [route, setRoute] = useState("");
  const post = row.allowedActions.includes("COMPLETE_POST_PROCESSING");
  const qc = row.allowedActions.includes("COMPLETE_QUALITY_CHECK");
  const definitions = post ? postChecks : qcChecks;
  return (
    <div className="space-y-4">
      {(post || qc) && (
        <fieldset disabled={pending} className="space-y-3 border-t pt-4">
          <legend className="text-sm font-semibold">
            {post ? "후가공 확인" : "품질 검수"}
          </legend>
          {Object.entries(definitions).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checks.includes(key)}
                onChange={e =>
                  setChecks(old =>
                    e.target.checked
                      ? [...old, key]
                      : old.filter(k => k !== key)
                  )
                }
              />
              {label}
            </label>
          ))}
          {post && (
            <label className="block text-sm">
              레진 경화 확인
              <select
                value={resin}
                className="mt-1 block w-full rounded border bg-background p-2"
                onChange={e => setResin(e.target.value)}
              >
                <option value="">선택하세요</option>
                <option value="DONE">레진 경화 완료</option>
                <option value="NOT_APPLICABLE">레진 미사용</option>
              </select>
            </label>
          )}
          <label className="block text-sm">
            {post ? "후가공 메모" : "검수 메모"}
            <textarea
              className="mt-1 block w-full rounded border bg-background p-2"
              maxLength={1000}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </label>
          <Button
            disabled={
              pending ||
              Object.keys(definitions).some(k => !checks.includes(k)) ||
              (post && !resin)
            }
            onClick={() =>
              onCommand(
                post ? "post-processing" : "quality-check",
                {
                  version: row.version,
                  checks: Object.keys(definitions).filter(k =>
                    checks.includes(k)
                  ),
                  note: note.trim(),
                  ...(post ? { resinCuring: resin } : { decision: "PASSED" }),
                },
                post
                  ? "후가공을 완료했습니다. 품질 검수를 진행해 주세요."
                  : "검수를 통과해 포장 대기로 이동했습니다."
              )
            }
          >
            {post ? "후가공 완료" : "검수 통과"}
          </Button>
          {qc && (
            <details className="space-y-2">
              <summary className="cursor-pointer text-sm">
                불합격·재작업 요청
              </summary>
              <label className="block text-sm">
                불합격 사유
                <select
                  className="mt-1 block w-full rounded border bg-background p-2"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  <option value="SHAPE">형상 불량</option>
                  <option value="COLOR">색상 불량</option>
                  <option value="PRINT_DEFECT">출력 불량</option>
                  <option value="FINISH_DEFECT">후가공 불량</option>
                </select>
              </label>
              <label className="block text-sm">
                보정 경로
                <select
                  className="mt-1 block w-full rounded border bg-background p-2"
                  value={route}
                  onChange={e => setRoute(e.target.value)}
                >
                  <option value="">선택하세요</option>
                  <option value="MODELING">모델 수정</option>
                  <option value="PLATE_PREPARATION">
                    새 플레이트로 재출력
                  </option>
                  <option value="POST_PROCESSING">후가공 재작업</option>
                </select>
              </label>
              <p className="text-xs text-muted-foreground">
                검수 메모에 보정할 내용을 적어 주세요. 새 작업 시도가
                생성됩니다.
              </p>
              <Button
                variant="outline"
                disabled={pending || !reason || !route || !note.trim()}
                onClick={() =>
                  onCommand(
                    "quality-check",
                    {
                      version: row.version,
                      decision: "FAILED",
                      reasonCode: reason,
                      reworkStage: route,
                      note: note.trim(),
                    },
                    "불합격 사유를 기록하고 새 보정 작업을 만들었습니다."
                  )
                }
              >
                불합격 및 재작업
              </Button>
            </details>
          )}
        </fieldset>
      )}
      {(row.finishingHistory ?? []).length > 0 && (
        <div className="space-y-2 border-t pt-3">
          <h3 className="text-sm font-medium">후가공·검수 기록</h3>
          {row.finishingHistory?.map(r => (
            <div key={r.id} className="space-y-1 rounded bg-muted p-3 text-sm">
              <p>
                {stageLabels[r.stage]} · 시도 {r.attempt} ·{" "}
                {r.decision === "PASSED"
                  ? "통과"
                  : r.decision === "FAILED"
                    ? "불합격"
                    : "완료"}
              </p>
              <p className="break-words">
                {r.checks
                  .map(
                    c =>
                      ({
                        ...postChecks,
                        ...qcChecks,
                        RESIN_DONE: "레진 경화 완료",
                        RESIN_NOT_APPLICABLE: "레진 미사용",
                      })[c as keyof typeof postChecks] ?? c
                  )
                  .join(" / ")}
              </p>
              {r.reworkStage && <p>보정: {stageLabels[r.reworkStage]}</p>}
              {r.note && (
                <p className="whitespace-pre-wrap break-words">{r.note}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {r.actorName} · {formatDateTime(r.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
