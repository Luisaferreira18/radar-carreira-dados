"use client"

import { useMemo } from "react"

import { fmtMes, fmtMesLongo } from "@/lib/format"

import { EChart, eixoCategoria, eixoValor, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

type Props = {
  meses: string[]
  valores: number[]
  rotulo: string
  formatar: (v: number) => string
  ariaLabel: string
  className?: string
}

/** Barras acima/abaixo de zero (ex.: saldo do mês). Azul = positivo, vermelho = negativo. */
export function DivergingBarChart({ meses, valores, rotulo, formatar, ariaLabel, className }: Props) {
  const t = useChartTheme()
  const option = useMemo(() => {
    if (!t) return null
    const positivo = t.series[0]
    const negativo = t.deltaDown
    return {
      grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        ...estiloTooltip(t),
        axisPointer: { type: "shadow", shadowStyle: { color: `${t.axis}33` } },
        formatter: (p: { dataIndex: number; value: number }[]) => {
          const v = p[0].value
          return tituloTooltip(fmtMesLongo(meses[p[0].dataIndex])) + linhaTooltip(v >= 0 ? positivo : negativo, rotulo, formatar(v))
        },
      },
      xAxis: eixoCategoria(t, meses.map(fmtMes), { axisLabel: { color: t.muted, fontSize: 11, hideOverlap: true } }),
      yAxis: { ...eixoValor(t, formatar), splitNumber: 2 },
      series: [
        {
          type: "bar",
          barMaxWidth: 14,
          data: valores.map((v) => ({
            value: v,
            itemStyle: { color: v >= 0 ? positivo : negativo, borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3] },
          })),
        },
      ],
    }
  }, [t, meses, valores, rotulo, formatar])

  if (!option) return <div className={className ?? "h-28"} />
  return <EChart option={option} ariaLabel={ariaLabel} className={className ?? "h-28"} />
}
