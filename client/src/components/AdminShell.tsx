import { useEffect, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  clearAdminToken,
  readAdminRole,
  readAdminToken,
  type AdminRole,
} from "@/lib/adminApi";

/**
 * 관리자 화면 껍데기.
 *
 * 검색 로봇에게 색인하지 말라고 알린다. 로그인을 받는 화면이라 내용이 새지는
 * 않지만, 주소가 검색에 걸리면 문을 두드리는 사람이 늘어난다.
 */
const useNoIndex = () => {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow, noarchive";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);
};

export const useAdminGuard = () => {
  const [, setLocation] = useLocation();
  const token = readAdminToken();

  useEffect(() => {
    if (!token) {
      setLocation("/admin", { replace: true });
    }
  }, [token, setLocation]);

  return token ? readAdminRole() : null;
};

const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: "관리자",
  PRODUCTION: "제작팀",
};

type Props = {
  title: string;
  role: AdminRole | null;
  children: ReactNode;
  /** 목록으로 돌아가는 자리. 상세 화면에서만 쓴다. */
  backTo?: string;
};

export function AdminShell({ title, role, children, backTo }: Props) {
  const [, setLocation] = useLocation();
  useNoIndex();

  const signOut = () => {
    clearAdminToken();
    setLocation("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {backTo ? (
            <Link
              href={backTo}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← 목록
            </Link>
          ) : null}
          <h1 className="text-base font-semibold">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            {/* 제작팀에게는 담당자 관리가 403 이다. 보여 줄 이유가 없다. */}
            {role === "ADMIN" ? (
              <Link
                href="/admin/accounts"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                담당자
              </Link>
            ) : null}
            {role ? (
              <span className="text-xs text-muted-foreground">
                {ROLE_LABELS[role]}
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={signOut}>
              로그아웃
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

/**
 * 요청이 실패했을 때 보여 줄 문구.
 *
 * 다시 로그인해야 하는 경우는 화면을 옮기는 쪽에서 처리한다. 여기서는
 * 무슨 일이 있었는지만 알린다.
 */
export function AdminError({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}
