import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminError } from "@/components/AdminShell";
import { AdminApiError, adminAcceptInvite } from "@/lib/adminApi";

/** 서버가 요구하는 길이. 여기서 먼저 걸러 왕복을 줄인다. */
const MIN_PASSWORD_LENGTH = 12;

export default function AdminAcceptInvite() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // 초대 값은 주소에 담겨 온다. 상태로 옮겨 두고 주소에서는 지운다.
  const inviteToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);

    // 주소창과 방문 기록에 남으면 링크를 본 사람이 나중에도 쓸 수 있다.
    if (inviteToken && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin/accept-invite");
    }
    return () => {
      meta.remove();
    };
  }, [inviteToken]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`);
      return;
    }
    if (password !== confirm) {
      setError("두 비밀번호가 다릅니다.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await adminAcceptInvite(inviteToken, password);
      setDone(true);
    } catch (caught) {
      const failure = caught as AdminApiError;
      setError(
        failure.status === 400 || failure.status === 404
          ? "초대 링크가 만료됐거나 이미 사용됐습니다. 관리자에게 다시 요청해 주세요."
          : failure.message
      );
    } finally {
      setPending(false);
    }
  };

  if (done) {
    return (
      <Frame>
        <h1 className="text-lg font-semibold">비밀번호를 정했습니다</h1>
        <p className="text-sm text-muted-foreground">
          이제 로그인할 수 있습니다.
        </p>
        <Button className="w-full" onClick={() => setLocation("/admin")}>
          로그인하러 가기
        </Button>
      </Frame>
    );
  }

  if (!inviteToken) {
    return (
      <Frame>
        <h1 className="text-lg font-semibold">초대 링크가 필요합니다</h1>
        <AdminError message="주소에 초대 값이 없습니다. 받은 링크를 그대로 열어 주세요." />
      </Frame>
    );
  }

  return (
    <Frame>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">비밀번호 정하기</h1>
          <p className="text-sm text-muted-foreground">
            {MIN_PASSWORD_LENGTH}자 이상으로 정해 주세요.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-password">비밀번호</Label>
          <Input
            id="invite-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="invite-confirm">비밀번호 확인</Label>
          <Input
            id="invite-confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </div>

        {error ? <AdminError message={error} /> : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "저장 중..." : "비밀번호 저장"}
        </Button>
      </form>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6">
        {children}
      </div>
    </div>
  );
}
