import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminError, AdminShell, useAdminGuard } from "@/components/AdminShell";
import {
  AdminApiError,
  disableAdminAccount,
  inviteAdminAccount,
  listAdminAccounts,
  approveAdminAccount,
  reinviteAdminAccount,
  type AdminAccount,
  type AdminRole,
} from "@/lib/adminApi";
import { formatDateTime } from "@/lib/adminFormat";
import { AdminWorkSettings } from "./AdminWorkSettings";
import { useStaffSession } from "@/components/AdminSession";

const WORK_ROLES = [
  ["MODELING", "모델링 결과물 등록"],
  ["DESIGN_QC", "모델 검수·색상·플레이트"],
  ["PRINT_FINISHING", "출력·후가공"],
  ["PACKING_SHIPPING", "포장·배송"],
] as const;

const ROLE_LABELS: Record<AdminRole, string> = {
  OWNER: "소유자",
  MARKETING: "마케팅",
  SUPPORT: "고객 지원",
  ADMIN: "관리자",
  PRODUCTION: "제작팀",
};

const STATUS_LABELS: Record<AdminAccount["status"], string> = {
  INVITED: "초대함",
  PENDING_APPROVAL: "승인 대기",
  ACTIVE: "사용 중",
  DISABLED: "사용 정지",
};

