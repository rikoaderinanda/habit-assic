"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

export type ReadingDatum = { label: string; tooltip: string; ayat: number };

const chartConfig = {
  ayat: { label: "Ayat", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Ayahs read per Tadarus session in the month (single series, so no legend). */
export function ReadingChart({ data }: { data: ReadingDatum[] }) {
  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
      <BarChart
        data={data}
        margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={40} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as ReadingDatum | undefined)?.tooltip ?? ""
              }
            />
          }
        />
        <Bar dataKey="ayat" fill="var(--color-ayat)" radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  );
}
