"use client"

import { useMemo } from "react"

import { EChart, eixoCategoria, eixoValor, estiloTooltip, linhaTooltip, tituloTooltip } from "./echart"
import { useChartTheme } from "./use-chart-theme"

type Props = {
  categorias: string[]
  valores: number[]
  formatar: (v: number) => string
  rotuloValor: string
  ariaLabel: string
  className?: string
  cor?: number
  /** texto extra no tooltip, por categoria */
  detalhe?: (i: number) => string
  /** índice da coluna destacada (ex.: faixa da mediana) — ganha um tom mais escuro */
  destaque?: number
  /** rótulo do valor no topo das barras (desligue em histogramas densos) */
  rotulos?: boolean
}

/** Colunas verticais de uma cor — usada para distribuições (histograma, faixas). */
export function ColumnChart({
  categorias, valores, formatar, rotuloValor, ariaLabel, className, cor = 0, detalhe, destaque, rotulos = true,
}: Props) {
  const t = useChartTheme()
  const option = useMemo(() => {
    if (!t) return null
    return {
      grid: { left: 8, right: 8, top: rotulos ? 24 : 16, bottom: 8, containLabel: true },
      tooltip: {
        trigger: "axis",
        ...estiloTooltip(t),
        axisPointer: { type: "shadow", shadowStyle: { color: `${t.axis}33` } },
        formatter: (p: { dataIndex: number; value: number }[]) => {
          const i = p[0].dataIndex
          return tituloTooltip(categorias[i]) + linhaTooltip(t.series[cor], rotuloValor, formatar(p[0].value)) + (detalhe ? `<div style="margin-top:4px;opacity:.75">${detalhe(i)}</div>` : "")
        },
      },
      xAxis: eixoCategoria(t, categorias, { axisLabel: { color: t.muted, fontSize: 11, interval: "auto", hideOverlap: true } }),
      yAxis: { ...eixoValor(t, formatar), splitNumber: 3 },
      series: [
        {
          type: "bar",
          barCategoryGap: "18%",
          data: valores.map((v, i) => ({
            value: v,
            itemStyle: { color: i === destaque ? t.seq[5] : t.series[cor], borderRadius: [4, 4, 0, 0] },
          })),
          label: rotulos
            ? { show: true, position: "top", color: t.text, fontSize: 11, formatter: (p: { value: number }) => formatar(p.value) }
            : undefined,
        },
      ],
    }
  }, [t, categorias, valores, formatar, rotuloValor, cor, detalhe, destaque, rotulos])

  if (!option) return <div className={className ?? "h-64"} />
  return <EChart option={option} ariaLabel={ariaLabel} className={className} />
}
