"use client"

import { useMemo } from "react"

import { fmtEixoMoeda, fmtInt } from "@/lib/format"

import { EChart, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

export type ItemFaixa = { nome: string; p25: number; mediana: number; p75: number; n: number; cor: number }

type Props = {
  itens: ItemFaixa[]
  formatar: (v: number) => string
  ariaLabel: string
}

/**
 * Faixa salarial por categoria: barra fina do 1º ao 3º quartil (metade central
 * dos salários) e um ponto na mediana. Comparação entre categorias num só eixo.
 */
export function RangeChart({ itens, formatar, ariaLabel }: Props) {
  const t = useChartTheme()
  const altura = Math.max(150, itens.length * 38 + 44)
  const option = useMemo(() => {
    if (!t) return null
    const inv = [...itens].reverse()
    const tooltip = (i: number) => {
      const x = inv[i]
      return (
        tituloTooltip(x.nome) +
        linhaTooltip(t.series[x.cor], "Mediana", formatar(x.mediana)) +
        linhaTooltip("transparent", "25% ganham até", formatar(x.p25)) +
        linhaTooltip("transparent", "75% ganham até", formatar(x.p75)) +
        `<div style="margin-top:4px;opacity:.75">${fmtInt(x.n)} contratações com salário válido</div>`
      )
    }
    return {
      grid: { left: 8, right: 72, top: 8, bottom: 24, containLabel: true },
      tooltip: { trigger: "item", ...estiloTooltip(t), formatter: (p: { dataIndex: number }) => tooltip(p.dataIndex) },
      xAxis: {
        type: "value",
        axisLabel: { color: t.muted, fontSize: 11, formatter: fmtEixoMoeda, hideOverlap: true },
        splitLine: { lineStyle: { color: t.grid } },
        splitNumber: 4,
        min: 0,
      },
      yAxis: {
        type: "category",
        data: inv.map((x) => x.nome),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: t.text, fontSize: 12, width: 190, overflow: "truncate" },
      },
      series: [
        // base invisível até o 1º quartil
        { type: "bar", stack: "faixa", silent: true, barWidth: 10, itemStyle: { color: "transparent" }, data: inv.map((x) => x.p25) },
        {
          type: "bar",
          stack: "faixa",
          barWidth: 10,
          data: inv.map((x) => ({ value: x.p75 - x.p25, itemStyle: { color: `${t.series[x.cor]}66`, borderRadius: 5 } })),
          // rótulo da mediana depois da ponta da faixa, para não cobrir a barra
          label: {
            show: true,
            position: "right",
            distance: 8,
            color: t.text,
            fontSize: 11,
            fontWeight: 600,
            formatter: (p: { dataIndex: number }) => formatar(inv[p.dataIndex].mediana),
          },
        },
        {
          type: "scatter",
          symbolSize: 12,
          data: inv.map((x) => ({ value: x.mediana, itemStyle: { color: t.series[x.cor], borderColor: t.surface, borderWidth: 2 } })),
          z: 3,
        },
      ],
    }
  }, [t, itens, formatar])

  if (!option) return <div style={{ height: altura }} />
  return (
    <div style={{ height: altura }}>
      <EChart option={option} ariaLabel={ariaLabel} className="h-full" />
    </div>
  )
}
