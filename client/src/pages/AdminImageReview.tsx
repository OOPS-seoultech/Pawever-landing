import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { AdminShell, useAdminGuard, AdminError } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { AdminCustomerPhotos } from "@/components/AdminCustomerPhotos";
import { AdminImageGallery } from "@/components/AdminImageGallery";
import { Button } from "@/components/ui/button";
import {
  getImageJob,
  imageCommand,
  imageStatus,
  type ImageJob,
} from "@/lib/adminImageGeneration";
const directions = {
  all: "전체",
  front: "정면",
  left: "왼쪽",
  back: "뒷면",
  right: "오른쪽",
};
const regions = {
  face: "얼굴",
  eyes_nose: "눈·코",
  ears: "귀",
  markings: "색상·무늬",
  tail: "꼬리",
  paws: "발·다리",
  proportions: "신체 비율",
  pose: "자세",
  framing: "구도·잘림",
  other: "기타",
};
export default function AdminImageReview({
  params,
}: {
  params: { jobId: string };
}) {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [job, setJob] = useState<ImageJob | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [direction, setDirection] = useState("all");
  const [region, setRegion] = useState("tail");
  const [note, setNote] = useState("");
  const busy = useRef(false);
  const keys = useRef(new Map<string, string>());
  const refresh = useCallback(async () => {
    const fresh = await getImageJob(params.jobId);
    setJob(fresh);
    return fresh;
  }, [params.jobId]);
  useEffect(() => {
    if (!role) return;
    setJob(null);
    void refresh().catch(e => setError(e.message));
  }, [role, refresh]);
  useEffect(() => {
    if (!job || !["QUEUED", "RUNNING"].includes(job.status)) return;
    const timer = setInterval(
      () => void refresh().catch(e => setError(e.message)),
      5000
    );
    return () => clearInterval(timer);
  }, [job?.status, refresh]);
  const images = useCallback(
    async () => (await getImageJob(params.jobId)).images,
    [params.jobId]
  );
  const run = async (action: string) => {
    if (!job || busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    const body =
      action === "regenerate" ? { direction, region, note: note.trim() } : {};
    const fingerprint = `${job.id}:${action}:${JSON.stringify(body)}`;
    if (!keys.current.has(fingerprint))
      keys.current.set(fingerprint, crypto.randomUUID());
    try {
      const result = await imageCommand(
        job.id,
        action,
        body,
        keys.current.get(fingerprint)!
      );
      if (result.id !== job.id) {
        window.location.assign(`/admin/image-review/${result.id}`);
        return;
      }
      setJob(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리하지 못했습니다.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  return (
    <AdminShell
      title="4면도 이미지 검수"
      role={role}
      backTo={
        job
          ? `/admin/orders/${job.orderNumber}?petIndex=${job.petIndex}`
          : "/admin/my-work"
      }
    >
      {error && <AdminError message={error} />}
      {!job ? (
        <p role="status">검수 자료를 불러오는 중입니다.</p>
      ) : (
        <div className="space-y-5">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">
              {job.petName} · {job.orderNumber}
            </h2>
            <p>
              {imageStatus[job.status] ?? job.status} · 요청자:{" "}
              {job.requestedBy}
            </p>
            <p className="text-sm text-muted-foreground">
              프롬프트: {job.promptVersion} · 텔레그램:{" "}
              {job.telegramStatus === "ACCEPTED"
                ? "발송 접수"
                : job.telegramStatus === "FAILED"
                  ? "발송 실패"
                  : "미발송"}
            </p>
          </div>
          {!job.current && (
            <p role="status" className="rounded-md border p-3">
              이전 후보입니다. 주문 상세에서 최신 결과를 확인해 주세요.
            </p>
          )}
          {["QUEUED", "RUNNING"].includes(job.status) && (
            <p role="status" className="rounded-md border bg-muted p-4">
              한 세트의 4면도를 생성하고 있습니다. 완료되면 이 화면에
              나타납니다. 페이지를 닫아도 작업은 계속됩니다.
            </p>
          )}
          {job.errorCode && (
            <p role="alert" className="rounded-md border p-3">
              {job.errorCode} · 자동 재생성은 하지 않습니다. API 사용 내역과
              설정을 확인해 주세요.
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="space-y-3 rounded-[15px] border bg-muted p-4">
              <h3 className="font-semibold">신청 사진 · {job.petName}</h3>
              <AdminCustomerPhotos
                orderNumber={job.orderNumber}
                petIndex={job.petIndex}
                petName={job.petName}
              />
            </section>
            <section className="space-y-3 rounded-[15px] border bg-muted p-4">
              <h3 className="font-semibold">
                생성 후보 · 정면 / 왼쪽 / 뒷면 / 오른쪽
              </h3>
              <AdminImageGallery
                key={`${job.id}:${job.status}`}
                canSave={staff?.permissions.includes(
                  "DOWNLOAD_PRODUCTION_FILES"
                )}
                loadImages={images}
                emptyText="생성된 4면도가 아직 없습니다."
              />
            </section>
          </div>
          <section className="space-y-3 rounded-[15px] border bg-muted p-4">
            <h3 className="font-semibold">검수 체크</h3>
            <p className="text-sm">
              실제 얼굴·무늬가 닮았는지, 네 방향이 같은 아이인지 확인하세요.
              귀·다리·꼬리 수, 낮은 골반 중앙의 꼬리 뿌리와 몸에 붙은 지지 형태,
              앉은 자세·닫힌 입·잘림도 확인하세요. 실제 신체 예외는 원본 사진을
              기준으로 판단합니다.
            </p>
            <Button
              className="w-full"
              disabled={pending || !job.canReview}
              onClick={() => void run("approve")}
            >
              문제없음 · 4면도 검수 완료
            </Button>
            {job.status === "APPROVED" && (
              <p role="status">
                확정된 4장이 주문에 반영됐습니다. Tripo 모델링은 담당자가 직접
                진행합니다.
              </p>
            )}
            {job.canReview && job.telegramStatus === "FAILED" && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void run("notify")}
              >
                텔레그램 검수 알림 다시 보내기
              </Button>
            )}
            {job.canRetrySave && (
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void run("retry-save")}
              >
                저장만 다시 시도 · API 재호출 없음
              </Button>
            )}
          </section>
          {job.canRegenerate && (
            <form
              onSubmit={e => {
                e.preventDefault();
                void run("regenerate");
              }}
              className="space-y-4 rounded-[15px] border bg-muted p-4"
            >
              <h3 className="font-semibold">수정 요청</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  방향
                  <select
                    aria-label="수정 방향"
                    value={direction}
                    onChange={e => setDirection(e.target.value)}
                    className="block w-full rounded border bg-background p-2"
                  >
                    {Object.entries(directions).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  부위
                  <select
                    aria-label="수정 부위"
                    value={region}
                    onChange={e => setRegion(e.target.value)}
                    className="block w-full rounded border bg-background p-2"
                  >
                    {Object.entries(regions).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="block space-y-2 text-sm">
                수정할 내용
                <textarea
                  required
                  maxLength={1000}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="예: 뒷면 꼬리 뿌리를 골반 중앙으로 옮기고 몸에 넓게 붙여 주세요. 얼굴과 무늬는 유지해 주세요."
                  className="block min-h-28 w-full rounded border bg-background p-3"
                />
              </label>
              <p className="text-sm text-muted-foreground">
                원본 사진·직전 결과·이 메모를 함께 보내 다시 생성합니다. 새 API
                호출 비용이 발생하며, 이 아이의 피드백만 반영합니다.
              </p>
              <Button type="submit" disabled={pending || !note.trim()}>
                피드백 반영하여 다시 생성
              </Button>
            </form>
          )}
          {job.feedback && (
            <p className="whitespace-pre-wrap rounded-md border bg-background p-3 text-sm">
              이 후보에 반영한 요청: {job.feedback}
            </p>
          )}
          <Link
            className="inline-block underline underline-offset-4"
            href={`/admin/orders/${job.orderNumber}?petIndex=${job.petIndex}`}
          >
            주문 상세로 돌아가기
          </Link>
        </div>
      )}
    </AdminShell>
  );
}
