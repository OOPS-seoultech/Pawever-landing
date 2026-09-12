import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  reviewChecks,
  reviewReasons,
  type WorkflowOrder,
  type ModelReviewDecision,
} from "@/lib/adminContracts";
import { formatDateTime } from "@/lib/adminFormat";

export function AdminModelReview({
  row,
  pending,
  onReview,
}: {
  row: WorkflowOrder;
  pending: boolean;
  onReview: (decision: ModelReviewDecision) => void;
}) {
  const [checks, setChecks] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const approve = row.allowedActions.includes("APPROVE_MODEL");
  const revise = row.allowedActions.includes("REQUEST_MODEL_CHANGES");
  if (!approve && !revise) return null;
  return (
    <fieldset disabled={pending} className="space-y-3 border-t pt-4">
      <legend className="font-medium">모델 검수</legend>
      <p className="text-sm text-muted-foreground">
        고객 사진과 이번 제출 자료를 비교한 뒤 결정해 주세요.
      </p>
      {approve && (
        <div className="grid gap-2 sm:grid-cols-2">
          {Object.entries(reviewChecks).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checks.includes(key)}
                onChange={e =>
                  setChecks(current =>
                    e.target.checked
                      ? [...current, key]
                      : current.filter(value => value !== key)
                  )
                }
              />
              {label}
            </label>
          ))}
        </div>
      )}
      {revise && (
        <label className="block space-y-1 text-sm">
          <span>수정 사유</span>
          <select
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="block w-full rounded border bg-background p-2"
          >
            <option value="">수정 요청 시 선택해 주세요</option>
            {Object.entries(reviewReasons).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block space-y-1 text-sm">
        <span>검수 메모</span>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          maxLength={300}
          rows={3}
          placeholder="수정 요청 시 고칠 내용을 구체적으로 적어 주세요."
          className="block w-full resize-y rounded border bg-background p-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {approve && (
          <Button
            disabled={
              pending || checks.length !== Object.keys(reviewChecks).length
            }
            onClick={() =>
              onReview({
                decision: "APPROVED",
                reasonCode: null,
                note: note.trim(),
                checks: [...checks].sort(),
              })
            }
          >
            검수 승인
          </Button>
        )}
        {revise && (
          <Button
            variant="outline"
            disabled={pending || !reason || !note.trim()}
            onClick={() =>
              onReview({
                decision: "CHANGES_REQUESTED",
                reasonCode: reason,
                note: note.trim(),
                checks: [],
              })
            }
          >
            수정 요청
          </Button>
        )}
      </div>
    </fieldset>
  );
}

export function ModelReviewHistory({ row }: { row: WorkflowOrder }) {
  if (!row.reviews?.length) return null;
  return (
    <div className="space-y-2 border-t pt-4">
      <h3 className="font-medium">검수 이력</h3>
      <ol className="space-y-3">
        {[...row.reviews].reverse().map(review => (
          <li key={review.id} className="rounded border p-3 text-sm">
            <p className="font-medium">
              {review.modelingAttempt}차 제출 ·{" "}
              {review.decision === "APPROVED"
                ? "검수 승인"
                : `수정 요청 · ${reviewReasons[review.reasonCode ?? ""] ?? "기타"}`}
            </p>
            {review.note && (
              <p className="mt-1 whitespace-pre-wrap break-words">
                {review.note}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {review.reviewerName} · {formatDateTime(review.reviewedAt)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
