"use client"

import { useMemo } from "react"

import { EChart, eixoCategoria, eixoValor, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

export type SerieEmpilhada = { nome: string; valores: (number | null)[]; cor: number }

type Props = {
  categorias: string[]
  series: SerieEmpilhada[]
  formatar: (v: number) => string
  ariaLabel: string
  className?: string
  /** nota no tooltip para categorias específicas (ex.: ano sem dados) */
  nota?: (i: number) => string | null
}

/** Colunas empilhadas (parte do todo ao longo do tempo), com 2px de respiro entre os segmentos. */
export function StackedBarChart({ categorias, series, formatar, ariaLabel, className, nota }: Props) {
  const t = useChartTheme()
  const option = useMemo(() => {
    if (!t) return null
    const totais = categorias.map((_, i) => series.reduce((s, x) => s + (x.valores[i] ?? 0), 0))
    return {
      grid: { left: 8, right: 8, top: 24, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        ...estiloTooltip(t),
        axisPointer: { type: "shadow", shadowStyle: { color: `${t.axis}33` } },
        formatter: (p: { dataIndex: number }[]) => {
          const i = p[0].dataIndex
          const aviso = nota?.(i)
          if (aviso) return tituloTooltip(categorias[i]) + `<div style="max-width:220px;white-space:normal">${aviso}</div>`
          return (
            tituloTooltip(categorias[i]) +
            [...series].reverse().filter((s) => (s.valores[i] ?? 0) > 0).map((s) => linhaTooltip(t.series[s.cor], s.nome, formatar(s.valores[i] ?? 0))).join("") +
            `<div style="margin-top:4px;border-top:1px solid ${t.border};padding-top:4px">${linhaTooltip("transparent", "Total", formatar(totais[i]))}</div>`
          )
        },
      },
      xAxis: eixoCategoria(t, categorias),
      yAxis: { ...eixoValor(t, formatar), splitNumber: 4 },
      series: series.map((s, idx) => ({
        name: s.nome,
        type: "bar",
        stack: "total",
        barMaxWidth: 36,
        data: s.valores,
        itemStyle: {
          color: t.series[s.cor],
          borderColor: t.surface,
          borderWidth: 1,
          borderRadius: idx === series.length - 1 ? [4, 4, 0, 0] : 0,
        },
        label:
          idx === series.length - 1
            ? {
                show: true,
                position: "top",
                color: t.text,
                fontSize: 11,
                formatter: (p: { dataIndex: number }) => (totais[p.dataIndex] > 0 ? formatar(totais[p.dataIndex]) : ""),
              }
            : undefined,
      })),
    }
  }, [t, categorias, series, formatar, nota])

  if (!option) return <div className={className ?? "h-72"} />
  return <EChart option={option} ariaLabel={ariaLabel} className={className ?? "h-72"} />
}
