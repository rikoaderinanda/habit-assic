"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type TrendDatum = {
  label: string;
  tooltip: string;
  jamaah: number;
  sendiri: number;
  missed: number;
};

const chartConfig = {
  jamaah: { label: "Berjamaah", color: "var(--chart-1)" },
  sendiri: { label: "Sendiri", color: "var(--chart-2)" },
  missed: { label: "Belum input", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Members per day by status (stacked), last 14 days. Same series order/colors as the member charts. */
export function DailyTrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-64 w-full lg:h-auto lg:min-h-64 lg:flex-1"
    >
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        barCategoryGap="18%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          interval="preserveStartEnd"
        />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={40} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as TrendDatum | undefined)?.tooltip ?? ""
              }
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        <Bar
          dataKey="jamaah"
          stackId="d"
          fill="var(--color-jamaah)"
          stroke="var(--background)"
          strokeWidth={2}
        />
        <Bar
          dataKey="sendiri"
          stackId="d"
          fill="var(--color-sendiri)"
          stroke="var(--background)"
          strokeWidth={2}
        />
        <Bar
          dataKey="missed"
          stackId="d"
          fill="var(--color-missed)"
          stroke="var(--background)"
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
