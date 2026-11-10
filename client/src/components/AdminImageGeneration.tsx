import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  getImageJobs,
  imageStatus,
  type ImageJob,
} from "@/lib/adminImageGeneration";
import { useStaffSession } from "./AdminSession";
export function AdminImageGeneration({
  orderNumber,
  petIndex,
}: {
  orderNumber: string;
  petIndex: number;
}) {
  const { staff } = useStaffSession();
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [error, setError] = useState("");
  const visible =
    staff?.permissions.includes("VIEW_CUSTOMER_PHOTOS") &&
    staff.permissions.includes("VIEW_PRODUCTION_FILES");
  const refresh = useCallback(async () => {
    if (!visible) return;
    try {
      setJobs(await getImageJobs(orderNumber, petIndex));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "이미지 생성 현황을 확인하지 못했습니다."
      );
    }
  }, [visible, orderNumber, petIndex]);
  useEffect(() => {
    setJobs([]);
    void refresh();
    const timer = setInterval(() => void refresh(), 10_000);
    return () => clearInterval(timer);
  }, [refresh]);
  if (!visible || (!jobs.length && !error)) return null;
  const latest = jobs.at(-1);
  return (
    <section
      aria-label="AI 4면도 생성"
      className="space-y-3 rounded-[15px] border bg-muted p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">
          AI 4면도 · {latest ? imageStatus[latest.status] : "상태 확인"}
        </h3>
        <span className="text-sm text-muted-foreground">
          생성 요청 {jobs.length}회
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {latest && (
        <>
          <p className="text-sm">
            {latest.petName} · 입금 확인 후 자동 생성 → 담당자 검수 → Tripo에서
            직접 모델링
          </p>
          <Link
            className="inline-flex rounded-md bg-primary/20 px-4 py-2 font-medium text-foreground"
            href={`/admin/image-review/${latest.id}`}
          >
            4면도 확인·검수·수정 요청
          </Link>
          {latest.status === "UNKNOWN" && (
            <p className="text-sm">
              API 결과가 불확실해 자동 재생성하지 않았습니다. 사용 내역 확인 후
              다시 요청해 주세요.
            </p>
          )}
        </>
      )}
    </section>
  );
}
