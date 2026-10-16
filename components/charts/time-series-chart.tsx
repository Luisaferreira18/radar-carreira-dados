"use client"

import { useMemo } from "react"

import { fmtMes, fmtMesLongo } from "@/lib/format"

import { EChart, eixoCategoria, eixoValor, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

export type Serie = { nome: string; valores: number[]; cor: number }

type Props = {
  meses: string[]
  series: Serie[]
  formatar: (v: number) => string
  formatarEixo?: (v: number) => string
  ariaLabel: string
  className?: string
  /** preenche a área sob a linha (só faz sentido com uma série) */
  area?: boolean
}

/** Evolução no tempo: linhas finas (2px), crosshair e tooltip com todas as séries do mês. */
export function TimeSeriesChart({ meses, series, formatar, formatarEixo, ariaLabel, className, area }: Props) {
  const t = useChartTheme()
  const option = useMemo(() => {
    if (!t) return null
    const poucos = meses.length <= 18
    return {
      grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        ...estiloTooltip(t),
        axisPointer: { type: "line", lineStyle: { color: t.axis, width: 1 } },
        formatter: (params: { dataIndex: number; seriesIndex: number; value: number }[]) => {
          const i = params[0]?.dataIndex ?? 0
          return (
            tituloTooltip(fmtMesLongo(meses[i])) +
            params
              .map((p) => {
                const s = series[p.seriesIndex]
                return linhaTooltip(t.series[s.cor], s.nome, Number.isFinite(p.value) ? formatar(p.value) : "—")
              })
              .join("")
          )
        },
      },
      xAxis: eixoCategoria(t, meses.map(fmtMes), {
        boundaryGap: false,
        axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true },
      }),
      yAxis: eixoValor(t, formatarEixo ?? formatar),
      series: series.map((s) => ({
        name: s.nome,
        type: "line",
        data: s.valores.map((v) => (Number.isFinite(v) ? v : null)),
        connectNulls: false,
        smooth: false,
        showSymbol: poucos,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 2, color: t.series[s.cor] },
        itemStyle: { color: t.series[s.cor], borderColor: t.surface, borderWidth: 2 },
        emphasis: { focus: "series", lineStyle: { width: 2.5 } },
        areaStyle: area
          ? {
              color: {
                type: "linear", x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                  { offset: 0, color: `${t.series[s.cor]}33` },
                  { offset: 1, color: `${t.series[s.cor]}00` },
                ],
              },
            }
          : undefined,
      })),
    }
  }, [t, meses, series, formatar, formatarEixo, area])

  if (!option) return <div className={className ?? "h-64"} />
  return <EChart option={option} ariaLabel={ariaLabel} className={className} />
}
