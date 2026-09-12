import { useCallback, useEffect, useState } from "react";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getDefaults,
  getStaffAccounts,
  workflowCommand,
  type Defaults,
  type StaffAccount,
} from "@/lib/adminContracts";
import type { AdminRole } from "@/lib/adminApi";

export function AdminWorkSettings() {
  const { staff } = useStaffSession();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState("");
  const [role, setRole] = useState<AdminRole>("PRODUCTION");
  const [workRoles, setWorkRoles] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const canSettings = Boolean(
    staff?.permissions.includes("MANAGE_OPERATION_SETTINGS")
  );
  const canAccounts = Boolean(staff?.permissions.includes("MANAGE_ACCOUNTS"));
  const load = useCallback(async () => {
    setAccounts(await getStaffAccounts());
    if (canSettings) setDefaults(await getDefaults());
  }, [canSettings]);
  useEffect(() => {
    if (canAccounts) void load().catch(e => setError(e.message));
  }, [load, canAccounts]);
  if (!canAccounts) return null;
  const run = async (action: () => Promise<unknown>, message: string) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
      setNotice(message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장하지 못했습니다.");
      await load().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const target = accounts.find(a => a.id === Number(selected));
  return (
    <section className="mb-6 space-y-4 rounded-lg border bg-background p-4">
      <h2 className="font-semibold">작업 역할·기본 담당자</h2>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        초대한 담당자가 가입한 뒤 작업 역할을 지정하고, 새 작업을 받을 기본
        담당자로 선택해 주세요. 기존 작업은 주문에서 별도로 재배정합니다.
      </p>
      <fieldset disabled={busy} className="space-y-3">
        <legend className="text-sm font-medium">작업 역할 지정</legend>
        <label className="block text-sm">
          계정
          <select
            className="mt-1 block w-full rounded border bg-background p-2"
            value={selected}
            onChange={e => {
              setSelected(e.target.value);
              const a = accounts.find(
                item => item.id === Number(e.target.value)
              );
              if (a) {
                setRole(a.role);
                setWorkRoles(a.workRoles);
              }
            }}
          >
            <option value="">변경할 계정 선택</option>
            {accounts
              .filter(
                a =>
                  a.id !== staff?.id &&
                  (staff?.role === "OWNER" || a.role !== "OWNER")
              )
              .map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ·{" "}
                  {a.status === "ACTIVE"
                    ? "사용 중"
                    : a.status === "INVITED"
                      ? "초대함"
                      : "사용 정지"}
                </option>
              ))}
          </select>
        </label>
        {target && (
          <>
            <label className="block text-sm">
              기본 역할
              <select
                className="mt-1 block w-full rounded border bg-background p-2"
                value={role}
                onChange={e => setRole(e.target.value as AdminRole)}
              >
                {(staff?.role === "OWNER"
                  ? ["OWNER", "ADMIN", "PRODUCTION", "MARKETING", "SUPPORT"]
                  : ["ADMIN", "PRODUCTION", "MARKETING", "SUPPORT"]
                ).map(r => (
                  <option key={r} value={r}>
                    {
                      (
                        {
                          OWNER: "소유자",
                          ADMIN: "관리자",
                          PRODUCTION: "제작팀",
                          MARKETING: "마케팅",
                          SUPPORT: "고객 지원",
                        } as Record<string, string>
                      )[r]
                    }
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                ["MODELING", "모델링"],
                ["DESIGN_QC", "모델 검수"],
                ["PRINT_FINISHING", "출력·후가공"],
              ].map(([r, label]) => (
                <label className="flex items-center gap-2 text-sm" key={r}>
                  <input
                    type="checkbox"
                    checked={workRoles.includes(r)}
                    onChange={e =>
                      setWorkRoles(
                        e.target.checked
                          ? [...workRoles, r]
                          : workRoles.filter(x => x !== r)
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <label className="block text-sm">
              변경 사유
              <Input
                maxLength={300}
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </label>
            <Button
              size="sm"
              disabled={!reason.trim()}
              onClick={() =>
                void run(
                  () =>
                    workflowCommand(
                      `/api/admin/workflow/staff/${target.id}/roles`,
                      { version: target.version, role, workRoles, reason },
                      crypto.randomUUID(),
                      "PATCH"
                    ),
                  "작업 역할을 저장했습니다."
                )
              }
            >
              작업 역할 저장
            </Button>
          </>
        )}
      </fieldset>
      {canSettings && defaults && (
        <fieldset disabled={busy} className="space-y-3 border-t pt-4">
          <legend className="pt-3 text-sm font-medium">기본 담당자</legend>
          {(
            [
              ["modeling", "MODELING", "모델링 기본 담당자"],
              ["review", "DESIGN_QC", "검수 기본 담당자"],
              ["printing", "PRINT_FINISHING", "출력 기본 담당자"],
            ] as const
          ).map(([field, workRole, label]) => (
            <label className="block text-sm" key={field}>
              {label}
              <select
                className="mt-1 block w-full rounded border bg-background p-2"
                value={defaults[field] ?? ""}
                onChange={e =>
                  setDefaults({
                    ...defaults,
                    [field]: e.target.value ? Number(e.target.value) : null,
                  })
                }
              >
                <option value="">미지정 (관리자가 건별 배정)</option>
                {accounts
                  .filter(
                    a => a.status === "ACTIVE" && a.workRoles.includes(workRole)
                  )
                  .map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <Button
            size="sm"
            onClick={() =>
              void run(
                () =>
                  workflowCommand(
                    "/api/admin/workflow/default-assignees",
                    defaults,
                    crypto.randomUUID(),
                    "PATCH"
                  ),
                "새 작업에 적용할 기본 담당자를 저장했습니다."
              )
            }
          >
            기본 담당자 저장
          </Button>
        </fieldset>
      )}
    </section>
  );
}
