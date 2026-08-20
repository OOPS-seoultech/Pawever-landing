import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminError } from "@/components/AdminShell";
import { AdminApiError, adminSignIn, readAdminToken } from "@/lib/adminApi";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 이미 들어와 있으면 다시 로그인시킬 이유가 없다.
  useEffect(() => {
    if (readAdminToken()) {
      setLocation("/admin/orders", { replace: true });
    }
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [setLocation]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);
    try {
      await adminSignIn(email.trim(), password);
      setLocation("/admin/orders", { replace: true });
    } catch (caught) {
      const failure = caught as AdminApiError;
      setError(
        failure.code === "ADMIN_SIGN_IN_DISABLED"
          ? "관리자 로그인이 아직 열려 있지 않습니다. 서버 설정을 확인해 주세요."
          : // 아이디가 없는 것인지 비밀번호가 틀린 것인지 나누어 알리지 않는다.
            // 나누면 어떤 주소가 등록돼 있는지 밖에서 확인할 수 있다.
            "이메일 또는 비밀번호가 올바르지 않습니다."
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6"
      >
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">Pawever 관리자</h1>
          <p className="text-sm text-muted-foreground">
            굿즈 주문을 확인하고 상태를 관리합니다.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email">이메일</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-password">비밀번호</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? <AdminError message={error} /> : null}

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "확인 중..." : "로그인"}
        </Button>
      </form>
    </div>
  );
}
