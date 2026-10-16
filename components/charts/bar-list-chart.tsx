"use client"

import { useMemo } from "react"

import { EChart, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

export type ItemBarra = { nome: string; valor: number; detalhe?: string }

type Props = {
  itens: ItemBarra[]
  formatar: (v: number) => string
  rotuloValor: string
  ariaLabel: string
  /** índice da cor categórica (0 = azul) */
  cor?: number
  onClickItem?: (indice: number) => void
}

/** Ranking horizontal (top N): uma cor, rótulo do valor na ponta de cada barra. */
export function BarListChart({ itens, formatar, rotuloValor, ariaLabel, cor = 0, onClickItem }: Props) {
  const t = useChartTheme()
  const altura = Math.max(120, itens.length * 30 + 16)
  const option = useMemo(() => {
    if (!t) return null
    const invertido = [...itens].reverse() // ECharts desenha de baixo para cima
    return {
      grid: { left: 8, right: 56, top: 4, bottom: 4, containLabel: true },
      tooltip: {
        trigger: "item",
        ...estiloTooltip(t),
        formatter: (p: { dataIndex: number }) => {
          const item = invertido[p.dataIndex]
          return tituloTooltip(item.nome) + linhaTooltip(t.series[cor], rotuloValor, formatar(item.valor)) + (item.detalhe ? `<div style="margin-top:4px;opacity:.75">${item.detalhe}</div>` : "")
        },
      },
      xAxis: { type: "value", show: false, max: (v: { max: number }) => v.max * 1.02 },
      yAxis: {
        type: "category",
        data: invertido.map((i) => i.nome),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: t.text,
          fontSize: 12,
          width: 190,
          overflow: "truncate",
        },
      },
      series: [
        {
          type: "bar",
          barWidth: 14,
          data: invertido.map((i) => i.valor),
          itemStyle: { color: t.series[cor], borderRadius: [0, 4, 4, 0] },
          emphasis: { itemStyle: { color: t.series[cor], opacity: 0.85 } },
          label: {
            show: true,
            position: "right",
            color: t.text,
            fontSize: 11,
            formatter: (p: { value: number }) => formatar(p.value),
          },
          cursor: onClickItem ? "pointer" : "default",
        },
      ],
    }
  }, [t, itens, formatar, rotuloValor, cor, onClickItem])

  if (!option) return <div style={{ height: altura }} />
  return (
    <div style={{ height: altura }}>
      <EChart
        option={option}
        ariaLabel={ariaLabel}
        className="h-full"
        onClickItem={onClickItem ? (i) => onClickItem(itens.length - 1 - i) : undefined}
      />
    </div>
  )
}
