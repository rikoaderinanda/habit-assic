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

import type { WeekBucket } from "../lib/stats";

const chartConfig = {
  jamaah: { label: "Berjamaah", color: "var(--chart-1)" },
  sendiri: { label: "Sendiri", color: "var(--chart-2)" },
  missed: { label: "Belum isi", color: "var(--chart-3)" },
} satisfies ChartConfig;

/**
 * Stacked days per week. One axis (days, 0–7); a 2px surface stroke separates
 * stacked segments; legend always visible; hover tooltip per bar.
 */
export function WeeklyChart({ buckets }: { buckets: WeekBucket[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart
        data={buckets}
        margin={{ top: 8, right: 4, left: -24, bottom: 0 }}
        barCategoryGap="24%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis
          allowDecimals={false}
          domain={[0, 7]}
          ticks={[0, 7]}
          tickLine={false}
          axisLine={false}
          fontSize={12}
          width={40}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={<ChartTooltipContent labelFormatter={(label) => `Tanggal ${label}`} />}
        />
        <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
        <Bar
          dataKey="jamaah"
          stackId="days"
          fill="var(--color-jamaah)"
          stroke="var(--background)"
          strokeWidth={2}
        />
        <Bar
          dataKey="sendiri"
          stackId="days"
          fill="var(--color-sendiri)"
          stroke="var(--background)"
          strokeWidth={2}
        />
        <Bar
          dataKey="missed"
          stackId="days"
          fill="var(--color-missed)"
          stroke="var(--background)"
          strokeWidth={2}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}
