import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { adminRequest } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import { formatKrw } from "@/lib/adminFormat";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

type Sales = {
  totalKrw: number;
  monthKrw: number;
  currentMonth: string;
  paidOrderCount: number;
  months: { month: string; amountKrw: number }[];
};
export default function AdminSalesSummary({ revision }: { revision: number }) {
  const [sales, setSales] = useState<Sales | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    adminRequest<Sales>("/api/admin/workflow/sales-summary", {
      signal: controller.signal,
    })
      .then(setSales)
      .catch(e => {
        if (e instanceof Error && e.name === "AbortError") return;
        setSales(null);
        setError(
          e instanceof Error ? e.message : "매출을 불러오지 못했습니다."
        );
      });
    return () => controller.abort();
  }, [revision]);
  return (
    <section
      aria-label="판매가 기준 매출"
      className="mb-4 flex shrink-0 flex-col gap-3"
    >
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : !sales ? (
        <p role="status">매출 조회 중…</p>
      ) : (
        <>
          <Collapsible open={open} onOpenChange={setOpen}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">매출 요약</h2>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm">
                  매출 그래프 {open ? "접기" : "펼치기"}
                </Button>
              </CollapsibleTrigger>
            </div>
            <div
              className={cn(
                "grid items-start gap-3",
                open && "lg:grid-cols-[minmax(340px,2fr)_minmax(0,3fr)]"
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="gap-2 py-4">
                  <CardHeader className="px-4">
                    <CardDescription>누적 매출</CardDescription>
                    <CardTitle>{formatKrw(sales.totalKrw)}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-xs text-muted-foreground">
                    입금 확인 {sales.paidOrderCount}건 · 전체 기간
                  </CardContent>
                </Card>
                <Card className="gap-2 py-4">
                  <CardHeader className="px-4">
                    <CardDescription>이번 달 매출</CardDescription>
                    <CardTitle>{formatKrw(sales.monthKrw)}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 text-xs text-muted-foreground">
                    {sales.currentMonth} · 한국 시간 입금 확인일 기준
                  </CardContent>
                </Card>
              </div>
              <CollapsibleContent className="min-w-0">
                <ChartContainer
                  config={{
                    amountKrw: { label: "매출", color: "var(--chart-1)" },
                  }}
                  className="aspect-auto h-32 w-full"
                  aria-label="최근 12개월 매출 그래프"
                >
                  <BarChart
                    accessibilityLayer
                    data={sales.months}
                    margin={{ top: 5, right: 5, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={value => String(value).slice(2)}
                      minTickGap={12}
                    />
                    <YAxis
                      width={52}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={value =>
                        value >= 10000 ? `${value / 10000}만` : String(value)
                      }
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={value => formatKrw(Number(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="amountKrw"
                      fill="var(--color-amountKrw)"
                      radius={3}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ChartContainer>
                <details className="mt-2 text-xs">
                  <summary className="cursor-pointer">
                    월별 금액 표로 보기
                  </summary>
                  <table className="mt-2 w-full">
                    <caption className="sr-only">
                      최근 12개월 관리용 매출
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col" className="text-left">
                          월
                        </th>
                        <th scope="col" className="text-right">
                          매출
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.months.map(item => (
                        <tr key={item.month}>
                          <th scope="row" className="text-left font-normal">
                            {item.month}
                          </th>
                          <td className="text-right">
                            {formatKrw(item.amountKrw)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </CollapsibleContent>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              관리용 판매가 합계 · 배송비 제외 · 무료·미입금·취소·환불 제외.
              실제 입금액 합계와 다를 수 있습니다.
            </p>
          </Collapsible>
        </>
      )}
    </section>
  );
}
