import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { adminRequest, AdminApiError } from "@/lib/adminApi";
import { workflowCommand } from "@/lib/adminContracts";
import type { AdminNotice } from "@/lib/adminNotices";
import { useStaffSession } from "./AdminSession";
import { AdminNoticeBody } from "./AdminNoticeBody";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
export function AdminFirstVisit() {
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const key = useRef(crypto.randomUUID());
  const busy = useRef(false);
  useEffect(() => {
    let live = true;
    setNotice(null);
    setError("");
    if (!staff) return;
    adminRequest<{ notice: AdminNotice | null }>(
      "/api/admin/notices/onboarding"
    )
      .then(value => {
        if (live && value.notice?.id) setNotice(value.notice);
      })
      .catch(() => {
        if (live)
          setError(
            "첫 접속 안내를 불러오지 못했습니다. 공지사항에서 폴더 연결 안내를 확인해 주세요."
          );
      });
    return () => {
      live = false;
    };
  }, [staff?.id]);
  const decide = async (go: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await workflowCommand(
        "/api/admin/notices/onboarding",
        { decision: go ? "OPENED" : "DEFERRED" },
        key.current
      );
      setNotice(null);
      if (go) navigate("/admin/local-files");
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        key.current = crypto.randomUUID();
      setError(
        e instanceof Error
          ? e.message
          : "선택을 저장하지 못했습니다. 다시 시도해 주세요."
      );
    } finally {
      setPending(false);
      busy.current = false;
    }
  };
  return (
    <>
      {error && !notice && (
        <p role="alert" className="mx-auto max-w-6xl p-3 text-sm">
          {error}{" "}
          <Link href="/admin/notices" className="underline">
            공지사항
          </Link>
        </p>
      )}
      <Dialog open={!!notice} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          onEscapeKeyDown={e => e.preventDefault()}
          onInteractOutside={e => e.preventDefault()}
          className="flex max-h-[85dvh] flex-col sm:max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle>{notice?.title ?? "작업 폴더 연결 안내"}</DialogTitle>
            <DialogDescription>
              처음 한 번 표시하는 안내입니다. 언제든 공지사항에서 다시 확인할 수
              있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-2">
            {notice && <AdminNoticeBody body={notice.body ?? ""} />}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => void decide(false)}
            >
              다음에 하기
            </Button>
            <Button disabled={pending} onClick={() => void decide(true)}>
              바로 가기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
