import { useCallback, useEffect, useState } from "react";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { Button } from "@/components/ui/button";
import { adminRequest } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/adminFormat";

type AsCase = {
  id: number;
  orderNumber: string;
  reason: string;
  expiresAt: string;
  assets: { id: string; type: string }[];
};

/** 담당자는 OWNER가 열어 둔 사건의 선택 자료만 잠깐 요청한다. */
export default function AdminAsAssets() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [cases, setCases] = useState<AsCase[]>([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (staff?.role !== "PRODUCTION") return;
    try {
      setCases(await adminRequest<AsCase[]>("/api/production/as-cases"));
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "AS 자료를 불러오지 못했습니다."
      );
    }
  }, [staff?.role]);
  useEffect(() => {
    void load();
  }, [load]);
  const open = async (asCase: AsCase, assetId: string) => {
    try {
      const link = await adminRequest<{ url: string }>(
        `/api/production/as-cases/${asCase.id}/assets/${encodeURIComponent(assetId)}`
      );
      window.open(link.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AS 자료를 열지 못했습니다.");
    }
  };
  if (staff?.role !== "PRODUCTION") return null;
  return (
    <AdminShell title="AS 열람 자료" role={role}>
      <div className="space-y-3">
        <div className="flex gap-3">
          <p className="text-sm text-muted-foreground">
            OWNER가 선택한 자료만 표시됩니다. 만료 또는 회수되면 즉시 다시 열 수
            없습니다.
          </p>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            새로고침
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {cases.map(asCase => (
          <section
            key={asCase.id}
            className="space-y-2 rounded border p-3 text-sm"
          >
            <p className="font-medium">
              {asCase.orderNumber} · {asCase.reason}
            </p>
            <p className="text-muted-foreground">
              {formatDateTime(asCase.expiresAt)}까지
            </p>
            <div className="flex flex-wrap gap-2">
              {asCase.assets.map(asset => (
                <Button
                  key={`${asset.type}:${asset.id}`}
                  size="sm"
                  variant="outline"
                  onClick={() => void open(asCase, asset.id)}
                >
                  {asset.type === "CUSTOMER_PHOTO" ? "고객 사진" : "제작 자료"}{" "}
                  열기
                </Button>
              ))}
            </div>
          </section>
        ))}
        {!cases.length && (
          <p className="text-sm text-muted-foreground">
            현재 열람 가능한 AS 자료가 없습니다.
          </p>
        )}
      </div>
    </AdminShell>
  );
}
