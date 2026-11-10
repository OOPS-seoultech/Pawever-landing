import { useEffect, useState } from "react";
import { AdminShell, useAdminGuard, AdminError } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/adminApi";
type Status = {
  enabled: boolean;
  keyConfigured: boolean;
  model: string;
  connection: boolean;
  webhooks: Record<string, string>;
};
export default function AdminTelegram() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [connected, setConnected] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const owner = staff?.permissions.includes("MANAGE_OPERATION_SETTINGS");
  useEffect(() => {
    if (!role) return;
    const refresh = () =>
      void adminRequest<{ connected: boolean }>("/api/admin/telegram/link")
        .then(s => {
          setConnected(s.connected);
          if (s.connected) setLink("");
        })
        .catch(e => setError(e.message));
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [role]);
  useEffect(() => {
    if (owner)
      void adminRequest<Status>("/api/admin/image-generation/status")
        .then(setStatus)
        .catch(e => setError(e.message));
  }, [owner]);
  const connect = async () => {
    setPending(true);
    setError("");
    try {
      const result = await adminRequest<{ url: string }>(
        "/api/admin/telegram/link",
        { method: "POST" }
      );
      setLink(result.url);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "연결 링크를 만들지 못했습니다."
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <AdminShell title="텔레그램 연결" role={role}>
      <div className="max-w-2xl space-y-5">
        {error && <AdminError message={error} />}
        <section className="space-y-4 rounded-[15px] border bg-muted p-5">
          <h2 className="font-semibold">내 관리자 계정 ↔ 내 텔레그램 계정</h2>
          <p>
            한 번 연결하면 기존 주문방의 입금 확인 버튼과 검수방의 이미지 승인
            버튼을 모바일에서 사용할 수 있습니다. 사이트에서 받은 권한이 그대로
            적용됩니다.
          </p>
          <p role="status">
            {connected ? "연결 완료" : "아직 연결하지 않았습니다."}
          </p>
          {!connected && (
            <Button disabled={pending} onClick={() => void connect()}>
              연결 링크 만들기
            </Button>
          )}
          {link && (
            <div className="space-y-3 rounded-md border bg-background p-4">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-md bg-primary/20 px-4 py-2 font-semibold"
              >
                텔레그램에서 연결하기
              </a>
              <p className="text-sm">
                10분 안에 봇 대화에서 ‘시작’을 눌러 주세요. 링크는 본인만
                사용하고 다른 사람에게 전달하지 마세요.
              </p>
            </div>
          )}
          {connected && (
            <Button
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    "이 계정의 텔레그램 버튼 사용 연결을 해제할까요?"
                  )
                )
                  void adminRequest("/api/admin/telegram/link", {
                    method: "DELETE",
                  })
                    .then(() => setConnected(false))
                    .catch(e => setError(e.message));
              }}
            >
              내 텔레그램 연결 해제
            </Button>
          )}
        </section>
        {owner && status && (
          <section className="space-y-3 rounded-[15px] border bg-muted p-5">
            <h2 className="font-semibold">이미지 API · 웹훅 설정</h2>
            <p>
              자동 생성:{" "}
              {status.enabled && status.keyConfigured ? "설정됨" : "미설정"} ·
              모델: {status.model}
            </p>
            <p>
              주문방 웹훅: {status.webhooks.payment ?? "미연결"} · 검수방 웹훅:{" "}
              {status.webhooks.review ?? "미연결"}
            </p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void adminRequest<Status>(
                  "/api/admin/image-generation/status?probe=true"
                )
                  .then(s => {
                    setStatus(s);
                    if (!s.connection)
                      setError(
                        "API 키의 모델 접근 권한·결제 설정을 확인해 주세요."
                      );
                    else setError("");
                  })
                  .catch(e => setError(e.message))
                  .finally(() => setPending(false));
              }}
            >
              API 연결 확인 · 이미지 생성 비용 없음
            </Button>
            {status.connection && <p role="status">API 모델 접근 확인 완료</p>}
          </section>
        )}
      </div>
    </AdminShell>
  );
}