export default function AdminAccounts() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [approvalRoles, setApprovalRoles] = useState<Record<number, string[]>>(
    {}
  );
  const [settingsRevision, setSettingsRevision] = useState(0);
  const [, setLocation] = useLocation();

  const [accounts, setAccounts] = useState<AdminAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  /**
   * 초대 링크는 지금 한 번만 볼 수 있다.
   *
   * 서버는 해시만 남긴다. 이 화면을 벗어나면 다시 볼 방법이 없고, 다시
   * 초대하는 수밖에 없다.
   */
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const handle = useCallback(
    (caught: unknown) => {
      const failure = caught as AdminApiError;
      if (failure.needsSignIn) {
        setLocation("/admin", { replace: true });
        return;
      }
      setError(
        failure.status === 403
          ? "담당자 관리는 소유자 권한이 필요합니다."
          : failure.message
      );
    },
    [setLocation]
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setAccounts(await listAdminAccounts());
    } catch (caught) {
      handle(caught);
    }
  }, [handle]);

  useEffect(() => {
    if (role) void load();
  }, [role, load]);

  const linkFor = (token: string) =>
    `${window.location.origin}/admin/accept-invite?token=${encodeURIComponent(token)}`;

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const { inviteToken } = await inviteAdminAccount(
        email.trim(),
        name.trim(),
        "PRODUCTION"
      );
      setInviteLink(linkFor(inviteToken));
      setEmail("");
      setName("");
      await load();
    } catch (caught) {
      handle(caught);
    } finally {
      setPending(false);
    }
  };

  return (
    <AdminShell title="담당자" role={role} backTo="/admin/orders">
      <p className="mb-4 text-sm text-muted-foreground">
        초대 링크 전달 → 직원이 비밀번호 설정 → 작업 역할을 지정하고 승인 → 기본
        담당자 설정 순서로 진행해 주세요.
      </p>
      <AdminWorkSettings key={settingsRevision} />
      {error ? <AdminError message={error} /> : null}

      <form
        onSubmit={invite}
        className="mb-5 rounded-lg border bg-background p-4"
      >
        <h2 className="mb-3 text-sm font-semibold">담당자 초대</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="email"
            required
            value={email}
            onChange={event => setEmail(event.target.value)}
            placeholder="이메일"
            className="max-w-xs"
          />
          <Input
            required
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="이름"
            className="max-w-[10rem]"
            maxLength={50}
          />
          <p className="text-sm text-muted-foreground">
            작업자 계정으로 초대합니다. 가입 후 승인할 때 작업 역할을
            지정합니다.
          </p>
          <Button type="submit" size="sm" disabled={pending}>
            초대
          </Button>
        </div>

        {inviteLink ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs text-amber-900">
              아래 링크를 본인에게 직접 전달해 주세요.{" "}
              <strong>이 화면을 벗어나면 다시 볼 수 없습니다.</strong>
            </p>
            <code className="mt-2 block break-all rounded bg-background px-2 py-1 text-xs">
              {inviteLink}
            </code>
          </div>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">이름</th>
              <th className="px-3 py-2 font-medium">이메일</th>
              <th className="px-3 py-2 font-medium">역할</th>
              <th className="px-3 py-2 font-medium">상태</th>
              <th className="px-3 py-2 font-medium">최근 로그인</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {accounts?.map(account => (
              <tr key={account.id} className="border-b last:border-0">
                <td className="px-3 py-2">{account.name}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {account.email}
                </td>
                <td className="px-3 py-2">
                  {ROLE_LABELS[account.role]}
                  <div className="text-xs text-muted-foreground">
                    {WORK_ROLES.filter(([r]) => account.workRoles?.includes(r))
                      .map(([, label]) => label)
                      .join(" · ")}
                  </div>
                </td>
                <td className="px-3 py-2">{STATUS_LABELS[account.status]}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDateTime(account.lastLoginAt)}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {/* 가입만으로 권한이 생기지 않는다. 대표가 여기서
                        권한을 줘야 쓸 수 있다. */}
                    {account.status === "PENDING_APPROVAL" ? (
                      <div className="space-y-2 text-left">
                        {WORK_ROLES.map(([value, label]) => (
                          <label
                            key={value}
                            className="flex items-center gap-2 text-xs"
                          >
                            <input
                              type="checkbox"
                              disabled={pending}
                              checked={(
                                approvalRoles[account.id] ??
                                account.workRoles ??
                                []
                              ).includes(value)}
                              onChange={event => {
                                const current =
                                  approvalRoles[account.id] ??
                                  account.workRoles ??
                                  [];
                                setApprovalRoles(previous => ({
                                  ...previous,
                                  [account.id]: event.target.checked
                                    ? [...current, value]
                                    : current.filter(r => r !== value),
                                }));
                              }}
                            />
                            {label}
                          </label>
                        ))}
                        <Button
                          variant="default"
                          size="sm"
                          disabled={
                            pending ||
                            !(
                              approvalRoles[account.id] ??
                              account.workRoles ??
                              []
                            ).length
                          }
                          onClick={async () => {
                            setPending(true);
                            try {
                              await approveAdminAccount(
                                account.id,
                                approvalRoles[account.id] ??
                                  account.workRoles ??
                                  []
                              );
                              await load();
                              setSettingsRevision(value => value + 1);
                            } catch (caught) {
                              handle(caught);
                            } finally {
                              setPending(false);
                            }
                          }}
                        >
                          역할 지정 후 승인
                        </Button>
                      </div>
                    ) : null}
                    {/* 비밀번호를 이미 정한 계정에 다시 보내면 그
                        비밀번호가 지워진다. 서버도 막지만 누를 수
                        있게 두면 누른다. */}
                    {account.status === "INVITED" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `${account.name} 님의 초대 링크를 다시 만들까요? 기존 링크는 사용할 수 없게 됩니다.`
                            )
                          )
                            return;
                          setPending(true);
                          try {
                            const { inviteToken } = await reinviteAdminAccount(
                              account.id
                            );
                            setInviteLink(linkFor(inviteToken));
                          } catch (caught) {
                            handle(caught);
                          } finally {
                            setPending(false);
                          }
                        }}
                      >
                        재초대
                      </Button>
                    ) : null}
                    {account.status !== "DISABLED" &&
                    account.id !== staff?.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `${account.name} (${account.email}) 계정의 사용을 정지할까요? 이후 로그인과 작업을 할 수 없습니다.`
                            )
                          )
                            return;
                          setPending(true);
                          try {
                            await disableAdminAccount(account.id);
                            await load();
                          } catch (caught) {
                            handle(caught);
                          } finally {
                            setPending(false);
                          }
                        }}
                      >
                        사용 정지
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {accounts?.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  담당자가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
