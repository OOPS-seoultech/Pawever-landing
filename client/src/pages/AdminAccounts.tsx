import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
  const [inviteRoles, setInviteRoles] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminAccount | null>(null);

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

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await inviteAdminAccount(
        email.trim(),
        name.trim(),
        "PRODUCTION",
        inviteRoles
      );
      setNotice(
        "초대 메일을 발송했습니다. 받은 사람이 비밀번호를 설정하면 로그인할 수 있습니다."
      );
      setEmail("");
      setName("");
      setInviteRoles([]);
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
        작업 역할 선택 → 초대 메일 발송 → 본인이 비밀번호 설정 → 로그인
        순서입니다. 비밀번호는 관리자에게 공개되지 않습니다.
      </p>
      <AdminWorkSettings key={settingsRevision} />
      {error ? <AdminError message={error} /> : null}
      {notice ? (
        <p role="status" className="mb-4 text-sm">
          {notice}
        </p>
      ) : null}

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
            초대할 사람이 맡을 작업 역할을 선택해 주세요. 선택하지 않으면 제작
            권한 없이 가입합니다.
          </p>
          <Button type="submit" size="sm" disabled={pending}>
            초대
          </Button>
        </div>

        <fieldset className="mt-3 flex flex-wrap gap-4" disabled={pending}>
          <legend className="mb-2 text-sm">초대할 담당자의 작업 역할</legend>
          {WORK_ROLES.map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inviteRoles.includes(value)}
                onChange={event =>
                  setInviteRoles(current =>
                    event.target.checked
                      ? [...current, value]
                      : current.filter(role => role !== value)
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
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
                            await reinviteAdminAccount(account.id);
                            setNotice(
                              `${account.email}로 초대 메일을 다시 보냈습니다.`
                            );
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
                    {account.role !== "OWNER" && account.id !== staff?.id ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={pending}
                        aria-label={`${account.name} 계정 삭제`}
                        title="계정 삭제 및 모든 권한 회수"
                        onClick={() => setDeleteTarget(account)}
                      >
                        <X />
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
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={open => {
          if (!open && !pending) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>담당자 계정을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} ({deleteTarget?.email})의 모든 접근 권한과
              로그인 정보가 삭제됩니다. 이미 로그인한 기기에서도 더는 사용할 수
              없습니다. 과거 작업·정산 기록은 보존됩니다. 다시 사용하려면
              관리자가 새로 초대해야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={async () => {
                if (!deleteTarget) return;
                setPending(true);
                try {
                  await disableAdminAccount(deleteTarget.id);
                  setDeleteTarget(null);
                  setNotice("계정을 삭제하고 모든 접근 권한을 회수했습니다.");
                  await load();
                  setSettingsRevision(value => value + 1);
                } catch (caught) {
                  handle(caught);
                } finally {
                  setPending(false);
                }
              }}
            >
              {pending ? "삭제 중..." : "계정 삭제"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}
